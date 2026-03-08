import { NextRequest } from 'next/server';
import crypto from 'crypto';

// 단순 토큰 생성 (ADMIN_PASSWORD 기반)
export function generateToken(): string {
  const secret = process.env.ADMIN_PASSWORD || 'default-secret';
  const timestamp = Date.now().toString();
  const hash = crypto.createHmac('sha256', secret).update(timestamp).digest('hex');
  return `${timestamp}.${hash}`;
}

// 토큰 검증
export function verifyToken(token: string): boolean {
  const secret = process.env.ADMIN_PASSWORD || 'default-secret';
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [timestamp, hash] = parts;
  const expectedHash = crypto.createHmac('sha256', secret).update(timestamp).digest('hex');

  if (hash !== expectedHash) return false;

  // 24시간 만료 체크
  const tokenAge = Date.now() - parseInt(timestamp, 10);
  const maxAge = 24 * 60 * 60 * 1000; // 24시간
  return tokenAge < maxAge;
}

// 요청에서 관리자 인증 확인
export function verifyAdminAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  const token = authHeader.slice(7);
  return verifyToken(token);
}
