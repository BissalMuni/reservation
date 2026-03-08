'use client';

import { useState } from 'react';
import AdminDashboard from '@/components/AdminDashboard';

// 관리자 페이지
export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 로그인 처리
  const handleLogin = async () => {
    if (!password.trim()) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    setIsLoggingIn(true);
    setError('');

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        setToken(data.token);
        setPassword('');
      } else {
        setError(data.message || '로그인에 실패했습니다.');
      }
    } catch {
      setError('로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 로그아웃
  const handleLogout = () => {
    setToken(null);
    setPassword('');
  };

  // 로그인 화면
  if (!token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-sm space-y-4">
          <h1 className="text-center text-xl font-bold text-gray-900">관리자 로그인</h1>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="비밀번호 입력"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base
                focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                min-h-[48px]"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full rounded-lg bg-blue-600 py-3 text-center text-white font-semibold
              transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed
              hover:bg-blue-700 active:bg-blue-800 min-h-[48px]"
          >
            {isLoggingIn ? '로그인 중...' : '로그인'}
          </button>
        </div>
      </div>
    );
  }

  // 대시보드
  return <AdminDashboard token={token} onLogout={handleLogout} />;
}
