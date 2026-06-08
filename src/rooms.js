export const DEFAULT_AVATAR = '🎤';
export const ALLOWED_REACTION_TYPES = Object.freeze(['rose', 'clap', 'egg', 'shoe']);
export const DEFAULT_REACTIONS = Object.freeze({
  rose: 0,
  clap: 0,
  egg: 0,
  shoe: 0
});

export function normalizeRoomId(roomId) {
  return String(roomId || '')
    .trim()
    .toUpperCase();
}

export function createRoom(roomId, now = Date.now()) {
  const normalizedId = normalizeRoomId(roomId);
  return {
    id: normalizedId,
    songs: [],
    alreadySung: [],
    hostUserId: '',
    moderatorUserIds: [],
    updatedAt: now,
    historyStack: [],
    futureStack: []
  };
}

export function ensureRoomDefaults(room) {
  room.songs ||= [];
  room.alreadySung ||= [];
  room.hostUserId ||= '';
  room.moderatorUserIds ||= [];
  room.historyStack ||= [];
  room.futureStack ||= [];
  return room;
}

export function getOrCreateRoom(roomsData, roomId, now = Date.now()) {
  const normalizedId = normalizeRoomId(roomId);
  if (!roomsData[normalizedId]) {
    roomsData[normalizedId] = createRoom(normalizedId, now);
  }

  return ensureRoomDefaults(roomsData[normalizedId]);
}

export function createReactions() {
  return { ...DEFAULT_REACTIONS };
}

export function createSong({ title, singer, link, requestedBy, requestedByUserId, requestedByAvatar, dedicatedBy }) {
  if (!requestedByUserId) {
    throw new Error('requestedByUserId is required');
  }

  const song = {
    id: Math.random().toString(36).substring(2, 9),
    title: String(title).trim(),
    singer: String(singer || '').trim(),
    link: String(link || '').trim(),
    requestedBy,
    requestedByUserId,
    requestedByAvatar,
    prioritized: false,
    reactions: createReactions(),
    createdAt: Date.now()
  };

  if (dedicatedBy) {
    song.dedicatedBy = dedicatedBy;
  }

  return song;
}

export function pushHistory(room) {
  ensureRoomDefaults(room);
  room.historyStack.push(
    JSON.stringify({
      songs: room.songs,
      alreadySung: room.alreadySung
    })
  );

  if (room.historyStack.length > 50) {
    room.historyStack.shift();
  }

  room.futureStack = [];
}

export function undoAction(room) {
  ensureRoomDefaults(room);
  if (room.historyStack.length === 0) {
    return false;
  }

  room.futureStack.push(
    JSON.stringify({
      songs: room.songs,
      alreadySung: room.alreadySung
    })
  );

  const prevState = JSON.parse(room.historyStack.pop());
  room.songs = prevState.songs;
  room.alreadySung = prevState.alreadySung;
  return true;
}

export function redoAction(room) {
  ensureRoomDefaults(room);
  if (room.futureStack.length === 0) {
    return false;
  }

  room.historyStack.push(
    JSON.stringify({
      songs: room.songs,
      alreadySung: room.alreadySung
    })
  );

  const nextState = JSON.parse(room.futureStack.pop());
  room.songs = nextState.songs;
  room.alreadySung = nextState.alreadySung;
  return true;
}

export function isHost(userData, room) {
  return Boolean(userData && room && userData.userId === room.hostUserId);
}

export function isModerator(userData, room) {
  return Boolean(userData && room && room.moderatorUserIds.includes(userData.userId));
}

export function canManageQueue(userData, room) {
  return isHost(userData, room) || isModerator(userData, room);
}

export function canDeleteSong(userData, room, song) {
  return canManageQueue(userData, room) || song.requestedByUserId === userData.userId;
}
