import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'rooms.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory store for rooms
// Structure:
// {
//   [roomId]: {
//     id: string,
//     songs: Array<{ id, title, singer, link, requestedBy, requestedByAvatar, prioritized, reactions, createdAt }>,
//     alreadySung: Array<{ id, title, singer, link, requestedBy, requestedByAvatar, prioritized, reactions, createdAt, completedAt }>,
//     hostUserId: string,
//     moderatorUserIds: Array<string>,
//     updatedAt: number
//   }
// }
let roomsData = {};

// Keep track of active users per socket connection
// Structure:
// {
//   [socketId]: { roomId, username, avatar, userId }
// }
const activeConnections = new Map();
const pendingDedications = new Map();

// Helper: Push state to undo stack
function pushHistory(room) {
  if (!room.historyStack) room.historyStack = [];
  room.historyStack.push(JSON.stringify({
    songs: room.songs,
    alreadySung: room.alreadySung
  }));
  if (room.historyStack.length > 50) {
    room.historyStack.shift();
  }
  room.futureStack = []; // Clear redo stack on new action
}

// Helper: Undo last action
function undoAction(room) {
  if (!room.historyStack || room.historyStack.length === 0) return false;
  if (!room.futureStack) room.futureStack = [];
  
  room.futureStack.push(JSON.stringify({
    songs: room.songs,
    alreadySung: room.alreadySung
  }));

  const prevState = JSON.parse(room.historyStack.pop());
  room.songs = prevState.songs;
  room.alreadySung = prevState.alreadySung;
  return true;
}

// Helper: Redo action
function redoAction(room) {
  if (!room.futureStack || room.futureStack.length === 0) return false;
  if (!room.historyStack) room.historyStack = [];

  room.historyStack.push(JSON.stringify({
    songs: room.songs,
    alreadySung: room.alreadySung
  }));

  const nextState = JSON.parse(room.futureStack.pop());
  room.songs = nextState.songs;
  room.alreadySung = nextState.alreadySung;
  return true;
}

// Load rooms from file on startup
function loadRooms() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      roomsData = JSON.parse(data);
      console.log(`Loaded ${Object.keys(roomsData).length} rooms from storage.`);
    }
  } catch (err) {
    console.error('Error loading rooms:', err);
    roomsData = {};
  }
}

