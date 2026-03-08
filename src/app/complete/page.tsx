'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { EVENT_INFO, formatTimeSlot } from '@/lib/constants';

// 예약 완료 페이지 내용
function CompleteContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || '';
  const hourSlot = parseInt(searchParams.get('hourSlot') || '0');
  const minuteSlot = parseInt(searchParams.get('minuteSlot') || '0');
  const category = searchParams.get('category') || '';

  if (!name || !hourSlot) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">예약 정보를 찾을 수 없습니다.</p>
          <a href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            예약 페이지로 이동
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-center text-xl font-bold text-gray-900">
        {EVENT_INFO.name}
      </h1>

      <div className="rounded-lg bg-green-50 p-6 text-center">
        <div className="mb-2 text-4xl">✅</div>
        <h2 className="mb-1 text-lg font-bold text-green-800">예약이 완료되었습니다</h2>
        <p className="text-sm text-green-700">확인 문자가 발송됩니다.</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
        <h3 className="font-semibold text-gray-900">예약 정보</h3>
        <p className="text-sm text-gray-700">👤 {name}</p>
        <p className="text-sm text-gray-700">
          🕓 {formatTimeSlot(hourSlot, minuteSlot)}
        </p>
        <p className="text-sm text-gray-700">📋 {category}</p>
        <p className="text-sm text-gray-700">📍 {EVENT_INFO.location}</p>
        <p className="text-sm text-gray-700">📅 {EVENT_INFO.dateDisplay}</p>
      </div>

      <a
        href="/cancel"
        className="block w-full rounded-lg border border-gray-300 bg-white py-3 text-center
          text-sm text-gray-700 transition-colors hover:bg-gray-50 min-h-[48px]
          flex items-center justify-center"
      >
        예약을 취소하려면 여기를 클릭하세요
      </a>
    </div>
  );
}

// 예약 완료 페이지
export default function CompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-gray-600">로딩 중...</p>
        </div>
      }
    >
      <CompleteContent />
    </Suspense>
  );
}
