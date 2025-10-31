/**
 * Custom Error Classes
 * Provides structured error handling with proper HTTP status codes
 */

/**
 * Base API Error class
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 - Bad Request
 */
class BadRequestError extends ApiError {
  constructor(message = 'Bad request', details = null) {
    super(message, 400);
    this.name = 'BadRequestError';
    this.details = details;
  }
}

/**
 * 401 - Unauthorized
 */
class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 402 - Payment Required
 */
class PaymentRequiredError extends ApiError {
  constructor(message = 'Insufficient credits', creditsNeeded = 1) {
    super(message, 402);
    this.name = 'PaymentRequiredError';
    this.creditsNeeded = creditsNeeded;
  }
}

/**
 * 403 - Forbidden
 */
class ForbiddenError extends ApiError {
  constructor(message = 'Access forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * 404 - Not Found
 */
class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * 409 - Conflict
 */
class ConflictError extends ApiError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * 422 - Unprocessable Entity
 */
class ValidationError extends ApiError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 422);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * 429 - Too Many Requests
 */
class RateLimitError extends ApiError {
  constructor(message = 'Rate limit exceeded', retryAfter = null) {
    super(message, 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * 500 - Internal Server Error
 */
class InternalServerError extends ApiError {
  constructor(message = 'Internal server error') {
    super(message, 500, false); // Not operational
    this.name = 'InternalServerError';
  }
}

/**
 * 503 - Service Unavailable
 */
class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503);
    this.name = 'ServiceUnavailableError';
  }
}

module.exports = {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  PaymentRequiredError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError
};
