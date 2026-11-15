import { AppError } from '../../common/errors/app-error.ts';

/**
 * R3 Voice/Video Room Interface Stub (Out of MVP Scope per Approval Rule).
 * Fails closed until Release R3 is approved by the founder.
 */
export class VideoRoomService {
  issueRoomToken(): never {
    throw AppError.forbidden('Voice and video study rooms are out of MVP scope (scheduled for Release R3).');
  }
}

