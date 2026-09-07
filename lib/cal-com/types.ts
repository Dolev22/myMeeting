export type CalComTriggerEvent =
  | "BOOKING_CREATED"
  | "BOOKING_RESCHEDULED"
  | "BOOKING_CANCELLED"
  | "MEETING_ENDED"
  | string;

export interface CalComAttendee {
  email?: string;
  name?: string;
}

export interface CalComOrganizer {
  email?: string;
  username?: string;
  name?: string;
}

export interface CalComBookingPayload {
  uid?: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  videoCallUrl?: string;
  organizer?: CalComOrganizer;
  attendees?: CalComAttendee[];
  rescheduleUid?: string;
}

export interface CalComWebhookBody {
  triggerEvent: CalComTriggerEvent;
  payload: CalComBookingPayload;
}
