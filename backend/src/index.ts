import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${env.PORT}`);
  console.log(`🔍 Healthcheck disponible en http://localhost:${env.PORT}/api/health`);
});
