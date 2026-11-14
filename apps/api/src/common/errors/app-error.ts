import { HttpStatus } from './http-status.ts';
import { ERROR_CODES, type ErrorCode } from '../../../../../packages/shared/src/index.ts';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: HttpStatus;
  public readonly details?: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: unknown,
  ) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static validationFailed(message: string, details?: unknown) {
    return new AppError(ERROR_CODES.VALIDATION_FAILED, message, HttpStatus.UNPROCESSABLE_ENTITY, details);
  }

  static unauthenticated(message = 'Authentication required') {
    return new AppError(ERROR_CODES.UNAUTHENTICATED, message, HttpStatus.UNAUTHORIZED);
  }

  static forbidden(message = 'Access forbidden') {
    return new AppError(ERROR_CODES.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(ERROR_CODES.NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }

  static conflict(message: string, details?: unknown) {
    return new AppError(ERROR_CODES.CONFLICT, message, HttpStatus.CONFLICT, details);
  }

  static rateLimited(message = 'Too many requests, please try again later') {
    return new AppError(ERROR_CODES.RATE_LIMITED, message, HttpStatus.TOO_MANY_REQUESTS);
  }

  static invalidState(message: string, details?: unknown) {
    return new AppError(ERROR_CODES.INVALID_STATE, message, HttpStatus.CONFLICT, details);
  }

  static idempotencyConflict(message = 'Request already processed or currently in progress') {
    return new AppError(ERROR_CODES.IDEMPOTENCY_CONFLICT, message, HttpStatus.CONFLICT);
  }
}
