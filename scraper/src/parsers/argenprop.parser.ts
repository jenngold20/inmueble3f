import * as cheerio from 'cheerio';
import {
  AvisoCrudoSchema,
  type AvisoCrudo,
  type TipoInmueble,
  type TipoOperacion,
  type Moneda,
} from '../schemas/aviso-crudo.schema.js';

/* ==========================================================================
   HELPERS DE NORMALIZACIÓN Y LIMPIEZA DE DATOS
   ========================================================================== */

/**
 * Normaliza strings de precios ("USD 2.500", "U$S 1.500 + IVA", "$ 850.000")
 * reconociendo miles y separando el código de moneda oficial.
 */
export function normalizarPrecioMoneda(raw: string | null | undefined): {
  precio: number | null;
  moneda: Moneda;
} {
  if (!raw || typeof raw !== 'string') {
    return { precio: null, moneda: 'USD' };
  }

  const texto = raw.trim().toUpperCase();

  // Detección de moneda
  let moneda: Moneda = 'USD';
  if (texto.includes('ARS') || texto.includes('PESO') || (texto.startsWith('$') && !texto.includes('U$S') && !texto.includes('USD'))) {
    moneda = 'ARS';
  } else if (texto.includes('USD') || texto.includes('U$S') || texto.includes('US$')) {
    moneda = 'USD';
  }

  // Si dice "consultar precio" o no tiene números
  if (texto.includes('CONSULTAR') || texto.includes('PRECIO A CONVENIR')) {
    return { precio: null, moneda };
  }

  // Extraer dígitos (removiendo puntos de miles argentinos, ej: "850.000" -> "850000")
  const digitos = texto.replace(/[^0-9]/g, '');
  if (!digitos) {
    return { precio: null, moneda };
  }

  const numero = parseInt(digitos, 10);
  return {
    precio: isNaN(numero) ? null : numero,
    moneda,
  };
}

/**
 * Normaliza valores de superficie ("450 m²", "600 m2 cubiertos", "1.200 m²")
 */
export function normalizarSuperficie(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return raw > 0 ? raw : null;

  const texto = String(raw).trim().toLowerCase();
  const digitos = texto.replace(/[^0-9]/g, '');
  if (!digitos) return null;

  const numero = parseInt(digitos, 10);
  return isNaN(numero) || numero <= 0 ? null : numero;
}

/**
 * Mapea tipologías textuales a los 4 enums oficiales del proyecto:
 * 'local' | 'galpon' | 'oficina' | 'terreno'
 */
export function normalizarTipoInmueble(raw: string | null | undefined): TipoInmueble {
  if (!raw) return 'galpon';
  const t = raw.trim().toLowerCase();

  if (
    t.includes('galpon') ||
    t.includes('galpón') ||
    t.includes('deposito') ||
    t.includes('depósito') ||
    t.includes('nave') ||
    t.includes('industrial') ||
    t.includes('tinglado') ||
    t.includes('bodega')
  ) {
    return 'galpon';
  }

  if (t.includes('local') || t.includes('comercial') || t.includes('negocio') || t.includes('fondo de comercio')) {
    return 'local';
  }

  if (t.includes('oficina') || t.includes('consultorio') || t.includes('estudio')) {
    return 'oficina';
  }

  if (t.includes('terreno') || t.includes('lote') || t.includes('fraccion') || t.includes('fracción')) {
    return 'terreno';
  }

  return 'galpon';
}

/**
 * Mapea operaciones textuales a 'venta' | 'alquiler'
 */
export function normalizarOperacion(raw: string | null | undefined): TipoOperacion {
  if (!raw) return 'alquiler';
  const t = raw.trim().toLowerCase();
  if (t.includes('venta') || t.includes('vende') || t.includes('sale') || t.includes('comprar')) {
    return 'venta';
  }
  return 'alquiler';
}

