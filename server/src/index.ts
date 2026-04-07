import os from 'os';
import http from 'http';
import './lib/load-env';
import { createApp } from './app';
import { logger } from './lib/logger';
import { initSocket } from './socket';
import { initI18n } from './i18n';
import { startEmailJobWorker } from './modules/notifications/email-worker';

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
  const stopEmailWorker = startEmailJobWorker();
  let shuttingDown = false;

  const shutdown = (signal: string) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.info(`Received ${signal}. Shutting down server...`);

    const forceExitTimer = setTimeout(() => {
      logger.error('Forced shutdown after graceful timeout');
      process.exit(1);
    }, 10_000);

    forceExitTimer.unref?.();

    server.close(async (closeError) => {
      if (closeError) {
        logger.error('HTTP server shutdown failed', { error: closeError });
      }

      try {
        await stopEmailWorker();
      } catch (workerError) {
        logger.error('Email worker shutdown failed', { error: workerError });
      } finally {
        clearTimeout(forceExitTimer);
        process.exit(closeError ? 1 : 0);
      }
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

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
