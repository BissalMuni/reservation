// 이벤트 정보
export const EVENT_INFO = {
  name: '현장밀착 열린 세금상담회',
  organizer: '강남구청 / 한국세무사회',
  location: '강남구민회관',
  date: '2026-03-13',
  dateDisplay: '2026년 3월 12일 (목)',
  timeRange: '오후 4시 ~ 오후 6시',
} as const;

// 슬롯 구성
export const SLOT_CONFIG = {
  hourSlots: [16, 17] as const,         // 오후 4시, 오후 5시
  minuteSlots: [0, 20, 40] as const,    // 00분, 20분, 40분
  maxPerSubtime: 5,                      // 타임당 최대 예약 건수
  totalSlots: 6,                         // 총 슬롯 수 (2시간대 × 3타임)
  totalCapacity: 30,                     // 총 예약 가능 건수
} as const;

// 시간대 표시 레이블
export const HOUR_LABELS: Record<number, string> = {
  16: '오후 4시',
  17: '오후 5시',
};

// 분 표시 레이블
export const MINUTE_LABELS: Record<number, string> = {
  0: '00분',
  20: '20분',
  40: '40분',
};

// 상담 분야
export const CONSULTATION_TYPES = ['국세', '지방세', '기타'] as const;

// 상담 분야 설명
export const CONSULTATION_DESCRIPTIONS: Record<string, string> = {
  '국세': '종합소득세, 상속·증여세, 부가가치세 등',
  '지방세': '취득세, 재산세 등',
  '기타': '기타 세금 관련 상담',
};

// SMS 메시지 템플릿 (기본값, sms-templates.ts에서 상세 구현)
export const SMS_TEMPLATES = {
  confirmation: '예약 확인',
  reminder: '상담 5분 전 알림',
  cancellation: '예약 취소 확인',
} as const;

// 전화번호 유효성 검사 정규식
export const PHONE_REGEX = /^010-?\d{4}-?\d{4}$/;

// 전화번호 정규화 (하이픈 제거)
export function normalizePhone(phone: string): string {
  return phone.replace(/-/g, '');
}

// 전화번호 포맷팅 (하이픈 추가)
export function formatPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7)}`;
}

// 시간대 포맷팅
export function formatTimeSlot(hourSlot: number, minuteSlot: number): string {
  return `${HOUR_LABELS[hourSlot]} ${MINUTE_LABELS[minuteSlot]}`;
}
