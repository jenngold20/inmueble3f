import { Router } from 'express';
import { getStatus } from '../controllers/scrapers.controller.js';

export const scrapersRouter = Router();

scrapersRouter.get('/status', getStatus);
