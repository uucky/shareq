import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addReaction,
  advanceQueue,
  canKickUser,
  deleteSong,
  endSession,
  prioritizeSong,
  redoPlaylist,
  restorePreviousSong,
  shufflePlaylist,
  toggleModerator,
  transferHost,
  undoPlaylist
} from '../src/room-actions.js';
import { createReactions, pushHistory } from '../src/rooms.js';

const hostUser = { userId: 'host-user', username: 'Host', avatar: 'mic' };
const moderatorUser = { userId: 'mod-user', username: 'Mod', avatar: 'mic' };
const aliceUser = { userId: 'alice-user', username: 'Alice', avatar: 'mic' };
const bobUser = { userId: 'bob-user', username: 'Bob', avatar: 'mic' };

function createRoom(overrides = {}) {
  return {
    id: 'ROOM',
    songs: [],
    alreadySung: [],
    hostUserId: hostUser.userId,
    moderatorUserIds: [],
    updatedAt: 1,
    historyStack: [],
    futureStack: [],
    ...overrides
  };
}

function createSong(id, requestedBy = 'Alice', overrides = {}) {
  return {
    id,
    title: id,
    singer: '',
    link: '',
    requestedBy,
    requestedByAvatar: 'mic',
    prioritized: false,
    reactions: createReactions(),
    createdAt: 1,
    ...overrides
  };
}

test('deleteSong rejects a non-owner deleting another user song', () => {
  const room = createRoom({
    songs: [createSong('song-1', 'Alice')]
  });

  const result = deleteSong(room, bobUser, 'song-1', 2);

  assert.deepEqual(result, {
    changed: false,
    reason: 'forbidden',
    song: room.songs[0]
  });
  assert.equal(room.songs.length, 1);
  assert.equal(room.historyStack.length, 0);
  assert.equal(room.updatedAt, 1);
});

test('deleteSong allows host and moderators to delete another user song', () => {
  const hostRoom = createRoom({
    songs: [createSong('host-delete', 'Alice')]
  });
  const hostResult = deleteSong(hostRoom, hostUser, 'host-delete', 2);

  assert.equal(hostResult.changed, true);
  assert.equal(hostResult.song.id, 'host-delete');
  assert.deepEqual(hostRoom.songs, []);
  assert.equal(hostRoom.updatedAt, 2);

  const moderatorRoom = createRoom({
    moderatorUserIds: [moderatorUser.userId],
    songs: [createSong('mod-delete', 'Alice')]
  });
  const moderatorResult = deleteSong(moderatorRoom, moderatorUser, 'mod-delete', 3);

  assert.equal(moderatorResult.changed, true);
  assert.equal(moderatorResult.song.id, 'mod-delete');
  assert.deepEqual(moderatorRoom.songs, []);
  assert.equal(moderatorRoom.updatedAt, 3);
});

test('prioritizeSong moves a queued song directly after now playing', () => {
  const room = createRoom({
    songs: [
      createSong('current'),
      createSong('second'),
      createSong('third')
    ]
  });

  const result = prioritizeSong(room, 'third', 2);

  assert.equal(result.changed, true);
  assert.equal(result.song.id, 'third');
  assert.deepEqual(room.songs.map(song => song.id), ['current', 'third', 'second']);
  assert.equal(room.updatedAt, 2);
});

test('shufflePlaylist preserves now playing and prioritized songs before shuffled rest', () => {
  const room = createRoom({
    songs: [
      createSong('current'),
      createSong('priority', 'Alice', { prioritized: true }),
      createSong('first'),
      createSong('second')
    ]
  });

  const result = shufflePlaylist(room, { random: () => 0, now: 2 });

  assert.equal(result.changed, true);
  assert.deepEqual(room.songs.map(song => song.id), ['current', 'priority', 'second', 'first']);
  assert.equal(room.historyStack.length, 1);
  assert.equal(room.updatedAt, 2);
});

test('advanceQueue moves current song to sung history and initializes reactions', () => {
  const room = createRoom({
    songs: [
      createSong('current', 'Alice', { reactions: undefined }),
      createSong('next', 'Bob')
    ]
  });

  const result = advanceQueue(room, aliceUser, 100);

  assert.equal(result.changed, true);
  assert.equal(result.song.id, 'current');
  assert.equal(result.song.completedAt, 100);
  assert.deepEqual(result.song.reactions, createReactions());
  assert.deepEqual(room.songs.map(song => song.id), ['next']);
  assert.deepEqual(room.alreadySung.map(song => song.id), ['current']);
  assert.equal(room.updatedAt, 100);
});

