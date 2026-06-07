import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { io as createClient } from 'socket.io-client';

import { createShareQServer } from '../src/app.js';
import {
  createReactions,
  getOrCreateRoom,
  pushHistory,
  redoAction,
  undoAction
} from '../src/rooms.js';
import { createSaveData } from '../src/storage.js';

const silentLogger = {
  log() {},
  error() {}
};

function listen(server) {
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function waitForSocket(socket, event) {
  return new Promise(resolve => {
    socket.once(event, resolve);
  });
}

function connectClient(port) {
  const client = createClient(`http://127.0.0.1:${port}`, {
    forceNew: true,
    reconnection: false
  });

  return new Promise((resolve, reject) => {
    client.once('connect', () => resolve(client));
    client.once('connect_error', reject);
  });
}

async function createTestServer() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shareq-test-'));
  const shareq = createShareQServer({
    dataFile: path.join(tmpDir, 'rooms.json'),
    enableRequestLog: false,
    logger: silentLogger,
    saveIntervalMs: 0
  });
  const port = await listen(shareq.httpServer);

  return { port, shareq, tmpDir };
}

async function closeTestServer({ shareq, tmpDir }, clients = []) {
  for (const client of clients) {
    client.disconnect();
  }

  await shareq.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

test('HTTP server serves the ShareQ app', async () => {
  const server = await createTestServer();

  try {
    const response = await fetch(`http://127.0.0.1:${server.port}/`);

    assert.equal(response.status, 200);
    assert.match(await response.text(), /ShareQ/i);
  } finally {
    await closeTestServer(server);
  }
});

test('first socket to join a room becomes host', async () => {
  const server = await createTestServer();
  let client;

  try {
    client = await connectClient(server.port);
    const roomDataPromise = waitForSocket(client, 'room-data');

    client.emit('join-room', {
      roomId: ' abc12 ',
      username: 'Alice',
      avatar: '🎤',
      userId: 'user-1'
    });

    const roomData = await roomDataPromise;

    assert.equal(roomData.roomId, 'ABC12');
    assert.equal(roomData.hostUserId, 'user-1');
    assert.equal(server.shareq.roomsData.ABC12.hostUserId, 'user-1');
  } finally {
    await closeTestServer(server, client ? [client] : []);
  }
});

test('duplicate usernames in the same room are rejected', async () => {
  const server = await createTestServer();
  const clients = [];

  try {
    const firstClient = await connectClient(server.port);
    clients.push(firstClient);
    const firstRoomData = waitForSocket(firstClient, 'room-data');
    firstClient.emit('join-room', {
      roomId: 'DUPES',
      username: 'Alice',
      avatar: '🎤',
      userId: 'user-1'
    });
    await firstRoomData;

    const secondClient = await connectClient(server.port);
    clients.push(secondClient);
    const joinFailed = waitForSocket(secondClient, 'join-failed');
    secondClient.emit('join-room', {
      roomId: 'dupes',
      username: 'alice',
      avatar: '🎤',
      userId: 'user-2'
    });

    const failure = await joinFailed;
    assert.match(failure.message, /昵称/);
    assert.equal(server.shareq.roomsData.DUPES.hostUserId, 'user-1');
  } finally {
    await closeTestServer(server, clients);
  }
});

test('adding a song broadcasts playlist and persists room data', async () => {
  const server = await createTestServer();
  let client;

  try {
    client = await connectClient(server.port);
    const roomDataPromise = waitForSocket(client, 'room-data');
    client.emit('join-room', {
      roomId: 'SONGS',
      username: 'Alice',
      avatar: '🎤',
      userId: 'user-1'
    });
    await roomDataPromise;

    const playlistPromise = waitForSocket(client, 'playlist-updated');
    client.emit('add-song', {
      title: '七里香',
      singer: '周杰伦',
      link: 'https://example.com/song'
    });
    const playlist = await playlistPromise;

    assert.equal(playlist.length, 1);
    assert.equal(playlist[0].title, '七里香');
    assert.equal(playlist[0].requestedBy, 'Alice');

    const savedRooms = JSON.parse(fs.readFileSync(server.shareq.dataFile, 'utf8'));
    assert.equal(savedRooms.SONGS.songs[0].title, '七里香');
  } finally {
    await closeTestServer(server, client ? [client] : []);
  }
});

test('rooms normalize IDs and initialize transient state', () => {
  const roomsData = {};
  const room = getOrCreateRoom(roomsData, ' abc12 ');

  assert.equal(room.id, 'ABC12');
  assert.deepEqual(Object.keys(roomsData), ['ABC12']);
  assert.deepEqual(room.songs, []);
  assert.deepEqual(room.alreadySung, []);
  assert.deepEqual(room.moderatorUserIds, []);
  assert.deepEqual(room.historyStack, []);
  assert.deepEqual(room.futureStack, []);
});

test('playlist history supports undo and redo', () => {
  const room = getOrCreateRoom({}, 'ROOM1');
  room.songs.push({
    id: 'song-1',
    title: 'Song One',
    singer: '',
    link: '',
    requestedBy: 'Alice',
    requestedByAvatar: '🎤',
    prioritized: false,
    reactions: createReactions(),
    createdAt: 1
  });

  pushHistory(room);
  room.songs.push({
    id: 'song-2',
    title: 'Song Two',
    singer: '',
    link: '',
    requestedBy: 'Bob',
    requestedByAvatar: '🎤',
    prioritized: false,
    reactions: createReactions(),
    createdAt: 2
  });

  assert.equal(undoAction(room), true);
  assert.deepEqual(room.songs.map(song => song.id), ['song-1']);
  assert.equal(redoAction(room), true);
  assert.deepEqual(room.songs.map(song => song.id), ['song-1', 'song-2']);
});

test('storage cleanup removes only old empty rooms', () => {
  const now = Date.UTC(2026, 5, 7);
  const old = now - 49 * 60 * 60 * 1000;
  const recent = now - 1 * 60 * 60 * 1000;

  const { cleanSaveData, cleanedCount } = createSaveData({
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
      songs: [{ id: 'song-1', title: 'Still Here' }],
      alreadySung: [],
      updatedAt: old
    }
  }, now);

  assert.equal(cleanedCount, 1);
  assert.deepEqual(Object.keys(cleanSaveData).sort(), ['OLD_ACTIVE', 'RECENT_EMPTY']);
});
