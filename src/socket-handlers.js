import {
  acceptDedication,
  addReaction,
  addSong,
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
} from './room-actions.js';
import {
  DEFAULT_AVATAR,
  getOrCreateRoom as getOrCreateRoomData,
  normalizeRoomId
} from './rooms.js';

const INVALID_REQUEST_MESSAGE = '请求参数无效，请刷新后重试';
const INVALID_JOIN_MESSAGE = '房间号、昵称或用户 ID 无效，请检查后重试';
const INVALID_SONG_MESSAGE = '点歌信息无效，请填写歌曲名称';
const INVALID_DEDICATION_MESSAGE = '指名点歌信息无效';

function isPayloadObject(payload) {
  return payload !== null && typeof payload === 'object' && !Array.isArray(payload);
}

function normalizeRequiredString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue === '' ? null : trimmedValue;
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    return null;
  }

  return value.trim();
}

function normalizeAvatar(value) {
  if (typeof value !== 'string') {
    return DEFAULT_AVATAR;
  }

  const trimmedValue = value.trim();
  return trimmedValue === '' ? DEFAULT_AVATAR : trimmedValue;
}

function validateJoinPayload(payload) {
  if (!isPayloadObject(payload)) {
    return null;
  }

  const roomId = normalizeRequiredString(payload.roomId);
  const username = normalizeRequiredString(payload.username);
  const userId = normalizeRequiredString(payload.userId);
  if (!roomId || !username || !userId) {
    return null;
  }

  return {
    roomId: normalizeRoomId(roomId),
    username,
    avatar: normalizeAvatar(payload.avatar),
    userId
  };
}

function validateProfilePayload(payload) {
  if (!isPayloadObject(payload)) {
    return null;
  }

  const username = normalizeRequiredString(payload.username);
  if (!username) {
    return null;
  }

  return {
    username,
    avatar: normalizeAvatar(payload.avatar)
  };
}

function validateSongPayload(payload) {
  if (!isPayloadObject(payload)) {
    return null;
  }

  const title = normalizeRequiredString(payload.title);
  const singer = normalizeOptionalString(payload.singer);
  const link = normalizeOptionalString(payload.link);
  if (!title || singer === null || link === null) {
    return null;
  }

  return { title, singer, link };
}

function validateStringIdPayload(payload, key) {
  if (!isPayloadObject(payload)) {
    return null;
  }

  return normalizeRequiredString(payload[key]);
}

function validateDedicationPayload(payload) {
  const song = validateSongPayload(payload);
  if (!song) {
    return null;
  }

  const targetUserId = validateStringIdPayload(payload, 'targetUserId');
  if (!targetUserId) {
    return null;
  }

  return { ...song, targetUserId };
}

function validateDedicationResponsePayload(payload) {
  const id = validateStringIdPayload(payload, 'id');
  if (!id || typeof payload.accept !== 'boolean') {
    return null;
  }

  return {
    id,
    accept: payload.accept
  };
}