/**
 * Detecta y extrae la localidad oficial de Tres de Febrero
 */
export function normalizarLocalidad(raw: string | null | undefined): string {
  if (!raw) return 'Caseros';
  const t = raw.toLowerCase();

  const localidadesOficiales = [
    'Caseros',
    'Villa Bosch',
    'Ciudadela',
    'Loma Hermosa',
    'Santos Lugares',
    'Ciudad Jardín',
    'El Palomar',
    'Pablo Podestá',
    'Churruca',
    'Remedios de Escalada',
    'Martín Coronado',
    'Sáenz Peña',
    'José Ingenieros',
    '11 de Septiembre',
  ];

  for (const loc of localidadesOficiales) {
    if (t.includes(loc.toLowerCase())) {
      return loc;
    }
  }

  return 'Caseros';
}

/* ==========================================================================
   ESTRATEGIA 1: EXTRACCIÓN DESDE JSON EMBEBIDO (__NEXT_DATA__ / LD+JSON)
   ========================================================================== */

interface NextDataProperty {
  id?: string;
  title?: string;
  description?: string;
  propertyType?: string;
  operationType?: string;
  price?: { amount?: number; currency?: string };
  location?: {
    address?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  };
  surface?: { covered?: number; total?: number };
  advertiser?: { name?: string; phone?: string };
  photos?: string[];
  [key: string]: unknown;
}

function extraerDesdeNextData($: cheerio.CheerioAPI, url: string): AvisoCrudo | null {
  const scriptTag = $('script#__NEXT_DATA__').html();
  if (!scriptTag) return null;

  try {
    const json = JSON.parse(scriptTag.trim());
    const prop: NextDataProperty | undefined =
      json?.props?.pageProps?.property || json?.props?.pageProps?.listing;

    if (!prop || !prop.title) return null;

    const precio = prop.price?.amount ?? null;
    const moneda = prop.price?.currency === 'ARS' ? 'ARS' : 'USD';
    const direccion = prop.location?.address || prop.title;
    const localidad = normalizarLocalidad(prop.location?.city || prop.location?.state || direccion);
    const tipo = normalizarTipoInmueble(prop.propertyType || prop.title);
    const operacion = normalizarOperacion(prop.operationType);

    const avisoData = {
      idExterno: prop.id ? String(prop.id) : `arg-${Date.now()}`,
      fuente: 'argenprop' as const,
      url,
      titulo: prop.title.trim(),
      descripcion: prop.description || null,
      tipo,
      operacion,
      precio,
      moneda,
      direccion,
      localidad,
      lat: prop.location?.latitude ?? null,
      lng: prop.location?.longitude ?? null,
      superficieTotalM2: normalizarSuperficie(prop.surface?.total),
      superficieCubiertaM2: normalizarSuperficie(prop.surface?.covered),
      anunciante: prop.advertiser?.name || null,
      comercializadora: prop.advertiser?.name || null,
      contactoTelefono: prop.advertiser?.phone || null,
      fotos: Array.isArray(prop.photos) ? prop.photos : [],
    };

    const validado = AvisoCrudoSchema.safeParse(avisoData);
    return validado.success ? validado.data : null;
  } catch {
    return null;
  }
}

