import { EVENT_INFO, formatTimeSlot } from './constants';

interface TemplateParams {
  name: string;
  hourSlot: number;
  minuteSlot: number;
  category: string;
}

// 예약 확인 문자 템플릿
export function confirmationMessage(params: TemplateParams): string {
  return `[${EVENT_INFO.name}] 예약 확인
${params.name}님, 예약이 완료되었습니다.

▶ 일시: ${EVENT_INFO.dateDisplay} ${formatTimeSlot(params.hourSlot, params.minuteSlot)}
▶ 분야: ${params.category}
▶ 장소: ${EVENT_INFO.location}

예약 취소는 예약 페이지에서 가능합니다.`;
}

// 상담 5분 전 알림 문자 템플릿
export function reminderMessage(params: TemplateParams): string {
  return `[${EVENT_INFO.name}] 상담 알림
${params.name}님, 상담 시간이 5분 후입니다.

▶ 시간: ${formatTimeSlot(params.hourSlot, params.minuteSlot)}
▶ 분야: ${params.category}
▶ 장소: ${EVENT_INFO.location}

잠시 후 상담이 시작됩니다.`;
}

// 예약 취소 확인 문자 템플릿
export function cancellationMessage(params: TemplateParams): string {
  return `[${EVENT_INFO.name}] 예약 취소
${params.name}님, 예약이 취소되었습니다.

▶ 취소된 시간: ${formatTimeSlot(params.hourSlot, params.minuteSlot)}
▶ 분야: ${params.category}

재예약을 원하시면 예약 페이지를 방문해주세요.`;
}
