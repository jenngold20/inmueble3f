import { Request, Response, NextFunction } from 'express';
import * as healthService from '../services/health.service.js';

export const getHealth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const health = await healthService.checkHealth();

    res.status(200).json({
      success: true,
      status: health.status,
      db: health.db,
      timestamp: health.timestamp,
      data: health,
    });
  } catch (error) {
    next(error);
  }
};
