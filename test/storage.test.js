import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { migrateRoomsJsonToSqlite } from '../scripts/migrate-json-to-sqlite.js';
import { loadRooms, saveRooms } from '../src/storage.js';

const silentLogger = {
  log() {},
  error() {}
};

function createTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'shareq-storage-test-'));
}

function createSong(id, overrides = {}) {
  return {
    id,
    title: id,
    singer: '',
    link: '',
    requestedBy: 'Alice',
    requestedByUserId: 'alice-user',
    requestedByAvatar: '🎤',
    prioritized: false,
    reactions: {
      rose: 0,
      clap: 0,
      egg: 0,
      shoe: 0
    },
    createdAt: 1,
    ...overrides
  };
}

test('SQLite storage initializes an empty database', () => {
  const tmpDir = createTmpDir();
  const databaseFile = path.join(tmpDir, 'shareq.sqlite');

  try {
    const rooms = loadRooms(databaseFile, silentLogger);

    assert.deepEqual(rooms, {});
    assert.equal(fs.existsSync(databaseFile), true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('SQLite storage round trips rooms, songs, reactions, and roles', () => {
  const tmpDir = createTmpDir();
  const databaseFile = path.join(tmpDir, 'shareq.sqlite');
  const roomsData = {
    ROOM1: {
      id: 'ROOM1',
      songs: [
        createSong('queued-1', {
          title: 'Queued Song',
          singer: 'Queued Singer',
          link: 'https://example.com/queued',
          requestedBy: 'Alice',
          requestedByAvatar: '🎸',
          dedicatedBy: 'Bob',
          prioritized: true,
          reactions: {
            rose: 2,
            clap: 3,
            egg: 4,
            shoe: 5
          },
          createdAt: 100
        })
      ],
      alreadySung: [
        createSong('sung-1', {
          title: 'Sung Song',
          completedAt: 200
        })
      ],
      hostUserId: 'host-user',
      moderatorUserIds: ['mod-user'],
      updatedAt: 300,
      historyStack: ['past'],
      futureStack: ['future']
    }
  };

  try {
    assert.equal(saveRooms(roomsData, databaseFile, silentLogger), true);

    const loadedRooms = loadRooms(databaseFile, silentLogger);

    assert.deepEqual(loadedRooms, {
      ROOM1: {
        id: 'ROOM1',
        songs: [
          {
            id: 'queued-1',
            title: 'Queued Song',
            singer: 'Queued Singer',
            link: 'https://example.com/queued',
            requestedBy: 'Alice',
            requestedByUserId: 'alice-user',
            requestedByAvatar: '🎸',
            dedicatedBy: 'Bob',
            prioritized: true,
            reactions: {
              rose: 2,
              clap: 3,
              egg: 4,
              shoe: 5
            },
            createdAt: 100
          }
        ],
        alreadySung: [
          {
            id: 'sung-1',
            title: 'Sung Song',
            singer: '',
            link: '',
            requestedBy: 'Alice',
            requestedByUserId: 'alice-user',
            requestedByAvatar: '🎤',
            prioritized: false,
            reactions: {
              rose: 0,
              clap: 0,
              egg: 0,
              shoe: 0
            },
            createdAt: 1,
            completedAt: 200
          }
        ],
        hostUserId: 'host-user',
        moderatorUserIds: ['mod-user'],
        updatedAt: 300,
        historyStack: [],
        futureStack: []
      }
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('SQLite storage cleanup removes only old empty rooms', () => {
  const tmpDir = createTmpDir();
  const databaseFile = path.join(tmpDir, 'shareq.sqlite');
  const now = Date.UTC(2026, 5, 7);
  const old = now - 49 * 60 * 60 * 1000;
  const recent = now - 1 * 60 * 60 * 1000;

  try {
    assert.equal(
      saveRooms(
        {
          OLD_EMPTY: {
            id: 'OLD_EMPTY',
            songs: [],
            alreadySung: [],
            updatedAt: old
          },
          RECENT_EMPTY: {
            id: 'RECENT_EMPTY',
            songs: [],
            alreadySung: [],
            updatedAt: recent
          },
          OLD_ACTIVE: {
            id: 'OLD_ACTIVE',
            songs: [createSong('song-1')],
            alreadySung: [],
            updatedAt: old
          }
        },
        databaseFile,
        silentLogger,
        now
      ),
      true
    );

    assert.deepEqual(Object.keys(loadRooms(databaseFile, silentLogger)).sort(), ['OLD_ACTIVE', 'RECENT_EMPTY']);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('JSON to SQLite migration imports rooms and refuses accidental overwrite', () => {
  const tmpDir = createTmpDir();
  const jsonFile = path.join(tmpDir, 'rooms.json');
  const databaseFile = path.join(tmpDir, 'shareq.sqlite');

  try {
    fs.writeFileSync(
      jsonFile,
      JSON.stringify({
        MIGR8: {
          id: 'MIGR8',
          songs: [createSong('song-1', { title: 'Migrated Song' })],
          alreadySung: [],
          hostUserId: 'host-user',
          moderatorUserIds: ['mod-user'],
          updatedAt: 123
        }
      }),
      'utf8'
    );

    migrateRoomsJsonToSqlite(jsonFile, databaseFile, { logger: silentLogger });

    const migratedRooms = loadRooms(databaseFile, silentLogger);
    assert.equal(migratedRooms.MIGR8.songs[0].title, 'Migrated Song');
    assert.equal(migratedRooms.MIGR8.songs[0].requestedByUserId, 'alice-user');
    assert.equal(migratedRooms.MIGR8.hostUserId, 'host-user');
    assert.deepEqual(migratedRooms.MIGR8.moderatorUserIds, ['mod-user']);

    assert.throws(() => migrateRoomsJsonToSqlite(jsonFile, databaseFile, { logger: silentLogger }), /already exists/);

    fs.writeFileSync(
      jsonFile,
      JSON.stringify({
        FORCE: {
          id: 'FORCE',
          songs: [createSong('song-2', { title: 'Forced Song' })],
          alreadySung: [],
          updatedAt: 456
        }
      }),
      'utf8'
    );

    migrateRoomsJsonToSqlite(jsonFile, databaseFile, { force: true, logger: silentLogger });

    const forcedRooms = loadRooms(databaseFile, silentLogger);
    assert.deepEqual(Object.keys(forcedRooms), ['FORCE']);
    assert.equal(forcedRooms.FORCE.songs[0].title, 'Forced Song');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
