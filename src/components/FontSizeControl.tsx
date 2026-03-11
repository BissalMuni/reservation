'use client';

import { useState, useEffect } from 'react';

// 글씨 크기 조절 컴포넌트
export default function FontSizeControl() {
  const DEFAULT_SCALE = 1.4;
  const [scale, setScale] = useState(DEFAULT_SCALE);

  useEffect(() => {
    const saved = localStorage.getItem('fontScale');
    if (saved) {
      const parsed = parseFloat(saved);
      setScale(parsed);
      document.documentElement.style.setProperty('--font-scale', String(parsed));
    } else {
      document.documentElement.style.setProperty('--font-scale', String(DEFAULT_SCALE));
    }
  }, []);

  const updateScale = (newScale: number) => {
    const clamped = Math.max(1.0, Math.min(1.8, newScale));
    setScale(clamped);
    document.documentElement.style.setProperty('--font-scale', String(clamped));
    localStorage.setItem('fontScale', String(clamped));
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <span className="text-xs text-gray-500 mr-1">글씨</span>
      <button
        onClick={() => updateScale(scale - 0.1)}
        disabled={scale <= 1.0}
        className="w-8 h-8 rounded-full bg-white border border-gray-300 text-gray-600
          flex items-center justify-center text-sm font-bold
          hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed
          transition-colors shadow-sm"
        aria-label="글씨 줄이기"
      >
        A-
      </button>
      <button
        onClick={() => updateScale(scale + 0.1)}
        disabled={scale >= 1.8}
        className="w-8 h-8 rounded-full bg-white border border-gray-300 text-gray-600
          flex items-center justify-center text-sm font-bold
          hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed
          transition-colors shadow-sm"
        aria-label="글씨 키우기"
      >
        A+
      </button>
    </div>
  );
}
