'use client';

import { useState } from 'react';
import { PHONE_REGEX, formatTimeSlot } from '@/lib/constants';
import type { ConsultCategory } from '@/types';

interface ReservationFormProps {
  hourSlot: number;
  minuteSlot: number;
  category: ConsultCategory;
  onSubmit: (name: string, phone: string) => Promise<void>;
  onBack: () => void;
}

// 이름+전화번호 입력 폼 컴포넌트
export default function ReservationForm({
  hourSlot,
  minuteSlot,
  category,
  onSubmit,
  onBack,
}: ReservationFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 전화번호 자동 포맷팅
  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) {
      setPhone(digits);
    } else if (digits.length <= 7) {
      setPhone(`${digits.slice(0, 3)}-${digits.slice(3)}`);
    } else {
      setPhone(`${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`);
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!name.trim() || name.trim().length > 50) {
      setError('이름을 1~50자로 입력해주세요.');
      return;
    }

    if (!PHONE_REGEX.test(phone)) {
      setError('올바른 전화번호를 입력해주세요. (010-XXXX-XXXX)');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(name.trim(), phone);
    } catch {
      setError('예약 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 선택 정보 요약 */}
      <div className="rounded-2xl bg-primary-50 border border-primary-100 p-4 shadow-sm">
        <h3 className="mb-2 text-dynamic-base font-bold text-primary-800">선택한 예약 정보</h3>
        <div className="flex items-center gap-4 text-dynamic-base text-primary-700">
          <span>🕓 {formatTimeSlot(hourSlot, minuteSlot)}</span>
          <span>📋 {category}</span>
        </div>
      </div>

      {/* 이름 입력 */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 space-y-4">
        <div>
          <label htmlFor="name" className="mb-2 block text-dynamic-base font-bold text-gray-800">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            maxLength={50}
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-dynamic-base
              focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200
              min-h-[52px] transition-colors"
          />
        </div>

        {/* 전화번호 입력 */}
        <div>
          <label htmlFor="phone" className="mb-2 block text-dynamic-base font-bold text-gray-800">
            전화번호 <span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="010-1234-5678"
            maxLength={13}
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-dynamic-base
              focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200
              min-h-[52px] transition-colors"
          />
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-dynamic-sm text-red-700">
          {error}
        </div>
      )}

      {/* 버튼 */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 rounded-xl border-2 border-gray-200 bg-white py-4 text-center
            text-dynamic-base font-bold text-gray-600 transition-all hover:bg-gray-50
            min-h-[56px]"
        >
          ← 이전
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 py-4 text-center
            text-white text-dynamic-base font-bold
            transition-all disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed
            hover:from-accent-600 hover:to-accent-700 active:scale-[0.98]
            min-h-[56px] shadow-md"
        >
          {isSubmitting ? '예약 중...' : '예약하기 🎉'}
        </button>
      </div>
    </div>
  );
}
