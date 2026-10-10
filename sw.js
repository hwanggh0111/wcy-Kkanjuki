// 깐죽이 서비스 워커 — 홈 화면에 설치했을 때 오프라인에서도 화면이 뜨게 한다
// 화면 파일은 항상 인터넷에서 먼저 받고(최신 유지), 안 될 때만 저장해 둔 걸 쓴다.
// 아이콘/폰트처럼 잘 안 바뀌는 건 저장해 둔 걸 먼저 쓴다.

const VERSION = "kkanjuki-v1";
const SHELL = ["/", "/index.html", "/config.js", "/manifest.json", "/icon.svg", "/icon-192.png", "/icon-512.png", "/offline.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return; // /api/chat 같은 POST는 건드리지 않는다
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/")) return;

  const isStatic = url.origin !== location.origin || /\.(png|svg|ico|woff2?|ttf)$/.test(url.pathname);

  if (isStatic) {
    // 아이콘·폰트: 저장본 먼저, 없으면 받아서 저장
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((r) => {
        if (r.ok) caches.open(VERSION).then((c) => c.put(req, r.clone()));
        return r;
      }).catch(() => hit))
    );
    return;
  }

  // 화면 파일: 인터넷 먼저, 실패하면 저장본, 그것도 없으면 오프라인 안내
  e.respondWith(
    fetch(req).then((r) => {
      if (r.ok) caches.open(VERSION).then((c) => c.put(req, r.clone()));
      return r;
    }).catch(async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      if (req.mode === "navigate") return caches.match("/offline.html");
      return new Response("", { status: 504 });
    })
  );
});
