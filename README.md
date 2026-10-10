# 깐죽이 — 인터넷 배포용

장난기 많고 짓궂은 AI 챗봇. 화면(`index.html`)과 키를 숨기는 작은 서버(`api/chat.js`)로 나뉘어 있어요.
AI는 Google **Gemini**(`gemini-2.5-flash`)를 씁니다.

## 파일 구조
```
/
├─ index.html          ← 화면 (키 없음, 안전)
├─ config.js           ← 로그인용 Supabase 주소/공개키 (비워두면 로그인 기능 꺼짐)
├─ supabase/schema.sql ← 로그인 DB 만들 때 한 번 실행하는 SQL
├─ admin.html          ← 관리자 페이지 (비밀번호 필요)
├─ sw.js, offline.html ← 홈 화면 설치·오프라인용
├─ api/admin.js        ← 관리자 통계 API
├─ lib/usage.js        ← 사용 기록 저장 (Supabase)
├─ api/
│  └─ chat.js          ← 작은 서버 (여기서만 키를 사용)
└─ .claude/
   └─ dev-server.mjs   ← 내 컴퓨터에서 미리보기용 서버 (배포엔 안 쓰임)
```
이 폴더 구조 그대로 올려야 작동해요. `api` 폴더 안에 `chat.js`가 들어 있어야 `/api/chat` 주소가 만들어집니다.

## 기능
- 깐죽 단계 1~3 고르기 (헤더 색/표정도 같이 바뀜)
- 답이 글자 단위로 바로바로 나옴 (스트리밍)
- 대화가 자동 저장되고, "목록"에서 지난 대화를 골라 이어가거나 지울 수 있음 (최대 30개)
- 사진 보내기 (보내기 전에 자동으로 줄여서 빠름)
- 실패하면 "다시 보내기" 버튼
- 45초 가만히 있으면 깐죽이가 먼저 말 걸음
- "공유" 버튼으로 대화 텍스트 공유/복사
- 같은 IP에서 1분에 20번까지만 (키 할당량 보호)
- 로그인(닉네임/이메일/구글)하면 대화가 계정에 저장돼서 다른 기기에서도 이어짐, 깐죽이가 이름도 불러줌
- 📚 숙제 모드: 켜면 까불지 않고 차근차근 설명 (대화마다 따로 기억)
- 대화 검색, 제목 바꾸기(✎), 즐겨찾기(★)로 위에 고정
- 힘들거나 위험한 말(괴롭힘·자해 등)이 보이면 상담전화(1388·117·112) 안내를 띄우고 AI도 장난을 멈춤
- 홈 화면에 추가(PWA): 설치 안내 배너, 오프라인이면 안내 화면
- 관리자 페이지 `/admin.html`: 날짜별 요청·사용자·에러·토큰 (대화 내용은 저장 안 함)

## 배포 순서 (Vercel 기준, 무료로 가능)

1. **API 키 발급**
   - aistudio.google.com 에 로그인 → Get API key → Create API key
   - `AIza...` 로 시작하는 키가 나와요. 복사해 두세요.
   - 이 키는 비밀번호예요. 코드에 적지 말고, 깃허브에도 올리지 말고, 아무한테도 보여주지 마세요.

2. **이 폴더를 Vercel에 올리기**
   - vercel.com 에 로그인 → 새 프로젝트 → 깃허브 저장소 연동 (main에 푸시하면 자동 배포).

3. **키를 환경변수로 숨기기** ← 제일 중요
   - Vercel 프로젝트 → Settings → Environment Variables
   - Name: `GEMINI_API_KEY`
   - Value: 발급받은 `AIza...` 키
   - 저장 후 다시 배포(Redeploy).

4. **나온 주소를 친구들한테 공유**
   - `https://내프로젝트.vercel.app` 같은 주소가 생겨요. 그걸 보내면 끝.
   - 친구들은 키도, 로그인도 필요 없어요.

## 로그인 켜기 (Supabase, 무료)
로그인 없이도 잘 돌아가요. 계정 저장을 쓰고 싶을 때만 하세요.

1. supabase.com 가입 → New project (이름·비밀번호·지역은 아무거나, Seoul 추천)
2. 왼쪽 **SQL Editor** → `supabase/schema.sql` 내용 붙여넣고 **Run**
3. **Authentication → Providers → Email** 에서 **Confirm email 끄기** (닉네임만으로 가입하려면 꼭 필요)
4. (선택) 구글 로그인: **Authentication → Providers → Google** 켜고, Google Cloud Console에서 OAuth 클라이언트 만들어 ID/Secret 입력.
   Supabase가 알려주는 Callback URL을 구글 쪽 "승인된 리디렉션 URI"에 넣어야 해요.
   **Authentication → URL Configuration** 의 Site URL은 배포 주소(`https://내프로젝트.vercel.app`)로.
5. **Settings → API** 의 Project URL 과 anon public 키를 `config.js`에 적고 커밋·배포
   (anon 키는 공개용이라 깃허브에 올라가도 괜찮아요. RLS가 각자 자기 대화만 보게 막아줍니다)

로그인 방식: 닉네임+비밀번호(이메일 없이), 이메일+비밀번호, 구글. 로그인 전에 손님으로 쓴 대화는 로그인하면 계정으로 옮겨져요.

## 관리자 페이지 켜기
`https://내프로젝트.vercel.app/admin.html` 에서 사용량을 볼 수 있어요. Vercel > Settings > Environment Variables 에 세 개를 추가하세요.

| 이름 | 값 |
|---|---|
| `ADMIN_PASSWORD` | 관리자 페이지 들어갈 때 칠 비밀번호 (아무거나 길게) |
| `SUPABASE_URL` | Supabase > Settings > API 의 Project URL |
| `SUPABASE_SERVICE_KEY` | 같은 화면의 **service_role** 키 — 이건 비밀! 코드나 config.js에 절대 넣지 말고 Vercel 환경변수에만 |

`supabase/schema.sql`을 아직 안 돌렸으면 돌려야 `usage_log` 테이블이 생겨요 (로그인 설정 때 이미 돌렸다면 다시 한 번 돌려도 안전해요).
세 개 중 하나라도 없으면 사용 기록은 안 남고 앱은 그냥 돌아갑니다.

## 내 컴퓨터에서 미리보기
- 프로젝트 루트에 `.env` 파일을 만들고 `GEMINI_API_KEY=AIza...` 한 줄을 적어요 (`.gitignore`에 들어 있어서 깃허브엔 안 올라감).
- `node .claude/dev-server.mjs` 실행 후 http://localhost:5173 열기.

## 비용
- Gemini 무료 등급 안에서는 돈이 안 나가요. 한도를 넘기면 그날은 "AI가 거절했어"가 뜹니다.
- 유료로 바꿨다면 친구들이 쓸수록 내 키로 요금이 나가요(쓴 만큼).

## 성격 바꾸기
- `api/chat.js` 맨 위 `BASE_PROMPT`가 기본 성격, `LEVEL_PROMPTS`가 단계별 톤이에요. 특별 규칙도 `BASE_PROMPT` 안에 있어요.
