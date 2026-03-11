import { SolapiMessageService } from 'solapi';
import { createServerClient } from './supabase';
import type { SmsMessageType } from '@/types';

// SMS 발송 결과 타입
interface SmsResult {
  success: boolean;
  messageId?: string;
  message: string;
}

// SMS 발송 옵션
interface SendSmsOptions {
  receiver: string;
  message: string;
  reservationId?: string;
  messageType: SmsMessageType;
}

const MAX_RETRY = 3;

// SOLAPI 클라이언트 생성
function getSolapiClient(): SolapiMessageService | null {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;

  if (!apiKey || !apiSecret) {
    return null;
  }

  return new SolapiMessageService(apiKey, apiSecret);
}

// SMS 발송 함수
export async function sendSms(options: SendSmsOptions): Promise<SmsResult> {
  const { receiver, message, reservationId, messageType } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    try {
      const result = await callSolapiApi(receiver, message);

      // SMS 로그 기록
      await logSms({
        reservationId: reservationId || null,
        phone: receiver,
        messageType,
        status: result.success ? 'sent' : 'failed',
        retryCount: attempt,
        messageId: result.messageId || null,
        errorMessage: result.success ? null : result.message,
      });

      // 성공 시 반환
      if (result.success) {
        return result;
      }

      lastError = new Error(result.message);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 실패 로그 기록
      await logSms({
        reservationId: reservationId || null,
        phone: receiver,
        messageType,
        status: 'failed',
        retryCount: attempt,
        messageId: null,
        errorMessage: lastError.message,
      });
    }
  }

  // 모든 재시도 실패
  console.error(`SMS 발송 최종 실패 (${MAX_RETRY}회 시도):`, lastError?.message);
  return { success: false, message: lastError?.message || 'Unknown error' };
}

// SOLAPI API 호출
async function callSolapiApi(receiver: string, message: string): Promise<SmsResult> {
  const client = getSolapiClient();
  const sender = process.env.SOLAPI_SENDER;

  // 환경변수 미설정 시 테스트 모드로 동작
  if (!client || !sender) {
    console.warn('SOLAPI SMS 환경변수 미설정 - 테스트 모드');
    return { success: true, messageId: 'test_' + Date.now(), message: 'test mode' };
  }

  // SOLAPI는 한글 45자 / 영자 90자 초과 시 자동으로 LMS 전환
  const res = await client.send({
    to: receiver.replace(/-/g, ''),
    from: sender,
    text: message,
  });

  const groupInfo = res.groupInfo;
  if (groupInfo && groupInfo.count && groupInfo.count.total > 0) {
    return {
      success: true,
      messageId: groupInfo.groupId,
      message: 'sent',
    };
  }

  return {
    success: false,
    message: '발송 실패',
  };
}

// SMS 로그 DB 기록
interface SmsLogEntry {
  reservationId: string | null;
  phone: string;
  messageType: SmsMessageType;
  status: string;
  retryCount: number;
  messageId: string | null;
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
      aligo_msg_id: entry.messageId,
      error_message: entry.errorMessage,
    });
  } catch (error) {
    console.error('SMS 로그 기록 실패:', error);
  }
}
