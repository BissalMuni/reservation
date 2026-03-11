-- 세금상담회 예약시스템 초기 스키마
-- 시간대 슬롯 테이블
CREATE TABLE IF NOT EXISTS time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hour_slot INTEGER NOT NULL CHECK (hour_slot IN (16, 17)),
  minute_slot INTEGER NOT NULL CHECK (minute_slot IN (0, 20, 40)),
  current_count INTEGER NOT NULL DEFAULT 0,
  max_count INTEGER NOT NULL DEFAULT 5,
  UNIQUE (hour_slot, minute_slot)
);

-- 예약 테이블
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  hour_slot INTEGER NOT NULL,
  minute_slot INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('국세', '지방세', '기타')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 활성 예약에 대한 중복 방지 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_active_unique
  ON reservations (name, phone) WHERE status = 'active';

-- 슬롯별 예약 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_reservations_slot_status
  ON reservations (hour_slot, minute_slot, status);

-- 7일 경과 데이터 자동 삭제용 인덱스
CREATE INDEX IF NOT EXISTS idx_reservations_created_at
  ON reservations (created_at);

-- SMS 발송 기록 테이블
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('confirmation', 'reminder', 'cancellation')),
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  aligo_msg_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SMS 로그 인덱스
CREATE INDEX IF NOT EXISTS idx_sms_logs_reservation
  ON sms_logs (reservation_id);

CREATE INDEX IF NOT EXISTS idx_sms_logs_status_retry
  ON sms_logs (status, retry_count);

-- 초기 슬롯 데이터 (6개)
INSERT INTO time_slots (hour_slot, minute_slot, max_count) VALUES
  (16, 0, 5),
  (16, 20, 5),
  (16, 40, 5),
  (17, 0, 5),
  (17, 20, 5),
  (17, 40, 5)
ON CONFLICT (hour_slot, minute_slot) DO NOTHING;
