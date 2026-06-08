#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { removeDatabaseFiles, saveRooms } from '../src/storage.js';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toTimestamp(value, fieldName) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${fieldName} must be a finite timestamp`);
  }

  return Math.trunc(number);
}

function normalizeReactions(value, fieldName) {
  if (value === undefined || value === null) {
    return { rose: 0, clap: 0, egg: 0, shoe: 0 };
  }

  if (!isObject(value)) {
    throw new Error(`${fieldName} must be an object`);
  }

  return {
    rose: Number(value.rose) || 0,
    clap: Number(value.clap) || 0,
    egg: Number(value.egg) || 0,
    shoe: Number(value.shoe) || 0
  };
}

function normalizeSong(song, fieldName) {
  if (!isObject(song)) {
    throw new Error(`${fieldName} must be an object`);
  }

  if (!song.id) {
    throw new Error(`${fieldName}.id is required`);
  }

  if (!song.title) {
    throw new Error(`${fieldName}.title is required`);
  }

  if (!song.requestedByUserId) {
    throw new Error(`${fieldName}.requestedByUserId is required`);
  }

  const normalized = {
    id: String(song.id),
    title: String(song.title),
    singer: String(song.singer || ''),
    link: String(song.link || ''),
    requestedBy: String(song.requestedBy || ''),
    requestedByUserId: String(song.requestedByUserId),
    requestedByAvatar: String(song.requestedByAvatar || ''),
    prioritized: Boolean(song.prioritized),
    reactions: normalizeReactions(song.reactions, `${fieldName}.reactions`)
  };

  if (song.dedicatedBy) {
    normalized.dedicatedBy = String(song.dedicatedBy);
  }

  const createdAt = toTimestamp(song.createdAt, `${fieldName}.createdAt`);
  if (createdAt !== undefined) {
    normalized.createdAt = createdAt;
  }

  const completedAt = toTimestamp(song.completedAt, `${fieldName}.completedAt`);
  if (completedAt !== undefined) {
    normalized.completedAt = completedAt;
  }

  return normalized;
}

export function normalizeRoomsJson(value) {
  if (!isObject(value)) {
    throw new Error('rooms JSON must be an object keyed by room ID');
  }

  const rooms = {};
  for (const [roomId, room] of Object.entries(value)) {
    if (!isObject(room)) {
      throw new Error(`room ${roomId} must be an object`);
    }

    const songs = Array.isArray(room.songs) ? room.songs : [];
    const alreadySung = Array.isArray(room.alreadySung) ? room.alreadySung : [];
    const moderatorUserIds = Array.isArray(room.moderatorUserIds) ? room.moderatorUserIds.map(String) : [];

    rooms[roomId] = {
      id: String(room.id || roomId),
      songs: songs.map((song, index) => normalizeSong(song, `${roomId}.songs[${index}]`)),
      alreadySung: alreadySung.map((song, index) => normalizeSong(song, `${roomId}.alreadySung[${index}]`)),
      hostUserId: String(room.hostUserId || ''),
      moderatorUserIds,
      updatedAt: toTimestamp(room.updatedAt, `${roomId}.updatedAt`)
    };
  }

  return rooms;
}

export function migrateRoomsJsonToSqlite(sourceJsonFile, databaseFile, { force = false, logger = console } = {}) {
  const sourcePath = path.resolve(sourceJsonFile);
  const databasePath = path.resolve(databaseFile);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`source JSON file does not exist: ${sourcePath}`);
  }

  if (fs.existsSync(databasePath) && !force) {
    throw new Error(`destination database already exists: ${databasePath}. Pass --force to overwrite it.`);
  }

  const parsed = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const rooms = normalizeRoomsJson(parsed);

  if (force) {
    removeDatabaseFiles(databasePath);
  }

  const saved = saveRooms(rooms, databasePath, logger, Date.now(), { cleanupEmptyRooms: false });
  if (!saved) {
    throw new Error('failed to write SQLite database');
  }

  logger.log(`Migrated ${Object.keys(rooms).length} rooms to ${databasePath}`);
}

function parseArgs(argv) {
  const args = [...argv];
  const forceIndex = args.indexOf('--force');
  const force = forceIndex !== -1;
  if (force) {
    args.splice(forceIndex, 1);
  }

  if (args.length !== 2) {
    throw new Error('usage: node scripts/migrate-json-to-sqlite.js [--force] <rooms.json> <shareq.sqlite>');
  }

  return {
    force,
    sourceJsonFile: args[0],
    databaseFile: args[1]
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { force, sourceJsonFile, databaseFile } = parseArgs(process.argv.slice(2));
    migrateRoomsJsonToSqlite(sourceJsonFile, databaseFile, { force });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
