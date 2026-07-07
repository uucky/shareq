import { io } from 'socket.io-client';

import { t } from './i18n.js';
import { state } from './state.js';

function translatedPayloadText(payload, fallbackField = 'text') {
  if (payload?.i18nKey) {
    return t(payload.i18nKey, payload.i18nParams || {});
  }

  return payload?.[fallbackField] || '';
}

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
    showToast(msg.type, translatedPayloadText(msg));
  });

  state.socket.on('dedication-request', (data) => {
    showDedicationRequestModal(data);
  });

  state.socket.on('dedication-response-notify', (data) => {
    showToast('dedicate', translatedPayloadText(data));
  });

  state.socket.on('dedication-failed', (data) => {
    showToast('delete', t('dedication-failed', { message: translatedPayloadText(data, 'message') }));
  });

  state.socket.on('dedication-pending', (data) => {
    showToast('info', t('dedication-pending', { username: data.targetUsername, title: data.title }));
  });

  state.socket.on('session-ended', () => {
    alert(t('session-ended-alert'));
    window.location.href = window.location.origin + window.location.pathname;
  });

  state.socket.on('join-failed', (data) => {
    alert(translatedPayloadText(data, 'message'));
  });

  state.socket.on('kicked', (data) => {
    if (data.reason === 'kicked_by_admin') {
      alert(t('kicked-by-admin'));
    } else if (data.reason === 'session_takeover') {
      alert(t('kicked-session-takeover'));
    }
    // Redirect back to home without queries
    window.location.href = window.location.origin + window.location.pathname;
  });

  state.socket.on('trigger-reaction-effect', (data) => {
    triggerReactionFloat(data.type);
    playSound(data.type);
  });
}
