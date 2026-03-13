import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/admin-auth';
import type { ConsultStatus } from '@/types';

const VALID_STATUSES: ConsultStatus[] = ['대기중', '상담중', '상담종료'];

// 상담 상태 변경 API
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'UNAUTHORIZED', message: '인증이 필요합니다' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const { consultStatus } = await request.json();

    if (!VALID_STATUSES.includes(consultStatus)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_STATUS', message: '유효하지 않은 상담 상태입니다' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from('reservations')
      .update({ consult_status: consultStatus })
      .eq('id', id)
      .eq('status', 'active');

    if (error) {
      console.error('상담 상태 변경 오류:', error);
      return NextResponse.json(
        { success: false, error: 'DB_ERROR', message: '상태 변경에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '상담 상태가 변경되었습니다',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
