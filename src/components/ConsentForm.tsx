'use client';

import { useState } from 'react';

interface ConsentFormProps {
  onConsent: () => void;
}

// 개인정보 동의 폼 컴포넌트
export default function ConsentForm({ onConsent }: ConsentFormProps) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="space-y-5">
      {/* 개인정보 수집 안내 */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-dynamic-lg font-bold text-gray-900 flex items-center gap-2">
          📋 개인정보 수집 및 이용 동의
        </h3>
        <div className="space-y-3 text-dynamic-base text-gray-700">
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">1</span>
            <div>
              <p className="font-semibold">수집 항목</p>
              <p className="text-gray-500">이름, 전화번호</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">2</span>
            <div>
              <p className="font-semibold">수집 목적</p>
              <p className="text-gray-500">통계 및 예약정보 제공</p>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-accent-50 border border-accent-200 p-3">
            <p className="text-dynamic-sm font-bold text-accent-700">
              ⚠️ 개인정보는 수집일로부터 1주일 이내 폐기됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 동의 체크박스 */}
      <label className="flex items-center gap-3 cursor-pointer rounded-xl bg-white p-4 border border-gray-100 shadow-sm">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="h-6 w-6 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="text-dynamic-base text-gray-700 font-medium">
          위 개인정보 수집 및 이용에 동의합니다 <span className="text-red-500">(필수)</span>
        </span>
      </label>

      {/* 다음 단계 버튼 */}
      <button
        onClick={onConsent}
        disabled={!agreed}
        className="w-full rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 py-4 text-center
          text-white text-dynamic-lg font-bold
          transition-all disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed
          hover:from-primary-600 hover:to-primary-700 active:scale-[0.98]
          min-h-[56px] shadow-md"
      >
        동의하고 예약하기
      </button>

      {/* 예약 취소 버튼 */}
      <a
        href="/cancel"
        className="block w-full rounded-xl border-2 border-gray-200 bg-white py-3 text-center
          text-dynamic-sm text-gray-500 font-medium transition-colors hover:bg-gray-50
          hover:border-gray-300 min-h-[48px] leading-[calc(48px-1.5rem)]"
      >
        이미 예약하셨나요? 예약 취소하기
      </a>
    </div>
  );
}
