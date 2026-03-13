-- 상담 상태 필드 추가
ALTER TABLE reservations
  ADD COLUMN consult_status TEXT NOT NULL DEFAULT '대기중'
  CHECK (consult_status IN ('대기중', '상담중', '상담종료'));
