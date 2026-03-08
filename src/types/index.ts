// 시간대 슬롯 타입
export interface TimeSlot {
  id: string;
  hourSlot: number;    // 16 = 오후 4시, 17 = 오후 5시
  minuteSlot: number;  // 0, 20, 40
  currentCount: number;
  maxCount: number;
}

// 슬롯 가용성 응답 타입
export interface SlotAvailability {
  hourSlot: number;
  minuteSlot: number;
  currentCount: number;
  maxCount: number;
  available: number;
}

// 상담 분야
export type ConsultCategory = '국세' | '지방세' | '기타';

// 예약 상태
export type ReservationStatus = 'active' | 'cancelled';

// 예약 타입
export interface Reservation {
  id: string;
  name: string;
  phone: string;
  hourSlot: number;
  minuteSlot: number;
  category: ConsultCategory;
  status: ReservationStatus;
  createdAt: string;
}

// SMS 발송 유형
export type SmsMessageType = 'confirmation' | 'reminder' | 'cancellation';

// SMS 발송 상태
export type SmsStatus = 'pending' | 'sent' | 'failed';

// SMS 로그 타입
export interface SmsLog {
  id: string;
  reservationId: string | null;
  phone: string;
  messageType: SmsMessageType;
  status: SmsStatus;
  retryCount: number;
  aligoMsgId: string | null;
  errorMessage: string | null;
  sentAt: string;
}

// API 응답 타입
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 예약 생성 요청 타입
export interface CreateReservationRequest {
  name: string;
  phone: string;
  hourSlot: number;
  minuteSlot: number;
  category: ConsultCategory;
}

// 예약 취소 요청 타입
export interface CancelReservationRequest {
  name: string;
  phone: string;
}

// 슬롯 현황 응답 타입
export interface SlotsResponse {
  slots: SlotAvailability[];
  totalReserved: number;
  totalCapacity: number;
}

// 관리자 예약 목록 응답 타입
export interface AdminReservationsResponse {
  reservations: Reservation[];
  summary: {
    total: number;
    active: number;
    cancelled: number;
    capacity: number;
  };
}

// RPC 함수 응답 타입
export interface RpcResponse {
  success: boolean;
  reservation_id?: string;
  error?: string;
  message?: string;
}
