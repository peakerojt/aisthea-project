import os from 'os';
import http from 'http';
import dotenv from 'dotenv';
import { createApp } from './app';
import { logger } from './lib/logger';
import { initSocket } from './socket';
import { initI18n } from './i18n';

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;

const getLocalIp = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

async function bootstrap() {
  await initI18n();

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalIp();
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Local:   http://localhost:${PORT}/`);
    logger.info(`Network: http://${localIp}:${PORT}/`);
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to bootstrap server', { error });
  process.exit(1);
});
