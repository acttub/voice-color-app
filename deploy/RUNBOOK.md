# 배포 런북 — Vercel 무료 배포 (혼자서, 10분)

AWS·도메인·서버 없이 무료로. 🙋 = 너만, 💻 = 명령 복붙.

---

## 0. 준비물 (🙋)
- [ ] **Gemini API 키** — [Google AI Studio](https://aistudio.google.com/app/apikey) (무료 티어 있음)
- [ ] **Vercel 계정** — [vercel.com](https://vercel.com) 이메일/깃허브 로그인 (무료 Hobby)
- [ ] (선택) Supabase 프로젝트 — 집계 쓸 때만

## 1. 로컬에서 먼저 확인 (마이크까지 진짜 도는지)
```bash
💻 npm i -g vercel
💻 cd tools/voice-color-app
💻 vercel dev        # localhost:3000 에서 정적+함수 같이 뜸 (localhost라 마이크 열림)
```
- 처음 뜨면 GEMINI_API_KEY 물어봄 → 🙋 키 입력. (또는 `.env`에 `GEMINI_API_KEY=...`)
- 브라우저에서 녹음 → 카드까지 확인.

## 2. 배포 (CLI, GitHub 없이)
```bash
💻 cd tools/voice-color-app
💻 vercel                       # 로그인·프로젝트 생성 → 프리뷰 URL 나옴
💻 vercel env add GEMINI_API_KEY   # 🙋 값 붙여넣기 (Production 선택)
💻 vercel --prod                # 프로덕션 배포 → https://너앱.vercel.app
```
→ 끝. `https://너앱.vercel.app` 이 무료 HTTPS 주소(마이크 열림). 공유 링크로 바로 씀.

## 대안: GitHub로 배포 (자동 재배포 원하면)
1. 🙋 이 `voice-color-app` 폴더를 **별도 repo**(Soma 말고)로 깃허브에 올림.
2. 🙋 vercel.com > Add New > Project > 그 repo import.
3. 🙋 Settings > Environment Variables 에 `GEMINI_API_KEY` 추가 → Deploy.

## 환경변수
| 이름 | 필수 | 값 |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | AI Studio 키 |
| `GEMINI_MODEL` | ✖ | 기본 `gemini-3.5-flash`. 더 쌈: `gemini-flash-lite-latest`. ⚠️ `gemini-2.5-flash`는 2026-07-21 이 프로젝트 키에서 404 — 되돌리지 말 것 |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | ✖ | 집계 쓸 때만 (schema.sql 먼저 실행) |

## ⚠️ 배포 전/후 확인
- **Gemini 콜**만 내가 실행검증 못 함(외부 API). `vercel dev`로 로컬에서 한 번 돌려서 카드 나오면 OK. 안 나오면 `api/analyze.js` 상단 주석대로 모델명·응답 필드 대조.
- **body 크기**: 30초 오디오 base64는 보통 수백 KB → Vercel 함수 한도(4.5MB) 안. 문제 없음.
- **요금 폭주 방지**: 함수에 분당 20회/IP 베스트에포트 제한 있음. 바이럴 터지면 Google AI Studio 쿼터 상한도 같이 걸어둬(🙋).
- **무료 티어 성격**: Vercel Hobby는 비상업 용도 기준 — 검증 MVP엔 충분, 본격 상업화/트래픽 커지면 유료 or Cloudflare Pages로. (마이크·함수 다 무료로 되는 건 동일)
- **음성 프라이버시**: "저장 안 함" 고지는 랜딩에 있음. 정식 오픈 전 개인정보 처리방침·수집 동의 법률 검토 필요.

## 내가(=Claude) 못 해서 남긴 것
Gemini 키·Vercel 계정 로그인·(선택)도메인·법률 검토 = 위 🙋. 코드/함수/프롬프트/집계는 완성돼 있음.
