-- 보이스 컬러 — Supabase 스키마 (선택: 집계 쓸 때만)
-- Supabase 프로젝트 > SQL Editor 에 붙여넣고 실행.
-- 오디오·전사·개인정보는 저장하지 않음. 퍼널 이벤트만.
-- 계열 결과도 result_velvet 같은 이벤트로 여기 함께 들어옴.

create table if not exists voice_events (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  event      text not null
  -- landing_view | record_open | analyze_start | analyze_fail
  -- | result_view (카드 노출 = 공유율·완주율의 분모) | result_<계열키> (16색 쏠림)
  -- | share_save | cta_click | face_yes|face_no|face_skip (외모→목소리 이동 확인 문항)
);

create index if not exists idx_events_created on voice_events (created_at);

-- 서버(서버리스 함수)가 SERVICE_KEY 로 접근. 공개 클라이언트는 직접 안 씀 → anon 권한 주지 않음.
