# Quickstart: 세금상담회 예약시스템

**Date**: 2026-03-06
**Feature**: 001-reservation-system

## Prerequisites

- Node.js 18+
- pnpm
- Supabase 프로젝트 (기존 프로젝트 사용)
- Aligo SMS 계정 (발신번호 사전 등록 필요)
- Vercel 계정

## 1. 프로젝트 생성

```bash
pnpm create next-app@latest reservation --typescript --tailwind --app --src-dir
cd reservation
```

## 2. 의존성 설치

```bash
pnpm add @supabase/supabase-js
```

## 3. 환경변수 설정

`.env.local` 파일 생성:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Aligo SMS
ALIGO_API_KEY=your-api-key
ALIGO_USER_ID=your-user-id
ALIGO_SENDER=01012345678

# Admin
ADMIN_PASSWORD=your-admin-password

# Cron
CRON_SECRET=your-cron-secret
```

## 4. DB 테이블 생성

Supabase SQL Editor에서 실행:

```sql
-- 시간대 슬롯 테이블
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hour_slot INTEGER NOT NULL CHECK (hour_slot IN (16, 17)),
  minute_slot INTEGER NOT NULL CHECK (minute_slot IN (0, 20, 40)),
  current_count INTEGER NOT NULL DEFAULT 0,
  max_count INTEGER NOT NULL DEFAULT 6,
  UNIQUE (hour_slot, minute_slot)
);

-- 초기 데이터
INSERT INTO time_slots (hour_slot, minute_slot) VALUES
  (16, 0), (16, 20), (16, 40),
  (17, 0), (17, 20), (17, 40);

-- 예약 테이블
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  hour_slot INTEGER NOT NULL,
  minute_slot INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('국세', '지방세', '기타')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_active_reservation
  ON reservations (name, phone) WHERE status = 'active';

CREATE INDEX idx_reservations_slot
  ON reservations (hour_slot, minute_slot, status);

CREATE INDEX idx_reservations_created
  ON reservations (created_at);

-- SMS 발송 기록 테이블
CREATE TABLE sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id),
  phone TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('confirmation', 'reminder', 'cancellation')),
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  aligo_msg_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_logs_reservation ON sms_logs (reservation_id);
```

## 5. RPC 함수 생성

Supabase SQL Editor에서 `create_reservation` 및 `cancel_reservation` 함수 생성.
(상세 SQL은 research.md 참조)

## 6. Vercel 배포

```bash
pnpm add -g vercel
vercel link
vercel env add  # 환경변수 등록
vercel deploy
```

## 7. Vercel Cron 설정

`vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## 8. QR코드 생성

배포 완료 후 Vercel URL로 QR코드를 생성하여 홍보물에 배치.
(무료 QR 생성기 사용: 예 qr-code-generator.com)

## Validation Checklist

- [ ] 예약 생성 → 확인 문자 수신 확인
- [ ] 만석 시 예약 차단 확인
- [ ] 동시 접속 테스트 (2개 브라우저)
- [ ] 예약 취소 → 슬롯 재개방 확인
- [ ] 관리자 로그인 → 목록 조회 확인
- [ ] 모바일 브라우저 UI 확인
- [ ] Aligo 테스트 모드로 SMS 검증
