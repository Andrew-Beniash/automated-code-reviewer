import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';
import { loggerWrapper as logger } from '../config/logger';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';

interface ErrorResponse {
  status: string;
  message: string;
  errors?: Record<string, string[]>;
  stack?: string;
}

// Error handling middleware must have 4 parameters to be recognized by Express
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Default error response
  const response: ErrorResponse = {
    status: 'error',
    message: 'Internal server error',
  };

  // Handle known errors
  if (err instanceof AppError) {
    response.status = 'fail';
    response.message = err.message;
    
    if (err instanceof ValidationError) {
      response.errors = err.errors;
    }

    // Only show stack trace in development
    if (process.env.NODE_ENV === 'development') {
      response.stack = err.stack;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle TypeORM errors
  if (err instanceof QueryFailedError) {
    response.status = 'fail';
    response.message = 'Database operation failed';
    
    if (err.message.includes('duplicate key')) {
      response.message = 'Duplicate entry found';
      res.status(409).json(response);
      return;
    }

    res.status(400).json(response);
    return;
  }

  // Handle TypeORM not found errors
  if (err instanceof EntityNotFoundError) {
    response.status = 'fail';
    response.message = 'Resource not found';
    res.status(404).json(response);
    return;
  }

  // Handle MongoDB duplicate key errors
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    response.status = 'fail';
    response.message = 'Duplicate key error';
    res.status(409).json(response);
    return;
  }

  // Default error response for unknown errors
  if (process.env.NODE_ENV === 'development') {
    response.message = err.message;
    response.stack = err.stack;
  }

  res.status(500).json(response);
  return;
};

// Type-safe process event handlers
export const setupErrorHandlers = (): void => {
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled Promise Rejection:', {
      error: reason instanceof Error ? reason.message : 'Unknown error'
    });
    // Give the server time to handle remaining requests before shutting down
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', {
      error: error.message,
      stack: error.stack
    });
    // Give the server time to handle remaining requests before shutting down
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
};