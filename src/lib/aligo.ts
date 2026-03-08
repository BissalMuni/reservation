import { createServerClient } from './supabase';
import type { SmsMessageType } from '@/types';

// Aligo SMS API 응답 타입
interface AligoResponse {
  result_code: number;
  message: string;
  msg_id?: string;
  success_cnt?: number;
  error_cnt?: number;
}

// SMS 발송 옵션
interface SendSmsOptions {
  receiver: string;
  message: string;
  reservationId?: string;
  messageType: SmsMessageType;
}

const ALIGO_BASE_URL = 'https://apis.aligo.in';
const MAX_RETRY = 3;

// SMS 발송 함수
export async function sendSms(options: SendSmsOptions): Promise<AligoResponse> {
  const { receiver, message, reservationId, messageType } = options;

  let lastError: Error | null = null;
  let response: AligoResponse | null = null;

  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    try {
      response = await callAligoApi(receiver, message);

      // SMS 로그 기록
      await logSms({
        reservationId: reservationId || null,
        phone: receiver,
        messageType,
        status: response.result_code === 1 ? 'sent' : 'failed',
        retryCount: attempt,
        aligoMsgId: response.msg_id || null,
        errorMessage: response.result_code !== 1 ? response.message : null,
      });

      // 성공 시 반환
      if (response.result_code === 1) {
        return response;
      }

      lastError = new Error(response.message);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 실패 로그 기록
      await logSms({
        reservationId: reservationId || null,
        phone: receiver,
        messageType,
        status: 'failed',
        retryCount: attempt,
        aligoMsgId: null,
        errorMessage: lastError.message,
      });
    }
  }

  // 모든 재시도 실패
  console.error(`SMS 발송 최종 실패 (${MAX_RETRY}회 시도):`, lastError?.message);
  return response || { result_code: -1, message: lastError?.message || 'Unknown error' };
}

// Aligo API 호출
async function callAligoApi(receiver: string, message: string): Promise<AligoResponse> {
  const apiKey = process.env.ALIGO_API_KEY;
  const userId = process.env.ALIGO_USER_ID;
  const sender = process.env.ALIGO_SENDER;

  // 환경변수 미설정 시 테스트 모드로 동작
  if (!apiKey || !userId || !sender) {
    console.warn('Aligo SMS 환경변수 미설정 - 테스트 모드');
    return { result_code: 1, message: 'test mode', msg_id: 'test_' + Date.now(), success_cnt: 1, error_cnt: 0 };
  }

  const formData = new URLSearchParams();
  formData.append('key', apiKey);
  formData.append('user_id', userId);
  formData.append('sender', sender);
  formData.append('receiver', receiver.replace(/-/g, ''));
  formData.append('msg', message);
  // 테스트 모드 비활성화 (실제 발송)
  formData.append('testmode_yn', process.env.NODE_ENV === 'production' ? 'N' : 'Y');

  const res = await fetch(`${ALIGO_BASE_URL}/send/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  if (!res.ok) {
    throw new Error(`Aligo API HTTP error: ${res.status}`);
  }

  return res.json();
}

// SMS 로그 DB 기록
interface SmsLogEntry {
  reservationId: string | null;
  phone: string;
  messageType: SmsMessageType;
  status: string;
  retryCount: number;
  aligoMsgId: string | null;
  errorMessage: string | null;
}

async function logSms(entry: SmsLogEntry): Promise<void> {
  try {
    const supabase = createServerClient();
    await supabase.from('sms_logs').insert({
      reservation_id: entry.reservationId,
      phone: entry.phone,
      message_type: entry.messageType,
      status: entry.status,
      retry_count: entry.retryCount,
      aligo_msg_id: entry.aligoMsgId,
      error_message: entry.errorMessage,
    });
  } catch (error) {
    console.error('SMS 로그 기록 실패:', error);
  }
}
