import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { SLOT_CONFIG } from '@/lib/constants';

// 관리자 전체 예약 목록 조회 API
export async function GET(request: NextRequest) {
  // 관리자 인증 확인
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'UNAUTHORIZED', message: '인증이 필요합니다' },
      { status: 401 }
    );
  }

  try {
    const supabase = createServerClient();

    // 모든 예약 조회 (시간대별 정렬)
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('*')
      .order('hour_slot')
      .order('minute_slot')
      .order('created_at');

    if (error) {
      return NextResponse.json(
        { success: false, error: 'DB_ERROR', message: '조회 실패' },
        { status: 500 }
      );
    }

    const all = reservations || [];
    const active = all.filter((r) => r.status === 'active');
    const cancelled = all.filter((r) => r.status === 'cancelled');

    return NextResponse.json({
      reservations: all.map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        hourSlot: r.hour_slot,
        minuteSlot: r.minute_slot,
        category: r.category,
        status: r.status,
        createdAt: r.created_at,
      })),
      summary: {
        total: all.length,
        active: active.length,
        cancelled: cancelled.length,
        capacity: SLOT_CONFIG.totalCapacity,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: '서버 오류' },
      { status: 500 }
    );
  }
}
