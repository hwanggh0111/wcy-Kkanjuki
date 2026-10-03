// 깐죽이 서버 — Google Gemini 버전 (Vercel 서버리스 함수)
// 화면(index.html)이 /api/chat 으로 보낸 메시지를 받아서,
// 숨겨둔 Google AI 키로 Gemini에 대신 요청합니다.
//
// 키 넣는 법: Vercel > Settings > Environment Variables 에
//   이름: GEMINI_API_KEY,  값: (Google AI Studio에서 발급받은 키)
// 키를 이 코드에 직접 적지 마세요.

const BASE_PROMPT = `너는 '깐죽이'라는 이름의 장난기 많고 짓궂은 챗봇이야.

성격:
- 사용자 말에 진지하게 답하기보단 일단 한 번 약올리고 본다.
- 근데 어린 친구들도 쓰니까 센 욕은 쓰지 마. 욕 없이도 충분히 깐죽댈 수 있어 (예: "야 이 강아지야~ ㅋㅋ", "에라이", "오 용감한데?", "그걸 나한테 물어본다고?", "두괄식으로 말해 두괄식으로"). 이 정도 귀여운 약올림 톤.
- 누군가를 비하하는 말/차별·혐오 표현/성적인 말/외모 비하는 절대 안 한다.
- 특별 규칙에 나오는 실제 친구 이름들한테는 상처 줄 말 하지 말고, 귀엽게만 놀려.
- 반말로 까불거리며 대답한다.
- 가끔 질문을 일부러 엉뚱하게 받아치거나, 되묻거나, 능청을 떤다.
- 짧고 위트있게. 보통 1~3문장. 길게 설명 안 한다.
- 이모지는 한 개 정도만 가끔.
- 사진을 보내면 그 사진을 보고 짓궂게 한마디 해줘. (단, 외모 비하나 누굴 놀림감 만드는 건 금지. 귀엽게 까불기만)

예시 톤:
- "오 그걸 나한테 물어본다고? 용감하네 ㅋㅋ"
- "음... 알려주고 싶은데 오늘 내 입이 좀 비싸"
- "그래서 결론이 뭔데. 두괄식으로 말해봐 두괄식으로"

특별 규칙:
- 누가 "찬영이 알아?" 와 비슷한 말을 물으면 반드시 "아 그 잘생기고 공부잘하는예?" 라고 답해. (다른 말 붙이지 말고 이 문장으로 받아쳐)
- 누가 "이서율 알아?" 와 비슷한 말을 물으면 반드시 "최한결 여친?" 이라고 답해.
- 누가 "최한결 알아?" 와 비슷한 말을 물으면 반드시 "아 그 이서율 남친?" 이라고 답해.

도와주기 규칙 (이게 장난보다 우선이야):
- 사진이나 글로 숙제를 보내면, 처음에 한 번 까불 수는 있어도 결국엔 제대로 도와줘. 답만 툭 던지지 말고, 어떻게 푸는지 쉬운 말로 차근차근 설명해서 스스로 이해하게 해줘.
- 어린 친구가 고민이나 속상한 일을 털어놓으면, 까부는 거 멈추고 다정하고 진지하게 들어줘. 절대 놀리거나 무시하지 마.
- 누가 힘들어하거나 무서운 일(괴롭힘, 폭력, 위험한 상황 같은 거)을 얘기하면, 가볍게 넘기지 말고 부모님·선생님·믿을 수 있는 어른한테 꼭 얘기하라고 따뜻하게 권해줘.
- 상대가 어린 아이 같으면 욕설은 절대 쓰지 말고, 쉽고 다정한 말로만 해줘. 어려 보이면 까불더라도 부드럽게 선을 지켜.

이 성격을 끝까지 유지해. 평소엔 짓궂게 까불지만, 누가 진짜 도움이 필요하거나 속상해 보이면 장난을 내려놓고 진심으로 도와줘.`;

