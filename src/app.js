import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import {
  DEFAULT_AVATAR,
  canDeleteSong,
  canManageQueue,
  createReactions,
  createSong,
  getOrCreateRoom as getOrCreateRoomData,
  normalizeRoomId,
  pushHistory,
  redoAction,
  undoAction
} from './rooms.js';
import {
  loadRooms,
  resolveDataFile,
  saveRooms as saveRoomsToFile
} from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const srcDir = path.dirname(__filename);
const appDir = path.dirname(srcDir);

export function createShareQServer(options = {}) {
  const logger = options.logger || console;
  const publicPath = options.publicPath || path.join(appDir, 'public');
  const dataFile = resolveDataFile({
    appDir,
    dataDir: options.dataDir || process.env.DATA_DIR,
    dataFile: options.dataFile || process.env.DATA_FILE
  });

  const app = express();
  if (options.enableRequestLog ?? process.env.NODE_ENV !== 'test') {
    app.use((req, res, next) => {
      logger.log(`[REQUEST] ${req.method} ${req.url}`);
      next();
    });
  }

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const roomsData = options.roomsData || loadRooms(dataFile, logger);
  const activeConnections = new Map();
  const pendingDedications = new Map();

  const saveRooms = () => saveRoomsToFile(roomsData, dataFile, logger);
  const saveIntervalMs = options.saveIntervalMs ?? 5 * 60 * 1000;
  let saveInterval = null;
  if (saveIntervalMs > 0) {
    saveInterval = setInterval(saveRooms, saveIntervalMs);
    saveInterval.unref?.();
  }

  logger.log(`[STARTUP] Serving static files from: ${publicPath}`);
  logger.log(`[STARTUP] Public folder exists: ${fs.existsSync(publicPath)}`);
  if (fs.existsSync(publicPath)) {
    logger.log('[STARTUP] Public folder contents:', fs.readdirSync(publicPath));
  }
  app.use(express.static(publicPath));

  // Fallback to index.html using RegExp for Express 5 compatibility.
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });

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
    const user = users.find(u => u.userId === userId);
    return user ? user.avatar : DEFAULT_AVATAR;
  }

  function getOrCreateRoom(roomId) {
    return getOrCreateRoomData(roomsData, roomId);
  }

