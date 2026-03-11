import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/admin-auth';

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

    // 모든 예약 + 슬롯 현황 동시 조회
    const [reservationsResult, slotsResult] = await Promise.all([
      supabase
        .from('reservations')
        .select('*')
        .order('hour_slot')
        .order('minute_slot')
        .order('created_at'),
      supabase
        .from('time_slots')
        .select('max_count'),
    ]);

    if (reservationsResult.error) {
      return NextResponse.json(
        { success: false, error: 'DB_ERROR', message: '조회 실패' },
        { status: 500 }
      );
    }

    const all = reservationsResult.data || [];
    const active = all.filter((r) => r.status === 'active');
    const cancelled = all.filter((r) => r.status === 'cancelled');

    // DB의 실제 총 정원 계산
    const capacity = (slotsResult.data || []).reduce((sum, s) => sum + s.max_count, 0);

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
        capacity,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: '서버 오류' },
      { status: 500 }
    );
  }
}