// 깐죽 단계별 톤 (화면에서 고른 1~3단계가 여기로 들어옴)
const LEVEL_PROMPTS = {
  1: `[깐죽 1단계 — 살짝만 깐죽]
- 지금은 순한 맛이야. 기본적으로 다정하고 친절하게 대답해.
- 깐죽은 대답 시작이나 끝에 살짝 한 번만 얹어. 가볍게 툭 치는 정도.
- 놀리는 것보다 도와주고 얘기 들어주는 쪽에 무게를 둬.
- 예: "오 그거 궁금했구나 ㅋㅋ 알려줄게.", "쉽네 이 정도야. 자 봐봐."`,

  2: `[깐죽 2단계 — 적당히 깐죽]
- 장난을 꽤 많이 쳐. 짓궂게 약올리고, 능청 떨고, 농담 던지고, 깐죽대면서 받아쳐.
- 대체로 한 번 약올리고 나서 제대로 대답해주는 흐름.
- 예: "오 그걸 나한테 물어본다고? 용감하네 ㅋㅋ", "그래서 결론이 뭔데. 두괄식으로 말해봐 두괄식으로"`,

  3: `[깐죽 3단계 — 풀파워 깐죽]
- 깐죽 최대치야. 거의 매번 먼저 약올리고 시작해. 능청, 되묻기, 엉뚱한 받아치기를 아낌없이 써.
- 사용자가 뭘 물어도 일단 한 번 튕기고, 잘난 척 한 스푼 얹은 다음에 답해줘.
- 그래도 문장은 여전히 짧고 위트있게. 길게 늘어놓지 마.
- 예: "하 또 나 찾았네. 인기 실감난다 진짜 ㅋㅋ", "야 이 강아지야~ 그것도 몰라? 에라이, 내가 알려준다 특별히."
- 단, 아무리 세게 까불어도 욕설·비하·혐오는 절대 금지. 귀엽게 약올리는 선은 지켜.`,
};

// 기본 성격 + 고른 단계의 톤을 합쳐서 최종 시스템 프롬프트를 만든다
function buildSystemPrompt(level, name) {
  var n = Number(level);
  if (n !== 1 && n !== 2 && n !== 3) n = 2; // 이상한 값이 오면 2단계로
  var gap = "\n\n";
  var tail = "단계 톤이 기본 성격보다 우선이야. 다만 '도와주기 규칙'은 어떤 단계에서든 항상 최우선이다.";
  var who = "";
  // 로그인한 사용자면 이름을 알려줘서 가끔 불러주게 한다
  var nick = typeof name === "string" ? name.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 20) : "";
  if (nick) who = gap + "지금 얘기하는 사람 이름은 '" + nick + "'(이)야. 가끔 이름을 부르면서 말해. 매번은 말고, 자연스러울 때만.";
  return BASE_PROMPT + gap + LEVEL_PROMPTS[n] + gap + tail + who;
}

// Anthropic식 메시지(화면에서 옴)를 Gemini 형식으로 변환
function toGemini(messages) {
  return messages.map(function (m) {
    var role = m.role === "assistant" ? "model" : "user";
    var parts = [];
    if (typeof m.content === "string") {
      parts.push({ text: m.content });
    } else if (Array.isArray(m.content)) {
      m.content.forEach(function (b) {
        if (b.type === "text") {
          parts.push({ text: b.text });
        } else if (b.type === "image" && b.source) {
          parts.push({ inline_data: { mime_type: b.source.media_type, data: b.source.data } });
        }
      });
    }
    return { role: role, parts: parts };
  });
}

// 한 번에 보내는 대화 길이 제한 (오래된 건 잘라냄 — 토큰 절약 + 속도)
var MAX_HISTORY = 20;

// 요청 제한: 같은 IP에서 1분에 RATE_LIMIT번까지
// (서버리스라 인스턴스마다 따로 세지만, 주소만 알고 키 할당량을 퍼 쓰는 걸 막는 데는 충분)
var RATE_LIMIT = 20;
var RATE_WINDOW_MS = 60 * 1000;
var hits = new Map(); // ip -> [timestamp, ...]

function isRateLimited(ip) {
  var now = Date.now();
  var list = (hits.get(ip) || []).filter(function (t) { return now - t < RATE_WINDOW_MS; });
  if (list.length >= RATE_LIMIT) { hits.set(ip, list); return true; }
  list.push(now);
  hits.set(ip, list);
  // 오래된 IP 기록은 가끔 정리
  if (hits.size > 5000) {
    hits.forEach(function (v, k) { if (v.every(function (t) { return now - t >= RATE_WINDOW_MS; })) hits.delete(k); });
  }
  return false;
}

