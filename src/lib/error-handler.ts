import { NextResponse } from 'next/server';
import { z } from 'zod';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleApiError(error: unknown) {
  console.error('API Error:', error);

  if (error instanceof AppError) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        code: error.code 
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof z.ZodError) {
    const errorMessage = error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Validation error: ${errorMessage}`,
        code: 'VALIDATION_ERROR'
      },
      { status: 400 }
    );
  }

  if (error instanceof Error) {
    // En producción, no exponer detalles del error
    const message = process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message;
    
    return NextResponse.json(
      { 
        success: false, 
        error: message,
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { 
      success: false, 
      error: 'Unknown error occurred',
      code: 'UNKNOWN_ERROR'
    },
    { status: 500 }
  );
}

// Wrapper para APIs que maneja errores automáticamente
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// Rate limiting simple
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(ip: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const current = requestCounts.get(ip);
  
  if (!current || current.resetTime < windowStart) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}
