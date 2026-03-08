'use client';

import { HOUR_LABELS, MINUTE_LABELS, CONSULTATION_TYPES, CONSULTATION_DESCRIPTIONS } from '@/lib/constants';
import type { SlotAvailability, ConsultCategory } from '@/types';

interface SlotSelectorProps {
  slots: SlotAvailability[];
  selectedHour: number | null;
  selectedMinute: number | null;
  selectedCategory: ConsultCategory | null;
  onSelectHour: (hour: number) => void;
  onSelectMinute: (minute: number) => void;
  onSelectCategory: (category: ConsultCategory) => void;
  onNext: () => void;
}

// 시간대/타임/분야 선택 컴포넌트
export default function SlotSelector({
  slots,
  selectedHour,
  selectedMinute,
  selectedCategory,
  onSelectHour,
  onSelectMinute,
  onSelectCategory,
  onNext,
}: SlotSelectorProps) {
  // 시간대별 잔여 건수 계산
  const getHourAvailability = (hour: number) => {
    const hourSlots = slots.filter((s) => s.hourSlot === hour);
    const total = hourSlots.reduce((sum, s) => sum + s.available, 0);
    return total;
  };

  // 특정 시간대의 세부 타임 필터
  const getMinuteSlots = (hour: number) => {
    return slots.filter((s) => s.hourSlot === hour);
  };

  const canProceed = selectedHour !== null && selectedMinute !== null && selectedCategory !== null;

  return (
    <div className="space-y-5">
      {/* 시간대 선택 */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-dynamic-lg font-bold text-gray-900 flex items-center gap-2">
          🕐 시간대 선택
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[16, 17].map((hour) => {
            const available = getHourAvailability(hour);
            const isFull = available === 0;
            const isSelected = selectedHour === hour;

            return (
              <button
                key={hour}
                onClick={() => onSelectHour(hour)}
                disabled={isFull}
                className={`rounded-xl border-2 p-4 text-center transition-all min-h-[70px]
                  ${isSelected
                    ? 'border-primary-500 bg-primary-50 shadow-md scale-[1.02]'
                    : 'border-gray-200 bg-white'}
                  ${isFull
                    ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                    : 'hover:border-primary-300 hover:shadow-sm cursor-pointer'}
                `}
              >
                <div className={`text-dynamic-lg font-bold ${isSelected ? 'text-primary-700' : ''}`}>
                  {HOUR_LABELS[hour]}
                </div>
                <div className={`text-dynamic-sm mt-1 ${isFull ? 'text-red-400' : isSelected ? 'text-primary-600' : 'text-gray-500'}`}>
                  {isFull ? '😔 만석' : `잔여 ${available}건`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 세부 타임 선택 */}
      {selectedHour !== null && (
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
          <h3 className="mb-4 text-dynamic-lg font-bold text-gray-900 flex items-center gap-2">
            ⏰ 세부 시간 선택
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {getMinuteSlots(selectedHour).map((slot) => {
              const isFull = slot.available === 0;
              const isSelected = selectedMinute === slot.minuteSlot;

              return (
                <button
                  key={slot.minuteSlot}
                  onClick={() => onSelectMinute(slot.minuteSlot)}
                  disabled={isFull}
                  className={`rounded-xl border-2 p-3 text-center transition-all min-h-[64px]
                    ${isSelected
                      ? 'border-primary-500 bg-primary-50 shadow-md scale-[1.02]'
                      : 'border-gray-200 bg-white'}
                    ${isFull
                      ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'hover:border-primary-300 cursor-pointer'}
                  `}
                >
                  <div className={`text-dynamic-base font-bold ${isSelected ? 'text-primary-700' : ''}`}>
                    {MINUTE_LABELS[slot.minuteSlot]}
                  </div>
                  <div className={`text-dynamic-xs mt-0.5 ${isFull ? 'text-red-400' : isSelected ? 'text-primary-600' : 'text-gray-500'}`}>
                    {isFull ? '만석' : `${slot.available}건 남음`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 상담 분야 선택 */}
      {selectedMinute !== null && (
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
          <h3 className="mb-4 text-dynamic-lg font-bold text-gray-900 flex items-center gap-2">
            📋 상담 분야 선택
          </h3>
          <div className="space-y-2">
            {CONSULTATION_TYPES.map((type) => {
              const isSelected = selectedCategory === type;

              return (
                <button
                  key={type}
                  onClick={() => onSelectCategory(type as ConsultCategory)}
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all min-h-[56px]
                    ${isSelected
                      ? 'border-primary-500 bg-primary-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-primary-300'}
                    cursor-pointer
                  `}
                >
                  <div className={`text-dynamic-base font-bold ${isSelected ? 'text-primary-700' : 'text-gray-800'}`}>
                    {type}
                  </div>
                  <div className="text-dynamic-xs text-gray-500 mt-0.5">{CONSULTATION_DESCRIPTIONS[type]}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 다음 단계 버튼 */}
      {canProceed && (
        <button
          onClick={onNext}
          className="w-full rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 py-4 text-center
            text-white text-dynamic-lg font-bold
            transition-all hover:from-primary-600 hover:to-primary-700 active:scale-[0.98]
            min-h-[56px] shadow-md"
        >
          다음 →
        </button>
      )}
    </div>
  );
}
