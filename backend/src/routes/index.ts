import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { ingestaRouter } from './ingesta.routes.js';
import { scrapersRouter } from './scrapers.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/ingesta', ingestaRouter);
apiRouter.use('/scrapers', scrapersRouter);

