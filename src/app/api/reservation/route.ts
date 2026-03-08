import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { PHONE_REGEX, normalizePhone } from '@/lib/constants';
import { sendSms } from '@/lib/aligo';
import { confirmationMessage, cancellationMessage } from '@/lib/sms-templates';
import type { CreateReservationRequest, RpcResponse } from '@/types';

// 예약 생성 API
export async function POST(request: NextRequest) {
  try {
    const body: CreateReservationRequest = await request.json();
    const { name, phone, hourSlot, minuteSlot, category } = body;

    // 입력 유효성 검사
    if (!name || name.trim().length === 0 || name.trim().length > 50) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: '이름을 1~50자로 입력해주세요' },
        { status: 400 }
      );
    }

    if (!phone || !PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: '올바른 전화번호 형식(010-XXXX-XXXX)으로 입력해주세요' },
        { status: 400 }
      );
    }

    if (![16, 17].includes(hourSlot)) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: '유효하지 않은 시간대입니다' },
        { status: 400 }
      );
    }

    if (![0, 20, 40].includes(minuteSlot)) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: '유효하지 않은 세부 타임입니다' },
        { status: 400 }
      );
    }

    if (!['국세', '지방세', '기타'].includes(category)) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: '유효하지 않은 상담 분야입니다' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const normalizedPhone = normalizePhone(phone);

    // RPC 함수 호출 (원자적 예약 생성)
    const { data, error } = await supabase.rpc('create_reservation', {
      p_name: name.trim(),
      p_phone: normalizedPhone,
      p_hour_slot: hourSlot,
      p_minute_slot: minuteSlot,
      p_category: category,
    });

    if (error) {
      console.error('예약 생성 RPC 오류:', error);
      return NextResponse.json(
        { success: false, error: 'DB_ERROR', message: '예약 처리 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    const result = data as RpcResponse;

    if (!result.success) {
      const statusCode = result.error === 'SLOT_FULL' || result.error === 'DUPLICATE_RESERVATION' ? 409 : 400;
      return NextResponse.json(
        { success: false, error: result.error, message: result.message },
        { status: statusCode }
      );
    }

    // 예약 확인 SMS 발송 (비동기 fire-and-forget)
    sendSms({
      receiver: normalizedPhone,
      message: confirmationMessage({
        name: name.trim(),
        hourSlot,
        minuteSlot,
        category,
      }),
      reservationId: result.reservation_id,
      messageType: 'confirmation',
    }).catch((err) => console.error('확인 SMS 발송 실패:', err));

    return NextResponse.json(
      {
        success: true,
        reservationId: result.reservation_id,
        message: '예약이 완료되었습니다',
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 예약 조회 API (이름+전화번호)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const phone = searchParams.get('phone');

    if (!name || !phone) {
      return NextResponse.json(
        { found: false, message: '이름과 전화번호를 입력해주세요' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const normalizedPhone = normalizePhone(phone);

    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('name', name.trim())
      .eq('phone', normalizedPhone)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      return NextResponse.json({ found: false, message: '예약을 찾을 수 없습니다' });
    }

    return NextResponse.json({
      found: true,
      reservation: {
        id: data.id,
        name: data.name,
        phone: data.phone,
        hourSlot: data.hour_slot,
        minuteSlot: data.minute_slot,
        category: data.category,
        status: data.status,
        createdAt: data.created_at,
      },
    });
  } catch {
    return NextResponse.json(
      { found: false, message: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 예약 취소 API
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: '이름과 전화번호를 입력해주세요' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const normalizedPhone = normalizePhone(phone);

    // 취소 전 예약 정보 조회 (SMS 발송용)
    const { data: existingReservation } = await supabase
      .from('reservations')
      .select('*')
      .eq('name', name.trim())
      .eq('phone', normalizedPhone)
      .eq('status', 'active')
      .single();

    const { data, error } = await supabase.rpc('cancel_reservation', {
      p_name: name.trim(),
      p_phone: normalizedPhone,
    });

    if (error) {
      console.error('예약 취소 RPC 오류:', error);
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

    // 취소 확인 SMS 발송 (비동기)
    if (existingReservation) {
      sendSms({
        receiver: normalizedPhone,
        message: cancellationMessage({
          name: name.trim(),
          hourSlot: existingReservation.hour_slot,
          minuteSlot: existingReservation.minute_slot,
          category: existingReservation.category,
        }),
        reservationId: existingReservation.id,
        messageType: 'cancellation',
      }).catch((err) => console.error('취소 SMS 발송 실패:', err));
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
