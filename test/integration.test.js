import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { clearTimeout, setTimeout } from 'node:timers';
import { io as createClient } from 'socket.io-client';

import { createShareQServer } from '../src/app.js';
import { addSong } from '../src/room-actions.js';
import { createReactions, getOrCreateRoom, pushHistory, redoAction, undoAction } from '../src/rooms.js';
import { createSaveData, loadRooms } from '../src/storage.js';

const silentLogger = {
  log() {},
  error() {}
};

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function waitForSocket(socket, event, timeoutMs = 1000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(event, onEvent);
      reject(new Error(`Timed out waiting for socket event "${event}"`));
    }, timeoutMs);

    function onEvent(payload) {
      clearTimeout(timeout);
      resolve(payload);
    }

    socket.once(event, onEvent);
  });
}

function waitForSocketMatching(socket, event, predicate, timeoutMs = 1000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(event, onEvent);
      reject(new Error(`Timed out waiting for matching socket event "${event}"`));
    }, timeoutMs);

    function onEvent(payload) {
      if (!predicate(payload)) {
        return;
      }

      clearTimeout(timeout);
      socket.off(event, onEvent);
      resolve(payload);
    }

    socket.on(event, onEvent);
  });
}

function waitForNoSocketEvent(socket, event, timeoutMs = 100) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(event, onEvent);
      resolve();
    }, timeoutMs);

    function onEvent(payload) {
      clearTimeout(timeout);
      reject(new Error(`Unexpected socket event "${event}": ${JSON.stringify(payload)}`));
    }

    socket.once(event, onEvent);
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

function joinRoom(client, { roomId, username, userId, avatar = '🎤' }) {
  const roomDataPromise = waitForSocket(client, 'room-data');
  client.emit('join-room', {
    roomId,
    username,
    avatar,
    userId
  });
  return roomDataPromise;
}

