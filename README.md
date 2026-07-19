# 보이스 컬러 — 프로덕션 앱 (Vercel 무료 배포)

녹음 30초 → Gemini가 목소리를 **16색** 중 하나로 찾아줌(칭찬만) → 카드 → 공유 → acttub 전환.

> 16색 = 톤 4단계 × 질감 4단계. 벨벳·느와르·선샤인·크리스탈은 그중 네 코너다.
> **카피 정본은 `index.html`** — 이 README가 아니다.
스택: **정적 프론트 + Vercel 서버리스 함수(Gemini 키 숨김) + (선택) Supabase 집계.** 서버·AWS·도메인 없이 무료.

## 구조 (Vercel 네이티브)
```
tools/voice-color-app/
├─ index.html            # 프론트 (녹음→base64 업로드→카드→PNG 저장)
├─ api/
│  ├─ analyze.js         # /api/analyze : 오디오→Gemini→계열 key (키 숨김·레이트리밋·음원 미저장)
│  └─ event.js           # /api/event   : 퍼널 집계 (Supabase 없으면 no-op)
├─ package.json          # 의존성 0개 (Node 18+ 내장 fetch만 씀)
├─ supabase/schema.sql   # (선택) 집계 테이블
└─ deploy/RUNBOOK.md     # Vercel 배포 단계별
```
> 의존성이 0개라 `npm install`도 필요 없음 — 함수는 Node 내장 `fetch`만 사용.

## 제일 빠른 길
```bash
npm i -g vercel
cd tools/voice-color-app
vercel dev     # 로컬 테스트 (localhost = 마이크 열림). GEMINI_API_KEY 입력 필요.
vercel --prod  # 배포 → https://너앱.vercel.app (무료 HTTPS, 공유 링크)
```
자세한 건 `deploy/RUNBOOK.md`.

## 링크 미리보기 (OG) — 2026-07-19 추가

카톡·DM으로 링크를 공유할 때 뜨는 미리보기. 그 전엔 메타 태그가 하나도 없어 **빈 미리보기**로 떴다.

| 파일 | 용도 |
|---|---|
| `og-2026-07-19.jpg` | 1200×630, 94KB. 링크 미리보기 이미지 |
| `favicon.ico` · `apple-touch-icon.png` · `icon-192/512.png` | 탭 아이콘, iOS 홈화면, PWA |
| `manifest.webmanifest` | PWA 매니페스트 |
| `assets-src/` | 배경 원본 + 렌더 스크립트. `.vercelignore`로 **배포 제외** |

**고칠 때**: `assets-src/render_og.py`를 고쳐 다시 렌더한다. 배경은 gpt-image-2로 만들고 한글은 PIL로 얹는 하이브리드다(gpt-image-2는 한글 자모를 깨뜨림).

⚠️ **이미지 캐시는 URL 단위다.** 이미지를 바꾸면 **파일명의 날짜를 반드시 바꾸고** `index.html`의 `og:image`도 같이 고친다. 같은 파일명으로 덮으면 카톡에 옛 이미지가 계속 뜬다.

**규격 근거** (2026-07-19 조사): 카카오는 og:image를 800×400(2:1)로 변환하며 크롭 위치를 제어할 수 없다 → 핵심 요소는 안쪽에 배치. 카카오는 JPG/PNG만 지원(WebP 불가). 용량은 300KB 이하 권장(카카오 문서가 500KB와 5MB로 어긋나 안전값).

## 🙋 운영자만 할 일
1. **Gemini API 키** 발급 (Google AI Studio, 무료).
2. **Vercel 로그인** (무료).
3. `vercel` 명령 실행 + `GEMINI_API_KEY` 환경변수 등록.
4. (선택) Supabase 집계, 커스텀 도메인.
5. 정식 오픈 전 음성 수집 동의·개인정보 처리방침 법률 검토.
6. **카카오 OG 캐시 초기화** — 전에 이 링크를 카톡에 공유한 적이 있으면 "이미지 없음" 상태가 캐시돼 있다. https://developers.kakao.com/tool/clear/og 에 `https://voice.acttub.com/` 를 넣고 초기화. 본인 폰에서 확인하려면 카톡 앱 캐시도 지워야 한다.

## 가드레일 (위반 시 제품 회귀)
- 함수는 **계열/수식 key만** 반환, 사용자 문장은 프론트 확정 카피로 조립(판정 누출 차단).
- 오디오는 메모리에서만 처리, **저장·보관 안 함**.
- 잘/못·발성·점수 등 판정어 프롬프트로 금지. 사투리=희귀 옵션(긍정).

## ✅ Gemini 콜 검증됨 (2026-07-16)
실제 키로 오디오 콜 성공 — 정상 JSON 반환 확인. 기본 모델 `gemini-2.5-flash`(검증). 더 저렴하게는 `gemini-flash-lite-latest`로 `GEMINI_MODEL`만 바꾸면 됨(둘 다 확인). 모델은 시간 지나면 단종되니, 나중에 404 나면 `GET /v1beta/models?key=...`로 목록 확인 후 교체.
