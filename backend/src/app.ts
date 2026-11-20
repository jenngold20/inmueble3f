import express, { Express } from 'express';
import cors from 'cors';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

export const createApp = (): Express => {
  const app = express();

  // Middlewares globales
  app.use(cors());
  // 2 MB: el default de 100 kB no alcanza para lotes con descripción y fotos.
  app.use(express.json({ limit: '2mb' }));

  // Rutas base de la API
  app.use('/api', apiRouter);

  // Middleware centralizado de errores
  app.use(errorHandler);

  return app;
};
