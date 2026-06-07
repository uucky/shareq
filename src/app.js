import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';

import { registerSocketHandlers } from './socket-handlers.js';
import {
  loadRooms,
  resolveDatabaseFile,
  saveRooms as saveRoomsToFile
} from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const srcDir = path.dirname(__filename);
const appDir = path.dirname(srcDir);

export function createShareQServer(options = {}) {
  const logger = options.logger || console;
  const publicPath = options.publicPath || path.join(appDir, 'public');
  const databaseFile = resolveDatabaseFile({
    appDir,
    dataDir: options.dataDir || process.env.DATA_DIR,
    databaseFile: options.databaseFile || process.env.DATABASE_FILE
  });

  const app = express();
  if (options.enableRequestLog ?? process.env.NODE_ENV !== 'test') {
    app.use((req, res, next) => {
      logger.log(`[REQUEST] ${req.method} ${req.url}`);
      next();
    });
  }

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const roomsData = options.roomsData || loadRooms(databaseFile, logger);
  const activeConnections = new Map();
  const pendingDedications = new Map();

  const saveRooms = options.saveRooms || (() => saveRoomsToFile(roomsData, databaseFile, logger));
  const saveIntervalMs = options.saveIntervalMs ?? 5 * 60 * 1000;
  let saveInterval = null;
  if (saveIntervalMs > 0) {
    saveInterval = setInterval(saveRooms, saveIntervalMs);
    saveInterval.unref?.();
  }

  app.use(express.static(publicPath));

  // Fallback to index.html using RegExp for Express 5 compatibility.
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  registerSocketHandlers({
    io,
    roomsData,
    activeConnections,
    pendingDedications,
    logger,
    saveRooms
  });

  async function close() {
    if (saveInterval) {
      clearInterval(saveInterval);
    }

    await new Promise(resolve => io.close(resolve));

    if (httpServer.listening) {
      await new Promise((resolve, reject) => {
        httpServer.close(err => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    }
  }

  return {
    app,
    httpServer,
    io,
    roomsData,
    activeConnections,
    pendingDedications,
    databaseFile,
    saveRooms,
    close
  };
}
