# API Contracts: 세금상담회 예약시스템

**Date**: 2026-03-06
**Base path**: `/api`

## Public Endpoints (시민용)

### GET /api/reservation/slots

슬롯 현황 조회. 각 시간대/타임의 잔여 건수를 반환.

**Response 200**:
```json
{
  "slots": [
    { "hourSlot": 16, "minuteSlot": 0, "currentCount": 3, "maxCount": 6, "available": 3 },
    { "hourSlot": 16, "minuteSlot": 20, "currentCount": 6, "maxCount": 6, "available": 0 },
    { "hourSlot": 16, "minuteSlot": 40, "currentCount": 1, "maxCount": 6, "available": 5 },
    { "hourSlot": 17, "minuteSlot": 0, "currentCount": 0, "maxCount": 6, "available": 6 },
    { "hourSlot": 17, "minuteSlot": 20, "currentCount": 4, "maxCount": 6, "available": 2 },
    { "hourSlot": 17, "minuteSlot": 40, "currentCount": 6, "maxCount": 6, "available": 0 }
  ],
  "totalReserved": 20,
  "totalCapacity": 36
}
```

### POST /api/reservation

예약 생성. Supabase RPC `create_reservation`을 호출.

**Request body**:
```json
{
  "name": "홍길동",
  "phone": "010-1234-5678",
  "hourSlot": 16,
  "minuteSlot": 0,
  "category": "국세"
}
```

**Validation rules**:
- `name`: 필수, 1~50자
- `phone`: 필수, 010-XXXX-XXXX 형식
- `hourSlot`: 필수, 16 또는 17
- `minuteSlot`: 필수, 0, 20, 또는 40
- `category`: 필수, "국세", "지방세", "기타" 중 하나

**Response 201** (성공):
```json
{
  "success": true,
  "reservationId": "uuid-here",
  "message": "예약이 완료되었습니다"
}
```

**Response 409** (실패):
```json
{
  "success": false,
  "error": "SLOT_FULL",
  "message": "해당 시간대는 만석입니다"
}
```

**Error codes**: `SLOT_FULL`, `DUPLICATE_RESERVATION`, `INVALID_SLOT`,
`VALIDATION_ERROR`

### GET /api/reservation?name=홍길동&phone=01012345678

이름+전화번호로 예약 조회.

**Response 200** (찾음):
```json
{
  "found": true,
  "reservation": {
    "id": "uuid-here",
    "name": "홍길동",
    "phone": "01012345678",
    "hourSlot": 16,
    "minuteSlot": 0,
    "category": "국세",
    "status": "active",
    "createdAt": "2026-03-10T10:30:00Z"
  }
}
```

**Response 200** (없음):
```json
{
  "found": false,
  "message": "예약을 찾을 수 없습니다"
}
```

### DELETE /api/reservation

예약 취소. Supabase RPC `cancel_reservation`을 호출.

**Request body**:
```json
{
  "name": "홍길동",
  "phone": "010-1234-5678"
}
```

**Response 200** (성공):
```json
{
  "success": true,
  "message": "예약이 취소되었습니다"
}
```

**Response 404/409** (실패):
```json
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "예약을 찾을 수 없습니다"
}
```

**Error codes**: `NOT_FOUND`, `ALREADY_CANCELLED`

## Admin Endpoints (관리자용)

모든 관리자 엔드포인트는 `Authorization: Bearer <admin_token>` 헤더 필요.
토큰은 POST /api/admin/login 으로 발급.

### POST /api/admin/login

관리자 비밀번호 인증.

**Request body**:
```json
{
  "password": "admin-password"
}
```

**Response 200** (성공):
```json
{
  "success": true,
  "token": "jwt-or-simple-token"
}
```

**Response 401** (실패):
```json
{
  "success": false,
  "error": "INVALID_PASSWORD"
}
```

### GET /api/admin/reservations

전체 예약 목록 조회 (시간대별 정렬).

**Response 200**:
```json
{
  "reservations": [
    {
      "id": "uuid",
      "name": "홍길동",
      "phone": "01012345678",
      "hourSlot": 16,
      "minuteSlot": 0,
      "category": "국세",
      "status": "active",
      "createdAt": "2026-03-10T10:30:00Z"
    }
  ],
  "summary": {
    "total": 20,
    "active": 18,
    "cancelled": 2,
    "capacity": 36
  }
}
```

### DELETE /api/admin/reservations/:id

관리자 수동 취소. 슬롯 카운터도 함께 감소.

**Response 200**:
```json
{
  "success": true,
  "message": "예약이 취소되었습니다"
}
```

### POST /api/admin/purge

개인정보 폐기. 모든 예약 데이터 + SMS 로그 삭제.

**Response 200**:
```json
{
  "success": true,
  "deletedReservations": 36,
  "deletedSmsLogs": 108,
  "message": "개인정보가 폐기되었습니다"
}
```

## Cron Endpoint

### GET /api/cron

Vercel Cron에서 5분마다 호출. 두 가지 작업 수행:

1. **5분 전 알림**: 상담 시간 5분 전인 활성 예약에 알림 SMS 발송
2. **7일 자동 삭제**: `created_at`이 7일 경과한 데이터 삭제

**Headers**: `Authorization: Bearer <CRON_SECRET>` (Vercel 자동 설정)

**Response 200**:
```json
{
  "reminders": { "sent": 3, "failed": 0 },
  "cleanup": { "deleted": 0 }
}
```
