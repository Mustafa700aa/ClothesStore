export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number = 400, code: string = 'BAD_REQUEST', details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', id?: string) {
    super(id ? `${resource} with id "${id}" was not found` : `${resource} was not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden action') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class InsufficientStockError extends AppError {
  public readonly productName: string;
  public readonly available: number;
  public readonly requested: number;

  constructor(productName: string, available: number, requested: number) {
    super(
      `Insufficient stock for "${productName}". Available: ${available}, Requested: ${requested}`,
      409,
      'INSUFFICIENT_STOCK',
      { productName, available, requested }
    );
    this.productName = productName;
    this.available = available;
    this.requested = requested;
  }
}

export class InvalidTransitionError extends AppError {
  constructor(fromStatus: string, toStatus: string) {
    super(
      `Cannot transition order status from "${fromStatus}" to "${toStatus}"`,
      422,
      'INVALID_TRANSITION',
      { fromStatus, toStatus }
    );
  }
}
