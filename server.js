import { createShareQServer } from './src/app.js';

const PORT = process.env.PORT || 3000;
const server = createShareQServer();

server.httpServer.listen(PORT, () => {
  console.log(`KTV ShareQ server running at http://localhost:${PORT}`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down ShareQ server...`);
  await server.close();
  process.exit(0);
}

process.on('SIGINT', () => {
  shutdown('SIGINT').catch(err => {
    console.error('Error during shutdown:', err);
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch(err => {
    console.error('Error during shutdown:', err);
    process.exit(1);
  });
});
