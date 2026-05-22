// ============================================================
// DibnowRepairSaaS — Custom Error Classes
// All errors extend AppError for consistent handling
// ============================================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean; // true = expected, false = bug

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// 400 — Bad input from client
export class ValidationError extends AppError {
  public readonly fields?: Record<string, string>;
  constructor(message: string, fields?: Record<string, string>) {
    super(message, 400);
    this.fields = fields;
  }
}

// 401 — Not authenticated
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

// 403 — Authenticated but no permission
export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403);
  }
}

// 404 — Resource not found
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

// 409 — Conflict (duplicate, state violation)
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

// 422 — Business rule violation
export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(message, 422);
  }
}

// 429 — Rate limit exceeded
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message, 429);
  }
}

// 402 — Payment required / payment failure
export class PaymentError extends AppError {
  public readonly gatewayCode?: string;
  constructor(message: string, gatewayCode?: string) {
    super(message, 402);
    this.gatewayCode = gatewayCode;
  }
}

// 423 — Tenant suspended / plan limit reached
export class TenantError extends AppError {
  constructor(message: string) {
    super(message, 423);
  }
}

// 500 — Unexpected internal error (non-operational)
export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred') {
    super(message, 500, false);
  }
}
