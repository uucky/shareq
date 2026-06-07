import fs from 'node:fs';
import path from 'node:path';

const EMPTY_ROOM_EXPIRY_MS = 48 * 60 * 60 * 1000;

export function resolveDataFile({ appDir, dataDir, dataFile } = {}) {
  if (dataFile) {
    return path.resolve(dataFile);
  }

  return path.join(dataDir || path.join(appDir || process.cwd(), 'data'), 'rooms.json');
}

export function ensureDataDir(dataFile) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
}

export function loadRooms(dataFile, logger = console) {
  try {
    ensureDataDir(dataFile);
    if (!fs.existsSync(dataFile)) {
      return {};
    }

    const data = fs.readFileSync(dataFile, 'utf8');
    const rooms = JSON.parse(data);
    logger.log(`Loaded ${Object.keys(rooms).length} rooms from storage.`);
    return rooms;
  } catch (err) {
    logger.error('Error loading rooms:', err);
    return {};
  }
}

export function createSaveData(roomsData, now = Date.now()) {
  const cleanSaveData = {};
  let cleanedCount = 0;

  for (const [roomId, room] of Object.entries(roomsData)) {
    const songs = room.songs || [];
    const alreadySung = room.alreadySung || [];
    const lastActive = room.updatedAt || now;
    const isOldEmptyRoom = songs.length === 0 && alreadySung.length === 0 && now - lastActive > EMPTY_ROOM_EXPIRY_MS;

    if (isOldEmptyRoom) {
      cleanedCount++;
      continue;
    }

    cleanSaveData[roomId] = {
      id: room.id,
      songs,
      alreadySung,
      hostUserId: room.hostUserId || '',
      moderatorUserIds: room.moderatorUserIds || [],
      updatedAt: room.updatedAt
    };
  }

  return { cleanSaveData, cleanedCount };
}

export function saveRooms(roomsData, dataFile, logger = console, now = Date.now()) {
  try {
    ensureDataDir(dataFile);
    const { cleanSaveData, cleanedCount } = createSaveData(roomsData, now);

    if (cleanedCount > 0) {
      logger.log(`Cleaned up ${cleanedCount} inactive empty rooms.`);
    }

    fs.writeFileSync(dataFile, JSON.stringify(cleanSaveData, null, 2), 'utf8');
  } catch (err) {
    logger.error('Error saving rooms:', err);
  }
}
