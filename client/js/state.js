export const state = {
  socket: null,
  currentRoomId: '',
  currentUsername: '',
  currentAvatar: '🎤',
  currentUserId: '',
  playlist: [],
  historyPlaylist: [],
  roomUsers: [],
  currentHostUserId: '',
  currentModeratorUserIds: [],
  toastHistory: [],
  unreadToastsCount: 0,
  lastSingingSongId: '',
  lastPinnedSongId: null,
  isSoundMuted: localStorage.getItem('shareq_gift_muted') === 'true',
  language: localStorage.getItem('shareq_lang') || 'zh-CN'
};
