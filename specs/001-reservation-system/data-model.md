# Data Model: 세금상담회 예약시스템

**Date**: 2026-03-06
**Feature**: 001-reservation-system

## Entity Relationship

```text
time_slots (6 rows, 고정)
  1 ←── N  reservations
                1 ←── N  sms_logs
```

## Tables

### time_slots (시간대 슬롯)

상담 가능 시간 단위. 6개 고정 행 (2시간대 × 3타임).

| Column | Type | Constraints | Description |
| ------ | ---- | ----------- | ----------- |
| id | UUID | PK, DEFAULT gen_random_uuid() | 고유 식별자 |
| hour_slot | INTEGER | NOT NULL, CHECK (IN 16,17) | 시간대 (16=오후4시, 17=오후5시) |
| minute_slot | INTEGER | NOT NULL, CHECK (IN 0,20,40) | 세부 타임 (분) |
| current_count | INTEGER | NOT NULL, DEFAULT 0 | 현재 예약 건수 |
| max_count | INTEGER | NOT NULL, DEFAULT 6 | 최대 수용 건수 |

**Constraints**:
- `UNIQUE (hour_slot, minute_slot)`

**Initial data** (6 rows):

| hour_slot | minute_slot | max_count |
| --------- | ----------- | --------- |
| 16 | 0 | 6 |
| 16 | 20 | 6 |
| 16 | 40 | 6 |
| 17 | 0 | 6 |
| 17 | 20 | 6 |
| 17 | 40 | 6 |

### reservations (예약)

시민의 세금상담 예약 기록.

| Column | Type | Constraints | Description |
| ------ | ---- | ----------- | ----------- |
| id | UUID | PK, DEFAULT gen_random_uuid() | 고유 식별자 |
| name | TEXT | NOT NULL | 예약자 이름 |
| phone | TEXT | NOT NULL | 전화번호 (하이픈 제거, 01012345678) |
| hour_slot | INTEGER | NOT NULL | 시간대 (16 or 17) |
| minute_slot | INTEGER | NOT NULL | 세부 타임 (0, 20, 40) |
| category | TEXT | NOT NULL, CHECK (IN '국세','지방세','기타') | 상담 분야 |
| status | TEXT | NOT NULL, DEFAULT 'active', CHECK (IN 'active','cancelled') | 예약 상태 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 생성 시각 |

**Constraints**:
- Partial unique index: `UNIQUE (name, phone) WHERE status = 'active'`
  — 활성 예약에 대해서만 중복 방지. 취소 후 재예약 허용.

**State transitions**:

```text
active ──(취소)──→ cancelled
```

- 취소된 예약은 다시 활성화할 수 없음 (새로 예약해야 함)

### sms_logs (SMS 발송 기록)

문자 발송 이력 추적.

| Column | Type | Constraints | Description |
| ------ | ---- | ----------- | ----------- |
| id | UUID | PK, DEFAULT gen_random_uuid() | 고유 식별자 |
| reservation_id | UUID | FK → reservations.id, NULL 허용 | 연관 예약 |
| phone | TEXT | NOT NULL | 수신자 전화번호 |
| message_type | TEXT | NOT NULL, CHECK (IN 'confirmation','reminder','cancellation') | 발송 유형 |
| status | TEXT | NOT NULL, DEFAULT 'pending' | 발송 상태 |
| retry_count | INTEGER | NOT NULL, DEFAULT 0 | 재시도 횟수 |
| aligo_msg_id | TEXT | NULL | Aligo 응답 msg_id |
| error_message | TEXT | NULL | 실패 시 오류 메시지 |
| sent_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 발송 시각 |

**Status values**: `pending` → `sent` / `failed`

## PostgreSQL RPC Functions

### create_reservation

원자적 예약 생성. `time_slots` 행을 `FOR UPDATE`로 잠그고,
슬롯 가용성 확인 + 중복 체크 + 삽입 + 카운터 증가를 단일 트랜잭션으로 수행.

- **Input**: name, phone, hour_slot, minute_slot, category
- **Output**: `{ success, reservation_id?, error?, message }`
- **Errors**: `SLOT_FULL`, `DUPLICATE_RESERVATION`, `INVALID_SLOT`

### cancel_reservation

원자적 예약 취소. 예약 상태를 `cancelled`로 변경하고 슬롯 카운터 감소.

- **Input**: name, phone
- **Output**: `{ success, error?, message }`
- **Errors**: `NOT_FOUND`, `ALREADY_CANCELLED`

## Indexes

- `time_slots`: `UNIQUE (hour_slot, minute_slot)` — 슬롯 조회 및 잠금
- `reservations`: `UNIQUE (name, phone) WHERE status = 'active'` — 중복 방지
- `reservations`: `INDEX (hour_slot, minute_slot, status)` — 슬롯별 예약 조회
- `reservations`: `INDEX (created_at)` — 7일 경과 데이터 자동 삭제용
- `sms_logs`: `INDEX (reservation_id)` — 예약별 SMS 이력 조회
- `sms_logs`: `INDEX (status, retry_count)` — 재시도 대상 조회

## Data Volume

- `time_slots`: 6 rows (고정)
- `reservations`: 최대 36 rows (활성) + 취소분
- `sms_logs`: 최대 ~108 rows (36예약 × 3종류)

## Privacy & Lifecycle

- 개인정보 (name, phone)는 `reservations` 테이블에만 존재
- 7일 자동 삭제: `DELETE FROM reservations WHERE created_at < now() - interval '7 days'`
- 수동 폐기: `DROP TABLE reservations; DROP TABLE sms_logs;` (time_slots는 개인정보 없음)
- `sms_logs.phone`도 개인정보이므로 함께 삭제 대상
