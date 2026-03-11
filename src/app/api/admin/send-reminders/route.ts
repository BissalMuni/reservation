import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { sendSms } from '@/lib/sms';
import { reminderMessage } from '@/lib/sms-templates';

// 관리자 수동 알림 문자 발송 API (시간대별)
export async function POST(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'UNAUTHORIZED', message: '인증이 필요합니다' },
      { status: 401 }
    );
  }

  try {
    const { hourSlot, minuteSlot } = await request.json();

    // 입력 검증
    if (![16, 17].includes(hourSlot) || ![0, 20, 40].includes(minuteSlot)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_SLOT', message: '유효하지 않은 시간대입니다' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // 해당 슬롯의 활성 예약 조회
    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select('id, name, phone, hour_slot, minute_slot, category')
      .eq('hour_slot', hourSlot)
      .eq('minute_slot', minuteSlot)
      .eq('status', 'active');

    if (resError) {
      return NextResponse.json(
        { success: false, error: 'DB_ERROR', message: '예약 조회 실패' },
        { status: 500 }
      );
    }

    if (!reservations || reservations.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        alreadySent: 0,
        message: '해당 시간대에 활성 예약이 없습니다',
      });
    }

    // 이미 알림 발송된 예약 확인
    const reservationIds = reservations.map((r) => r.id);
    const { data: sentLogs } = await supabase
      .from('sms_logs')
      .select('reservation_id')
      .in('reservation_id', reservationIds)
      .eq('message_type', 'reminder')
      .eq('status', 'sent');

    const alreadySentIds = new Set((sentLogs || []).map((l) => l.reservation_id));

    // 미발송 예약에 알림 발송
    let sent = 0;
    let failed = 0;
    const alreadySent = alreadySentIds.size;

    for (const reservation of reservations) {
      if (alreadySentIds.has(reservation.id)) continue;

      try {
        const message = reminderMessage({
          name: reservation.name,
          hourSlot: reservation.hour_slot,
          minuteSlot: reservation.minute_slot,
          category: reservation.category,
        });

        const result = await sendSms({
          receiver: reservation.phone,
          message,
          reservationId: reservation.id,
          messageType: 'reminder',
        });

        if (result.success) {
          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      alreadySent,
      message: `발송 완료: ${sent}건 성공, ${failed}건 실패, ${alreadySent}건 기발송`,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: '서버 오류' },
      { status: 500 }
    );
  }
}