async function createTestServer(options = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shareq-test-'));
  const shareq = createShareQServer({
    databaseFile: path.join(tmpDir, 'shareq.sqlite'),
    enableRequestLog: false,
    logger: silentLogger,
    saveIntervalMs: 0,
    ...options
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
    const roomData = await joinRoom(client, {
      roomId: ' abc12 ',
      username: 'Alice',
      userId: 'user-1'
    });

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
    await joinRoom(firstClient, {
      roomId: 'DUPES',
      username: 'Alice',
      userId: 'user-1'
    });

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

test('malformed join-room payload is rejected without creating a room', async () => {
  const server = await createTestServer();
  let client;

  try {
    client = await connectClient(server.port);
    const joinFailedPromise = waitForSocket(client, 'join-failed');
    client.emit('join-room', null);

    const failure = await joinFailedPromise;

    assert.match(failure.message, /房间号/);
    assert.deepEqual(server.shareq.roomsData, {});
    assert.equal(server.shareq.activeConnections.size, 0);
  } finally {
    await closeTestServer(server, client ? [client] : []);
  }
});

test('join-room rejects invalid bounded fields without creating a room', async () => {
  const server = await createTestServer();
  let client;

  try {
    client = await connectClient(server.port);
    const invalidRoomPromise = waitForSocket(client, 'join-failed');
    client.emit('join-room', {
      roomId: 'BAD_ROOM',
      username: 'Alice',
      avatar: '🎤',
      userId: 'user-1'
    });

    const invalidRoomFailure = await invalidRoomPromise;
    assert.match(invalidRoomFailure.message, /房间号/);
    assert.deepEqual(server.shareq.roomsData, {});
    assert.equal(server.shareq.activeConnections.size, 0);

    const overlongAvatarPromise = waitForSocket(client, 'join-failed');
    client.emit('join-room', {
      roomId: 'VALID1',
      username: 'Alice',
      avatar: 'x'.repeat(64 * 1024 + 1),
      userId: 'user-1'
    });

    const overlongAvatarFailure = await overlongAvatarPromise;
    assert.match(overlongAvatarFailure.message, /房间号/);
    assert.deepEqual(server.shareq.roomsData, {});
    assert.equal(server.shareq.activeConnections.size, 0);
  } finally {
    await closeTestServer(server, client ? [client] : []);
  }
});

test('update-profile rejects invalid bounded fields without mutating connection data', async () => {
  const server = await createTestServer();
  let client;

  try {
    client = await connectClient(server.port);
    await joinRoom(client, {
      roomId: 'PROFILE',
      username: 'Alice',
      userId: 'user-1',
      avatar: '🎤'
    });

    const errorPromise = waitForSocket(client, 'system-message');
    client.emit('update-profile', {
      username: 'A'.repeat(31),
      avatar: '🎸'
    });

    const errorMessage = await errorPromise;
    assert.equal(errorMessage.type, 'error');
    assert.equal(server.shareq.activeConnections.get(client.id).username, 'Alice');
    assert.equal(server.shareq.activeConnections.get(client.id).avatar, '🎤');

    const avatarErrorPromise = waitForSocket(client, 'system-message');
    client.emit('update-profile', {
      username: 'Alice',
      avatar: 'x'.repeat(64 * 1024 + 1)
    });

    const avatarErrorMessage = await avatarErrorPromise;
    assert.equal(avatarErrorMessage.type, 'error');
    assert.equal(server.shareq.activeConnections.get(client.id).username, 'Alice');
    assert.equal(server.shareq.activeConnections.get(client.id).avatar, '🎤');
  } finally {
    await closeTestServer(server, client ? [client] : []);
  }
});

test('adding a song broadcasts playlist and persists room data', async () => {
  const server = await createTestServer();
  let client;

  try {
    client = await connectClient(server.port);
    await joinRoom(client, {
      roomId: 'SONGS',
      username: 'Alice',
      userId: 'user-1'
    });

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
    assert.equal(playlist[0].requestedByUserId, 'user-1');

    const savedRooms = loadRooms(server.shareq.databaseFile, silentLogger);
    assert.equal(savedRooms.SONGS.songs[0].title, '七里香');
    assert.equal(savedRooms.SONGS.songs[0].requestedByUserId, 'user-1');
  } finally {
    await closeTestServer(server, client ? [client] : []);
  }
});

test('add-song rejects overlong fields and non-http links without mutating the queue', async () => {
  const server = await createTestServer();
  let client;

  try {
    client = await connectClient(server.port);
    await joinRoom(client, {
      roomId: 'VALIDATE',
      username: 'Alice',
      userId: 'user-1'
    });

    const invalidLinkPromise = waitForSocket(client, 'system-message');
    client.emit('add-song', {
      title: '七里香',
      singer: '周杰伦',
      link: 'ftp://example.com/song'
    });
    const invalidLinkError = await invalidLinkPromise;

    assert.equal(invalidLinkError.type, 'error');
    assert.equal(server.shareq.roomsData.VALIDATE.songs.length, 0);

    const overlongTitlePromise = waitForSocket(client, 'system-message');
    client.emit('add-song', {
      title: 'A'.repeat(121),
      singer: '周杰伦',
      link: ''
    });
    const overlongTitleError = await overlongTitlePromise;

    assert.equal(overlongTitleError.type, 'error');
    assert.equal(server.shareq.roomsData.VALIDATE.songs.length, 0);

    const overlongSingerPromise = waitForSocket(client, 'system-message');
    client.emit('add-song', {
      title: '七里香',
      singer: 'A'.repeat(81),
      link: ''
    });
    const overlongSingerError = await overlongSingerPromise;

    assert.equal(overlongSingerError.type, 'error');
    assert.equal(server.shareq.roomsData.VALIDATE.songs.length, 0);
  } finally {
    await closeTestServer(server, client ? [client] : []);
  }
});

test('socket save failures emit an error without rolling back in-memory changes', async () => {
  let saveCalls = 0;
  const loggerErrors = [];
  const failingLogger = {
    log() {},
    error(...args) {
      loggerErrors.push(args);
    }
  };
  const server = await createTestServer({
    logger: failingLogger,
    saveRooms() {
      saveCalls++;
      return false;
    }
  });
  let client;

  try {
    client = await connectClient(server.port);
    await joinRoom(client, {
      roomId: 'SAVEFAIL',
      username: 'Alice',
      userId: 'user-1'
    });

    const playlistPromise = waitForSocket(client, 'playlist-updated');
    const errorPromise = waitForSocketMatching(
      client,
      'system-message',
      (message) => message.type === 'error' && message.text.includes('保存失败')
    );
    client.emit('add-song', {
      title: '七里香',
      singer: '周杰伦',
      link: ''
    });

    const [playlist, errorMessage] = await Promise.all([playlistPromise, errorPromise]);

    assert.equal(saveCalls, 1);
    assert.equal(playlist.length, 1);
    assert.equal(errorMessage.type, 'error');
    assert.equal(server.shareq.roomsData.SAVEFAIL.songs.length, 1);
    assert.equal(server.shareq.roomsData.SAVEFAIL.songs[0].title, '七里香');
    assert.equal(loggerErrors.length, 1);
    assert.match(loggerErrors[0][0], /persist room data/);
  } finally {
    await closeTestServer(server, client ? [client] : []);
  }
});

test('add-song rejects empty and invalid payloads without mutating the queue', async () => {
  const server = await createTestServer();
  let client;

  try {
    client = await connectClient(server.port);
    await joinRoom(client, {
      roomId: 'INVALIDSONGS',
      username: 'Alice',
      userId: 'user-1'
    });

    const emptyTitlePromise = waitForSocket(client, 'system-message');
    client.emit('add-song', {
      title: ' ',
      singer: '周杰伦',
      link: ''
    });
    const emptyTitleError = await emptyTitlePromise;

    assert.equal(emptyTitleError.type, 'error');
    assert.equal(server.shareq.roomsData.INVALIDSONGS.songs.length, 0);

    const invalidSingerPromise = waitForSocket(client, 'system-message');
    client.emit('add-song', {
      title: '七里香',
      singer: {},
      link: ''
    });
    const invalidSingerError = await invalidSingerPromise;

    assert.equal(invalidSingerError.type, 'error');
    assert.equal(server.shareq.roomsData.INVALIDSONGS.songs.length, 0);
  } finally {
    await closeTestServer(server, client ? [client] : []);
  }
});

test('add-song cooldown rejects rapid duplicate submissions from the same socket', async () => {
  const server = await createTestServer();
  let client;

  try {
    client = await connectClient(server.port);
    await joinRoom(client, {
      roomId: 'ADDSPAM',
      username: 'Alice',
      userId: 'user-1'
    });

    const firstPlaylistPromise = waitForSocket(client, 'playlist-updated');
    client.emit('add-song', {
      title: 'First',
      singer: '',
      link: ''
    });
    await firstPlaylistPromise;

    const errorPromise = waitForSocket(client, 'system-message');
    const noPlaylistPromise = waitForNoSocketEvent(client, 'playlist-updated');
    client.emit('add-song', {
      title: 'Second',
      singer: '',
      link: ''
    });
    const [errorMessage] = await Promise.all([errorPromise, noPlaylistPromise]);

    assert.equal(errorMessage.type, 'error');
    assert.equal(server.shareq.roomsData.ADDSPAM.songs.length, 1);
    assert.equal(server.shareq.roomsData.ADDSPAM.songs[0].title, 'First');
  } finally {
    await closeTestServer(server, client ? [client] : []);
  }
});

test('invalid reaction types do not update playlist or trigger effects', async () => {
  const server = await createTestServer();
  let client;

  try {
    client = await connectClient(server.port);
    await joinRoom(client, {
      roomId: 'REACTIONS',
      username: 'Alice',
      userId: 'user-1'
    });

    const playlistPromise = waitForSocket(client, 'playlist-updated');
    client.emit('add-song', {
      title: '七里香',
      singer: '周杰伦',
      link: ''
    });
    await playlistPromise;

    const noPlaylistPromise = waitForNoSocketEvent(client, 'playlist-updated');
    const noEffectPromise = waitForNoSocketEvent(client, 'trigger-reaction-effect');
    client.emit('send-reaction', { type: 'tomato' });
    await Promise.all([noPlaylistPromise, noEffectPromise]);

    const reactions = server.shareq.roomsData.REACTIONS.songs[0].reactions;
    assert.deepEqual(reactions, createReactions());
    assert.equal(Object.hasOwn(reactions, 'tomato'), false);
  } finally {
    await closeTestServer(server, client ? [client] : []);
  }
});

test('send-reaction cooldown drops rapid duplicate reactions from the same socket', async () => {
  const server = await createTestServer();
  let client;

  try {
    client = await connectClient(server.port);
    await joinRoom(client, {
      roomId: 'REACTSPAM',
      username: 'Alice',
      userId: 'user-1'
    });

    const addPlaylistPromise = waitForSocket(client, 'playlist-updated');
    client.emit('add-song', {
      title: '七里香',
      singer: '周杰伦',
      link: ''
    });
    await addPlaylistPromise;

    const firstPlaylistPromise = waitForSocket(client, 'playlist-updated');
    const firstEffectPromise = waitForSocket(client, 'trigger-reaction-effect');
    client.emit('send-reaction', { type: 'rose' });
    await Promise.all([firstPlaylistPromise, firstEffectPromise]);

    const noPlaylistPromise = waitForNoSocketEvent(client, 'playlist-updated');
    const noEffectPromise = waitForNoSocketEvent(client, 'trigger-reaction-effect');
    client.emit('send-reaction', { type: 'rose' });
    await Promise.all([noPlaylistPromise, noEffectPromise]);

    assert.deepEqual(server.shareq.roomsData.REACTSPAM.songs[0].reactions, {
      rose: 1,
      clap: 0,
      egg: 0,
      shoe: 0
    });
  } finally {
    await closeTestServer(server, client ? [client] : []);
  }
});

test('dedicate-song rejects invalid payloads without creating pending dedications', async () => {
  const server = await createTestServer();
  const clients = [];

  try {
    const alice = await connectClient(server.port);
    const bob = await connectClient(server.port);
    clients.push(alice, bob);

    await joinRoom(alice, {
      roomId: 'DEDICATE',
      username: 'Alice',
      userId: 'user-1'
    });
    await joinRoom(bob, {
      roomId: 'DEDICATE',
      username: 'Bob',
      userId: 'user-2'
    });

    const emptyTitlePromise = waitForSocket(alice, 'dedication-failed');
    alice.emit('dedicate-song', {
      title: '',
      singer: '周杰伦',
      link: '',
      targetUserId: 'user-2'
    });
    const emptyTitleFailure = await emptyTitlePromise;

    assert.match(emptyTitleFailure.message, /指名点歌/);
    assert.equal(server.shareq.pendingDedications.size, 0);
    assert.equal(server.shareq.roomsData.DEDICATE.songs.length, 0);

    const invalidLinkPromise = waitForSocket(alice, 'dedication-failed');
    alice.emit('dedicate-song', {
      title: '七里香',
      singer: '周杰伦',
      link: 'javascript:alert(1)',
      targetUserId: 'user-2'
    });
    const invalidLinkFailure = await invalidLinkPromise;

    assert.match(invalidLinkFailure.message, /指名点歌/);
    assert.equal(server.shareq.pendingDedications.size, 0);
    assert.equal(server.shareq.roomsData.DEDICATE.songs.length, 0);

    const malformedPromise = waitForSocket(alice, 'dedication-failed');
    alice.emit('dedicate-song', null);
    const malformedFailure = await malformedPromise;

    assert.match(malformedFailure.message, /指名点歌/);
    assert.equal(server.shareq.pendingDedications.size, 0);
    assert.equal(server.shareq.roomsData.DEDICATE.songs.length, 0);
  } finally {
    await closeTestServer(server, clients);
  }
});

test('dedicate-song cooldown rejects rapid duplicate requests from the same socket', async () => {
  const server = await createTestServer();
  const clients = [];

  try {
    const alice = await connectClient(server.port);
    const bob = await connectClient(server.port);
    clients.push(alice, bob);

    await joinRoom(alice, {
      roomId: 'DEDISPAM',
      username: 'Alice',
      userId: 'user-1'
    });
    await joinRoom(bob, {
      roomId: 'DEDISPAM',
      username: 'Bob',
      userId: 'user-2'
    });

    const firstPendingPromise = waitForSocket(alice, 'dedication-pending');
    alice.emit('dedicate-song', {
      title: 'First',
      singer: '',
      link: '',
      targetUserId: 'user-2'
    });
    await firstPendingPromise;
    assert.equal(server.shareq.pendingDedications.size, 1);

    const cooldownPromise = waitForSocket(alice, 'dedication-failed');
    alice.emit('dedicate-song', {
      title: 'Second',
      singer: '',
      link: '',
      targetUserId: 'user-2'
    });
    const cooldownFailure = await cooldownPromise;

    assert.match(cooldownFailure.message, /频繁/);
    assert.equal(server.shareq.pendingDedications.size, 1);
  } finally {
    await closeTestServer(server, clients);
  }
});

test('users cannot delete songs requested by someone else', async () => {
  const server = await createTestServer();
  const clients = [];

  try {
    const alice = await connectClient(server.port);
    const bob = await connectClient(server.port);
    clients.push(alice, bob);

    await joinRoom(alice, {
      roomId: 'PERMS',
      username: 'Alice',
      userId: 'user-1'
    });
    await joinRoom(bob, {
      roomId: 'PERMS',
      username: 'Bob',
      userId: 'user-2'
    });

    const alicePlaylistPromise = waitForSocket(alice, 'playlist-updated');
    const bobPlaylistPromise = waitForSocket(bob, 'playlist-updated');
    alice.emit('add-song', {
      title: '青花瓷',
      singer: '周杰伦',
      link: ''
    });

    const [playlist] = await Promise.all([alicePlaylistPromise, bobPlaylistPromise]);
    const songId = playlist[0].id;

    const errorPromise = waitForSocket(bob, 'system-message');
    bob.emit('delete-song', { songId });
    const errorMessage = await errorPromise;

    assert.equal(errorMessage.type, 'error');
    assert.equal(server.shareq.roomsData.PERMS.songs.length, 1);
    assert.equal(server.shareq.roomsData.PERMS.songs[0].id, songId);
  } finally {
    await closeTestServer(server, clients);
  }
});

test('song delete ownership follows user ID after profile renames', async () => {
  const server = await createTestServer();
  const clients = [];

  try {
    const alice = await connectClient(server.port);
    const bob = await connectClient(server.port);
    clients.push(alice, bob);

    await joinRoom(alice, {
      roomId: 'OWNER',
      username: 'Alice',
      userId: 'user-1'
    });
    await joinRoom(bob, {
      roomId: 'OWNER',
      username: 'Bob',
      userId: 'user-2'
    });

    const alicePlaylistPromise = waitForSocket(alice, 'playlist-updated');
    const bobPlaylistPromise = waitForSocket(bob, 'playlist-updated');
    alice.emit('add-song', {
      title: '青花瓷',
      singer: '周杰伦',
      link: ''
    });

    const [playlist] = await Promise.all([alicePlaylistPromise, bobPlaylistPromise]);
    const songId = playlist[0].id;
    assert.equal(playlist[0].requestedByUserId, 'user-1');

    const bobRenamePromise = waitForSocketMatching(
      bob,
      'users-updated',
      (users) => users.some((user) => user.userId === 'user-2' && user.username === 'Alice')
    );
    bob.emit('update-profile', { username: 'Alice', avatar: '🎤' });
    await bobRenamePromise;

    const forbiddenPromise = waitForSocket(bob, 'system-message');
    bob.emit('delete-song', { songId });
    const forbiddenMessage = await forbiddenPromise;

    assert.equal(forbiddenMessage.type, 'error');
    assert.equal(server.shareq.roomsData.OWNER.songs.length, 1);

    const aliceRenamePromise = waitForSocketMatching(
      alice,
      'users-updated',
      (users) => users.some((user) => user.userId === 'user-1' && user.username === 'Carol')
    );
    alice.emit('update-profile', { username: 'Carol', avatar: '🎤' });
    await aliceRenamePromise;

    const deletePromise = waitForSocket(alice, 'playlist-updated');
    alice.emit('delete-song', { songId });
    const updatedPlaylist = await deletePromise;

    assert.deepEqual(updatedPlaylist, []);
    assert.deepEqual(server.shareq.roomsData.OWNER.songs, []);
  } finally {
    await closeTestServer(server, clients);
  }
});

test('current singer skip permission follows user ID after profile renames', async () => {
  const server = await createTestServer();
  const clients = [];

  try {
    const alice = await connectClient(server.port);
    const bob = await connectClient(server.port);
    clients.push(alice, bob);

    await joinRoom(alice, {
      roomId: 'SINGER',
      username: 'Alice',
      userId: 'user-1'
    });
    await joinRoom(bob, {
      roomId: 'SINGER',
      username: 'Bob',
      userId: 'user-2'
    });

    const alicePlaylistPromise = waitForSocket(alice, 'playlist-updated');
    const bobPlaylistPromise = waitForSocket(bob, 'playlist-updated');
    alice.emit('add-song', {
      title: '稻香',
      singer: '周杰伦',
      link: ''
    });
    const [playlist] = await Promise.all([alicePlaylistPromise, bobPlaylistPromise]);
    assert.equal(playlist[0].requestedByUserId, 'user-1');

    const bobRenamePromise = waitForSocketMatching(
      bob,
      'users-updated',
      (users) => users.some((user) => user.userId === 'user-2' && user.username === 'Alice')
    );
    bob.emit('update-profile', { username: 'Alice', avatar: '🎤' });
    await bobRenamePromise;

    const noHistoryPromise = waitForNoSocketEvent(bob, 'history-updated');
    bob.emit('next-song');
    await noHistoryPromise;
    assert.equal(server.shareq.roomsData.SINGER.songs.length, 1);
    assert.equal(server.shareq.roomsData.SINGER.alreadySung.length, 0);

    const aliceRenamePromise = waitForSocketMatching(
      alice,
      'users-updated',
      (users) => users.some((user) => user.userId === 'user-1' && user.username === 'Carol')
    );
    alice.emit('update-profile', { username: 'Carol', avatar: '🎤' });
    await aliceRenamePromise;

    const historyPromise = waitForSocket(alice, 'history-updated');
    alice.emit('next-song');
    const history = await historyPromise;

    assert.equal(history.length, 1);
    assert.equal(history[0].id, playlist[0].id);
    assert.equal(server.shareq.roomsData.SINGER.songs.length, 0);
  } finally {
    await closeTestServer(server, clients);
  }
});

test('host can delete songs requested by another user', async () => {
  const server = await createTestServer();
  const clients = [];

  try {
    const host = await connectClient(server.port);
    const guest = await connectClient(server.port);
    clients.push(host, guest);

    await joinRoom(host, {
      roomId: 'ADMIN',
      username: 'Host',
      userId: 'host-user'
    });
    await joinRoom(guest, {
      roomId: 'ADMIN',
      username: 'Guest',
      userId: 'guest-user'
    });

    const hostPlaylistPromise = waitForSocket(host, 'playlist-updated');
    const guestPlaylistPromise = waitForSocket(guest, 'playlist-updated');
    guest.emit('add-song', {
      title: 'Guest Song',
      singer: '',
      link: ''
    });

    const [playlist] = await Promise.all([hostPlaylistPromise, guestPlaylistPromise]);
    const songId = playlist[0].id;

    const deletePromise = waitForSocket(guest, 'playlist-updated');
    host.emit('delete-song', { songId });
    const updatedPlaylist = await deletePromise;

    assert.deepEqual(updatedPlaylist, []);
    assert.deepEqual(server.shareq.roomsData.ADMIN.songs, []);
  } finally {
    await closeTestServer(server, clients);
  }
});

test('guests cannot shuffle the playlist by emitting the socket event directly', async () => {
  const server = await createTestServer();
  const clients = [];

  try {
    const host = await connectClient(server.port);
    const guest = await connectClient(server.port);
    clients.push(host, guest);

    await joinRoom(host, {
      roomId: 'SHUFFLE',
      username: 'Host',
      userId: 'host-user'
    });
    await joinRoom(guest, {
      roomId: 'SHUFFLE',
      username: 'Guest',
      userId: 'guest-user'
    });

    const room = server.shareq.roomsData.SHUFFLE;
    for (const title of ['One', 'Two', 'Three']) {
      addSong(
        room,
        {
          username: 'Host',
          userId: 'host-user',
          avatar: '🎤'
        },
        {
          title,
          singer: '',
          link: ''
        }
      );
    }

    const originalOrder = room.songs.map((song) => song.id);
    const errorPromise = waitForSocket(guest, 'system-message');
    const noPlaylistPromise = waitForNoSocketEvent(host, 'playlist-updated');
    guest.emit('shuffle-playlist');
    const [errorMessage] = await Promise.all([errorPromise, noPlaylistPromise]);

    assert.equal(errorMessage.type, 'error');
    assert.deepEqual(
      room.songs.map((song) => song.id),
      originalOrder
    );
    assert.equal(room.historyStack.length, 3);
  } finally {
    await closeTestServer(server, clients);
  }
});

test('moderators can advance the queue after host promotion', async () => {
  const server = await createTestServer();
  const clients = [];

  try {
    const host = await connectClient(server.port);
    const moderator = await connectClient(server.port);
    clients.push(host, moderator);

    await joinRoom(host, {
      roomId: 'ROLES',
      username: 'Host',
      userId: 'host-user'
    });
    await joinRoom(moderator, {
      roomId: 'ROLES',
      username: 'Moderator',
      userId: 'mod-user'
    });

    const rolesPromise = waitForSocket(moderator, 'roles-updated');
    host.emit('promote-moderator', { targetUserId: 'mod-user' });
    const roles = await rolesPromise;

    assert.deepEqual(roles, {
      hostUserId: 'host-user',
      moderatorUserIds: ['mod-user']
    });

    const hostPlaylistPromise = waitForSocket(host, 'playlist-updated');
    const modPlaylistPromise = waitForSocket(moderator, 'playlist-updated');
    host.emit('add-song', {
      title: 'Host Song',
      singer: '',
      link: ''
    });
    const [playlist] = await Promise.all([hostPlaylistPromise, modPlaylistPromise]);

    const historyPromise = waitForSocket(host, 'history-updated');
    moderator.emit('next-song');
    const history = await historyPromise;

    assert.equal(history.length, 1);
    assert.equal(history[0].id, playlist[0].id);
    assert.deepEqual(server.shareq.roomsData.ROLES.songs, []);
    assert.equal(server.shareq.roomsData.ROLES.alreadySung[0].id, playlist[0].id);
  } finally {
    await closeTestServer(server, clients);
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
    requestedByUserId: 'user-1',
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
    requestedByUserId: 'user-2',
    requestedByAvatar: '🎤',
    prioritized: false,
    reactions: createReactions(),
    createdAt: 2
  });

  assert.equal(undoAction(room), true);
  assert.deepEqual(
    room.songs.map((song) => song.id),
    ['song-1']
  );
  assert.equal(redoAction(room), true);
  assert.deepEqual(
    room.songs.map((song) => song.id),
    ['song-1', 'song-2']
  );
});

test('storage cleanup removes only old empty rooms', () => {
  const now = Date.UTC(2026, 5, 7);
  const old = now - 49 * 60 * 60 * 1000;
  const recent = now - 1 * 60 * 60 * 1000;

  const { cleanSaveData, cleanedCount } = createSaveData(
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
        songs: [{ id: 'song-1', title: 'Still Here' }],
        alreadySung: [],
        updatedAt: old
      }
    },
    now
  );

  assert.equal(cleanedCount, 1);
  assert.deepEqual(Object.keys(cleanSaveData).sort(), ['OLD_ACTIVE', 'RECENT_EMPTY']);
});
