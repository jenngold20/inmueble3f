import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { z } from 'zod';

// Esquema Zod de prueba para validar que el runtime de TS y Zod funcionan
const FixtureInfoSchema = z.object({
  filename: z.string(),
  sizeBytes: z.number().nonnegative(),
  isHtml: z.boolean(),
});

type FixtureInfo = z.infer<typeof FixtureInfoSchema>;

const resolveFixturesDir = (): string => {
  // Soporta ejecución desde raíz o desde /scraper
  const candidate1 = path.resolve(process.cwd(), 'data', 'html-fixtures');
  const candidate2 = path.resolve(process.cwd(), '..', 'data', 'html-fixtures');

  if (fs.existsSync(candidate1)) return candidate1;
  if (fs.existsSync(candidate2)) return candidate2;

  throw new Error(`No se pudo localizar el directorio de fixtures en: ${candidate1} ni en ${candidate2}`);
};

export const runScrapeTest = (): void => {
  console.log('🤖 [Scraper CLI] Inicializando comprobación del entorno...');

  const fixturesDir = resolveFixturesDir();
  console.log(`📁 Directorio de fixtures detectado: ${fixturesDir}`);

  const files = fs.readdirSync(fixturesDir);
  console.log(`📄 Archivos encontrados en /data/html-fixtures: ${files.length}`);

  const verifiedFixtures: FixtureInfo[] = [];

  for (const file of files) {
    if (file === '.gitkeep') continue;

    const fullPath = path.join(fixturesDir, file);
    const stat = fs.statSync(fullPath);
    const isHtml = file.endsWith('.html') || file.endsWith('.htm');

    const fixtureInfo = FixtureInfoSchema.parse({
      filename: file,
      sizeBytes: stat.size,
      isHtml,
    });

    verifiedFixtures.push(fixtureInfo);

    if (isHtml) {
      const rawHtml = fs.readFileSync(fullPath, 'utf-8');
      const $ = cheerio.load(rawHtml);
      const title = $('title').text() || $('h1').text() || 'Sin título';
      console.log(`  ✓ Parseado con Cheerio: "${file}" -> Título: "${title}" (${stat.size} bytes)`);
    }
  }

  console.log('✅ Entorno de ejecución TypeScript y dependencias (Cheerio + Zod) completamente OPERATIVOS.');
};

runScrapeTest();