function extraerDesdeSchemaOrg($: cheerio.CheerioAPI, url: string): AvisoCrudo | null {
  const scriptTag = $('script[type="application/ld+json"]').html();
  if (!scriptTag) return null;

  try {
    const json = JSON.parse(scriptTag.trim());
    if (!json || (!json.name && !json.headline)) return null;

    const titulo = json.name || json.headline || '';
    const { precio, moneda } = normalizarPrecioMoneda(
      json.offers?.price ? `${json.offers.priceCurrency || 'USD'} ${json.offers.price}` : null
    );

    const lat = json.geo?.latitude ? Number(json.geo.latitude) : null;
    const lng = json.geo?.longitude ? Number(json.geo.longitude) : null;
    const direccion = json.address?.streetAddress || json.description || titulo;
    const localidad = normalizarLocalidad(json.address?.addressLocality || direccion);

    const avisoData = {
      idExterno: json.url || `arg-${Date.now()}`,
      fuente: 'argenprop' as const,
      url: json.url || url,
      titulo: titulo.trim(),
      descripcion: json.description || null,
      tipo: normalizarTipoInmueble(titulo),
      operacion: normalizarOperacion(json.offers?.businessFunction || titulo),
      precio,
      moneda,
      direccion: typeof direccion === 'string' ? direccion.slice(0, 100) : titulo,
      localidad,
      lat,
      lng,
      superficieTotalM2: null,
      superficieCubiertaM2: null,
      anunciante: json.author?.name || null,
      comercializadora: json.author?.name || null,
      contactoTelefono: json.telephone || null,
      fotos: Array.isArray(json.image) ? json.image : [],
    };

    const validado = AvisoCrudoSchema.safeParse(avisoData);
    return validado.success ? validado.data : null;
  } catch {
    return null;
  }
}

/* ==========================================================================
   ESTRATEGIA 2: FALLBACK CON SELECTORES CSS EN CHEERIO
   ========================================================================== */

function extraerFichaDesdeCSS($: cheerio.CheerioAPI, url: string): AvisoCrudo | null {
  const titulo = $('.title, h1.property-title, h1.title, h1').first().text().trim();
  if (!titulo) return null;

  const rawPrecio = $('.price, .property-price, .card__price').first().text().trim();
  const { precio, moneda } = normalizarPrecioMoneda(rawPrecio);

  const rawDireccion = $('.location, .property-location, .card__address, address').first().text().trim();
  const direccion = rawDireccion || titulo;
  const localidad = normalizarLocalidad(direccion);

  // Extracción de superficies desde textos
  let superficieCubiertaM2: number | null = null;
  let superficieTotalM2: number | null = null;

  $('li, .feature, p').each((_, el) => {
    const texto = $(el).text().toLowerCase();
    if (texto.includes('m²') || texto.includes('m2')) {
      if (texto.includes('cub') && !superficieCubiertaM2) {
        superficieCubiertaM2 = normalizarSuperficie(texto);
      } else if (texto.includes('tot') && !superficieTotalM2) {
        superficieTotalM2 = normalizarSuperficie(texto);
      } else if (!superficieCubiertaM2) {
        superficieCubiertaM2 = normalizarSuperficie(texto);
      }
    }
  });

  // Fotos
  const fotos: string[] = [];
  $('img.gallery-image, .card__photos img, .gallery img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src && src.startsWith('http')) {
      fotos.push(src);
    }
  });

  const anunciante = $('.advertiser-name, .card__advertiser, .property-contact span').first().text().trim() || null;
  const telefono = $('.advertiser-phone, a[href^="tel:"]').first().text().trim() || null;

  const avisoData = {
    idExterno: `arg-css-${Math.abs(titulo.length * 31 + direccion.length)}`,
    fuente: 'argenprop' as const,
    url,
    titulo,
    descripcion: $('.property-description, .description').first().text().trim() || null,
    tipo: normalizarTipoInmueble(titulo),
    operacion: normalizarOperacion(titulo),
    precio,
    moneda,
    direccion,
    localidad,
    lat: null,
    lng: null,
    superficieTotalM2,
    superficieCubiertaM2,
    anunciante,
    comercializadora: anunciante,
    contactoTelefono: telefono,
    fotos,
  };

  const validado = AvisoCrudoSchema.safeParse(avisoData);
  return validado.success ? validado.data : null;
}

/* ==========================================================================
   PARSER DE LISTADOS (MÚLTIPLES TARJETAS)
   ========================================================================== */

