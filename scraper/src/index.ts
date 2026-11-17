import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsearArgenprop } from './parsers/argenprop.parser.js';
import { AvisoCrudoSchema, type AvisoCrudo } from './schemas/aviso-crudo.schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveFixturesDir = (): string => {
  const candidates = [
    path.resolve(__dirname, '../../data/html-fixtures'),
    path.resolve(process.cwd(), 'data/html-fixtures'),
    path.resolve(process.cwd(), '../data/html-fixtures'),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }

  throw new Error(`No se pudo localizar el directorio de fixtures en: ${candidates.join(', ')}`);
};

export const runScrapeTest = (): void => {
  console.log('🤖 ========================================================');
  console.log('   SUITE DE EXTRACCIÓN OFFLINE DE ARGENPROP (CARD-ING-01A)');
  console.log('   Plataforma Inmobiliaria Tres de Febrero');
  console.log('========================================================\n');

  const fixturesDir = resolveFixturesDir();
  console.log(`📁 Directorio de fixtures: ${fixturesDir}`);

  const files = fs.readdirSync(fixturesDir).filter((f) => f.endsWith('.html') || f.endsWith('.htm'));
  console.log(`📄 Archivos HTML encontrados: ${files.length}\n`);

  let totalAvisosExtraidos = 0;
  let totalValidadosZod = 0;

  for (const file of files) {
    const fullPath = path.join(fixturesDir, file);
    const html = fs.readFileSync(fullPath, 'utf-8');
    const url = `https://www.argenprop.com/test/${file}`;

    console.log(`🔍 [Procesando]: "${file}" (${(html.length / 1024).toFixed(1)} KB)`);

    const avisos: AvisoCrudo[] = parsearArgenprop(html, url);
    console.log(`   📦 Avisos detectados: ${avisos.length}`);

    if (avisos.length === 0) {
      console.warn(`   ⚠️ No se pudieron extraer avisos de: ${file}`);
      continue;
    }

    for (const [idx, aviso] of avisos.entries()) {
      totalAvisosExtraidos++;

      // Validación estricta con Zod
      const validacion = AvisoCrudoSchema.safeParse(aviso);

      if (validacion.success) {
        totalValidadosZod++;
        const p = aviso.precio ? `${aviso.moneda} ${aviso.precio.toLocaleString('es-AR')}` : 'Consultar';
        const m2 = aviso.superficieCubiertaM2 ? `${aviso.superficieCubiertaM2} m² cub.` : 'Sin m²';
        const geo = aviso.lat && aviso.lng ? `GPS: [${aviso.lat}, ${aviso.lng}]` : 'Sin GPS (Georef)';

        console.log(`   ────────────────────────────────────────────────────────`);
        console.log(`   #${idx + 1} | [${aviso.tipo.toUpperCase()}] ${aviso.titulo.slice(0, 50)}...`);
        console.log(`      💰 Precio: ${p} | Operación: ${aviso.operacion.toUpperCase()}`);
        console.log(`      📐 Superficie: ${m2} (Total: ${aviso.superficieTotalM2 || '-'} m²)`);
        console.log(`      📍 Dirección: "${aviso.direccion}" (${aviso.localidad})`);
        console.log(`      🌐 ${geo} | 📷 Fotos: ${aviso.fotos.length}`);
        console.log(`      🏢 Anunciante: ${aviso.anunciante || 'Inmobiliaria no especificada'}`);
        console.log(`      ✅ ZOD VALID: OK (idExterno: ${aviso.idExterno})`);
      } else {
        console.error(`   ❌ [ZOD ERROR en aviso #${idx + 1}]:`, validacion.error.format());
      }
    }
    console.log('');
  }

  console.log('========================================================');
  console.log(`🎉 RESUMEN DE EXTRACCIÓN:`);
  console.log(`   - Avisos extraídos en total: ${totalAvisosExtraidos}`);
  console.log(`   - Avisos 100% validados con Zod: ${totalValidadosZod}/${totalAvisosExtraidos}`);
  console.log('========================================================\n');

  if (totalAvisosExtraidos === 0 || totalValidadosZod !== totalAvisosExtraidos) {
    process.exit(1);
  }
};

runScrapeTest();
