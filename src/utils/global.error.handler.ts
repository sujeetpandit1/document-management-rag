import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

// Winston Logger Configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
    }),
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';
    let details: any = null;
    let stack: string | undefined;
    let origin: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        // Handle NotFoundException specifically
        if (status === HttpStatus.NOT_FOUND) {
          errorCode = 'NOT_FOUND';
          message = `Resource not found at ${request.method} ${request.url}`;
        } else if (status === HttpStatus.BAD_REQUEST) {
          errorCode = 'VALIDATION_ERROR';
        }
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as any;
        message = resObj.message || message;
        errorCode = (resObj.error || errorCode).toString().toUpperCase();
        details = resObj.details || null;
        
        // Standardize validation errors
        if (Array.isArray(resObj.message) && status === HttpStatus.BAD_REQUEST) {
          errorCode = 'VALIDATION_ERROR';
          details = resObj.message.map(err => ({
            field: err.property,
            constraints: err.constraints
          }));
          message = 'Validation failed';
        }
      }

      if (exception instanceof Error) {
        stack = exception.stack;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      stack = exception.stack;

      // Standardize error codes for common error types
      switch (exception.name) {
        case 'ValidationError':
          status = HttpStatus.BAD_REQUEST;
          errorCode = 'VALIDATION_ERROR';
          if (exception.message.includes('validation')) {
            message = 'Validation failed';
          }
          break;
        case 'EntityNotFoundError':
          status = HttpStatus.NOT_FOUND;
          errorCode = 'NOT_FOUND';
          message = 'Requested resource not found';
          break;
        case 'UnauthorizedError':
          status = HttpStatus.UNAUTHORIZED;
          errorCode = 'UNAUTHORIZED';
          break;
        case 'ForbiddenError':
          status = HttpStatus.FORBIDDEN;
          errorCode = 'FORBIDDEN';
          break;
        default:
          errorCode = exception.name?.toUpperCase() || errorCode;
          // Ensure error code doesn't contain spaces
      // Ensure consistent error code formatting
      errorCode = errorCode.toString().toUpperCase().replace(/\s+/g, '_');
      }
    }

    // Extract file and line number from stack trace
    if (stack) {
      const stackLines = stack.split('\n');
      const relevantLine = stackLines.find(
        (line) => line.includes('.ts') || line.includes('.js'),
      );
      origin = relevantLine?.trim();
    }

    logger.error({
      timestamp: new Date().toISOString(),
      message,
      errorCode,
      status,
      method: request.method,
      path: request.url,
      stack,
      origin,
      details,
    });

    const errorResponse: Record<string, any> = {
      statusCode: status,
      message,
      errorCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      details,
    };

    if (process.env.NODE_ENV !== 'production') {
      errorResponse.origin = origin;
    }

    response.status(status).json(errorResponse);
  }
}
