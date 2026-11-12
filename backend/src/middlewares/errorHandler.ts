import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../types/errors.js';

export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no cumplen con el esquema de validación',
        details: err.issues,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Error genérico no controlado (500)
  const message = err instanceof Error ? err.message : 'Error interno del servidor';
  console.error('[Unhandled Error]:', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error inesperado en el servidor',
      details: process.env.NODE_ENV === 'development' ? message : undefined,
    },
  });
};
