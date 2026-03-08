import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/admin-auth';

// 개인정보 폐기 API
export async function POST(request: NextRequest) {
  // 관리자 인증 확인
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'UNAUTHORIZED', message: '인증이 필요합니다' },
      { status: 401 }
    );
  }

  try {
    const supabase = createServerClient();

    // SMS 로그 삭제 건수 조회
    const { count: smsCount } = await supabase
      .from('sms_logs')
      .select('*', { count: 'exact', head: true });

    // 예약 삭제 건수 조회
    const { count: reservationCount } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true });

    // SMS 로그 전체 삭제
    await supabase.from('sms_logs').delete().gte('id', '00000000-0000-0000-0000-000000000000');

    // 예약 전체 삭제
    await supabase.from('reservations').delete().gte('id', '00000000-0000-0000-0000-000000000000');

    // 슬롯 카운터 초기화
    await supabase
      .from('time_slots')
      .update({ current_count: 0 })
      .gte('id', '00000000-0000-0000-0000-000000000000');

    return NextResponse.json({
      success: true,
      deletedReservations: reservationCount || 0,
      deletedSmsLogs: smsCount || 0,
      message: '개인정보가 폐기되었습니다',
    });
  } catch (error) {
    console.error('개인정보 폐기 오류:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: '폐기 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
