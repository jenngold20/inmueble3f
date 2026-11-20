import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsearArgenprop } from '../parsers/argenprop.parser.js';
import { AvisoCrudoSchema, type AvisoCrudo } from '../schemas/aviso-crudo.schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolverDirectorio = (candidatos: string[], descripcion: string): string => {
  for (const candidato of candidatos) {
    if (fs.existsSync(candidato)) return candidato;
  }

  throw new Error(`No se pudo localizar ${descripcion} en: ${candidatos.join(', ')}`);
};

const fixturesDir = resolverDirectorio(
  [
    path.resolve(__dirname, '../../data/html-fixtures'),
    path.resolve(process.cwd(), 'data/html-fixtures'),
    path.resolve(process.cwd(), '../data/html-fixtures'),
  ],
  'el directorio de fixtures HTML'
);

const dataDir = resolverDirectorio(
  [
    path.resolve(__dirname, '../../data'),
    path.resolve(process.cwd(), 'data'),
    path.resolve(process.cwd(), '../data'),
  ],
  'el directorio /data'
);

const archivos = fs
  .readdirSync(fixturesDir)
  .filter((archivo) => archivo.endsWith('.html') || archivo.endsWith('.htm'));

const porClave = new Map<string, AvisoCrudo>();

for (const archivo of archivos) {
  const html = fs.readFileSync(path.join(fixturesDir, archivo), 'utf-8');
  const url = `https://www.argenprop.com/test/${archivo}`;
  const avisos = parsearArgenprop(html, url);

  for (const aviso of avisos) {
    const validado = AvisoCrudoSchema.safeParse(aviso);

    if (!validado.success) continue;

    porClave.set(`${validado.data.fuente}:${validado.data.idExterno}`, validado.data);
  }
}

const avisos = [...porClave.values()];
const salida = path.join(dataDir, 'fixtures', 'avisos-argenprop.json');

fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, `${JSON.stringify(avisos, null, 2)}\n`, 'utf-8');

console.log(`Fixture generado con ${avisos.length} avisos validados: ${salida}`);
