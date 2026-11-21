import { NextFunction, Request, Response } from 'express';
import * as ingestaService from '../services/ingesta.service.js';
import type { IngestaLote } from '../types/ingesta.types.js';

/**
 * Handler delgado: el body ya fue validado por `validateSchema` y la
 * validación por registro vive en el servicio (D2).
 */
export const postAvisos = async (
  req: Request<Record<string, string>, unknown, IngestaLote>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const resultado = await ingestaService.procesarLoteAvisos(req.body);

    res.status(resultado.nuevos > 0 ? 201 : 200).json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    next(error);
  }
};
