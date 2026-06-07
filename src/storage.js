import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const EMPTY_ROOM_EXPIRY_MS = 48 * 60 * 60 * 1000;
const SCHEMA_VERSION = 1;
const QUEUED_LIST = 'queued';
const SUNG_LIST = 'sung';

export function resolveDatabaseFile({ appDir, dataDir, databaseFile } = {}) {
  if (databaseFile) {
    return path.resolve(databaseFile);
  }

  return path.join(dataDir || path.join(appDir || process.cwd(), 'data'), 'shareq.sqlite');
}

export function ensureDatabaseDir(databaseFile) {
  fs.mkdirSync(path.dirname(databaseFile), { recursive: true });
}

export function openDatabase(databaseFile) {
  ensureDatabaseDir(databaseFile);
  const db = new DatabaseSync(databaseFile);
  db.exec('PRAGMA foreign_keys = ON');
  return db;
}

export function initializeSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      host_user_id TEXT NOT NULL DEFAULT '',
      moderator_user_ids_json TEXT NOT NULL DEFAULT '[]',
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS songs (
      id TEXT NOT NULL,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      list_type TEXT NOT NULL CHECK (list_type IN ('queued', 'sung')),
      position INTEGER NOT NULL,
      title TEXT NOT NULL,
      singer TEXT NOT NULL DEFAULT '',
      link TEXT NOT NULL DEFAULT '',
      requested_by TEXT NOT NULL DEFAULT '',
      requested_by_avatar TEXT NOT NULL DEFAULT '',
      dedicated_by TEXT,
      prioritized INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER,
      completed_at INTEGER,
      rose INTEGER NOT NULL DEFAULT 0,
      clap INTEGER NOT NULL DEFAULT 0,
      egg INTEGER NOT NULL DEFAULT 0,
      shoe INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (room_id, list_type, id)
    );

    CREATE INDEX IF NOT EXISTS idx_songs_room_list_position
      ON songs (room_id, list_type, position);
  `);

  const schemaVersion = db.prepare(`
    SELECT value
    FROM schema_meta
    WHERE key = 'schema_version'
  `).get();

  if (schemaVersion && schemaVersion.value !== String(SCHEMA_VERSION)) {
    throw new Error(`Unsupported SQLite schema version: ${schemaVersion.value}`);
  }

  db.prepare(`
    INSERT INTO schema_meta (key, value)
    VALUES ('schema_version', ?)
    ON CONFLICT(key) DO NOTHING
  `).run(String(SCHEMA_VERSION));
}

function parseModeratorUserIds(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    if (Array.isArray(parsed)) {
      return parsed.map(String);
    }
  } catch {
    // Fall through to the safe default.
  }

  return [];
}

function serializeModeratorUserIds(value) {
  if (!Array.isArray(value)) {
    return '[]';
  }

  return JSON.stringify(value.map(String));
}

function toSqlInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

function toCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return Math.floor(number);
}

function getReactions(song) {
  const reactions = song.reactions || {};
  return {
    rose: toCount(reactions.rose),
    clap: toCount(reactions.clap),
    egg: toCount(reactions.egg),
    shoe: toCount(reactions.shoe)
  };
}

function createSongFromRow(row) {
  const song = {
    id: row.id,
    title: row.title,
    singer: row.singer,
    link: row.link,
    requestedBy: row.requested_by,
    requestedByAvatar: row.requested_by_avatar,
    prioritized: Boolean(row.prioritized),
    reactions: {
      rose: row.rose,
      clap: row.clap,
      egg: row.egg,
      shoe: row.shoe
    }
  };

  if (row.dedicated_by) {
    song.dedicatedBy = row.dedicated_by;
  }

  if (row.created_at !== null) {
    song.createdAt = row.created_at;
  }

  if (row.completed_at !== null) {
    song.completedAt = row.completed_at;
  }

  return song;
}

export function loadRooms(databaseFile, logger = console) {
  let db;
  try {
    db = openDatabase(databaseFile);
    initializeSchema(db);

    const rooms = {};
    const roomRows = db.prepare(`
      SELECT id, host_user_id, moderator_user_ids_json, updated_at
      FROM rooms
      ORDER BY id
    `).all();

    for (const row of roomRows) {
      rooms[row.id] = {
        id: row.id,
        songs: [],
        alreadySung: [],
        hostUserId: row.host_user_id || '',
        moderatorUserIds: parseModeratorUserIds(row.moderator_user_ids_json),
        updatedAt: row.updated_at,
        historyStack: [],
        futureStack: []
      };
    }

    const songRows = db.prepare(`
      SELECT
        id,
        room_id,
        list_type,
        title,
        singer,
        link,
        requested_by,
        requested_by_avatar,
        dedicated_by,
        prioritized,
        created_at,
        completed_at,
        rose,
        clap,
        egg,
        shoe
      FROM songs
      ORDER BY room_id, list_type, position
    `).all();

    for (const row of songRows) {
      const room = rooms[row.room_id];
      if (!room) {
        continue;
      }

      if (row.list_type === QUEUED_LIST) {
        room.songs.push(createSongFromRow(row));
      } else if (row.list_type === SUNG_LIST) {
        room.alreadySung.push(createSongFromRow(row));
      }
    }

    logger.log(`Loaded ${Object.keys(rooms).length} rooms from SQLite storage.`);
    return rooms;
  } catch (err) {
    logger.error('Error loading rooms:', err);
    return {};
  } finally {
    db?.close();
  }
}

export function createSaveData(roomsData, now = Date.now(), { cleanupEmptyRooms = true } = {}) {
  const cleanSaveData = {};
  let cleanedCount = 0;

  for (const [roomId, room] of Object.entries(roomsData)) {
    const songs = room.songs || [];
    const alreadySung = room.alreadySung || [];
    const lastActive = room.updatedAt || now;
    const isOldEmptyRoom = cleanupEmptyRooms
      && songs.length === 0
      && alreadySung.length === 0
      && now - lastActive > EMPTY_ROOM_EXPIRY_MS;

    if (isOldEmptyRoom) {
      cleanedCount++;
      continue;
    }

    cleanSaveData[roomId] = {
      id: room.id || roomId,
      songs,
      alreadySung,
      hostUserId: room.hostUserId || '',
      moderatorUserIds: room.moderatorUserIds || [],
      updatedAt: room.updatedAt
    };
  }

  return { cleanSaveData, cleanedCount };
}

function runInTransaction(db, callback) {
  db.exec('BEGIN IMMEDIATE');
  try {
    callback();
    db.exec('COMMIT');
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Keep the original error.
    }
    throw err;
  }
}

function saveSong(insertSong, roomId, listType, position, song) {
  const reactions = getReactions(song);
  insertSong.run(
    String(song.id),
    roomId,
    listType,
    position,
    String(song.title || ''),
    String(song.singer || ''),
    String(song.link || ''),
    String(song.requestedBy || ''),
    String(song.requestedByAvatar || ''),
    song.dedicatedBy ? String(song.dedicatedBy) : null,
    song.prioritized ? 1 : 0,
    toSqlInteger(song.createdAt),
    toSqlInteger(song.completedAt),
    reactions.rose,
    reactions.clap,
    reactions.egg,
    reactions.shoe
  );
}

export function saveRooms(
  roomsData,
  databaseFile,
  logger = console,
  now = Date.now(),
  { cleanupEmptyRooms = true } = {}
) {
  let db;
  try {
    db = openDatabase(databaseFile);
    initializeSchema(db);
    const { cleanSaveData, cleanedCount } = createSaveData(roomsData, now, { cleanupEmptyRooms });

    if (cleanedCount > 0) {
      logger.log(`Cleaned up ${cleanedCount} inactive empty rooms.`);
    }

    const insertRoom = db.prepare(`
      INSERT INTO rooms (id, host_user_id, moderator_user_ids_json, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    const insertSong = db.prepare(`
      INSERT INTO songs (
        id,
        room_id,
        list_type,
        position,
        title,
        singer,
        link,
        requested_by,
        requested_by_avatar,
        dedicated_by,
        prioritized,
        created_at,
        completed_at,
        rose,
        clap,
        egg,
        shoe
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    runInTransaction(db, () => {
      db.exec('DELETE FROM songs');
      db.exec('DELETE FROM rooms');

      for (const [roomId, room] of Object.entries(cleanSaveData)) {
        insertRoom.run(
          roomId,
          room.hostUserId,
          serializeModeratorUserIds(room.moderatorUserIds),
          toSqlInteger(room.updatedAt)
        );

        room.songs.forEach((song, position) => {
          saveSong(insertSong, roomId, QUEUED_LIST, position, song);
        });
        room.alreadySung.forEach((song, position) => {
          saveSong(insertSong, roomId, SUNG_LIST, position, song);
        });
      }
    });
    return true;
  } catch (err) {
    logger.error('Error saving rooms:', err);
    return false;
  } finally {
    db?.close();
  }
}

export function removeDatabaseFiles(databaseFile) {
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(`${databaseFile}${suffix}`, { force: true });
  }
}

export { SCHEMA_VERSION };
