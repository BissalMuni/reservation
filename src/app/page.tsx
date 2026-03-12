'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ConsentForm from '@/components/ConsentForm';
import SlotSelector from '@/components/SlotSelector';
import ReservationForm from '@/components/ReservationForm';
import FontSizeControl from '@/components/FontSizeControl';
import { EVENT_INFO, SLOT_CONFIG, formatTimeSlot } from '@/lib/constants';
import type { SlotAvailability, ConsultCategory } from '@/types';

// 예약 단계
type Step = 'consent' | 'slot' | 'form' | 'complete';

const STEP_LABELS = ['동의', '시간 선택', '정보 입력', '완료'];
const STEP_MAP: Record<Step, number> = { consent: 0, slot: 1, form: 2, complete: 3 };

// 예약 메인 페이지
export default function ReservationPage() {
  const [step, setStep] = useState<Step>('consent');
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCapacity, setTotalCapacity] = useState(SLOT_CONFIG.totalCapacity);

  // 선택 상태
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [selectedMinute, setSelectedMinute] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ConsultCategory | null>(null);

  // 완료 정보
  const [completedInfo, setCompletedInfo] = useState<{
    name: string;
    hourSlot: number;
    minuteSlot: number;
    category: string;
    reservationId: string;
  } | null>(null);

  // 스텝 전환 시 자동 스크롤
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step !== 'consent') {
      setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [step]);

  // 이벤트 종료 체크
  const isEventExpired = new Date() > new Date(EVENT_INFO.date + 'T23:59:59+09:00');

  // 슬롯 데이터 로드
  const initialLoadDone = useRef(false);
  const fetchSlots = useCallback(async () => {
    try {
      if (!initialLoadDone.current) setLoading(true);
      const res = await fetch('/api/reservation/slots', { cache: 'no-store' });
      const data = await res.json();
      setSlots(data.slots || []);
      if (data.totalCapacity) setTotalCapacity(data.totalCapacity);

      if (data.totalReserved >= (data.totalCapacity || SLOT_CONFIG.totalCapacity)) {
        setError('현재 모든 시간대가 만석입니다.');
      } else {
        setError('');
      }
    } catch {
      if (!initialLoadDone.current) {
        setError('슬롯 정보를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
      initialLoadDone.current = true;
    }
  }, []);

  useEffect(() => {
    if (!isEventExpired) {
      fetchSlots();
      // 15초마다 슬롯 현황 갱신
      const interval = setInterval(fetchSlots, 15000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [isEventExpired, fetchSlots]);

  // 잔여 수량 계산
  const totalReserved = slots.reduce((sum, s) => sum + s.currentCount, 0);
  const totalRemaining = totalCapacity - totalReserved;

  // 이벤트 종료 시 표시
  if (isEventExpired) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mb-3 text-5xl">🏁</div>
          <h2 className="mb-2 text-dynamic-xl font-bold text-gray-800">이벤트 종료</h2>
          <p className="text-dynamic-base text-gray-600">세금상담회 예약이 마감되었습니다.</p>
          <p className="mt-2 text-dynamic-sm text-gray-400">감사합니다.</p>
        </div>
      </div>
    );
  }

  // 로딩
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <p className="text-dynamic-base text-gray-500">불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 전체 만석
  if (totalReserved >= totalCapacity && step === 'consent') {
    return (
      <div className="space-y-6">
        <Header />
        <RemainingBadge remaining={0} total={totalCapacity} />
        <div className="rounded-2xl bg-accent-50 p-6 text-center shadow-sm">
          <div className="mb-2 text-4xl">😔</div>
          <h2 className="mb-2 text-dynamic-lg font-bold text-accent-700">전체 만석</h2>
          <p className="text-dynamic-base text-accent-600">모든 시간대의 예약이 마감되었습니다.</p>
          <p className="mt-3 text-dynamic-sm text-gray-500">
            취소 건이 발생하면 다시 예약 가능합니다.
          </p>
        </div>
      </div>
    );
  }

  // 예약 제출 핸들러
  const handleSubmit = async (name: string, phone: string) => {
    const res = await fetch('/api/reservation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        phone,
        hourSlot: selectedHour,
        minuteSlot: selectedMinute,
        category: selectedCategory,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      if (data.error === 'DUPLICATE_RESERVATION') {
        throw new Error('이미 예약이 존재합니다. 예약 취소 후 다시 시도해주세요.');
      }
      throw new Error(data.message || '예약에 실패했습니다.');
    }

    setCompletedInfo({
      name,
      hourSlot: selectedHour!,
      minuteSlot: selectedMinute!,
      category: selectedCategory!,
      reservationId: data.reservationId,
    });
    setStep('complete');
  };

  const handleSelectHour = (hour: number) => {
    setSelectedHour(hour);
    setSelectedMinute(null);
    setSelectedCategory(null);
  };

  return (
    <div className="space-y-5">
      {/* 글씨 크기 조절 */}
      <FontSizeControl />

      {/* 헤더 */}
      <Header />

      {/* 잔여 수량 뱃지 */}
      {step !== 'complete' && (
        <RemainingBadge remaining={totalRemaining} total={totalCapacity} />
      )}

      {/* 스텝 인디케이터 */}
      <StepIndicator currentStep={STEP_MAP[step]} />

      {/* 에러 */}
      {error && step !== 'complete' && (
        <div className="rounded-xl bg-accent-50 border border-accent-200 p-4 text-dynamic-sm text-accent-700">
          {error}
        </div>
      )}

      {/* 단계별 렌더링 */}
      <div ref={contentRef} />
      {step === 'consent' && (
        <ConsentForm onConsent={() => setStep('slot')} />
      )}

      {step === 'slot' && (
        <SlotSelector
          slots={slots}
          selectedHour={selectedHour}
          selectedMinute={selectedMinute}
          selectedCategory={selectedCategory}
          onSelectHour={handleSelectHour}
          onSelectMinute={setSelectedMinute}
          onSelectCategory={setSelectedCategory}
          onNext={() => setStep('form')}
        />
      )}

      {step === 'form' && selectedHour !== null && selectedMinute !== null && selectedCategory && (
        <ReservationForm
          hourSlot={selectedHour}
          minuteSlot={selectedMinute}
          category={selectedCategory}
          onSubmit={handleSubmit}
          onBack={() => setStep('slot')}
        />
      )}

      {step === 'complete' && completedInfo && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-primary-50 p-6 text-center shadow-sm">
            <div className="mb-3 text-5xl">🎉</div>
            <h2 className="mb-1 text-dynamic-xl font-bold text-primary-800">예약 완료!</h2>
            <p className="text-dynamic-sm text-primary-600">확인 문자가 발송됩니다.</p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-dynamic-lg font-bold text-gray-900">예약 정보</h3>
            <div className="space-y-2">
              <InfoRow icon="👤" label="이름" value={completedInfo.name} />
              <InfoRow icon="🕓" label="시간" value={formatTimeSlot(completedInfo.hourSlot, completedInfo.minuteSlot)} />
              <InfoRow icon="📋" label="분야" value={completedInfo.category} />
              <InfoRow icon="📍" label="장소" value={EVENT_INFO.location} />
              <InfoRow icon="📅" label="날짜" value={EVENT_INFO.dateDisplay} />
            </div>
          </div>

          <a
            href="/cancel"
            className="block w-full rounded-xl border-2 border-gray-200 bg-white py-4 text-center
              text-dynamic-sm text-gray-600 transition-colors hover:bg-gray-50 hover:border-gray-300
              min-h-[52px] flex items-center justify-center shadow-sm"
          >
            예약을 취소하려면 여기를 눌러주세요
          </a>
        </div>
      )}
    </div>
  );
}

// 헤더 컴포넌트
function Header() {
  return (
    <div className="overflow-hidden rounded-2xl shadow-lg">
      {/* 로고 영역 */}
      <div className="bg-white px-5 py-3">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <img src="/images/logo_gangnam.png" alt="강남구" className="h-10 w-auto" />
            <span className="text-dynamic-sm font-bold text-gray-700">강남구</span>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <img src="/images/logo_semusa.gif" alt="한국세무사회" className="h-9 w-auto" />
            <span className="text-dynamic-sm font-bold text-gray-700">한국세무사회</span>
          </div>
        </div>
      </div>
      {/* 타이틀 영역 */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 px-5 py-4 text-white">
        <div className="text-center">
          <h1 className="text-dynamic-xl font-bold mb-2">세금상담회 예약</h1>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-dynamic-sm text-primary-100">
            <span>📍 {EVENT_INFO.location}</span>
            <span>📅 3월 12일(목)</span>
            <span>🕓 4PM~6PM</span>
          </div>
        </div>
      </div>
      {/* 슬로건 */}
      <div className="bg-white px-5 py-2">
        <img src="/images/GN_Slogan_Basic.png" alt="꿈이 모이는 도시 미래를 그리는 강남" className="mx-auto h-8 w-auto" />
      </div>
    </div>
  );
}

// 잔여 수량 뱃지
function RemainingBadge({ remaining, total }: { remaining: number; total: number }) {
  const ratio = remaining / total;
  const bgColor = ratio > 0.5 ? 'bg-primary-50 border-primary-200' :
    ratio > 0.2 ? 'bg-accent-50 border-accent-200' : 'bg-red-50 border-red-200';
  const textColor = ratio > 0.5 ? 'text-primary-700' :
    ratio > 0.2 ? 'text-accent-700' : 'text-red-700';

  return (
    <div className={`rounded-xl border ${bgColor} px-4 py-3 text-center`}>
      <span className={`text-dynamic-base font-bold ${textColor}`}>
        잔여 {remaining}건
      </span>
      <span className="text-dynamic-xs text-gray-400 ml-2">/ 총 {total}건</span>
    </div>
  );
}

// 스텝 인디케이터
function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between px-2">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${i < currentStep ? 'bg-primary-500 text-white' :
                  i === currentStep ? 'bg-accent-500 text-white shadow-md' :
                  'bg-gray-200 text-gray-400'}
              `}
            >
              {i < currentStep ? '✓' : i + 1}
            </div>
            <span className={`mt-1 text-[10px] ${i === currentStep ? 'text-accent-600 font-bold' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div className={`w-8 sm:w-12 h-0.5 mx-1 mb-4 ${i < currentStep ? 'bg-primary-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// 정보 행
function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <div>
        <span className="text-dynamic-xs text-gray-400">{label}</span>
        <p className="text-dynamic-base font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );
}
