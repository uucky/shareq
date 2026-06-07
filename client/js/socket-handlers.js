import { io } from 'socket.io-client';

import { state } from './state.js';

export function initializeSocketHandlers(deps) {
  const {
    checkSingingTurn,
    playSound,
    renderHistory,
    renderMembers,
    renderPlaylist,
    renderStats,
    saveRoomToHistory,
    showDedicationRequestModal,
    showToast,
    triggerReactionFloat,
    updateDedicateSelect,
    updateNowPlaying,
    updateWidgetUI
  } = deps;

  // Initialize Socket.io
  state.socket = io();

  state.socket.on('connect', () => {
    const lastRoom = localStorage.getItem('shareq_last_room');
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoom = urlParams.get('room');
    if (lastRoom && (!urlRoom || urlRoom === lastRoom) && state.currentUsername) {
      state.socket.emit('join-room', {
        roomId: lastRoom,
        username: state.currentUsername,
        avatar: state.currentAvatar,
        userId: state.currentUserId
      });
    }
  });

  state.socket.on('error', (msg) => {
    if (msg && msg.includes('不存在')) localStorage.removeItem('shareq_last_room');
  });

  // Socket Core Receivers
  state.socket.on('room-data', (data) => {
    localStorage.setItem('shareq_last_room', data.roomId);
    state.currentRoomId = data.roomId;
    state.playlist = data.songs;
    state.historyPlaylist = data.alreadySung || [];
    state.roomUsers = data.users;
    state.currentHostUserId = data.hostUserId;
    state.currentModeratorUserIds = data.moderatorUserIds || [];

    // Save room to local storage history list
    saveRoomToHistory(state.currentRoomId);

    // Switch view
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('room-view').classList.remove('hidden');

    // Update displays
    document.getElementById('display-room-id').textContent = state.currentRoomId;
    updateWidgetUI();
    renderPlaylist();
    renderHistory();
    renderMembers();
    updateNowPlaying();
    checkSingingTurn();

    // Check URL queries and append room if not present
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('room') !== state.currentRoomId) {
      window.history.pushState({}, '', `?room=${state.currentRoomId}`);
    }
  });

  state.socket.on('playlist-updated', (updatedSongs) => {
    state.playlist = updatedSongs;
    renderPlaylist();
    updateNowPlaying();
    updateWidgetUI();
    checkSingingTurn();
    if (
      document.getElementById('tab-stats-btn') &&
      document.getElementById('tab-stats-btn').classList.contains('active')
    ) {
      renderStats();
    }
  });

  state.socket.on('history-updated', (updatedHistory) => {
    state.historyPlaylist = updatedHistory || [];
    renderHistory();
    if (
      document.getElementById('tab-stats-btn') &&
      document.getElementById('tab-stats-btn').classList.contains('active')
    ) {
      renderStats();
    }
  });

  state.socket.on('users-updated', (users) => {
    state.roomUsers = users;
    renderMembers();
    updateDedicateSelect();
  });

  state.socket.on('roles-updated', (data) => {
    state.currentHostUserId = data.hostUserId;
    state.currentModeratorUserIds = data.moderatorUserIds || [];
    renderMembers();
    updateWidgetUI();
  });

  state.socket.on('system-message', (msg) => {
    showToast(msg.type, msg.text);
  });

  state.socket.on('dedication-request', (data) => {
    showDedicationRequestModal(data);
  });

  state.socket.on('dedication-response-notify', (data) => {
    showToast('dedicate', data.text);
  });

  state.socket.on('dedication-failed', (data) => {
    showToast('delete', `❌ 指名点歌失败: ${data.message}`);
  });

  state.socket.on('dedication-pending', (data) => {
    showToast('info', `📤 已向 ${data.targetUsername} 发送指名点歌《${data.title}》，等待接受...`);
  });

  state.socket.on('session-ended', () => {
    alert('📢 主持人或房管已结束并关闭了本次 KTV 歌会会话。');
    window.location.href = window.location.origin + window.location.pathname;
  });

  state.socket.on('join-failed', (data) => {
    alert(data.message);
  });

  state.socket.on('kicked', (data) => {
    if (data.reason === 'kicked_by_admin') {
      alert('您已被房主或管理员移出当前房间！');
    } else if (data.reason === 'session_takeover') {
      alert('您的歌手ID在另一个窗口重新登入，当前连接已断开！');
    }
    // Redirect back to home without queries
    window.location.href = window.location.origin + window.location.pathname;
  });

  state.socket.on('trigger-reaction-effect', (data) => {
    triggerReactionFloat(data.type);
    playSound(data.type);
  });
}
