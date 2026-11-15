import { AppError } from '../../common/errors/app-error.ts';

/**
 * R3 AI Study Assistant Interface Stub (Out of MVP Scope per Approval Rule).
 * Fails closed until Release R3 is approved by the founder.
 */
export class AiAssistantService {
  generateStudyQuiz(): never {
    throw AppError.forbidden('AI Study Assistant is out of MVP scope (scheduled for Release R3).');
  }
}

