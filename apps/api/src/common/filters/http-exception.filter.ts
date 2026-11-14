import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ERROR_CODES, ErrorCode } from '@cahootz/shared';
import { AppError } from '../errors/app-error';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string) || (request as any).requestId;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCode = ERROR_CODES.INTERNAL_ERROR;
    let message = 'An unexpected error occurred';
    let details: unknown = undefined;

    if (exception instanceof AppError) {
      status = exception.httpStatus;
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();

      if (typeof responseBody === 'string') {
        message = responseBody;
      } else if (typeof responseBody === 'object' && responseBody !== null) {
        const body = responseBody as Record<string, any>;
        message = body.message || exception.message;
        details = body.details || (Array.isArray(body.message) ? body.message : undefined);

        // Map standard NestJS status to our ErrorCode
        if (status === HttpStatus.BAD_REQUEST || status === HttpStatus.UNPROCESSABLE_ENTITY) {
          code = ERROR_CODES.VALIDATION_FAILED;
        } else if (status === HttpStatus.UNAUTHORIZED) {
          code = ERROR_CODES.UNAUTHENTICATED;
        } else if (status === HttpStatus.FORBIDDEN) {
          code = ERROR_CODES.FORBIDDEN;
        } else if (status === HttpStatus.NOT_FOUND) {
          code = ERROR_CODES.NOT_FOUND;
        } else if (status === HttpStatus.CONFLICT) {
          code = ERROR_CODES.CONFLICT;
        } else if (status === HttpStatus.TOO_MANY_REQUESTS) {
          code = ERROR_CODES.RATE_LIMITED;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled error [${requestId}]: ${exception.message}`,
        exception.stack,
      );
    }

    // Never leak internal stack traces or database errors in production
    if (status === HttpStatus.INTERNAL_SERVER_ERROR && process.env.NODE_ENV === 'production') {
      message = 'An internal server error occurred';
      details = undefined;
    }

    response.status(status).json({
      error: {
        code,
        message,
        details,
        requestId,
      },
    });
  }
}
