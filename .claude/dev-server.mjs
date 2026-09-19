// 깐죽이 로컬 미리보기 서버
// - 프로젝트 폴더의 정적 파일(index.html 등)을 그대로 서빙
// - /api/chat 은 api/chat.js (Vercel 핸들러)를 그대로 불러서 실행
// 키는 환경변수 GEMINI_API_KEY 또는 프로젝트 루트의 .env 파일에서 읽음

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 5173;

const envFile = path.join(ROOT, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

async function handleApi(req, res) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }

  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(obj));
    return res;
  };

  // 수정할 때마다 최신 코드를 쓰도록 캐시를 피해서 불러온다
  const file = path.join(ROOT, "api", "chat.js");
  const mod = await import(pathToFileURL(file).href + "?t=" + fs.statSync(file).mtimeMs);
  await mod.default(req, res);
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/api/chat") return await handleApi(req, res);

    let rel = decodeURIComponent(url.pathname);
    if (rel === "/") rel = "/index.html";
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.statusCode = 404;
      return res.end("Not found");
    }
    res.setHeader("Content-Type", TYPES[path.extname(file).toLowerCase()] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    fs.createReadStream(file).pipe(res);
  } catch (err) {
    console.error("[dev-server]", err);
    res.statusCode = 500;
    res.end("Server error: " + (err && err.message ? err.message : err));
  }
}).listen(PORT, () => {
  console.log("깐죽이 미리보기: http://localhost:" + PORT);
  if (!process.env.GEMINI_API_KEY) console.log("(GEMINI_API_KEY 없음 — 화면은 뜨지만 대화는 에러가 납니다)");
});
