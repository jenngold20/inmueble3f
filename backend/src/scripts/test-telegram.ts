import {
  esTelegramConfigurado,
  notificarCorridaScraper,
  notificarErrorCritico,
} from '../services/telegram.service.js';

async function testTelegram() {
  console.log('🧪 Iniciando prueba de notificaciones por Telegram...');

  if (!esTelegramConfigurado()) {
    console.error('\n❌ Telegram no está completamente configurado en .env.');
    console.error('Verificá tener definidas ambas variables:');
    console.error('  TELEGRAM_BOT_TOKEN=...');
    console.error('  TELEGRAM_CHAT_ID=...\n');
    console.error('💡 Si no tenés el Chat ID, ejecutá:');
    console.error('  npm run telegram:chat-id\n');
    process.exit(1);
  }

  console.log('1️⃣ Enviando alerta simulada: Scraper Exitoso (OK)...');
  const okResult = await notificarCorridaScraper({
    fuente: 'argenprop',
    estado: 'OK',
    metricas: {
      totalLeidos: 45,
      nuevos: 12,
      actualizados: 33,
      fallidos: 0,
    },
    duracionMs: 4250,
  });

  if (okResult) {
    console.log('   ✅ Mensaje 1 enviado con éxito.');
  } else {
    console.error('   ❌ Error al enviar mensaje 1.');
  }

  console.log('\n2️⃣ Enviando alerta simulada: Scraper con Advertencias (parcial)...');
  const warnResult = await notificarCorridaScraper({
    fuente: 'argenprop',
    estado: 'OK',
    metricas: {
      totalLeidos: 30,
      nuevos: 25,
      actualizados: 0,
      fallidos: 5,
    },
    duracionMs: 3100,
    mensajeError: '5 avisos sin coordenadas válidas fueron descartados',
  });

  if (warnResult) {
    console.log('   ✅ Mensaje 2 enviado con éxito.');
  } else {
    console.error('   ❌ Error al enviar mensaje 2.');
  }

  console.log('\n3️⃣ Enviando alerta simulada: Error Crítico Backend (500)...');
  const errorSimulado = new Error('Connection timeout al conectar con postgres:5432');
  const errResult = await notificarErrorCritico({
    ruta: '/api/inmuebles?tipo=galpon',
    metodo: 'GET',
    error: errorSimulado,
    statusCode: 500,
    ip: '127.0.0.1',
  });

  if (errResult) {
    console.log('   ✅ Mensaje 3 enviado con éxito.');
  } else {
    console.error('   ❌ Error al enviar mensaje 3.');
  }

  console.log('\n🎉 ¡Prueba de Telegram finalizada! Revisá el grupo de Telegram para confirmar la recepción.');
}

void testTelegram();
