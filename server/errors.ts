import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public userMessage: string;

  constructor(message: string, statusCode: number = 500, userMessage?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.userMessage = userMessage || message;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "You must be logged in to access this resource") {
    super(message, 401, message);
  }
}

export { UnauthorizedError as AuthError };

export class ForbiddenError extends AppError {
  constructor(message: string = "You don't have permission to access this resource") {
    super(message, 403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, `${resource} not found`);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, message);
  }
}

export class ExternalServiceError extends AppError {
  public service: string;
  public originalError?: Error;

  constructor(service: string, originalError?: Error) {
    const userMessage = getServiceErrorMessage(service, originalError);
    super(originalError?.message || `${service} service error`, 502, userMessage);
    this.service = service;
    this.originalError = originalError;
  }
}

function getServiceErrorMessage(service: string, error?: Error): string {
  const errorMsg = error?.message?.toLowerCase() || "";

  if (errorMsg.includes("insufficient permission") || errorMsg.includes("insufficient_scope")) {
    return `We need additional permissions to access your ${service} account. Please reconnect the service in Settings.`;
  }
  if (errorMsg.includes("invalid_grant") || errorMsg.includes("token expired") || errorMsg.includes("token has been expired")) {
    return `Your ${service} connection has expired. Please reconnect in Settings.`;
  }
  if (errorMsg.includes("rate limit") || errorMsg.includes("quota exceeded") || errorMsg.includes("too many requests")) {
    return `${service} is temporarily limiting requests. Please try again in a few minutes.`;
  }
  if (errorMsg.includes("not found") || errorMsg.includes("404")) {
    return `The requested ${service} resource was not found.`;
  }
  if (errorMsg.includes("unauthorized") || errorMsg.includes("401")) {
    return `Your ${service} session has expired. Please reconnect in Settings.`;
  }
  if (errorMsg.includes("forbidden") || errorMsg.includes("403")) {
    return `You don't have permission to access this ${service} resource.`;
  }
  if (errorMsg.includes("network") || errorMsg.includes("econnrefused") || errorMsg.includes("timeout")) {
    return `Unable to connect to ${service}. Please check your internet connection and try again.`;
  }
  if (errorMsg.includes("not connected")) {
    return `${service} is not connected. Please connect it in Settings.`;
  }

  return `There was a problem communicating with ${service}. Please try again later.`;
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function normalizeExternalError(service: string, error: any): AppError {
  if (error instanceof AppError) {
    return error;
  }
  return new ExternalServiceError(service, error);
}

export function globalErrorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    console.error(`[${err.statusCode}] ${req.method} ${req.path}: ${err.message}`);
    return res.status(err.statusCode).json({
      error: err.userMessage,
      ...(process.env.NODE_ENV === "development" && { details: err.message }),
    });
  }

  console.error(`[500] ${req.method} ${req.path}: ${err.message}`, err.stack);
  return res.status(500).json({
    error: "An unexpected error occurred. Please try again later.",
    ...(process.env.NODE_ENV === "development" && { details: err.message }),
  });
}

export function wrapExternalCall<T>(service: string, fn: () => Promise<T>): Promise<T> {
  return fn().catch((error) => {
    throw normalizeExternalError(service, error);
  });
}