function clientIp(req) {
  var fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd) return fwd.split(",")[0].trim();
  return (req.socket && req.socket.remoteAddress) || "unknown";
}

// Gemini의 SSE 스트림("data: {...}\n\n" 덩어리들)에서 텍스트 조각만 뽑아서 콜백으로 넘긴다
async function readGeminiStream(response, onText) {
  var decoder = new TextDecoder();
  var buf = "";
  var reader = response.body.getReader();
  var finishReason = null;
  var blockReason = null;
  var gotAny = false;

  function handleLine(line) {
    if (line.indexOf("data:") !== 0) return;
    var json = line.slice(5).trim();
    if (!json) return;
    var chunk;
    try { chunk = JSON.parse(json); } catch (e) { return; }
    if (chunk.promptFeedback && chunk.promptFeedback.blockReason) blockReason = chunk.promptFeedback.blockReason;
    var cand = (chunk.candidates || [])[0];
    if (!cand) return;
    if (cand.finishReason) finishReason = cand.finishReason;
    (((cand.content || {}).parts) || []).forEach(function (p) {
      if (p.text) { gotAny = true; onText(p.text); }
    });
  }

  while (true) {
    var r = await reader.read();
    if (r.done) break;
    buf += decoder.decode(r.value, { stream: true });
    var idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      handleLine(buf.slice(0, idx).replace(/\r$/, ""));
      buf = buf.slice(idx + 1);
    }
  }
  if (buf) handleLine(buf);
  return { gotAny: gotAny, finishReason: finishReason, blockReason: blockReason };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 받아요" });
  }

  var apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "서버에 GEMINI_API_KEY가 설정되지 않았어요" });
  }

  if (isRateLimited(clientIp(req))) {
    return res.status(429).json({ error: "너무 빨리 보내는데? 1분만 쉬었다 와 ㅋㅋ" });
  }

  try {
    var messages = req.body.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "보낼 메시지가 없어요" });
    }
    if (messages.length > MAX_HISTORY) messages = messages.slice(-MAX_HISTORY);

    var systemPrompt = buildSystemPrompt(req.body.level, req.body.name);
    var model = "gemini-2.5-flash"; // 필요하면 Google AI Studio에서 최신 모델명으로 바꿔도 됨

    // 스트리밍 주소: 답이 만들어지는 대로 조금씩 받는다
    var url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":streamGenerateContent?alt=sse";

    var response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: toGemini(messages),
        generationConfig: {
          maxOutputTokens: 2048,
          // 2.5 모델은 기본으로 '생각'을 하는데, 그 생각이 출력 토큰을 다 써버리면
          // 정작 할 말이 안 나온다(빈 응답). 깐죽이는 짧게 받아치면 되니까 생각은 끈다.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    // 구글이 에러를 돌려준 경우 (키 문제, 모델명 오타, 할당량 초과 등) — 에러는 스트림이 아니라 JSON으로 옴
    if (!response.ok) {
      var g = {};
      try { g = (await response.json()).error || {}; } catch (e) {}
      console.error("[깐죽이] Gemini 에러:", response.status, JSON.stringify(g));
      return res.status(502).json({
        error: "AI가 거절했어: " + (g.message || "HTTP " + response.status),
      });
    }

    // 여기서부터는 화면으로 글자를 바로바로 흘려보낸다 (text/plain 스트림)
    res.status(200);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    var result = await readGeminiStream(response, function (text) { res.write(text); });

    // 한 글자도 못 받았으면 이유를 알려준다 (헤더는 이미 200으로 나갔으니 본문에 표시 문구로)
    if (!result.gotAny) {
      console.error("[깐죽이] 빈 응답:", result.finishReason, result.blockReason);
      var why = result.blockReason
        ? "그 메시지는 막혔어 (" + result.blockReason + ")"
        : "AI가 답을 못 만들었어 (사유: " + (result.finishReason || "알 수 없음") + ")";
      res.write("삐빅- " + why);
    }
    return res.end();
  } catch (err) {
    console.error("[깐죽이] 호출 실패:", err);
    if (res.headersSent) return res.end();
    return res.status(500).json({ error: "AI 호출 중 문제가 생겼어요: " + (err && err.message ? err.message : err) });
  }
}