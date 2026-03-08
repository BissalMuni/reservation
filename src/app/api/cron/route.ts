import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { sendSms } from '@/lib/aligo';
import { reminderMessage } from '@/lib/sms-templates';
import { EVENT_INFO } from '@/lib/constants';

// Vercel Cron: 5분마다 실행
// 1) 5분 전 알림 SMS 발송
// 2) 7일 경과 데이터 자동 삭제
export async function GET(request: NextRequest) {
  // Cron 인증 확인
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    reminders: { sent: 0, failed: 0 },
    cleanup: { deleted: 0 },
  };

  try {
    const supabase = createServerClient();

    // 1. 5분 전 알림 발송 (이벤트 당일만)
    const now = new Date();
    const eventDate = EVENT_INFO.date; // '2026-03-12'
    const today = now.toISOString().split('T')[0];

    if (today === eventDate) {
      // 현재 시각 (KST 기준) + 5분 이내의 타임 찾기
      const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000); // UTC → KST
      const kstHour = kstNow.getHours();
      const kstMinute = kstNow.getMinutes();

      // 현재 시간 + 5분 범위의 타임 슬롯 계산
      const targetMinute = kstMinute + 5;
      const targetHour = targetMinute >= 60 ? kstHour + 1 : kstHour;
      const normalizedMinute = targetMinute % 60;

      // 정확히 타임 슬롯 시작 시간 (00, 20, 40분)인 경우만 알림 발송
      if ([0, 20, 40].includes(normalizedMinute) && [16, 17].includes(targetHour)) {
        // 해당 타임의 활성 예약 조회
        const { data: reservations } = await supabase
          .from('reservations')
          .select('*')
          .eq('hour_slot', targetHour)
          .eq('minute_slot', normalizedMinute)
          .eq('status', 'active');

        if (reservations && reservations.length > 0) {
          // 이미 알림을 보낸 예약인지 확인
          const reservationIds = reservations.map((r) => r.id);
          const { data: existingLogs } = await supabase
            .from('sms_logs')
            .select('reservation_id')
            .in('reservation_id', reservationIds)
            .eq('message_type', 'reminder')
            .eq('status', 'sent');

          const alreadySent = new Set(
            (existingLogs || []).map((l) => l.reservation_id)
          );

          for (const reservation of reservations) {
            if (alreadySent.has(reservation.id)) continue;

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

              if (result.result_code === 1) {
                results.reminders.sent++;
              } else {
                results.reminders.failed++;
              }
            } catch {
              results.reminders.failed++;
            }
          }
        }
      }
    }

    // 2. 7일 경과 개인정보 자동 삭제
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 7일 경과 예약의 SMS 로그 먼저 삭제
    const { data: oldReservations } = await supabase
      .from('reservations')
      .select('id')
      .lt('created_at', sevenDaysAgo);

    if (oldReservations && oldReservations.length > 0) {
      const oldIds = oldReservations.map((r) => r.id);

      // SMS 로그 삭제
      await supabase
        .from('sms_logs')
        .delete()
        .in('reservation_id', oldIds);

      // 예약 삭제 (슬롯 카운터는 이미 반영되어 있거나 이벤트 종료 후이므로 업데이트 불필요)
      const deletedCount = oldReservations.length;
      await supabase
        .from('reservations')
        .delete()
        .lt('created_at', sevenDaysAgo);

      results.cleanup.deleted = deletedCount;
    }
  } catch (error) {
    console.error('Cron 실행 오류:', error);
    return NextResponse.json(
      { error: 'Cron execution failed', details: String(error) },
      { status: 500 }
    );
  }

  return NextResponse.json(results);
}
