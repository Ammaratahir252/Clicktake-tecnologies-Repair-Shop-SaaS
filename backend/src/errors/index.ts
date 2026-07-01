export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode    = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

export class ValidationError extends AppError {
  public readonly fields?: Record<string, string>;
  constructor(message: string, fields?: Record<string, string>) {
    super(message, 400);
    this.fields = fields;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) { super(message, 404); }
}

export class UnauthorisedError extends AppError {
  constructor(message = 'Unauthorised') { super(message, 401); }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') { super(message, 403); }
}

export class ConflictError extends AppError {
  constructor(message: string) { super(message, 409); }
}

export class BusinessRuleError extends AppError {
  constructor(message: string) { super(message, 422); }
}
export class InternalError extends AppError {
  constructor(message = 'Internal server error') { super(message, 500); }
}
export class PaymentError extends AppError {
  constructor(message: string) { super(message, 402); }
}