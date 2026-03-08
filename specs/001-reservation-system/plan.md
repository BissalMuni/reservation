# Implementation Plan: 세금상담회 예약시스템

**Branch**: `001-reservation-system` | **Date**: 2026-03-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-reservation-system/spec.md`

## Summary

강남구 세금상담회(2026.3.12) 예약을 위한 모바일 우선 웹 시스템.
QR코드 접속 → 개인정보 동의 → 시간대/타임/분야 선택 → 예약 완료 → SMS 확인의
핵심 흐름과, 예약 취소, 관리자 현황 조회, 개인정보 폐기 기능을 포함한다.
Supabase PostgreSQL에서 동시성 제어를 통해 36건(타임당 6건 × 3타임 × 2시간)의
예약 무결성을 보장한다.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: Next.js 14+ (App Router), Tailwind CSS,
@supabase/supabase-js, Aligo SMS REST API
**Storage**: Supabase (PostgreSQL) — 기존 프로젝트의 DB에 테이블 추가
**Testing**: Vitest
**Target Platform**: 모바일 웹 (모든 모바일 브라우저)
**Project Type**: Web application (모놀리스, Next.js 프론트+백엔드 통합)
**Performance Goals**: QR 스캔 → 예약 완료 2분 이내, 동시 50명 처리
**Constraints**: Vercel 무료 tier (서버리스), 이벤트 종료 후 폐기 전제
**Scale/Scope**: 최대 36건 예약, 최대 동시 접속 50명, 5개 화면

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Privacy-First Data Handling | PASS | 이름+전화번호만 수집, 동의 필수, 7일 내 폐기 메커니즘 설계 포함 |
| II. Reservation Integrity | PASS | 타임당 6건, 시간대당 18건, 총 36건 상한 + PostgreSQL RPC 동시성 제어 |
| III. Mobile-First Accessibility | PASS | Tailwind CSS 모바일 우선, QR → 즉시 예약 페이지, 회원가입 불필요 |
| IV. Reliable User Communication | PASS | Aligo SMS 예약확인/5분전 알림/취소확인 + 재시도 로직 |
| V. Simplicity & Event-Scoped Design | PASS | 단일 Next.js 모놀리스, YAGNI 준수, 이벤트 후 DROP TABLE 폐기 |

All gates PASS. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-reservation-system/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx                # 루트 레이아웃 (모바일 메타)
│   ├── page.tsx                  # 예약 메인 페이지
│   ├── cancel/
│   │   └── page.tsx              # 예약 취소 페이지
│   ├── complete/
│   │   └── page.tsx              # 예약 완료 페이지
│   ├── admin/
│   │   └── page.tsx              # 관리자 현황 페이지
│   └── api/
│       ├── reservation/
│       │   └── route.ts          # 예약 생성/조회/취소 API
│       ├── sms/
│       │   └── route.ts          # SMS 발송 API
│       ├── admin/
│       │   └── route.ts          # 관리자 API (로그인, 목록, 취소, 폐기)
│       └── cron/
│           └── route.ts          # Vercel Cron (5분 전 알림 + 7일 자동 삭제)
├── lib/
│   ├── supabase.ts               # Supabase 클라이언트
│   ├── aligo.ts                  # Aligo SMS 클라이언트
│   └── constants.ts              # 슬롯 구성, 이벤트 정보 상수
├── components/
│   ├── ConsentForm.tsx           # 개인정보 동의 폼
│   ├── SlotSelector.tsx          # 시간대/타임/분야 선택
│   ├── ReservationForm.tsx       # 이름+전화번호 입력
│   └── AdminDashboard.tsx        # 관리자 예약 목록
└── types/
    └── index.ts                  # 공유 타입 정의

tests/
├── unit/
│   ├── reservation.test.ts       # 예약 로직 단위 테스트
│   └── validation.test.ts        # 입력 검증 테스트
└── integration/
    └── booking-flow.test.ts      # 예약 흐름 통합 테스트
```

**Structure Decision**: Next.js App Router 모놀리스 구조. `src/app/`에 페이지와
API 라우트를 통합하고, `src/lib/`에 외부 서비스 클라이언트,
`src/components/`에 재사용 UI 컴포넌트를 배치한다.

## Complexity Tracking

> No Constitution Check violations. No complexity justification needed.
