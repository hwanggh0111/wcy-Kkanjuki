// 사용 기록 저장/조회 — 관리자 페이지용
// Supabase REST를 service role 키로 직접 부른다 (패키지 설치 없이).
// 환경변수 SUPABASE_URL, SUPABASE_SERVICE_KEY 가 없으면 조용히 아무것도 안 한다.

import crypto from "node:crypto";

export function usageEnabled() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

function headers() {
  var key = process.env.SUPABASE_SERVICE_KEY;
  return { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };
}

// IP는 그대로 저장하지 않고 해시로만 (같은 사람인지 세는 용도)
export function hashIp(ip) {
  var salt = process.env.ADMIN_PASSWORD || "kkanjuki";
  return crypto.createHash("sha256").update(String(ip) + "|" + salt).digest("hex").slice(0, 16);
}

export async function logUsage(row) {
  if (!usageEnabled()) return;
  try {
    var r = await fetch(process.env.SUPABASE_URL + "/rest/v1/usage_log", {
      method: "POST",
      headers: Object.assign({ Prefer: "return=minimal" }, headers()),
      body: JSON.stringify(row),
    });
    if (!r.ok) console.error("[깐죽이] 사용 기록 저장 실패:", r.status, await r.text());
  } catch (e) {
    console.error("[깐죽이] 사용 기록 저장 실패:", e);
  }
}

export async function fetchUsage(sinceIso, limit) {
  var url = process.env.SUPABASE_URL + "/rest/v1/usage_log?select=*&ts=gte." + encodeURIComponent(sinceIso) +
    "&order=ts.desc&limit=" + (limit || 10000);
  var r = await fetch(url, { headers: headers() });
  if (!r.ok) throw new Error("usage_log 조회 실패: " + r.status + " " + (await r.text()));
  return r.json();
}
