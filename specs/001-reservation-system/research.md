# Research: 세금상담회 예약시스템

**Date**: 2026-03-06
**Feature**: 001-reservation-system

## 1. Supabase PostgreSQL 동시성 제어

### Decision: PostgreSQL RPC 함수 + 행 수준 잠금

### Rationale

Vercel 서버리스 환경에서는 애플리케이션 레벨 락이 불가능하다 (인스턴스 간
상태 공유 불가). PostgreSQL의 트랜잭션 격리와 행 수준 잠금을 통해
데이터베이스 레벨에서 동시성을 제어해야 한다.

### Approach: Supabase RPC + SELECT FOR UPDATE

```sql
-- 예약 생성 RPC 함수 (원자적 연산)
CREATE OR REPLACE FUNCTION create_reservation(
  p_name TEXT,
  p_phone TEXT,
  p_time_slot TEXT,    -- '16:00' or '17:00'
  p_sub_time TEXT,     -- '00' or '20' or '40'
  p_category TEXT      -- '국세', '지방세', '기타'
)
RETURNS JSON AS $$
DECLARE
  v_current_count INT;
  v_max_per_subtime INT := 6;
  v_reservation_id UUID;
BEGIN
  -- 해당 서브타임의 현재 예약 건수를 잠금과 함께 조회
  SELECT COUNT(*) INTO v_current_count
  FROM reservations
  WHERE time_slot = p_time_slot
    AND sub_time = p_sub_time
    AND status = 'active'
  FOR UPDATE;  -- 행 수준 잠금

  -- 만석 체크
  IF v_current_count >= v_max_per_subtime THEN
    RETURN json_build_object(
      'success', false,
      'error', 'SLOT_FULL'
    );
  END IF;

  -- 중복 예약 체크
  IF EXISTS (
    SELECT 1 FROM reservations
    WHERE name = p_name AND phone = p_phone AND status = 'active'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'DUPLICATE'
    );
  END IF;

  -- 예약 삽입
  INSERT INTO reservations (name, phone, time_slot, sub_time, category, status)
  VALUES (p_name, p_phone, p_time_slot, p_sub_time, p_category, 'active')
  RETURNING id INTO v_reservation_id;

  RETURN json_build_object(
    'success', true,
    'reservation_id', v_reservation_id
  );
END;
$$ LANGUAGE plpgsql;
```

Supabase JS 클라이언트에서 호출:

```typescript
const { data, error } = await supabase.rpc('create_reservation', {
  p_name: '홍길동',
  p_phone: '01012345678',
  p_time_slot: '16:00',
  p_sub_time: '00',
  p_category: '국세'
});
```

### Alternatives considered

- **Optimistic locking (version column)**: 구현 복잡, 재시도 로직 필요. 36건
  소규모에서는 과잉.
- **Advisory locks**: 범용적이지만 PostgreSQL RPC 내 SELECT FOR UPDATE가 더
  직관적이고 간단.
- **Application-level mutex**: Vercel 서버리스에서 인스턴스 간 공유 불가.

## 2. Aligo SMS REST API

### Decision: Aligo REST API 직접 호출 (라이브러리 미사용)

### Rationale

API가 단순한 form-POST 기반이므로 내장 `fetch`로 충분하다.
커뮤니티 npm 패키지(`aligoapi`, `aligo-smartsms`)는 유지보수 불확실하므로
직접 구현이 안정적이다.

### API 요약

| 항목 | 값 |
| ---- | --- |
| Base URL | `https://apis.aligo.in` |
| 인증 | `key` (API키) + `user_id` (아이디) + `sender` (발신번호) |
| Content-Type | `application/x-www-form-urlencoded` |
| SMS 발송 | `POST /send/` |
| 잔여 조회 | `POST /remain/` |
| 발송 이력 | `POST /sent_list/` |
| 테스트 모드 | `testmode_yn=Y` (실제 발송 안 됨, 과금 안 됨) |

### 주요 파라미터 (POST /send/)

