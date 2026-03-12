import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { SlotAvailability, SlotsResponse } from '@/types';

// 캐싱 비활성화 — 항상 최신 DB 데이터 반환
export const dynamic = 'force-dynamic';

// 슬롯 현황 조회 API
export async function GET() {
  try {
    const supabase = createServerClient();

    // 슬롯 정보 + 실제 활성 예약 수 동시 조회
    const [slotsResult, reservationsResult] = await Promise.all([
      supabase
        .from('time_slots')
        .select('hour_slot, minute_slot, max_count')
        .order('hour_slot')
        .order('minute_slot'),
      supabase
        .from('reservations')
        .select('hour_slot, minute_slot')
        .eq('status', 'active'),
    ]);

    if (slotsResult.error) {
      return NextResponse.json(
        { success: false, error: 'DB_ERROR', message: '슬롯 조회 실패' },
        { status: 500 }
      );
    }

    // 슬롯별 실제 예약 수 집계
    const activeReservations = reservationsResult.data || [];
    const countMap = new Map<string, number>();
    for (const r of activeReservations) {
      const key = `${r.hour_slot}-${r.minute_slot}`;
      countMap.set(key, (countMap.get(key) || 0) + 1);
    }

    const slots: SlotAvailability[] = (slotsResult.data || []).map((slot) => {
      const key = `${slot.hour_slot}-${slot.minute_slot}`;
      const currentCount = countMap.get(key) || 0;
      return {
        hourSlot: slot.hour_slot,
        minuteSlot: slot.minute_slot,
        currentCount,
        maxCount: slot.max_count,
        available: slot.max_count - currentCount,
      };
    });

    // 실제 활성 예약 수 (슬롯 매핑과 무관하게 전체 카운트)
    const totalReserved = activeReservations.length;
    // DB 기반 총 정원
    const totalCapacity = (slotsResult.data || []).reduce((sum, s) => sum + s.max_count, 0);

    const response: SlotsResponse = {
      slots,
      totalReserved,
      totalCapacity,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: '서버 오류' },
      { status: 500 }
    );
  }
}