function extraerDesdeListado($: cheerio.CheerioAPI, urlBase: string): AvisoCrudo[] {
  const avisos: AvisoCrudo[] = [];
  
  // Seleccionar tarjetas sin duplicación de contenedores anidados
  let items = $('.listing__item');
  if (items.length === 0) {
    items = $('.card');
  }
  if (items.length === 0) {
    items = $('div[data-item-id]');
  }

  items.each((idx, el) => {
    const item = $(el);
    const idExterno = item.attr('data-item-id') || `arg-item-${idx + 1}`;
    const titulo = item.find('.card__title, h2, h3, .title').first().text().trim();
    if (!titulo) return;

    const rawPrecio = item.find('.card__price, .price').first().text().trim();
    const { precio, moneda } = normalizarPrecioMoneda(rawPrecio);

    const rawDireccion = item.find('.card__address, .address, .location').first().text().trim();
    const direccion = rawDireccion || `${titulo}, Tres de Febrero`;
    const localidad = normalizarLocalidad(direccion);

    const rawHref = item.find('a').attr('href') || `/aviso-${idExterno}`;
    const url = rawHref.startsWith('http') ? rawHref : `${urlBase}${rawHref}`;

    let superficieCubiertaM2: number | null = null;
    let superficieTotalM2: number | null = null;

    item.find('li, span').each((_, f) => {
      const texto = $(f).text().toLowerCase();
      if (texto.includes('m²') || texto.includes('m2')) {
        if (texto.includes('tot')) {
          superficieTotalM2 = normalizarSuperficie(texto);
        } else if (!superficieCubiertaM2) {
          superficieCubiertaM2 = normalizarSuperficie(texto);
        }
      }
    });

    const fotos: string[] = [];
    item.find('img').each((_, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src');
      if (src && src.startsWith('http')) {
        fotos.push(src);
      }
    });

    const anunciante = item.find('.card__advertiser, .advertiser').first().text().trim() || null;

    const avisoData = {
      idExterno,
      fuente: 'argenprop' as const,
      url,
      titulo,
      descripcion: null,
      tipo: normalizarTipoInmueble(titulo),
      operacion: normalizarOperacion(titulo),
      precio,
      moneda,
      direccion,
      localidad,
      lat: null,
      lng: null,
      superficieTotalM2,
      superficieCubiertaM2,
      anunciante,
      comercializadora: anunciante,
      contactoTelefono: null,
      fotos,
    };

    const validado = AvisoCrudoSchema.safeParse(avisoData);
    if (validado.success) {
      avisos.push(validado.data);
    }
  });

  return avisos;
}

/* ==========================================================================
   FUNCIÓN PRINCIPAL EXPORTADA: parsearArgenprop
   ========================================================================== */

/**
 * Parsea cualquier HTML de Argenprop (listado con múltiples propiedades o ficha unitaria),
 * aplicando primero la detección de JSON embebido y luego fallback CSS de Cheerio.
 */
export function parsearArgenprop(
  html: string,
  url: string = 'https://www.argenprop.com'
): AvisoCrudo[] {
  if (!html || !html.trim()) {
    return [];
  }

  const $ = cheerio.load(html);

  // 1. Verificar si es un listado con múltiples tarjetas
  const avisosListado = extraerDesdeListado($, url);
  if (avisosListado.length > 0) {
    return avisosListado;
  }

  // 2. Si no es listado, intentar como ficha detallada con __NEXT_DATA__
  const avisoNext = extraerDesdeNextData($, url);
  if (avisoNext) {
    return [avisoNext];
  }

  // 3. Intentar como ficha detallada con Schema.org LD+JSON
  const avisoSchema = extraerDesdeSchemaOrg($, url);
  if (avisoSchema) {
    return [avisoSchema];
  }

  // 4. Fallback final: Selectores CSS con Cheerio
  const avisoCSS = extraerFichaDesdeCSS($, url);
  if (avisoCSS) {
    return [avisoCSS];
  }

  return [];
}