- `key`, `user_id`, `sender`: 인증 (필수)
- `receiver`: 수신자 전화번호 (필수)
- `msg`: 메시지 내용 (필수, 90바이트 이하 SMS, 초과 시 LMS)
- `testmode_yn`: 테스트 모드 (`Y`/`N`)

### 응답 형식

```json
{
  "result_code": 1,
  "message": "success",
  "msg_id": "123456789",
  "success_cnt": 1,
  "error_cnt": 0
}
```

- `result_code` 1 = 성공, 음수 = 실패 (-101: 인증오류, -102: 잔액부족,
  -103: 미등록 발신번호)

### 비용

- SMS: ~8.4원/건, LMS: ~25~30원/건
- 36건 × 3종(확인+알림+취소) = 최대 ~108건 = ~908원

### 제약

- 발신번호는 Aligo 관리자에서 사전 등록 필수 (통신사 규정)
- 환경변수: `ALIGO_API_KEY`, `ALIGO_USER_ID`, `ALIGO_SENDER`

## 3. Vercel Cron Jobs

### Decision: Vercel Cron으로 5분 전 알림 발송

### Rationale

별도 스케줄러 서비스 없이 Vercel 무료 tier에서 cron job 사용 가능.
`vercel.json`에 cron 스케줄 정의.

### 구현

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

- 5분마다 실행하여 "현재 시각 + 5분" 이내의 예약을 조회하고 알림 발송
- 이벤트 당일(3/12)에만 실제 동작하므로 비용 영향 없음
- 같은 cron에서 7일 경과 개인정보 자동 삭제도 처리 가능

### Alternatives considered

- **setTimeout/setInterval**: 서버리스에서 불가
- **외부 스케줄러 (cron-job.org 등)**: 외부 의존성 추가, YAGNI 위반
- **Supabase Edge Functions**: 가능하나 Vercel에 이미 cron 기능 있으므로
  불필요한 복잡도

## 4. Next.js App Router 구조

### Decision: 단일 모놀리스, Server Components 중심

### Rationale

Constitution Principle V (단순성)에 따라 최소 구조. Server Components로
데이터 페칭을 서버에서 처리하고, 클라이언트 상태를 최소화한다.

### 페이지 구성

| 경로 | 용도 | 렌더링 |
| ---- | ---- | ------ |
| `/` | 예약 메인 (동의 → 선택 → 입력 → 완료) | Client Component (폼 상호작용) |
| `/cancel` | 예약 취소 | Client Component |
| `/complete` | 예약 완료 확인 | Server Component |
| `/admin` | 관리자 현황 | Client Component |

### API 라우트

| 경로 | 메서드 | 용도 |
| ---- | ------ | ---- |
| `/api/reservation` | POST | 예약 생성 (RPC 호출) |
| `/api/reservation` | GET | 예약 조회 (이름+전화번호) |
| `/api/reservation` | DELETE | 예약 취소 |
| `/api/reservation/slots` | GET | 슬롯 현황 조회 |
| `/api/admin` | POST | 관리자 로그인 |
| `/api/admin/reservations` | GET | 관리자 예약 목록 |
| `/api/admin/reservations` | DELETE | 관리자 수동 취소 |
| `/api/admin/purge` | POST | 개인정보 폐기 |
| `/api/cron` | GET | Vercel Cron (알림 발송 + 자동 삭제) |

## 5. 개인정보 폐기 전략

### Decision: DROP TABLE + Vercel Cron 7일 자동 삭제

### Rationale

Constitution에 명시된 두 가지 폐기 메커니즘:
1. **수동 폐기**: 관리자가 버튼 클릭 → 예약 테이블 전체 삭제 (DROP TABLE
   또는 TRUNCATE)
2. **자동 삭제**: Vercel Cron이 매일 체크 → `created_at` 기준 7일 경과
   데이터 DELETE

이벤트 종료 후 전체 Vercel 프로젝트 삭제 + Supabase 테이블 DROP으로
완전 폐기.
