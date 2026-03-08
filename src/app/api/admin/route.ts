import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/admin-auth';

// 관리자 로그인 API
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json(
        { success: false, error: 'CONFIG_ERROR', message: '관리자 비밀번호가 설정되지 않았습니다' },
        { status: 500 }
      );
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PASSWORD', message: '비밀번호가 올바르지 않습니다' },
        { status: 401 }
      );
    }

    const token = generateToken();

    return NextResponse.json({
      success: true,
      token,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
