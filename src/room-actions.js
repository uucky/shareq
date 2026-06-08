import {
  ALLOWED_REACTION_TYPES,
  canDeleteSong,
  canManageQueue,
  createReactions,
  createSong,
  pushHistory,
  redoAction,
  undoAction
} from './rooms.js';

export function addSong(room, userData, { title, singer, link }, now = Date.now()) {
  pushHistory(room);

  const song = createSong({
    title,
    singer,
    link,
    requestedBy: userData.username,
    requestedByUserId: userData.userId,
    requestedByAvatar: userData.avatar
  });

  room.songs.push(song);
  room.updatedAt = now;

  return { changed: true, song };
}

export function acceptDedication(room, dedication, requestedByAvatar, now = Date.now()) {
  pushHistory(room);

  const song = createSong({
    title: dedication.title,
    singer: dedication.singer,
    link: dedication.link,
    requestedBy: dedication.targetUsername,
    requestedByUserId: dedication.targetUserId,
    requestedByAvatar,
    dedicatedBy: dedication.fromUsername
  });

  room.songs.push(song);
  room.updatedAt = now;

  return { changed: true, song };
}

export function prioritizeSong(room, songId, now = Date.now()) {
  const songIndex = room.songs.findIndex((song) => song.id === songId);
  if (songIndex === -1) {
    return { changed: false, reason: 'not_found' };
  }

  pushHistory(room);
  const song = room.songs[songIndex];
  song.prioritized = true;

  if (songIndex > 1) {
    const [movedSong] = room.songs.splice(songIndex, 1);
    room.songs.splice(1, 0, movedSong);
  }

  room.updatedAt = now;
  return { changed: true, song };
}

export function deleteSong(room, userData, songId, now = Date.now()) {
  const songIndex = room.songs.findIndex((song) => song.id === songId);
  if (songIndex === -1) {
    return { changed: false, reason: 'not_found' };
  }

  const song = room.songs[songIndex];
  if (!canDeleteSong(userData, room, song)) {
    return { changed: false, reason: 'forbidden', song };
  }

  pushHistory(room);
  room.songs.splice(songIndex, 1);
  room.updatedAt = now;

  return { changed: true, song };
}

export function shufflePlaylist(room, { random = Math.random, now = Date.now() } = {}) {
  if (room.songs.length <= 2) {
    return { changed: false, reason: 'too_few_songs' };
  }

  pushHistory(room);

  const nowPlaying = room.songs[0];
  const restSongs = room.songs.slice(1);
  const prioritizedSongs = restSongs.filter((song) => song.prioritized);
  const unprioritizedSongs = restSongs.filter((song) => !song.prioritized);

  for (let i = unprioritizedSongs.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [unprioritizedSongs[i], unprioritizedSongs[j]] = [unprioritizedSongs[j], unprioritizedSongs[i]];
  }

  room.songs = [nowPlaying, ...prioritizedSongs, ...unprioritizedSongs];
  room.updatedAt = now;

  return { changed: true };
}

export function advanceQueue(room, userData, now = Date.now()) {
  const currentSong = room.songs[0];
  const isCurrentSongOwner = currentSong && currentSong.requestedByUserId === userData.userId;

  if (!canManageQueue(userData, room) && !isCurrentSongOwner) {
    return { changed: false, reason: 'forbidden' };
  }

  if (!currentSong) {
    return { changed: false, reason: 'empty_queue' };
  }

  pushHistory(room);

  const [completedSong] = room.songs.splice(0, 1);
  completedSong.completedAt = now;

  if (!completedSong.reactions) {
    completedSong.reactions = createReactions();
  }

  room.alreadySung.push(completedSong);
  room.updatedAt = now;

  return { changed: true, song: completedSong };
}

export function restorePreviousSong(room, userData, now = Date.now()) {
  if (!canManageQueue(userData, room)) {
    return { changed: false, reason: 'forbidden' };
  }

  if (!room.alreadySung || room.alreadySung.length === 0) {
    return { changed: false, reason: 'empty_history' };
  }

  pushHistory(room);

  const previousSong = room.alreadySung.pop();
  previousSong.reactions = createReactions();
  room.songs.unshift(previousSong);
  room.updatedAt = now;

  return { changed: true, song: previousSong };
}

export function undoPlaylist(room, userData, now = Date.now()) {
  if (!canManageQueue(userData, room)) {
    return { changed: false, reason: 'forbidden' };
  }

  if (!undoAction(room)) {
    return { changed: false, reason: 'empty_history' };
  }

  room.updatedAt = now;
  return { changed: true };
}

export function redoPlaylist(room, userData, now = Date.now()) {
  if (!canManageQueue(userData, room)) {
    return { changed: false, reason: 'forbidden' };
  }

  if (!redoAction(room)) {
    return { changed: false, reason: 'empty_future' };
  }

  room.updatedAt = now;
  return { changed: true };
}

export function toggleModerator(room, userData, targetUserId, now = Date.now()) {
  if (userData.userId !== room.hostUserId) {
    return { changed: false, reason: 'forbidden' };
  }

  const moderatorIndex = room.moderatorUserIds.indexOf(targetUserId);
  if (moderatorIndex === -1) {
    room.moderatorUserIds.push(targetUserId);
  } else {
    room.moderatorUserIds.splice(moderatorIndex, 1);
  }

  room.updatedAt = now;
  return { changed: true };
}

export function transferHost(room, userData, targetUserId, now = Date.now()) {
  if (userData.userId !== room.hostUserId) {
    return { changed: false, reason: 'forbidden' };
  }

  const oldHostId = room.hostUserId;
  room.hostUserId = targetUserId;

  if (!room.moderatorUserIds.includes(oldHostId)) {
    room.moderatorUserIds.push(oldHostId);
  }

  const newHostModeratorIndex = room.moderatorUserIds.indexOf(targetUserId);
  if (newHostModeratorIndex !== -1) {
    room.moderatorUserIds.splice(newHostModeratorIndex, 1);
  }

  room.updatedAt = now;
  return { changed: true, oldHostId };
}

export function canKickUser(room, userData, targetUserData) {
  if (!canManageQueue(userData, room) || !targetUserData) {
    return false;
  }

  if (targetUserData.userId === room.hostUserId) {
    return false;
  }

  const actorIsModerator = room.moderatorUserIds.includes(userData.userId);
  const targetIsModerator = room.moderatorUserIds.includes(targetUserData.userId);
  return !(actorIsModerator && targetIsModerator);
}

export function endSession(room, userData, now = Date.now()) {
  if (!canManageQueue(userData, room)) {
    return { changed: false, reason: 'forbidden' };
  }

  room.songs = [];
  room.alreadySung = [];
  room.historyStack = [];
  room.futureStack = [];
  room.updatedAt = now;

  return { changed: true };
}

export function addReaction(room, type) {
  if (!ALLOWED_REACTION_TYPES.includes(type)) {
    return { changed: false, reason: 'invalid_type' };
  }

  if (room.songs.length === 0) {
    return { changed: false, reason: 'empty_queue' };
  }

  const currentSong = room.songs[0];
  if (!currentSong.reactions) {
    currentSong.reactions = createReactions();
  }

  currentSong.reactions[type] = (currentSong.reactions[type] || 0) + 1;

  return { changed: true, song: currentSong };
}
