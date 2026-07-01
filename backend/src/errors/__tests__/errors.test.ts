import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorisedError,
  ForbiddenError,
  ConflictError,
  BusinessRuleError,
} from '../index';

describe('AppError', () => {
  it('sets message, statusCode, isOperational correctly', () => {
    const err = new AppError('Something broke', 500);
    expect(err.message).toBe('Something broke');
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(true);
  });

  it('defaults statusCode to 500', () => {
    const err = new AppError('oops');
    expect(err.statusCode).toBe(500);
  });

  it('is instance of Error', () => {
    expect(new AppError('x')).toBeInstanceOf(Error);
  });

  it('captures stack trace', () => {
    const err = new AppError('x');
    expect(err.stack).toBeDefined();
  });
});

describe('ValidationError', () => {
  it('has statusCode 400', () => {
    expect(new ValidationError('bad input').statusCode).toBe(400);
  });

  it('stores fields', () => {
    const err = new ValidationError('invalid', { email: 'Required' });
    expect(err.fields).toEqual({ email: 'Required' });
  });

  it('fields optional', () => {
    expect(new ValidationError('bad').fields).toBeUndefined();
  });
});

describe('NotFoundError', () => {
  it('has statusCode 404', () => {
    expect(new NotFoundError('not found').statusCode).toBe(404);
  });
});

describe('UnauthorisedError', () => {
  it('has statusCode 401', () => {
    expect(new UnauthorisedError().statusCode).toBe(401);
  });

  it('default message is Unauthorised', () => {
    expect(new UnauthorisedError().message).toBe('Unauthorised');
  });

  it('accepts custom message', () => {
    expect(new UnauthorisedError('Token expired').message).toBe('Token expired');
  });
});

describe('ForbiddenError', () => {
  it('has statusCode 403', () => {
    expect(new ForbiddenError().statusCode).toBe(403);
  });

  it('default message is Forbidden', () => {
    expect(new ForbiddenError().message).toBe('Forbidden');
  });
});

describe('ConflictError', () => {
  it('has statusCode 409', () => {
    expect(new ConflictError('duplicate').statusCode).toBe(409);
  });
});

describe('BusinessRuleError', () => {
  it('has statusCode 422', () => {
    expect(new BusinessRuleError('rule violation').statusCode).toBe(422);
  });
});