import os from 'os';
import http from 'http';
import dotenv from 'dotenv';
import { createApp } from './app';
import { initSocket } from './socket';

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;
const app = createApp();
const server = http.createServer(app);
initSocket(server);

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

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log(`Server running on port ${PORT}`);
  console.log(`Local:   http://localhost:${PORT}/`);
  console.log(`Network: http://${localIp}:${PORT}/`);
});