test('restorePreviousSong moves latest sung song back and resets reactions', () => {
  const room = createRoom({
    alreadySung: [
      createSong('old', 'Alice'),
      createSong('previous', 'Bob', {
        reactions: { rose: 5, clap: 4, egg: 3, shoe: 2 }
      })
    ]
  });

  const result = restorePreviousSong(room, hostUser, 200);

  assert.equal(result.changed, true);
  assert.equal(result.song.id, 'previous');
  assert.deepEqual(result.song.reactions, createReactions());
  assert.deepEqual(room.songs.map(song => song.id), ['previous']);
  assert.deepEqual(room.alreadySung.map(song => song.id), ['old']);
  assert.equal(room.updatedAt, 200);
});

test('undoPlaylist and redoPlaylist mutate queue and history for admins', () => {
  const room = createRoom({
    songs: [createSong('one')]
  });

  pushHistory(room);
  room.songs.push(createSong('two'));

  const undoResult = undoPlaylist(room, hostUser, 300);

  assert.equal(undoResult.changed, true);
  assert.deepEqual(room.songs.map(song => song.id), ['one']);
  assert.equal(room.updatedAt, 300);

  const redoResult = redoPlaylist(room, hostUser, 400);

  assert.equal(redoResult.changed, true);
  assert.deepEqual(room.songs.map(song => song.id), ['one', 'two']);
  assert.equal(room.updatedAt, 400);
});

test('toggleModerator adds and removes moderator membership for host only', () => {
  const room = createRoom();

  const addResult = toggleModerator(room, hostUser, moderatorUser.userId, 2);

  assert.equal(addResult.changed, true);
  assert.deepEqual(room.moderatorUserIds, [moderatorUser.userId]);
  assert.equal(room.updatedAt, 2);

  const removeResult = toggleModerator(room, hostUser, moderatorUser.userId, 3);

  assert.equal(removeResult.changed, true);
  assert.deepEqual(room.moderatorUserIds, []);
  assert.equal(room.updatedAt, 3);

  const forbiddenResult = toggleModerator(room, aliceUser, moderatorUser.userId, 4);

  assert.deepEqual(forbiddenResult, { changed: false, reason: 'forbidden' });
  assert.deepEqual(room.moderatorUserIds, []);
  assert.equal(room.updatedAt, 3);
});

test('transferHost demotes old host and removes new host from moderators', () => {
  const room = createRoom({
    moderatorUserIds: [aliceUser.userId]
  });

  const result = transferHost(room, hostUser, aliceUser.userId, 2);

  assert.equal(result.changed, true);
  assert.equal(result.oldHostId, hostUser.userId);
  assert.equal(room.hostUserId, aliceUser.userId);
  assert.deepEqual(room.moderatorUserIds, [hostUser.userId]);
  assert.equal(room.updatedAt, 2);
});

test('canKickUser enforces host and moderator kick restrictions', () => {
  const room = createRoom({
    moderatorUserIds: [moderatorUser.userId, aliceUser.userId]
  });

  assert.equal(canKickUser(room, hostUser, moderatorUser), true);
  assert.equal(canKickUser(room, moderatorUser, bobUser), true);
  assert.equal(canKickUser(room, moderatorUser, aliceUser), false);
  assert.equal(canKickUser(room, moderatorUser, hostUser), false);
  assert.equal(canKickUser(room, bobUser, aliceUser), false);
});

test('endSession clears queue, sung history, and undo stacks', () => {
  const room = createRoom({
    songs: [createSong('one')],
    alreadySung: [createSong('done')],
    historyStack: ['past'],
    futureStack: ['future']
  });

  const result = endSession(room, hostUser, 2);

  assert.equal(result.changed, true);
  assert.deepEqual(room.songs, []);
  assert.deepEqual(room.alreadySung, []);
  assert.deepEqual(room.historyStack, []);
  assert.deepEqual(room.futureStack, []);
  assert.equal(room.updatedAt, 2);
});

test('addReaction initializes missing reaction state and increments counters', () => {
  const room = createRoom({
    songs: [
      createSong('current', 'Alice', { reactions: undefined })
    ]
  });

  const firstResult = addReaction(room, 'rose');
  const secondResult = addReaction(room, 'rose');

  assert.equal(firstResult.changed, true);
  assert.equal(secondResult.changed, true);
  assert.deepEqual(room.songs[0].reactions, {
    rose: 2,
    clap: 0,
    egg: 0,
    shoe: 0
  });
});