export function registerSocketHandlers({
  io,
  roomsData,
  activeConnections,
  pendingDedications,
  logger,
  saveRooms
}) {
  function getRoomUsers(roomId) {
    const users = [];
    const roomSockets = io.sockets.adapter.rooms.get(roomId);
    if (roomSockets) {
      for (const socketId of roomSockets) {
        const userData = activeConnections.get(socketId);
        if (userData) {
          users.push({
            socketId,
            userId: userData.userId,
            username: userData.username,
            avatar: userData.avatar
          });
        }
      }
    }
    return users;
  }

  function getUserAvatar(roomId, userId) {
    const users = getRoomUsers(roomId);
    const user = users.find(candidate => candidate.userId === userId);
    return user ? user.avatar : DEFAULT_AVATAR;
  }

  function getOrCreateRoom(roomId) {
    return getOrCreateRoomData(roomsData, roomId);
  }

  function emitRoles(roomId, room) {
    io.to(roomId).emit('roles-updated', {
      hostUserId: room.hostUserId,
      moderatorUserIds: room.moderatorUserIds
    });
  }

  io.on('connection', socket => {
    logger.log(`Socket connected: ${socket.id}`);

    socket.on('join-room', payload => {
      const joinPayload = validateJoinPayload(payload);
      if (!joinPayload) {
        socket.emit('join-failed', { message: INVALID_JOIN_MESSAGE });
        return;
      }

      const {
        roomId: normRoomId,
        username: normUsername,
        avatar,
        userId: cleanUserId
      } = joinPayload;
      const room = getOrCreateRoom(normRoomId);

      const roomUsers = getRoomUsers(normRoomId);
      const isNameTaken = roomUsers.some(
        user => user.username.toLowerCase() === normUsername.toLowerCase() && user.userId !== cleanUserId
      );
      if (isNameTaken) {
        socket.emit('join-failed', { message: `昵称“${normUsername}”已在此房间中被占用，请更换昵称后重新加入！` });
        return;
      }

      for (const [socketId, connection] of activeConnections.entries()) {
        if (connection.roomId === normRoomId && connection.userId === cleanUserId && socketId !== socket.id) {
          logger.log(`Force disconnecting duplicate session for user ID ${cleanUserId}`);
          const oldSocket = io.sockets.sockets.get(socketId);
          if (oldSocket) {
            oldSocket.emit('kicked', { reason: 'session_takeover' });
            oldSocket.disconnect(true);
          }
          activeConnections.delete(socketId);
        }
      }

      if (!room.hostUserId || room.hostUserId === '') {
        room.hostUserId = cleanUserId;
      }

      socket.join(normRoomId);
      activeConnections.set(socket.id, {
        roomId: normRoomId,
        username: normUsername,
        avatar,
        userId: cleanUserId
      });

      room.updatedAt = Date.now();
      logger.log(`User "${normUsername}" (${cleanUserId}) joined room ${normRoomId}`);

      socket.emit('room-data', {
        roomId: normRoomId,
        songs: room.songs,
        alreadySung: room.alreadySung,
        users: getRoomUsers(normRoomId),
        hostUserId: room.hostUserId,
        moderatorUserIds: room.moderatorUserIds
      });

      io.to(normRoomId).emit('users-updated', getRoomUsers(normRoomId));
      emitRoles(normRoomId, room);
    });

    socket.on('update-profile', payload => {
      const userData = activeConnections.get(socket.id);
      if (!userData) {
        return;
      }

      const profilePayload = validateProfilePayload(payload);
      if (!profilePayload) {
        socket.emit('system-message', { type: 'error', text: INVALID_REQUEST_MESSAGE });
        return;
      }

      const oldUsername = userData.username;
      userData.username = profilePayload.username;
      userData.avatar = profilePayload.avatar;

      logger.log(`User "${oldUsername}" in room ${userData.roomId} updated profile to "${userData.username}" / ${profilePayload.avatar}`);
      io.to(userData.roomId).emit('users-updated', getRoomUsers(userData.roomId));
    });

    socket.on('add-song', payload => {
      const userData = activeConnections.get(socket.id);
      if (!userData) {
        return;
      }

      const room = roomsData[userData.roomId];
      if (!room) {
        return;
      }

      const songPayload = validateSongPayload(payload);
      if (!songPayload) {
        socket.emit('system-message', { type: 'error', text: INVALID_SONG_MESSAGE });
        return;
      }

      const result = addSong(room, userData, songPayload);

      io.to(userData.roomId).emit('playlist-updated', room.songs);
      io.to(userData.roomId).emit('system-message', {
        type: 'add',
        text: `${userData.username} 点了《${result.song.title}》`
      });
      saveRooms();
    });

    socket.on('dedicate-song', payload => {
      const userData = activeConnections.get(socket.id);
      if (!userData) {
        return;
      }

      const room = roomsData[userData.roomId];
      if (!room) {
        return;
      }

      const dedicationPayload = validateDedicationPayload(payload);
      if (!dedicationPayload) {
        socket.emit('dedication-failed', { message: INVALID_DEDICATION_MESSAGE });
        return;
      }

      const { title, singer, link, targetUserId } = dedicationPayload;
      let targetSocketId = null;
      let targetUsername = '';
      for (const [socketId, connection] of activeConnections.entries()) {
        if (connection.userId === targetUserId && connection.roomId === userData.roomId) {
          targetSocketId = socketId;
          targetUsername = connection.username;
          break;
        }
      }

      if (!targetSocketId) {
        socket.emit('dedication-failed', { message: '该用户已下线或不存在' });
        return;
      }

      const dedicationId = `dedicate_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      pendingDedications.set(dedicationId, {
        roomId: userData.roomId,
        fromUserId: userData.userId,
        fromUsername: userData.username,
        fromSocketId: socket.id,
        targetUserId,
        targetUsername,
        title,
        singer,
        link
      });

      io.to(targetSocketId).emit('dedication-request', {
        id: dedicationId,
        fromUserId: userData.userId,
        fromUsername: userData.username,
        title,
        singer,
        link
      });

      socket.emit('dedication-pending', { targetUsername, title });
    });

    socket.on('respond-dedication', payload => {
      const responsePayload = validateDedicationResponsePayload(payload);
      if (!responsePayload) {
        socket.emit('system-message', { type: 'error', text: INVALID_REQUEST_MESSAGE });
        return;
      }

      const { id, accept } = responsePayload;
      const dedication = pendingDedications.get(id);
      if (!dedication) {
        return;
      }

      pendingDedications.delete(id);

      const room = roomsData[dedication.roomId];
      if (!room) {
        return;
      }

      const senderSocket = io.sockets.sockets.get(dedication.fromSocketId);

      if (accept) {
        acceptDedication(
          room,
          dedication,
          getUserAvatar(dedication.roomId, dedication.targetUserId)
        );
        saveRooms();

        io.to(dedication.roomId).emit('playlist-updated', room.songs);
        io.to(dedication.roomId).emit('system-message', {
          type: 'add',
          text: `🎵 ${dedication.targetUsername} 接受了 ${dedication.fromUsername} 的指名点歌《${dedication.title}》`
        });

        if (senderSocket) {
          senderSocket.emit('dedication-response-notify', {
            type: 'accept',
            text: `🎉 ${dedication.targetUsername} 接受了你指名点播的《${dedication.title}》！`
          });
        }
        return;
      }

      if (senderSocket) {
        senderSocket.emit('dedication-response-notify', {
          type: 'decline',
          text: `❌ ${dedication.targetUsername} 拒绝了你指名点播的《${dedication.title}》`
        });
      }
    });

    socket.on('prioritize-song', payload => {
      const userData = activeConnections.get(socket.id);
      if (!userData) {
        return;
      }

      const room = roomsData[userData.roomId];
      if (!room) {
        return;
      }

      const songId = validateStringIdPayload(payload, 'songId');
      if (!songId) {
        socket.emit('system-message', { type: 'error', text: INVALID_REQUEST_MESSAGE });
        return;
      }

      const result = prioritizeSong(room, songId);
      if (!result.changed) {
        return;
      }

      io.to(userData.roomId).emit('playlist-updated', room.songs);
      io.to(userData.roomId).emit('system-message', {
        type: 'pin',
        text: `${userData.username} 置顶了《${result.song.title}》`
      });
      saveRooms();
    });

    socket.on('delete-song', payload => {
      const userData = activeConnections.get(socket.id);
      if (!userData) {
        return;
      }

      const room = roomsData[userData.roomId];
      if (!room) {
        return;
      }

      const songId = validateStringIdPayload(payload, 'songId');
      if (!songId) {
        socket.emit('system-message', { type: 'error', text: INVALID_REQUEST_MESSAGE });
        return;
      }

      const result = deleteSong(room, userData, songId);
      if (result.reason === 'forbidden') {
        socket.emit('system-message', { type: 'error', text: '您只能删除自己点的歌曲！' });
        return;
      }
      if (!result.changed) {
        return;
      }

      io.to(userData.roomId).emit('playlist-updated', room.songs);
      io.to(userData.roomId).emit('system-message', {
        type: 'delete',
        text: `${userData.username} 删除了《${result.song.title}》`
      });
      saveRooms();
    });

    socket.on('shuffle-playlist', () => {
      const userData = activeConnections.get(socket.id);
      if (!userData) {
        return;
      }

      const room = roomsData[userData.roomId];
      if (!room) {
        return;
      }

      const result = shufflePlaylist(room);
      if (!result.changed) {
        return;
      }

      io.to(userData.roomId).emit('playlist-updated', room.songs);
      io.to(userData.roomId).emit('system-message', {
        type: 'shuffle',
        text: `${userData.username} 打乱了歌单`
      });
      saveRooms();
    });

    socket.on('next-song', () => {
      const userData = activeConnections.get(socket.id);
      if (!userData) {
        return;
      }

      const room = roomsData[userData.roomId];
      if (!room) {
        return;
      }

      const result = advanceQueue(room, userData);
      if (!result.changed) {
        return;
      }

      io.to(userData.roomId).emit('playlist-updated', room.songs);
      io.to(userData.roomId).emit('history-updated', room.alreadySung);
      io.to(userData.roomId).emit('system-message', {
        type: 'next',
        text: `${userData.username} 开启了下一首，已移至已唱《${result.song.title}》`
      });
      saveRooms();
    });

    socket.on('prev-song', () => {
      const userData = activeConnections.get(socket.id);
      if (!userData) {
        return;
      }

      const room = roomsData[userData.roomId];
      if (!room) {
        return;
      }

      const result = restorePreviousSong(room, userData);
      if (!result.changed) {
        return;
      }

      io.to(userData.roomId).emit('playlist-updated', room.songs);
      io.to(userData.roomId).emit('history-updated', room.alreadySung);
      io.to(userData.roomId).emit('system-message', {
        type: 'next',
        text: `${userData.username} 返回了上一首《${result.song.title}》`
      });
      saveRooms();
    });

    socket.on('undo-playlist', () => {
      const userData = activeConnections.get(socket.id);
      if (!userData) {
        return;
      }

      const room = roomsData[userData.roomId];
      if (!room) {
        return;
      }

      const result = undoPlaylist(room, userData);
      if (!result.changed) {
        return;
      }

      io.to(userData.roomId).emit('playlist-updated', room.songs);
      io.to(userData.roomId).emit('history-updated', room.alreadySung);
      io.to(userData.roomId).emit('system-message', {
        type: 'shuffle',
        text: `${userData.username} 执行了撤销`
      });
      saveRooms();
    });

    socket.on('redo-playlist', () => {
      const userData = activeConnections.get(socket.id);
      if (!userData) {
        return;
      }

      const room = roomsData[userData.roomId];
      if (!room) {
        return;
      }

      const result = redoPlaylist(room, userData);
      if (!result.changed) {
        return;
      }

      io.to(userData.roomId).emit('playlist-updated', room.songs);
      io.to(userData.roomId).emit('history-updated', room.alreadySung);
      io.to(userData.roomId).emit('system-message', {
        type: 'shuffle',
        text: `${userData.username} 执行了前进`
      });
      saveRooms();
    });

    socket.on('promote-moderator', payload => {
      const userData = activeConnections.get(socket.id);
      if (!userData) {
        return;
      }

      const room = roomsData[userData.roomId];
      if (!room) {
        return;
      }

      const targetUserId = validateStringIdPayload(payload, 'targetUserId');
      if (!targetUserId) {
        socket.emit('system-message', { type: 'error', text: INVALID_REQUEST_MESSAGE });
        return;
      }

      const result = toggleModerator(room, userData, targetUserId);
      if (!result.changed) {
        return;
      }

      emitRoles(userData.roomId, room);
      saveRooms();
    });

    socket.on('transfer-host', payload => {
      const userData = activeConnections.get(socket.id);
      if (!userData) {
        return;
      }

      const room = roomsData[userData.roomId];
      if (!room) {
        return;
      }

      const targetUserId = validateStringIdPayload(payload, 'targetUserId');
      if (!targetUserId) {
        socket.emit('system-message', { type: 'error', text: INVALID_REQUEST_MESSAGE });
        return;
      }

      const result = transferHost(room, userData, targetUserId);
      if (!result.changed) {
        return;
      }

      emitRoles(userData.roomId, room);
      saveRooms();
    });

    socket.on('kick-user', payload => {
      const userData = activeConnections.get(socket.id);
      if (!userData) {
        return;
      }

      const room = roomsData[userData.roomId];
      if (!room) {
        return;
      }

      const targetSocketId = validateStringIdPayload(payload, 'targetSocketId');
      if (!targetSocketId) {
        socket.emit('system-message', { type: 'error', text: INVALID_REQUEST_MESSAGE });
        return;
      }

      const targetUserData = activeConnections.get(targetSocketId);
      if (!canKickUser(room, userData, targetUserData)) {
        return;
      }

      logger.log(`User "${targetUserData.username}" kicked by admin.`);

      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit('kicked', { reason: 'kicked_by_admin' });
        targetSocket.disconnect(true);
      }

      activeConnections.delete(targetSocketId);

      io.to(userData.roomId).emit('users-updated', getRoomUsers(userData.roomId));
      io.to(userData.roomId).emit('system-message', {
        type: 'delete',
        text: `${targetUserData.username} 被管理员移出了房间`
      });
    });

    socket.on('end-session', () => {
      const userData = activeConnections.get(socket.id);
      if (!userData) {
        return;
      }

      const room = roomsData[userData.roomId];
      if (!room) {
        return;
      }

      const result = endSession(room, userData);
      if (!result.changed) {
        return;
      }

      saveRooms();
      io.to(userData.roomId).emit('session-ended');
    });

    socket.on('send-reaction', payload => {
      const userData = activeConnections.get(socket.id);
      if (!userData) {
        return;
      }

      const room = roomsData[userData.roomId];
      if (!room) {
        return;
      }

      const type = validateStringIdPayload(payload, 'type');
      if (!type) {
        socket.emit('system-message', { type: 'error', text: INVALID_REQUEST_MESSAGE });
        return;
      }

      const result = addReaction(room, type);
      if (!result.changed) {
        return;
      }

      io.to(userData.roomId).emit('playlist-updated', room.songs);
      io.to(userData.roomId).emit('trigger-reaction-effect', {
        type,
        username: userData.username,
        avatar: userData.avatar
      });
      saveRooms();
    });

    socket.on('disconnect', () => {
      const userData = activeConnections.get(socket.id);
      if (!userData) {
        return;
      }

      const { roomId, username } = userData;
      activeConnections.delete(socket.id);

      logger.log(`Socket disconnected: ${socket.id} (${username} from room ${roomId})`);
      io.to(roomId).emit('users-updated', getRoomUsers(roomId));
    });
  });
}
