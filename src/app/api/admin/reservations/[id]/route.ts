import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { sendSms } from '@/lib/sms';
import { cancellationMessage } from '@/lib/sms-templates';
import type { RpcResponse } from '@/types';

// 관리자 수동 예약 취소 API
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 관리자 인증 확인
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'UNAUTHORIZED', message: '인증이 필요합니다' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const supabase = createServerClient();

    // 예약 정보 먼저 조회 (SMS 발송용)
    const { data: reservation } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single();

    // RPC 함수로 원자적 취소
    const { data, error } = await supabase.rpc('cancel_reservation_by_id', {
      p_reservation_id: id,
    });

    if (error) {
      console.error('관리자 취소 RPC 오류:', error);
      return NextResponse.json(
        { success: false, error: 'DB_ERROR', message: '취소 처리 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    const result = data as RpcResponse;

    if (!result.success) {
      const statusCode = result.error === 'NOT_FOUND' ? 404 : 409;
      return NextResponse.json(
        { success: false, error: result.error, message: result.message },
        { status: statusCode }
      );
    }

    // 취소 SMS 발송
    if (reservation) {
      try {
        await sendSms({
          receiver: reservation.phone,
          message: cancellationMessage({
            name: reservation.name,
            hourSlot: reservation.hour_slot,
            minuteSlot: reservation.minute_slot,
            category: reservation.category,
          }),
          reservationId: reservation.id,
          messageType: 'cancellation',
        });
      } catch (err) {
        console.error('취소 SMS 발송 실패:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: '예약이 취소되었습니다',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