// Save rooms to file
function saveRooms() {
  try {
    const now = Date.now();
    const expiryTime = 48 * 60 * 60 * 1000; // 48 hours
    let cleanedCount = 0;

    // Filter out memory stacks and old empty rooms before saving
    const cleanSaveData = {};
    for (const [roomId, room] of Object.entries(roomsData)) {
      const lastActive = room.updatedAt || now;
      if (room.songs.length === 0 && (room.alreadySung ? room.alreadySung.length === 0 : true) && (now - lastActive > expiryTime)) {
        cleanedCount++;
        continue;
      }
      
      // Copy only serializable properties
      cleanSaveData[roomId] = {
        id: room.id,
        songs: room.songs,
        alreadySung: room.alreadySung || [],
        hostUserId: room.hostUserId || '',
        moderatorUserIds: room.moderatorUserIds || [],
        updatedAt: room.updatedAt
      };
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} inactive empty rooms.`);
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(cleanSaveData, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving rooms:', err);
  }
}

loadRooms();

// Periodically save rooms (every 5 minutes)
setInterval(saveRooms, 5 * 60 * 1000);

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html using RegExp for Express 5 compatibility
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Helper: Get users currently in a room based on active socket connections
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

// Helper: Get avatar for user by userId inside a specific room
function getUserAvatar(roomId, userId) {
  const users = getRoomUsers(roomId);
  const user = users.find(u => u.userId === userId);
  return user ? user.avatar : "🎤";
}

// Helper: Get or create room
function getOrCreateRoom(roomId) {
  const normalizedId = String(roomId).trim().toUpperCase();
  if (!roomsData[normalizedId]) {
    roomsData[normalizedId] = {
      id: normalizedId,
      songs: [],
      alreadySung: [],
      hostUserId: '',
      moderatorUserIds: [],
      updatedAt: Date.now()
    };
  }
  const room = roomsData[normalizedId];
  
  // Backwards compatibility fixes
  if (!room.alreadySung) room.alreadySung = [];
  if (!room.hostUserId) room.hostUserId = '';
  if (!room.moderatorUserIds) room.moderatorUserIds = [];
  
  // Transient state stacks
  if (!room.historyStack) room.historyStack = [];
  if (!room.futureStack) room.futureStack = [];
  
  return room;
}

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // User joins a room
  socket.on('join-room', ({ roomId, username, avatar, userId }) => {
    const normRoomId = String(roomId).trim().toUpperCase();
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
        console.log(`Force disconnecting duplicate session for user ID ${cleanUserId}`);
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
      avatar: avatar || '🎤',
      userId: cleanUserId
    });

    room.updatedAt = Date.now();
    console.log(`User "${normUsername}" (${cleanUserId}) joined room ${normRoomId}`);

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
      
      console.log(`User "${oldUsername}" in room ${userData.roomId} updated profile to "${userData.username}" / ${avatar}`);
      
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

    const newSong = {
      id: Math.random().toString(36).substring(2, 9),
      title: String(title).trim(),
      singer: String(singer || '').trim(),
      link: String(link || '').trim(),
      requestedBy: userData.username,
      requestedByAvatar: userData.avatar,
      prioritized: false,
      reactions: { rose: 0, clap: 0, egg: 0, shoe: 0 },
      createdAt: Date.now()
    };

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
    let targetUsername = "";
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

      const songId = Math.random().toString(36).substring(2, 9);
      const newSong = {
        id: songId,
        title: String(dedication.title).trim(),
        singer: String(dedication.targetUsername).trim(),
        link: String(dedication.link || '').trim(),
        requestedBy: dedication.targetUsername,
        requestedByAvatar: getUserAvatar(dedication.roomId, dedication.targetUserId),
        prioritized: false,
        reactions: { rose: 0, clap: 0, egg: 0, shoe: 0 },
        createdAt: Date.now(),
        dedicatedBy: dedication.fromUsername
      };

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

  // Apply Priority (优先) - Move right after now playing (index 1)
  socket.on('prioritize-song', ({ songId }) => {
    const userData = activeConnections.get(socket.id);
    if (!userData) return;

    const room = roomsData[userData.roomId];
    if (!room) return;

    const songIndex = room.songs.findIndex(s => s.id === songId);
    if (songIndex !== -1) {
      pushHistory(room);
      const song = room.songs[songIndex];

      // Unconditionally apply priority
      song.prioritized = true;
      if (songIndex > 1) {
        const [movedSong] = room.songs.splice(songIndex, 1);
        room.songs.splice(1, 0, movedSong);
      }
      io.to(userData.roomId).emit('playlist-updated', room.songs);
      io.to(userData.roomId).emit('system-message', {
        type: 'pin',
        text: `${userData.username} 优先了《${song.title}》`
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

      const isHost = userData.userId === room.hostUserId;
      const isMod = room.moderatorUserIds.includes(userData.userId);
      const isOwner = song.requestedBy === userData.username;

      if (!isHost && !isMod && !isOwner) {
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

    const isHost = userData.userId === room.hostUserId;
    const isMod = room.moderatorUserIds.includes(userData.userId);
    const isCurrentSongOwner = room.songs.length > 0 && room.songs[0].requestedBy === userData.username;
    
    if (!isHost && !isMod && !isCurrentSongOwner) return;

    if (room.songs.length > 0) {
      pushHistory(room);

      const completedSong = room.songs.shift(); // remove the first song
      completedSong.completedAt = Date.now();
      
      if (!completedSong.reactions) {
        completedSong.reactions = { rose: 0, clap: 0, egg: 0, shoe: 0 };
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

    const isHost = userData.userId === room.hostUserId;
    const isMod = room.moderatorUserIds.includes(userData.userId);
    if (!isHost && !isMod) return;

    if (room.alreadySung && room.alreadySung.length > 0) {
      pushHistory(room);

      const prevSong = room.alreadySung.pop();
      // Reset reactions count when playing again
      prevSong.reactions = { rose: 0, clap: 0, egg: 0, shoe: 0 };

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

    const isHost = userData.userId === room.hostUserId;
    const isMod = room.moderatorUserIds.includes(userData.userId);
    if (!isHost && !isMod) return;

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

    const isHost = userData.userId === room.hostUserId;
    const isMod = room.moderatorUserIds.includes(userData.userId);
    if (!isHost && !isMod) return;

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

    const isHost = userData.userId === room.hostUserId;
    const isMod = room.moderatorUserIds.includes(userData.userId);
    if (!isHost && !isMod) return;

    const targetUserData = activeConnections.get(targetSocketId);
    if (!targetUserData) return;

    // Host cannot be kicked, and moderators cannot kick other moderators
    if (targetUserData.userId === room.hostUserId) return;
    if (isMod && room.moderatorUserIds.includes(targetUserData.userId)) return;

    console.log(`User "${targetUserData.username}" kicked by admin.`);

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

    const isHost = userData.userId === room.hostUserId;
    const isMod = room.moderatorUserIds.includes(userData.userId);
    if (!isHost && !isMod) return;

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
        currentSong.reactions = { rose: 0, clap: 0, egg: 0, shoe: 0 };
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
      
      console.log(`Socket disconnected: ${socket.id} (${username} from room ${roomId})`);
      
      // Broadcast updated user list
      io.to(roomId).emit('users-updated', getRoomUsers(roomId));
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`KTV ShareQ server running at http://localhost:${PORT}`);
});
