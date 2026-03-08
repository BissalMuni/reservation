import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { SLOT_CONFIG } from '@/lib/constants';
import type { SlotAvailability, SlotsResponse } from '@/types';

// 슬롯 현황 조회 API
export async function GET() {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('time_slots')
      .select('hour_slot, minute_slot, current_count, max_count')
      .order('hour_slot')
      .order('minute_slot');

    if (error) {
      return NextResponse.json(
        { success: false, error: 'DB_ERROR', message: '슬롯 조회 실패' },
        { status: 500 }
      );
    }

    const slots: SlotAvailability[] = (data || []).map((slot) => ({
      hourSlot: slot.hour_slot,
      minuteSlot: slot.minute_slot,
      currentCount: slot.current_count,
      maxCount: slot.max_count,
      available: slot.max_count - slot.current_count,
    }));

    const totalReserved = slots.reduce((sum, s) => sum + s.currentCount, 0);

    const response: SlotsResponse = {
      slots,
      totalReserved,
      totalCapacity: SLOT_CONFIG.totalCapacity,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: '서버 오류' },
      { status: 500 }
    );
  }
}