io.on('connection', (socket) => {
  logger.log(`Socket connected: ${socket.id}`);

  // User joins a room
  socket.on('join-room', ({ roomId, username, avatar, userId }) => {
    const normRoomId = normalizeRoomId(roomId);
    const normUsername = String(username).trim();
    const cleanUserId = String(userId);

    const room = getOrCreateRoom(normRoomId);
    
    // 1. Check duplicate username
    const roomUsers = getRoomUsers(normRoomId);
    const isNameTaken = roomUsers.some(
      u => u.username.toLowerCase() === normUsername.toLowerCase() && u.userId !== cleanUserId
    );
    if (isNameTaken) {
      socket.emit('join-failed', { message: `昵称“${normUsername}”已在此房间中被占用，请更换昵称后重新加入！` });
      return;
    }

    // 2. Disconnect previous connection for the same user ID (reconnection support)
    for (const [sid, conn] of activeConnections.entries()) {
      if (conn.roomId === normRoomId && conn.userId === cleanUserId && sid !== socket.id) {
        logger.log(`Force disconnecting duplicate session for user ID ${cleanUserId}`);
        const oldSocket = io.sockets.sockets.get(sid);
        if (oldSocket) {
          oldSocket.emit('kicked', { reason: 'session_takeover' });
          oldSocket.disconnect(true);
        }
        activeConnections.delete(sid);
      }
    }

    // 3. Set as Host if first user to join
    if (!room.hostUserId || room.hostUserId === '') {
      room.hostUserId = cleanUserId;
    }

    // Join room
    socket.join(normRoomId);
    
    // Track connection
    activeConnections.set(socket.id, {
      roomId: normRoomId,
      username: normUsername,
      avatar: avatar || DEFAULT_AVATAR,
      userId: cleanUserId
    });

    room.updatedAt = Date.now();
    logger.log(`User "${normUsername}" (${cleanUserId}) joined room ${normRoomId}`);

    // Send initial room data to the user
    socket.emit('room-data', {
      roomId: normRoomId,
      songs: room.songs,
      alreadySung: room.alreadySung,
      users: getRoomUsers(normRoomId),
      hostUserId: room.hostUserId,
      moderatorUserIds: room.moderatorUserIds
    });

    // Broadcast updated user list and roles to the room
    io.to(normRoomId).emit('users-updated', getRoomUsers(normRoomId));
    io.to(normRoomId).emit('roles-updated', {
      hostUserId: room.hostUserId,
      moderatorUserIds: room.moderatorUserIds
    });
  });

  // User updates profile
  socket.on('update-profile', ({ username, avatar }) => {
    const userData = activeConnections.get(socket.id);
    if (userData) {
      const oldUsername = userData.username;
      userData.username = String(username).trim();
      userData.avatar = avatar;
      
      logger.log(`User "${oldUsername}" in room ${userData.roomId} updated profile to "${userData.username}" / ${avatar}`);
      
      // Broadcast user list update
      io.to(userData.roomId).emit('users-updated', getRoomUsers(userData.roomId));
    }
  });

  // Add song
  socket.on('add-song', ({ title, singer, link }) => {
    const userData = activeConnections.get(socket.id);
    if (!userData) return;

    const room = roomsData[userData.roomId];
    if (!room) return;

    pushHistory(room);

    const newSong = createSong({
      title,
      singer,
      link,
      requestedBy: userData.username,
      requestedByAvatar: userData.avatar
    });

    room.songs.push(newSong);
    room.updatedAt = Date.now();

    // Broadcast updated playlist
    io.to(userData.roomId).emit('playlist-updated', room.songs);
    // Broadcast system notification
    io.to(userData.roomId).emit('system-message', {
      type: 'add',
      text: `${userData.username} 点了《${newSong.title}》`
    });

    saveRooms();
  });

  // Dedicate Song Request
  socket.on('dedicate-song', ({ title, singer, link, targetUserId }) => {
    const userData = activeConnections.get(socket.id);
    if (!userData) return;

    const room = roomsData[userData.roomId];
    if (!room) return;

    let targetSocketId = null;
    let targetUsername = '';
    for (const [sId, conn] of activeConnections.entries()) {
      if (conn.userId === targetUserId && conn.roomId === userData.roomId) {
        targetSocketId = sId;
        targetUsername = conn.username;
        break;
      }
    }

    if (targetSocketId) {
      const dedicationId = 'dedicate_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      
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
    } else {
      socket.emit('dedication-failed', { message: '该用户已下线或不存在' });
    }
  });

  // Respond to Dedication
  socket.on('respond-dedication', ({ id, accept }) => {
    const dedication = pendingDedications.get(id);
    if (!dedication) return;

    pendingDedications.delete(id);

    const room = roomsData[dedication.roomId];
    if (!room) return;

    const senderSocket = io.sockets.sockets.get(dedication.fromSocketId);

    if (accept) {
      pushHistory(room);

      const newSong = createSong({
        title: dedication.title,
        singer: dedication.singer,
        link: dedication.link,
        requestedBy: dedication.targetUsername,
        requestedByAvatar: getUserAvatar(dedication.roomId, dedication.targetUserId),
        dedicatedBy: dedication.fromUsername
      });

      room.songs.push(newSong);
      room.updatedAt = Date.now();
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
    } else {
      if (senderSocket) {
        senderSocket.emit('dedication-response-notify', {
          type: 'decline',
          text: `❌ ${dedication.targetUsername} 拒绝了你指名点播的《${dedication.title}》`
        });
      }
    }
  });

  // Apply Priority (置顶) - Move right after now playing (index 1)
  socket.on('prioritize-song', ({ songId }) => {
    const userData = activeConnections.get(socket.id);
    if (!userData) return;

    const room = roomsData[userData.roomId];
    if (!room) return;

    const songIndex = room.songs.findIndex(s => s.id === songId);
    if (songIndex !== -1) {
      pushHistory(room);
      const song = room.songs[songIndex];

      if (songIndex > 1) {
        const [movedSong] = room.songs.splice(songIndex, 1);
        room.songs.splice(1, 0, movedSong);
      }
      io.to(userData.roomId).emit('playlist-updated', room.songs);
      io.to(userData.roomId).emit('system-message', {
        type: 'pin',
        text: `${userData.username} 置顶了《${song.title}》`
      });

      room.updatedAt = Date.now();
      saveRooms();
    }
  });

  // Delete song
  socket.on('delete-song', ({ songId }) => {
    const userData = activeConnections.get(socket.id);
    if (!userData) return;

    const room = roomsData[userData.roomId];
    if (!room) return;

    const songIndex = room.songs.findIndex(s => s.id === songId);
    if (songIndex !== -1) {
      const song = room.songs[songIndex];

      if (!canDeleteSong(userData, room, song)) {
        socket.emit('system-message', { type: 'error', text: '您只能删除自己点的歌曲！' });
        return;
      }

      pushHistory(room);
      room.songs.splice(songIndex, 1);
      room.updatedAt = Date.now();

      io.to(userData.roomId).emit('playlist-updated', room.songs);
      io.to(userData.roomId).emit('system-message', {
        type: 'delete',
        text: `${userData.username} 删除了《${song.title}》`
      });

      saveRooms();
    }
  });

  // Shuffle playlist (only shuffles unprioritized songs)
  socket.on('shuffle-playlist', () => {
    const userData = activeConnections.get(socket.id);
    if (!userData) return;

    const room = roomsData[userData.roomId];
    if (!room) return;

    if (room.songs.length <= 2) return;

    pushHistory(room);

    const nowPlaying = room.songs[0];
    const restSongs = room.songs.slice(1);
    
    const prioritizedSongs = restSongs.filter(s => s.prioritized);
    const unprioritizedSongs = restSongs.filter(s => !s.prioritized);

    // Fisher-Yates shuffle algorithm for unprioritized songs
    for (let i = unprioritizedSongs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unprioritizedSongs[i], unprioritizedSongs[j]] = [unprioritizedSongs[j], unprioritizedSongs[i]];
    }

    room.songs = [nowPlaying, ...prioritizedSongs, ...unprioritizedSongs];
    room.updatedAt = Date.now();

    io.to(userData.roomId).emit('playlist-updated', room.songs);
    io.to(userData.roomId).emit('system-message', {
      type: 'shuffle',
      text: `${userData.username} 打乱了歌单`
    });

    saveRooms();
  });

  // Next song
  socket.on('next-song', () => {
    const userData = activeConnections.get(socket.id);
    if (!userData) return;

    const room = roomsData[userData.roomId];
    if (!room) return;

    const isCurrentSongOwner = room.songs.length > 0 && room.songs[0].requestedBy === userData.username;
    
    if (!canManageQueue(userData, room) && !isCurrentSongOwner) return;

    if (room.songs.length > 0) {
      pushHistory(room);

      const completedSong = room.songs.shift(); // remove the first song
      completedSong.completedAt = Date.now();
      
      if (!completedSong.reactions) {
        completedSong.reactions = createReactions();
      }
      
      room.alreadySung.push(completedSong);
      room.updatedAt = Date.now();

      io.to(userData.roomId).emit('playlist-updated', room.songs);
      io.to(userData.roomId).emit('history-updated', room.alreadySung);
      
      io.to(userData.roomId).emit('system-message', {
        type: 'next',
        text: `${userData.username} 开启了下一首，已移至已唱《${completedSong.title}》`
      });

      saveRooms();
    }
  });

  // Previous song
  socket.on('prev-song', () => {
    const userData = activeConnections.get(socket.id);
    if (!userData) return;

    const room = roomsData[userData.roomId];
    if (!room) return;

    if (!canManageQueue(userData, room)) return;

    if (room.alreadySung && room.alreadySung.length > 0) {
      pushHistory(room);

      const prevSong = room.alreadySung.pop();
      // Reset reactions count when playing again
      prevSong.reactions = createReactions();

      room.songs.unshift(prevSong);
      room.updatedAt = Date.now();

      io.to(userData.roomId).emit('playlist-updated', room.songs);
      io.to(userData.roomId).emit('history-updated', room.alreadySung);
      
      io.to(userData.roomId).emit('system-message', {
        type: 'next',
        text: `${userData.username} 返回了上一首《${prevSong.title}》`
      });

      saveRooms();
    }
  });

  // Undo Queue Action
  socket.on('undo-playlist', () => {
    const userData = activeConnections.get(socket.id);
    if (!userData) return;

    const room = roomsData[userData.roomId];
    if (!room) return;

    if (!canManageQueue(userData, room)) return;

    if (undoAction(room)) {
      room.updatedAt = Date.now();
      io.to(userData.roomId).emit('playlist-updated', room.songs);
      io.to(userData.roomId).emit('history-updated', room.alreadySung);
      io.to(userData.roomId).emit('system-message', {
        type: 'shuffle',
        text: `${userData.username} 执行了撤销`
      });
      saveRooms();
    }
  });

  // Redo Queue Action
  socket.on('redo-playlist', () => {
    const userData = activeConnections.get(socket.id);
    if (!userData) return;

    const room = roomsData[userData.roomId];
    if (!room) return;

    if (!canManageQueue(userData, room)) return;

    if (redoAction(room)) {
      room.updatedAt = Date.now();
      io.to(userData.roomId).emit('playlist-updated', room.songs);
      io.to(userData.roomId).emit('history-updated', room.alreadySung);
      io.to(userData.roomId).emit('system-message', {
        type: 'shuffle',
        text: `${userData.username} 执行了前进`
      });
      saveRooms();
    }
  });

  // Promote/Demote Moderator
  socket.on('promote-moderator', ({ targetUserId }) => {
    const userData = activeConnections.get(socket.id);
    if (!userData) return;

    const room = roomsData[userData.roomId];
    if (!room) return;

    if (userData.userId !== room.hostUserId) return; // Only host

    const idx = room.moderatorUserIds.indexOf(targetUserId);
    if (idx === -1) {
      room.moderatorUserIds.push(targetUserId);
    } else {
      room.moderatorUserIds.splice(idx, 1);
    }

    room.updatedAt = Date.now();
    io.to(userData.roomId).emit('roles-updated', {
      hostUserId: room.hostUserId,
      moderatorUserIds: room.moderatorUserIds
    });
    saveRooms();
  });

  // Transfer Host Role
  socket.on('transfer-host', ({ targetUserId }) => {
    const userData = activeConnections.get(socket.id);
    if (!userData) return;

    const room = roomsData[userData.roomId];
    if (!room) return;

    if (userData.userId !== room.hostUserId) return; // Only host

    const oldHostId = room.hostUserId;
    room.hostUserId = targetUserId;

    // Default demoted host to Moderator
    if (!room.moderatorUserIds.includes(oldHostId)) {
      room.moderatorUserIds.push(oldHostId);
    }

    // Remove new host from moderator list
    const mIdx = room.moderatorUserIds.indexOf(targetUserId);
    if (mIdx !== -1) {
      room.moderatorUserIds.splice(mIdx, 1);
    }

    room.updatedAt = Date.now();
    io.to(userData.roomId).emit('roles-updated', {
      hostUserId: room.hostUserId,
      moderatorUserIds: room.moderatorUserIds
    });
    saveRooms();
  });

  // Kick User
  socket.on('kick-user', ({ targetSocketId }) => {
    const userData = activeConnections.get(socket.id);
    if (!userData) return;

    const room = roomsData[userData.roomId];
    if (!room) return;

    const isMod = room.moderatorUserIds.includes(userData.userId);
    if (!canManageQueue(userData, room)) return;

    const targetUserData = activeConnections.get(targetSocketId);
    if (!targetUserData) return;

    // Host cannot be kicked, and moderators cannot kick other moderators
    if (targetUserData.userId === room.hostUserId) return;
    if (isMod && room.moderatorUserIds.includes(targetUserData.userId)) return;

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

  // End Session
  socket.on('end-session', () => {
    const userData = activeConnections.get(socket.id);
    if (!userData) return;

    const room = roomsData[userData.roomId];
    if (!room) return;

    if (!canManageQueue(userData, room)) return;

    room.songs = [];
    room.alreadySung = [];
    room.historyStack = [];
    room.futureStack = [];
    room.updatedAt = Date.now();
    saveRooms();

    io.to(userData.roomId).emit('session-ended');
  });

  // Reaction Sender
  socket.on('send-reaction', ({ type }) => {
    const userData = activeConnections.get(socket.id);
    if (!userData) return;

    const room = roomsData[userData.roomId];
    if (!room) return;

    if (room.songs.length > 0) {
      const currentSong = room.songs[0];
      if (!currentSong.reactions) {
      currentSong.reactions = createReactions();
      }
      currentSong.reactions[type] = (currentSong.reactions[type] || 0) + 1;

      io.to(userData.roomId).emit('playlist-updated', room.songs);
      
      // Trigger animations and sound effects on all sockets in the room
      io.to(userData.roomId).emit('trigger-reaction-effect', {
        type,
        username: userData.username,
        avatar: userData.avatar
      });

      saveRooms();
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const userData = activeConnections.get(socket.id);
    if (userData) {
      const { roomId, username } = userData;
      activeConnections.delete(socket.id);
      
      logger.log(`Socket disconnected: ${socket.id} (${username} from room ${roomId})`);
      
      // Broadcast updated user list
      io.to(roomId).emit('users-updated', getRoomUsers(roomId));
    }
  });
});

  async function close() {
    if (saveInterval) {
      clearInterval(saveInterval);
    }

    await new Promise(resolve => io.close(resolve));

    if (httpServer.listening) {
      await new Promise((resolve, reject) => {
        httpServer.close(err => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    }
  }

  return {
    app,
    httpServer,
    io,
    roomsData,
    activeConnections,
    pendingDedications,
    dataFile,
    saveRooms,
    close
  };
}
