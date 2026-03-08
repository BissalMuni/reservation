'use client';

import { useState } from 'react';
import { PHONE_REGEX, normalizePhone, formatTimeSlot, formatPhone, EVENT_INFO } from '@/lib/constants';
import type { Reservation } from '@/types';

// 예약 취소 페이지
export default function CancelPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

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

  // 예약 조회
  const handleSearch = async () => {
    setError('');
    setReservation(null);

    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }

    if (!PHONE_REGEX.test(phone)) {
      setError('올바른 전화번호를 입력해주세요. (010-XXXX-XXXX)');
      return;
    }

    setIsSearching(true);
    try {
      const normalizedPhone = normalizePhone(phone);
      const res = await fetch(
        `/api/reservation?name=${encodeURIComponent(name.trim())}&phone=${normalizedPhone}`
      );
      const data = await res.json();

      if (data.found) {
        setReservation(data.reservation);
      } else {
        setError('예약을 찾을 수 없습니다.');
      }
    } catch {
      setError('조회 중 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  // 예약 취소
  const handleCancel = async () => {
    if (!confirm('예약을 취소하시겠습니까?')) return;

    setIsCancelling(true);
    setError('');

    try {
      const res = await fetch('/api/reservation', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setCancelled(true);
      } else {
        setError(data.message || '취소에 실패했습니다.');
      }
    } catch {
      setError('취소 처리 중 오류가 발생했습니다.');
    } finally {
      setIsCancelling(false);
    }
  };

  // 취소 완료 화면
  if (cancelled) {
    return (
      <div className="space-y-6">
        <h1 className="text-center text-xl font-bold text-gray-900">
          {EVENT_INFO.name}
        </h1>

        <div className="rounded-lg bg-orange-50 p-6 text-center">
          <div className="mb-2 text-4xl">❌</div>
          <h2 className="mb-1 text-lg font-bold text-orange-800">예약이 취소되었습니다</h2>
          <p className="text-sm text-orange-700">취소 확인 문자가 발송됩니다.</p>
        </div>

        <a
          href="/"
          className="block w-full rounded-lg bg-blue-600 py-3 text-center text-white
            font-semibold transition-colors hover:bg-blue-700 min-h-[48px]
            flex items-center justify-center"
        >
          다시 예약하기
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-center text-xl font-bold text-gray-900">
        {EVENT_INFO.name}
      </h1>
      <h2 className="text-center text-gray-600">예약 조회 및 취소</h2>

      {/* 조회 폼 */}
      <div className="space-y-4">
        <div>
          <label htmlFor="cancel-name" className="mb-1 block text-sm font-medium text-gray-700">
            이름
          </label>
          <input
            id="cancel-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예약 시 입력한 이름"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base
              focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
              min-h-[48px]"
          />
        </div>

        <div>
          <label htmlFor="cancel-phone" className="mb-1 block text-sm font-medium text-gray-700">
            전화번호
          </label>
          <input
            id="cancel-phone"
            type="tel"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="010-1234-5678"
            maxLength={13}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base
              focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
              min-h-[48px]"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="w-full rounded-lg bg-blue-600 py-3 text-center text-white font-semibold
            transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed
            hover:bg-blue-700 active:bg-blue-800 min-h-[48px]"
        >
          {isSearching ? '조회 중...' : '예약 조회'}
        </button>
      </div>

      {/* 예약 정보 표시 */}
      {reservation && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
            <h3 className="font-semibold text-gray-900">예약 정보</h3>
            <p className="text-sm text-gray-700">👤 {reservation.name}</p>
            <p className="text-sm text-gray-700">📱 {formatPhone(reservation.phone)}</p>
            <p className="text-sm text-gray-700">
              🕓 {formatTimeSlot(reservation.hourSlot, reservation.minuteSlot)}
            </p>
            <p className="text-sm text-gray-700">📋 {reservation.category}</p>
            <p className="text-sm text-gray-700">📍 {EVENT_INFO.location}</p>
          </div>

          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="w-full rounded-lg bg-red-500 py-3 text-center text-white font-semibold
              transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed
              hover:bg-red-600 active:bg-red-700 min-h-[48px]"
          >
            {isCancelling ? '취소 중...' : '예약 취소'}
          </button>
        </div>
      )}
    </div>
  );
}
