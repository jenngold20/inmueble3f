import type { NextFunction, Request, Response } from 'express';
import * as scrapersService from '../services/scrapers.service.js';

/**
 * Retorna el estado consolidado de salud de los scrapers inmobiliarios
 * y el detalle por fuente para el semáforo del Navbar (CARD-MTR-16).
 */
export const getStatus = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await scrapersService.obtenerEstadoScrapers();

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};
