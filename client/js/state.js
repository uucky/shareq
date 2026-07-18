function getInitialLanguage() {
  const savedLanguage = localStorage.getItem('shareq_lang');
  if (savedLanguage === 'zh-CN' || savedLanguage === 'en') {
    return savedLanguage;
  }

  const browserLanguage = navigator.languages?.[0] || navigator.language || '';
  return /^zh(?:-|$)/i.test(browserLanguage) ? 'zh-CN' : 'en';
}

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
  language: getInitialLanguage()
};
