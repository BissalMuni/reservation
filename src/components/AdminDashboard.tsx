'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatTimeSlot, formatPhone, SLOT_CONFIG } from '@/lib/constants';
import type { Reservation, AdminReservationsResponse } from '@/types';

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
}

// 관리자 대시보드 컴포넌트
export default function AdminDashboard({ token, onLogout }: AdminDashboardProps) {
  const [data, setData] = useState<AdminReservationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purging, setPurging] = useState(false);

  // 예약 목록 로드
  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/reservations', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        onLogout();
        return;
      }

      const json = await res.json();
      setData(json);
    } catch {
      setError('예약 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [token, onLogout]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // 예약 수동 취소
  const handleCancel = async (reservation: Reservation) => {
    if (!confirm(`${reservation.name}님의 예약을 취소하시겠습니까?`)) return;

    setCancellingId(reservation.id);
    try {
      const res = await fetch(`/api/admin/reservations/${reservation.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (json.success) {
        await fetchReservations();
      } else {
        alert(json.message || '취소에 실패했습니다.');
      }
    } catch {
      alert('취소 처리 중 오류가 발생했습니다.');
    } finally {
      setCancellingId(null);
    }
  };

  // 개인정보 폐기
  const handlePurge = async () => {
    setPurging(true);
    try {
      const res = await fetch('/api/admin/purge', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (json.success) {
        alert(`개인정보 폐기 완료\n삭제된 예약: ${json.deletedReservations}건\n삭제된 SMS 로그: ${json.deletedSmsLogs}건`);
        setShowPurgeConfirm(false);
        await fetchReservations();
      } else {
        alert(json.message || '폐기에 실패했습니다.');
      }
    } catch {
      alert('폐기 처리 중 오류가 발생했습니다.');
    } finally {
      setPurging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-dynamic-base text-red-700">{error}</div>;
  }

  if (!data) return null;

  const { reservations, summary } = data;
  const activeReservations = reservations.filter((r) => r.status === 'active');

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-dynamic-xl font-bold text-gray-900">📊 관리자 대시보드</h2>
        <button
          onClick={onLogout}
          className="rounded-lg px-3 py-2 text-dynamic-sm text-gray-500 hover:bg-gray-100 transition-colors"
        >
          로그아웃
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard value={summary.active} label="활성 예약" color="primary" />
        <SummaryCard value={summary.cancelled} label="취소" color="gray" />
        <SummaryCard value={summary.capacity} label="총 정원" color="green" />
        <SummaryCard value={summary.capacity - summary.active} label="잔여" color="accent" />
      </div>

      {/* 시간대별 현황 */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
        <h3 className="mb-3 text-dynamic-lg font-bold text-gray-900">🕐 시간대별 현황</h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[16, 17].flatMap((hour) =>
            [0, 20, 40].map((minute) => {
              const count = activeReservations.filter(
                (r) => r.hourSlot === hour && r.minuteSlot === minute
              ).length;
              const max = SLOT_CONFIG.maxPerSubtime;
              const isFull = count >= max;
              const ratio = count / max;

              return (
                <div
                  key={`${hour}-${minute}`}
                  className={`rounded-xl border-2 p-3 text-center
                    ${isFull ? 'border-red-300 bg-red-50' :
                      ratio > 0.5 ? 'border-accent-200 bg-accent-50' :
                      'border-gray-200 bg-white'}
                  `}
                >
                  <div className="text-dynamic-sm font-bold">{formatTimeSlot(hour, minute)}</div>
                  <div className={`text-dynamic-lg font-bold mt-1
                    ${isFull ? 'text-red-600' : ratio > 0.5 ? 'text-accent-600' : 'text-primary-600'}
                  `}>
                    {count}/{max}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 예약 목록 */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
        <h3 className="mb-3 text-dynamic-lg font-bold text-gray-900">
          📋 예약 목록 ({reservations.length}건)
        </h3>
        {reservations.length === 0 ? (
          <p className="text-center text-dynamic-base text-gray-400 py-8">예약이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {reservations.map((r) => (
              <div
                key={r.id}
                className={`flex items-center justify-between rounded-xl border p-4
                  ${r.status === 'cancelled'
                    ? 'border-gray-100 bg-gray-50 opacity-50'
                    : 'border-gray-200 bg-white'}
                `}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-dynamic-base font-bold">{r.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold
                      ${r.status === 'active'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-200 text-gray-500'}
                    `}>
                      {r.status === 'active' ? '활성' : '취소'}
                    </span>
                  </div>
                  <div className="text-dynamic-sm text-gray-500 mt-1">
                    {formatPhone(r.phone)} · {formatTimeSlot(r.hourSlot, r.minuteSlot)} · {r.category}
                  </div>
                </div>
                {r.status === 'active' && (
                  <button
                    onClick={() => handleCancel(r)}
                    disabled={cancellingId === r.id}
                    className="ml-3 shrink-0 rounded-lg bg-red-500 px-4 py-2 text-dynamic-sm text-white font-bold
                      hover:bg-red-600 disabled:bg-gray-300 min-h-[40px] transition-colors"
                  >
                    {cancellingId === r.id ? '취소 중...' : '취소'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 개인정보 폐기 */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-red-100">
        <h3 className="mb-2 text-dynamic-lg font-bold text-red-700">🗑️ 개인정보 폐기</h3>
        <p className="mb-4 text-dynamic-sm text-gray-600">
          모든 예약 데이터와 SMS 로그를 영구 삭제합니다. 이 작업은 되돌릴 수 없습니다.
        </p>

        {showPurgeConfirm ? (
          <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 space-y-3">
            <p className="text-dynamic-base font-bold text-red-700">
              정말로 모든 개인정보를 폐기하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handlePurge}
                disabled={purging}
                className="flex-1 rounded-lg bg-red-600 py-3 text-dynamic-sm text-white font-bold
                  hover:bg-red-700 disabled:bg-gray-300 min-h-[48px] transition-colors"
              >
                {purging ? '폐기 중...' : '폐기 확인'}
              </button>
              <button
                onClick={() => setShowPurgeConfirm(false)}
                disabled={purging}
                className="flex-1 rounded-lg border-2 border-gray-200 bg-white py-3 text-dynamic-sm
                  text-gray-700 font-bold hover:bg-gray-50 min-h-[48px] transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowPurgeConfirm(true)}
            className="rounded-lg border-2 border-red-300 bg-white px-5 py-3 text-dynamic-sm
              text-red-600 font-bold hover:bg-red-50 min-h-[48px] transition-colors"
          >
            개인정보 폐기
          </button>
        )}
      </div>

      {/* 새로고침 */}
      <button
        onClick={fetchReservations}
        className="w-full rounded-xl border-2 border-gray-200 bg-white py-3 text-dynamic-base
          text-gray-600 font-bold hover:bg-gray-50 min-h-[48px] transition-colors"
      >
        🔄 새로고침
      </button>
    </div>
  );
}

// 요약 카드 컴포넌트
function SummaryCard({ value, label, color }: { value: number; label: string; color: string }) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary-50 border-primary-100 text-primary-700',
    gray: 'bg-gray-50 border-gray-100 text-gray-600',
    green: 'bg-green-50 border-green-100 text-green-700',
    accent: 'bg-accent-50 border-accent-100 text-accent-700',
  };

  return (
    <div className={`rounded-xl border p-3 text-center ${colorMap[color]}`}>
      <div className="text-dynamic-2xl font-bold">{value}</div>
      <div className="text-dynamic-xs font-medium mt-0.5">{label}</div>
    </div>
  );
}
