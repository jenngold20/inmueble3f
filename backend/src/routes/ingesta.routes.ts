import { Router } from 'express';
import { postAvisos } from '../controllers/ingesta.controller.js';
import { validateSchema } from '../middlewares/validateSchema.js';
import { IngestaLoteSchema } from '../schemas/ingesta.schema.js';

export const ingestaRouter = Router();

ingestaRouter.post('/avisos', validateSchema(IngestaLoteSchema, 'body'), postAvisos);
