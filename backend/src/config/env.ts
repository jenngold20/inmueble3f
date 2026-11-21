import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Cargar .env desde backend o desde la raíz si no se encuentra local
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  POSTGRES_USER: z.string().min(1, 'POSTGRES_USER es requerido'),
  POSTGRES_PASSWORD: z.string().min(1, 'POSTGRES_PASSWORD es requerido'),
  POSTGRES_DB: z.string().min(1, 'POSTGRES_DB es requerido'),
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().default(5432),
  INGESTA_MAX_AVISOS_LOTE: z.coerce.number().int().positive().max(5000).default(500),
});

const parseEnv = () => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Error de validación en las variables de entorno:');
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    process.exit(1);
  }

  return parsed.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
