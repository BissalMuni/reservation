# Tasks: 세금상담회 예약시스템

**Input**: Design documents from `/specs/001-reservation-system/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Project initialization and basic structure

- [x] T001 Create Next.js project with TypeScript, Tailwind CSS, App Router, src directory per plan.md structure
- [x] T002 Install @supabase/supabase-js dependency via pnpm
- [x] T003 [P] Create environment variables template in .env.local.example with SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER, ADMIN_PASSWORD, CRON_SECRET
- [x] T004 [P] Define shared TypeScript types (Reservation, TimeSlot, SmsLog, ApiResponse) in src/types/index.ts per data-model.md
- [x] T005 [P] Define constants (SLOT_CONFIG, EVENT_DATE, EVENT_LOCATION, CONSULTATION_TYPES, MAX_PER_SUBTIME, SMS_TEMPLATES) in src/lib/constants.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create SQL migration file with time_slots, reservations, sms_logs tables, indexes, and initial slot data (6 rows) per data-model.md in supabase/migrations/001_init.sql
- [x] T007 Create PostgreSQL RPC functions (create_reservation, cancel_reservation) with FOR UPDATE locking per research.md in supabase/migrations/002_rpc_functions.sql
- [x] T008 [P] Implement Supabase client (browser + server admin) in src/lib/supabase.ts
- [x] T009 [P] Implement Aligo SMS client with sendSms() and retry logic (max 3 attempts) in src/lib/aligo.ts
- [x] T010 Create root layout with mobile-first viewport meta, Korean font, Tailwind globals in src/app/layout.tsx
- [x] T011 [P] Configure Vercel cron schedule (*/5 * * * *) in vercel.json

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 세금상담 예약 생성 (Priority: P1) MVP

**Goal**: 시민이 QR코드로 접속하여 개인정보 동의 → 시간대/타임/분야 선택 → 이름/전화번호 입력 → 예약 완료

**Independent Test**: URL 접속 → 동의 → 슬롯 선택 → 정보 입력 → 예약 완료 화면 표시 확인

### Implementation for User Story 1

- [x] T012 [P] [US1] Implement GET /api/reservation/slots route returning slot availability from time_slots table in src/app/api/reservation/slots/route.ts
- [x] T013 [US1] Implement POST /api/reservation route calling create_reservation RPC, with input validation (name 1-50자, phone 010 format, hourSlot 16/17, minuteSlot 0/20/40, category enum) in src/app/api/reservation/route.ts
- [x] T014 [P] [US1] Create ConsentForm component with privacy consent checkbox and "개인정보는 수집일로부터 1주일 이내 폐기됩니다" notice in src/components/ConsentForm.tsx
- [x] T015 [P] [US1] Create SlotSelector component showing 6 time slots with availability count, disabling full slots (current_count >= max_count) in src/components/SlotSelector.tsx
- [x] T016 [P] [US1] Create ReservationForm component with name input, phone input (010-XXXX-XXXX validation), and category selector (국세/지방세/기타) in src/components/ReservationForm.tsx
- [x] T017 [US1] Implement main reservation page with multi-step flow (ConsentForm → SlotSelector → ReservationForm → submit) in src/app/page.tsx
- [x] T018 [US1] Implement reservation complete page showing confirmed time/category details in src/app/complete/page.tsx

**Checkpoint**: User Story 1 fully functional — citizens can make reservations via QR/URL

---

## Phase 4: User Story 2 - SMS 예약 확인 및 알림 (Priority: P2)

**Goal**: 예약 완료 시 확인 문자 즉시 발송 + 상담 5분 전 알림 문자 자동 발송

**Independent Test**: 예약 생성 후 확인 SMS 수신 확인, cron 실행 시 알림 SMS 발송 확인

### Implementation for User Story 2

- [x] T019 [US2] Create SMS message templates (confirmation, reminder, cancellation) with reservation details (name, time, category, location) in src/lib/sms-templates.ts
- [x] T020 [US2] Integrate confirmation SMS dispatch into POST /api/reservation success flow (async, fire-and-forget with logging) in src/app/api/reservation/route.ts
- [x] T021 [US2] Implement GET /api/cron route: query active reservations with upcoming time (within 5 minutes), send reminder SMS to each, log results in src/app/api/cron/route.ts
- [x] T022 [US2] Add SMS log recording (insert into sms_logs with status/retry_count/aligo_msg_id) to src/lib/aligo.ts

**Checkpoint**: SMS confirmation + 5-min reminder operational

---

## Phase 5: User Story 3 - 예약 취소 (Priority: P3)

**Goal**: 시민이 이름+전화번호로 예약 조회 후 취소, 슬롯 재개방, 취소 SMS 발송

**Independent Test**: 이름+전화번호로 예약 조회 → 취소 → 슬롯 현황에서 잔여 수 증가 확인

### Implementation for User Story 3

- [x] T023 [US3] Implement GET /api/reservation route (query by name+phone params) returning reservation details or not-found in src/app/api/reservation/route.ts
- [x] T024 [US3] Implement DELETE /api/reservation route calling cancel_reservation RPC, with cancellation SMS dispatch in src/app/api/reservation/route.ts
- [x] T025 [US3] Create cancel page with name+phone lookup form, reservation details display, cancel confirmation button in src/app/cancel/page.tsx

**Checkpoint**: Citizens can look up and cancel their reservations

---

## Phase 6: User Story 4 - 관리자 예약 현황 관리 (Priority: P4)

**Goal**: 관리자가 비밀번호 로그인 후 전체 예약 현황 조회 + 수동 취소

**Independent Test**: 비밀번호 로그인 → 예약 목록 조회 → 시간대별 건수 확인 → 수동 취소

### Implementation for User Story 4

- [x] T026 [P] [US4] Implement POST /api/admin/login route comparing password against ADMIN_PASSWORD env var, returning simple token in src/app/api/admin/route.ts
- [x] T027 [P] [US4] Implement admin auth middleware checking Authorization Bearer token in src/lib/admin-auth.ts
- [x] T028 [US4] Implement GET /api/admin/reservations route returning all reservations with summary (total/active/cancelled/capacity) in src/app/api/admin/reservations/route.ts
- [x] T029 [US4] Implement DELETE /api/admin/reservations/[id] route for manual cancellation with slot counter update in src/app/api/admin/reservations/[id]/route.ts
- [x] T030 [US4] Create AdminDashboard component with slot summary, reservation table with cancel buttons in src/components/AdminDashboard.tsx
- [x] T031 [US4] Implement admin page with login form and AdminDashboard in src/app/admin/page.tsx

**Checkpoint**: Admin can view all reservations and manually cancel

---

## Phase 7: User Story 5 - 개인정보 폐기 (Priority: P5)

**Goal**: 관리자 수동 폐기 + 7일 경과 자동 삭제

**Independent Test**: 관리자 화면에서 폐기 버튼 → 데이터 삭제 확인; 7일 경과 데이터 cron 삭제 확인

### Implementation for User Story 5

- [x] T032 [US5] Implement POST /api/admin/purge route truncating reservations + sms_logs tables, resetting time_slots counters in src/app/api/admin/purge/route.ts
- [x] T033 [US5] Add 7-day auto-deletion logic to GET /api/cron: DELETE reservations and sms_logs WHERE created_at < now() - 7 days in src/app/api/cron/route.ts
- [x] T034 [US5] Add purge button with confirmation dialog to admin page in src/app/admin/page.tsx

**Checkpoint**: Privacy disposal mechanism complete (manual + automatic)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, event lifecycle, and final quality checks

- [x] T035 Add event expiry check: if current date > 2026-03-12, show "이벤트 종료" message and disable reservation form in src/app/page.tsx
- [x] T036 Add full-capacity state: when totalReserved >= 36, show "전체 만석" message in src/app/page.tsx
- [x] T037 Add duplicate reservation handling: show existing reservation info when name+phone already has active booking in src/app/page.tsx
- [x] T038 Mobile UI polish: test all pages on mobile viewport, ensure touch targets >= 44px, loading states, error messages in all components
- [x] T039 Add link from reservation complete page to cancel page for easy access in src/app/complete/page.tsx

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 (Phase 3): Can start immediately after Foundational
  - US2 (Phase 4): Depends on US1 (needs reservation creation flow)
  - US3 (Phase 5): Depends on US1 (needs existing reservations to cancel)
  - US4 (Phase 6): Depends on US1 (needs reservations to view)
  - US5 (Phase 7): Depends on US4 (extends admin page)
- **Polish (Phase 8)**: Depends on US1 completion

### Within Each User Story

- Models/schemas before services
- API routes before UI components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

Phase 1: T003, T004, T005 can run in parallel
Phase 2: T008, T009, T011 can run in parallel
Phase 3: T012, T014, T015, T016 can run in parallel
Phase 6: T026, T027 can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test reservation flow end-to-end
5. Deploy to Vercel if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test → Deploy (MVP!)
3. Add User Story 2 → SMS working → Deploy
4. Add User Story 3 → Cancellation working → Deploy
5. Add User Story 4 → Admin panel → Deploy
6. Add User Story 5 → Privacy disposal → Deploy
7. Polish → Final deploy
