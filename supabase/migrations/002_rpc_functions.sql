-- 예약 생성 RPC 함수 (원자적 연산)
CREATE OR REPLACE FUNCTION create_reservation(
  p_name TEXT,
  p_phone TEXT,
  p_hour_slot INTEGER,
  p_minute_slot INTEGER,
  p_category TEXT
)
RETURNS JSON AS $$
DECLARE
  v_slot_id UUID;
  v_current INTEGER;
  v_max INTEGER;
  v_reservation_id UUID;
BEGIN
  -- 슬롯 유효성 검사
  IF p_hour_slot NOT IN (16, 17) OR p_minute_slot NOT IN (0, 20, 40) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INVALID_SLOT',
      'message', '유효하지 않은 시간대입니다'
    );
  END IF;

  -- 카테고리 유효성 검사
  IF p_category NOT IN ('국세', '지방세', '기타') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INVALID_CATEGORY',
      'message', '유효하지 않은 상담 분야입니다'
    );
  END IF;

  -- 해당 슬롯을 FOR UPDATE로 잠금
  SELECT id, current_count, max_count
  INTO v_slot_id, v_current, v_max
  FROM time_slots
  WHERE hour_slot = p_hour_slot AND minute_slot = p_minute_slot
  FOR UPDATE;

  IF v_slot_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INVALID_SLOT',
      'message', '슬롯을 찾을 수 없습니다'
    );
  END IF;

  -- 만석 체크
  IF v_current >= v_max THEN
    RETURN json_build_object(
      'success', false,
      'error', 'SLOT_FULL',
      'message', '해당 시간대는 만석입니다'
    );
  END IF;

  -- 중복 예약 체크 (활성 예약만)
  IF EXISTS (
    SELECT 1 FROM reservations
    WHERE name = p_name AND phone = p_phone AND status = 'active'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'DUPLICATE_RESERVATION',
      'message', '이미 예약이 존재합니다'
    );
  END IF;

  -- 예약 삽입
  INSERT INTO reservations (name, phone, hour_slot, minute_slot, category, status)
  VALUES (p_name, p_phone, p_hour_slot, p_minute_slot, p_category, 'active')
  RETURNING id INTO v_reservation_id;

  -- 슬롯 카운터 증가
  UPDATE time_slots
  SET current_count = current_count + 1
  WHERE id = v_slot_id;

  RETURN json_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'message', '예약이 완료되었습니다'
  );
END;
$$ LANGUAGE plpgsql;

-- 예약 취소 RPC 함수 (원자적 연산)
CREATE OR REPLACE FUNCTION cancel_reservation(
  p_name TEXT,
  p_phone TEXT
)
RETURNS JSON AS $$
DECLARE
  v_reservation RECORD;
BEGIN
  -- 활성 예약 조회
  SELECT id, hour_slot, minute_slot, status
  INTO v_reservation
  FROM reservations
  WHERE name = p_name AND phone = p_phone AND status = 'active'
  FOR UPDATE;

  IF v_reservation IS NULL THEN
    -- 취소된 예약이 있는지 확인
    IF EXISTS (
      SELECT 1 FROM reservations
      WHERE name = p_name AND phone = p_phone AND status = 'cancelled'
    ) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'ALREADY_CANCELLED',
        'message', '이미 취소된 예약입니다'
      );
    END IF;

    RETURN json_build_object(
      'success', false,
      'error', 'NOT_FOUND',
      'message', '예약을 찾을 수 없습니다'
    );
  END IF;

  -- 예약 상태 변경
  UPDATE reservations
  SET status = 'cancelled'
  WHERE id = v_reservation.id;

  -- 슬롯 카운터 감소
  UPDATE time_slots
  SET current_count = GREATEST(current_count - 1, 0)
  WHERE hour_slot = v_reservation.hour_slot
    AND minute_slot = v_reservation.minute_slot;

  RETURN json_build_object(
    'success', true,
    'message', '예약이 취소되었습니다'
  );
END;
$$ LANGUAGE plpgsql;

-- 관리자용 예약 취소 RPC 함수 (ID로 취소)
CREATE OR REPLACE FUNCTION cancel_reservation_by_id(
  p_reservation_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_reservation RECORD;
BEGIN
  SELECT id, hour_slot, minute_slot, status
  INTO v_reservation
  FROM reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF v_reservation IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'NOT_FOUND',
      'message', '예약을 찾을 수 없습니다'
    );
  END IF;

  IF v_reservation.status = 'cancelled' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'ALREADY_CANCELLED',
      'message', '이미 취소된 예약입니다'
    );
  END IF;

  UPDATE reservations
  SET status = 'cancelled'
  WHERE id = v_reservation.id;

  UPDATE time_slots
  SET current_count = GREATEST(current_count - 1, 0)
  WHERE hour_slot = v_reservation.hour_slot
    AND minute_slot = v_reservation.minute_slot;

  RETURN json_build_object(
    'success', true,
    'message', '예약이 취소되었습니다'
  );
END;
$$ LANGUAGE plpgsql;
