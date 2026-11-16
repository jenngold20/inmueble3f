import {
  sequelize,
  InmuebleModel,
  AvisoModel,
  FotoModel,
  CorridaScraperModel,
} from '../models/index.js';
import {
  CreateInmuebleSchema,
  CreateAvisoSchema,
  CreateFotoSchema,
  CreateCorridaScraperSchema,
} from '../schemas/dominio.schema.js';

async function main() {
  console.log('🔄 Iniciando verificación de conexión y sincronización de base de datos...');

  try {
    // 1. Probar conexión
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL 16 establecida exitosamente.');

    // 2. Sincronizar esquemas DDL (crear tablas, relaciones e índices)
    console.log('📦 Sincronizando modelos con la base de datos (sequelize.sync)...');
    await sequelize.sync({ alter: true });
    console.log('✅ Tablas creadas/actualizadas correctamente en PostgreSQL.');

    // 3. Prueba de Inserción y Validación de Dominio (Caseros - Tres de Febrero)
    console.log('\n🧪 Probando inserción y contratos de dominio con Zod...');

    const inmuebleData = CreateInmuebleSchema.parse({
      direccion: 'Av. San Martín 2450',
      direccionNormalizada: 'Avenida General San Martín 2450, Caseros, Tres de Febrero',
      localidad: 'Caseros',
      lat: -34.6061,
      lng: -58.5645,
      superficieTotalM2: 180.5,
      superficieCubiertaM2: 160.0,
      tipo: 'local',
      zonaCodigo: 'C1',
      macrozona: 'DESARROLLO_PRIORITARIO',
    });

    // Inserción en base de datos
    const nuevoInmueble = await InmuebleModel.create(inmuebleData);
    console.log(`✅ Inmueble creado con éxito en BD (UUID: ${nuevoInmueble.id}).`);

    // Inserción de Aviso asociado
    const avisoData = CreateAvisoSchema.parse({
      inmuebleId: nuevoInmueble.id,
      idExterno: 'argenprop-test-001',
      fuente: 'argenprop',
      url: 'https://www.argenprop.com/local-en-venta-en-caseros--12345678',
      titulo: 'Excelente Local Comercial sobre Av. San Martín',
      descripcion: 'Local comercial en zona bancaria y comercial de Caseros centro.',
      precio: 145000,
      moneda: 'USD',
      operacion: 'venta',
      anunciante: 'Inmobiliaria 3F Propiedades',
      comercializadora: 'Inmobiliaria 3F Propiedades',
      contactoTelefono: '+54 11 4750-0000',
      fechaVistoPrimeraVez: new Date(),
      fechaVistoUltimaVez: new Date(),
      estado: 'activo',
    });

    const nuevoAviso = await AvisoModel.create(avisoData);
    console.log(`✅ Aviso comercial asociado creado (UUID: ${nuevoAviso.id}, Fuente: ${nuevoAviso.fuente}).`);

    // Inserción de Foto
    const fotoData = CreateFotoSchema.parse({
      avisoId: nuevoAviso.id,
      url: 'https://imagenes.argenprop.com/fotos/local-caseros-frente.jpg',
      orden: 1,
    });
    await FotoModel.create(fotoData);
    console.log('✅ Fotografía asociada persistida.');

    // 4. Prueba de Consulta Relacional (Eager Loading)
    console.log('\n🔍 Consultando inmueble con sus publicaciones y fotos asociadas...');
    const inmuebleConsultado = await InmuebleModel.findByPk(nuevoInmueble.id, {
      include: [
        {
          model: AvisoModel,
          as: 'avisos',
          include: [
            {
              model: FotoModel,
              as: 'fotos',
            },
          ],
        },
      ],
    });

    if (!inmuebleConsultado) {
      throw new Error('No se encontró el inmueble recién insertado.');
    }

    console.log('✅ Consulta Eager Loading exitosa:');
    console.log(`   - Propiedad: ${inmuebleConsultado.direccion} (${inmuebleConsultado.localidad})`);
    console.log(`   - Tipo: ${inmuebleConsultado.tipo} | Zona: ${inmuebleConsultado.zonaCodigo}`);
    console.log(`   - Publicaciones asociadas: ${inmuebleConsultado.avisos?.length ?? 0}`);
    if (inmuebleConsultado.avisos && inmuebleConsultado.avisos.length > 0) {
      const primerAviso = inmuebleConsultado.avisos[0];
      console.log(`     * Aviso 1: ${primerAviso.titulo} - ${primerAviso.moneda} ${primerAviso.precio}`);
      console.log(`     * Fotos del aviso: ${primerAviso.fotos?.length ?? 0}`);
    }

    // 5. Prueba de CorridaScraper
    console.log('\n📊 Probando registro de trazabilidad de scraper...');
    const corridaData = CreateCorridaScraperSchema.parse({
      fuente: 'argenprop',
      fechaInicio: new Date(),
      fechaFin: new Date(),
      estado: 'OK',
      totalLeidos: 120,
      nuevos: 15,
      actualizados: 105,
      fallidos: 0,
      mensajeError: null,
    });

    const nuevaCorrida = await CorridaScraperModel.create(corridaData);
    console.log(`✅ Registro de corrida generado con éxito (ID: ${nuevaCorrida.id}, Estado: ${nuevaCorrida.estado}).`);

    // Limpieza de datos de prueba
    await nuevoInmueble.destroy();
    await nuevaCorrida.destroy();
    console.log('\n🧹 Limpieza de registros de prueba completada.');

    console.log('\n🎉 ¡TODOS LOS MODELOS Y CONTRATOS ZOD FUNCIONAN AL 100% EN POSTGRESQL 16!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la verificación de base de datos:', error);
    process.exit(1);
  }
}

main();
