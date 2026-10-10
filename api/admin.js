// 관리자 API — admin.html 이 부른다
// GET /api/admin?days=7   (헤더 x-admin-password: 환경변수 ADMIN_PASSWORD 와 같아야 함)
// usage_log 를 읽어서 날짜별/전체 통계로 묶어 돌려준다. 대화 내용은 어디에도 없다.

import crypto from "node:crypto";
import { usageEnabled, fetchUsage } from "../lib/usage.js";

function sameSecret(a, b) {
  var x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

function dayKey(ts) {
  // 한국 시간 기준 날짜
  var d = new Date(new Date(ts).getTime() + 9 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET만 받아요" });

  var want = process.env.ADMIN_PASSWORD;
  if (!want) return res.status(500).json({ error: "서버에 ADMIN_PASSWORD 환경변수가 없어요. Vercel > Settings > Environment Variables 에 추가하세요." });
  if (!sameSecret(req.headers["x-admin-password"], want)) return res.status(401).json({ error: "비밀번호가 틀렸어요" });
  if (!usageEnabled()) return res.status(500).json({ error: "SUPABASE_URL / SUPABASE_SERVICE_KEY 환경변수가 없어요. 사용 기록을 저장하려면 둘 다 필요해요." });

  var query = req.query || Object.fromEntries(new URL(req.url, "http://x").searchParams);
  var days = Math.min(90, Math.max(1, parseInt(query.days, 10) || 7));
  var since = new Date(Date.now() - days * 86400 * 1000);

  try {
    var rows = await fetchUsage(since.toISOString());
    var byDay = {};
    var total = { requests: 0, ok: 0, errors: 0, users: new Set(), loggedIn: 0, study: 0, safety: 0, inTokens: 0, outTokens: 0, durationSum: 0 };
    var levels = { 1: 0, 2: 0, 3: 0 };
    var errors = [];

    rows.forEach(function (r) {
      var k = dayKey(r.ts);
      var d = byDay[k] || (byDay[k] = { date: k, requests: 0, ok: 0, errors: 0, users: new Set(), study: 0, safety: 0, inTokens: 0, outTokens: 0 });
      d.requests++; total.requests++;
      if (r.ok) { d.ok++; total.ok++; } else { d.errors++; total.errors++; if (errors.length < 30) errors.push({ ts: r.ts, status: r.status, error: r.error }); }
      if (r.ip_hash) { d.users.add(r.ip_hash); total.users.add(r.ip_hash); }
      if (r.logged_in) total.loggedIn++;
      if (r.study) { d.study++; total.study++; }
      if (r.safety) { d.safety++; total.safety++; }
      d.inTokens += r.in_tokens || 0; total.inTokens += r.in_tokens || 0;
      d.outTokens += r.out_tokens || 0; total.outTokens += r.out_tokens || 0;
      total.durationSum += r.duration_ms || 0;
      if (levels[r.level] !== undefined) levels[r.level]++;
    });

    // 기록 없는 날도 0으로 채워서 표가 비지 않게
    var dayList = [];
    for (var i = days - 1; i >= 0; i--) {
      var k2 = dayKey(Date.now() - i * 86400 * 1000);
      var d2 = byDay[k2] || { date: k2, requests: 0, ok: 0, errors: 0, users: new Set(), study: 0, safety: 0, inTokens: 0, outTokens: 0 };
      dayList.push(Object.assign({}, d2, { users: d2.users.size }));
    }

    return res.status(200).json({
      days: days,
      total: Object.assign({}, total, { users: total.users.size, avgMs: total.requests ? Math.round(total.durationSum / total.requests) : 0 }),
      levels: levels,
      byDay: dayList,
      recentErrors: errors,
      truncated: rows.length >= 10000,
    });
  } catch (err) {
    console.error("[깐죽이] 관리자 조회 실패:", err);
    return res.status(500).json({ error: "통계를 못 가져왔어요: " + (err && err.message ? err.message : err) });
  }
}
