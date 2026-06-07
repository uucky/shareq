// ShareQ - KTV Client App Logic
import './style.css';
import { playSound } from './js/audio.js';
import { createAvatarElement, renderEmojiGrid, setAvatarElement, updateAvatarPreview } from './js/avatar.js';
import { emojis, hotSongs } from './js/data.js';
import { appendText, clearChildren, createElement, getSafeHttpUrl } from './js/dom.js';
import { state } from './js/state.js';
import { closeArchiveModal, downloadSessionArchive, openArchiveModal } from './js/archive.js';
import {
  showDedicationRequestModal,
  showToast,
  updateMessagesEmptyState,
  updateToastHistoryUI
} from './js/notifications.js';
import { renderStats } from './js/stats.js';
import { initializeSocketHandlers } from './js/socket-handlers.js';
import { setupEventListeners } from './js/events.js';

// Initialize Elements
document.addEventListener('DOMContentLoaded', () => {
  renderAppVersion();
  updateMessagesEmptyState();

  // Generate or Load Persistent User ID (6-digit numeric ID)
  state.currentUserId = localStorage.getItem('shareq_userid');
  if (!state.currentUserId) {
    state.currentUserId = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem('shareq_userid', state.currentUserId);
  }

  // Load username & avatar from localStorage
  state.currentUsername = localStorage.getItem('shareq_username') || '';
  state.currentAvatar = localStorage.getItem('shareq_avatar');
  if (!state.currentAvatar) {
    const randomIdx = Math.floor(Math.random() * emojis.length);
    state.currentAvatar = emojis[randomIdx];
    localStorage.setItem('shareq_avatar', state.currentAvatar);
  }

  // Pre-fill fields
  document.getElementById('setup-username').value = state.currentUsername;
  updateAvatarPreview('setup-avatar-preview', state.currentAvatar);

  // Render previously joined rooms on home lobby
  renderHistoryRooms();

  initializeSocketHandlers({
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
  });

  // Render Login Emojis selector
  renderEmojiGrid(
    'avatar-grid',
    emojis,
    (emoji) => {
      state.currentAvatar = emoji;
      localStorage.setItem('shareq_avatar', emoji);
      updateAvatarPreview('setup-avatar-preview', emoji);
    },
    state.currentAvatar
  );

  renderEmojiGrid(
    'modal-avatar-grid',
    emojis,
    (emoji) => {
      const preview = document.getElementById('modal-avatar-preview');
      setAvatarElement(preview, emoji);
      preview.dataset.selectedEmoji = emoji;
    },
    state.currentAvatar
  );

  // Hot song suggestions
  renderSuggestions();

  // Tab setup login view
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.dataset.tab;
      document.getElementById('tab-join-content').classList.remove('active');
      document.getElementById('tab-create-content').classList.remove('active');
      document.getElementById(`tab-${target}-content`).classList.add('active');
    });
  });

  // URL Query check auto-join room ID
  const urlParams = new URLSearchParams(window.location.search);
  const queryRoom = urlParams.get('room');
  if (queryRoom) {
    document.getElementById('room-id-input').value = queryRoom.trim().toUpperCase();
  }

  // Bind Event Listeners
  setupEventListeners({
    closeArchiveModal,
    downloadSessionArchive,
    handleLoginJoin,
    openArchiveModal,
    playSound,
    renderStats,
    showToast,
    updateToastHistoryUI,
    updateWidgetUI
  });
});

function renderAppVersion() {
  const versionElement = document.getElementById('app-version');
  if (!versionElement) {
    return;
  }

  const versionText = `v${__APP_VERSION__} (${__APP_COMMIT__})`;
  versionElement.textContent = versionText;
  versionElement.title = `v${__APP_VERSION__} (${__APP_COMMIT_FULL__})`;
}

// Logic: Handle User Login Join / Creation Action
function handleLoginJoin(mode) {
  const usernameInput = document.getElementById('setup-username').value.trim();
  if (!usernameInput) {
    alert('请在进入前设定歌手昵称！');
    return;
  }

  state.currentUsername = usernameInput;
  localStorage.setItem('shareq_username', state.currentUsername);
  localStorage.setItem('shareq_avatar', state.currentAvatar);

  let roomId;

  if (mode === 'join') {
    roomId = document.getElementById('room-id-input').value.trim().toUpperCase();
    if (!roomId) {
      alert('请输入正确的房间号！');
      return;
    }
  } else {
    // Generate a random 5 digit room ID
    roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
  }

  // Join Room Socket Emit
  state.socket.emit('join-room', {
    roomId: roomId,
    username: state.currentUsername,
    avatar: state.currentAvatar,
    userId: state.currentUserId
  });
}

function renderSuggestions() {
  const container = document.getElementById('suggestions-tags');
  clearChildren(container);

  hotSongs.forEach((song) => {
    const tag = document.createElement('button');
    tag.type = 'button';
    tag.className = 'suggestion-tag';
    tag.textContent = `${song.title} - ${song.singer}`;
    tag.addEventListener('click', () => {
      document.getElementById('song-title').value = song.title;
      document.getElementById('song-singer').value = song.singer;
    });
    container.appendChild(tag);
  });
}

// Update widget details
function updateWidgetUI() {
  document.getElementById('user-widget-name').textContent = state.currentUsername;
  setAvatarElement(document.getElementById('user-widget-avatar'), state.currentAvatar);
  document.getElementById('user-widget-id').textContent = `ID: ${state.currentUserId}`;

  // Admin visibility setup
  const isAdmin =
    state.currentUserId === state.currentHostUserId || state.currentModeratorUserIds.includes(state.currentUserId);

  // 1. The three-dots menu container in top-right (visible to everyone)
  const adminMenuContainer = document.getElementById('admin-menu-container');
  if (adminMenuContainer) {
    adminMenuContainer.classList.remove('hidden');
  }

  // Hide or show admin-only options section in dropdown
  const adminOnlySection = document.getElementById('admin-only-section');
  if (adminOnlySection) {
    if (isAdmin) {
      adminOnlySection.classList.remove('hidden');
    } else {
      adminOnlySection.classList.add('hidden');
    }
  }

  // 2. The next-btn in state.playlist card header (切歌/下一首)
  // Visible to: admins, AND the person whose song is currently playing
  const nextBtn = document.getElementById('next-btn');
  const currentlyPlayingSong = state.playlist.length > 0 ? state.playlist[0] : null;
  const isCurrentSongMine = currentlyPlayingSong && currentlyPlayingSong.requestedBy === state.currentUsername;
  if (isAdmin || isCurrentSongMine) {
    nextBtn.classList.remove('hidden');
  } else {
    nextBtn.classList.add('hidden');
  }
}

function createIcon(iconClass) {
  return createElement('i', { className: `fa-solid ${iconClass}` });
}

function createEmptyState(iconClass, text) {
  return createElement(
    'div',
    {
      className: 'text-center',
      style: 'padding: 40px; color: var(--text-muted);'
    },
    [
      createElement('i', {
        className: `fa-solid ${iconClass}`,
        style: 'font-size: 2.5rem; margin-bottom: 15px;'
      }),
      createElement('p', { text })
    ]
  );
}

function createSongActionButton(className, title, songId, iconClass, text = '') {
  const button = createElement(
    'button',
    {
      type: 'button',
      className,
      title,
      dataset: { id: songId }
    },
    [createIcon(iconClass)]
  );

  if (text) {
    appendText(button, ` ${text}`);
  }

  return button;
}

function createAccompanimentLink(link) {
  const safeLink = getSafeHttpUrl(link);
  if (!safeLink) {
    return null;
  }

  return createElement(
    'a',
    {
      className: 'song-accompaniment-link',
      title: '伴奏链接',
      attributes: {
        href: safeLink,
        target: '_blank',
        rel: 'noopener noreferrer'
      }
    },
    [createIcon('fa-link'), ' 伴奏']
  );
}

function createRequesterRow(song, includeDedication = true, includeLink = true) {
  const requesterRow = createElement('span', { className: 'song-requester-row' });
  const avatar = createElement('span', { className: 'song-requester-avatar' }, [
    createAvatarElement(song.requestedByAvatar)
  ]);
  const requester = createElement('span', {
    className: 'song-requester-name',
    text: formatUsername(song.requestedBy)
  });

  requesterRow.appendChild(avatar);
  requesterRow.appendChild(requester);

  if (includeDedication && song.dedicatedBy) {
    const tag = createElement('span', { className: 'dedicate-tag' }, [
      createIcon('fa-gift'),
      ` ${song.dedicatedBy} 指名`
    ]);
    requesterRow.appendChild(tag);
  }

  if (includeLink) {
    const accompanimentLink = createAccompanimentLink(song.link);
    if (accompanimentLink) {
      requesterRow.appendChild(accompanimentLink);
    }
  }

  return requesterRow;
}

// Render upcoming state.playlist queue
function renderPlaylist() {
  const container = document.getElementById('playlist-container');
  clearChildren(container);

  // Update badges
  document.getElementById('song-count-badge').textContent = `${state.playlist.length} 首`;

  if (state.playlist.length <= 1) {
    // If only Now Playing exists or empty
    if (state.playlist.length === 0) {
      container.appendChild(createEmptyState('fa-guitar', '歌单空空如也，快来点歌展示你的歌喉吧！'));
      return;
    }
  }

  // Render index 1 to length (upcoming ones, since index 0 is Singing)
  const isUserAdmin =
    state.currentUserId === state.currentHostUserId || state.currentModeratorUserIds.includes(state.currentUserId);

  for (let i = 1; i < state.playlist.length; i++) {
    const song = state.playlist[i];
    const isSongOwner = song.requestedBy === state.currentUsername;
    const canDelete = isUserAdmin || isSongOwner;

    const row = document.createElement('div');
    row.className = 'song-card';
    if (state.lastPinnedSongId === song.id) {
      row.classList.add('slide-in-top-anim');
      state.lastPinnedSongId = null;
      setTimeout(() => {
        if (row && row.classList) row.classList.remove('slide-in-top-anim');
      }, 1000);
    }

    const details = createElement('div', { className: 'song-details-col song-single-row' }, [
      createElement('span', { className: 'song-title-text', text: song.title }),
      createElement('span', { className: 'song-divider', text: '•' }),
      createElement('span', { className: 'song-singer-text', text: song.singer || '未知歌手' }),
      createRequesterRow(song)
    ]);

    const actions = createElement('div', { className: 'song-actions-col' });
    const priorityBtn = createSongActionButton(
      'action-icon-btn priority-btn',
      '置顶这首歌 (移到最前)',
      song.id,
      'fa-angles-up'
    );
    actions.appendChild(priorityBtn);

    if (canDelete) {
      actions.appendChild(createSongActionButton('action-icon-btn delete-btn', '删除该歌曲', song.id, 'fa-trash-can'));
    }

    row.appendChild(createElement('div', { className: 'song-index-col', text: i }));
    row.appendChild(details);
    row.appendChild(actions);

    // Priority bind
    row.querySelector('.priority-btn').addEventListener('click', () => {
      state.lastPinnedSongId = song.id;
      state.socket.emit('prioritize-song', { songId: song.id });
    });

    // Delete bind
    if (canDelete) {
      row.querySelector('.delete-btn').addEventListener('click', () => {
        state.socket.emit('delete-song', { songId: song.id });
      });
    }

    container.appendChild(row);
  }
}

// Check if the current user is next up or currently singing, and show reminder with sound
function checkSingingTurn() {
  if (state.playlist.length === 0) return;
  const currentSong = state.playlist[0];

  // If the now playing song is requested by current user, and we haven't reminded them yet
  if (currentSong.requestedBy === state.currentUsername) {
    if (state.lastSingingSongId !== currentSong.id) {
      state.lastSingingSongId = currentSong.id;
      showTurnToSingReminder(currentSong);
    }
  }
}

// Show turn to sing reminder banner and play a notification chime
function showTurnToSingReminder(song) {
  // Play chime
  playSound('chime');

  // Show toast notification
  showToast('shuffle', `🎤 轮到你唱歌啦！当前播放歌曲：《${song.title}》`);

  // Also show a beautiful overlay reminder card for a few seconds
  const overlay = document.createElement('div');
  overlay.className = 'singing-turn-overlay';

  const card = createElement('div', { className: 'singing-turn-card animate-glow' }, [
    createElement('div', { className: 'singing-icon' }, [createIcon('fa-microphone-lines')]),
    createElement('h2', { text: '轮到你上台啦！' }),
    createElement('p', { text: '正在播放你点的歌曲：' }),
    createElement('div', {
      className: 'song-info',
      text: `《${song.title}》 - ${song.singer || '未知歌手'}`
    }),
    createElement('button', {
      type: 'button',
      className: 'btn btn-primary btn-block close-overlay-btn',
      text: '我已准备好',
      style:
        'margin-top: 20px; background: var(--color-primary); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s;'
    })
  ]);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector('.close-overlay-btn');
  closeBtn.addEventListener('click', () => {
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 400);
  });

  // Auto dismiss after 6 seconds
  setTimeout(() => {
    if (overlay.parentNode) {
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.remove(), 400);
    }
  }, 6000);
}

// Render history state.playlist
function renderHistory() {
  const container = document.getElementById('history-playlist-container');
  clearChildren(container);

  document.getElementById('history-count-badge').textContent = `${state.historyPlaylist.length} 首`;

  if (state.historyPlaylist.length === 0) {
    container.appendChild(createEmptyState('fa-microphone-slash', '暂无唱毕曲目历史记录。'));
    return;
  }

  // Show completed history in reverse order (newest sung first)
  for (let i = state.historyPlaylist.length - 1; i >= 0; i--) {
    const song = state.historyPlaylist[i];
    const item = document.createElement('div');
    item.className = 'song-card';

    // Count total reactions
    const reactCount = song.reactions || { rose: 0, clap: 0, egg: 0, shoe: 0 };

    const historyTime = createElement(
      'span',
      {
        className: 'history-time',
        style: 'margin-left: auto; font-size: 0.78rem; opacity: 0.75;'
      },
      [
        createIcon('fa-circle-play'),
        ` 唱毕: ${song.completedAt ? new Date(song.completedAt).toLocaleTimeString() : '--'}`
      ]
    );

    const reactionSummary = createElement('div', {
      className: 'playing-reaction-summary',
      style: 'margin-top: 4px; width: 100%;'
    });
    [
      ['🌹', reactCount.rose || 0],
      ['👏', reactCount.clap || 0],
      ['🥚', reactCount.egg || 0],
      ['👞', reactCount.shoe || 0]
    ].forEach(([emoji, count]) => {
      reactionSummary.appendChild(
        createElement(
          'span',
          {
            className: 'stat-reaction',
            style: 'font-size:0.7rem; padding: 2px 6px; border: none; background: transparent;'
          },
          [createElement('span', { className: 'reaction-emoji', text: emoji }), ` ${count}`]
        )
      );
    });

    const details = createElement('div', { className: 'song-details-col song-single-row' }, [
      createElement('span', {
        className: 'song-title-text',
        text: song.title,
        style: 'opacity: 0.6;'
      }),
      createElement('span', { className: 'song-divider', text: '•' }),
      createElement('span', { className: 'song-singer-text', text: song.singer || '未知歌手' }),
      createRequesterRow(song, false, false),
      historyTime,
      reactionSummary
    ]);

    item.appendChild(
      createElement('div', {
        className: 'song-index-col',
        text: state.historyPlaylist.length - i
      })
    );
    item.appendChild(details);
    container.appendChild(item);
  }
}

// Render user avatars in header stack & sidebar list
function renderMembers() {
  // 1. Stack inside header
  const stack = document.getElementById('users-stack');
  clearChildren(stack);

  // Render up to 5 overlapping avatars
  const limit = Math.min(state.roomUsers.length, 5);
  for (let i = 0; i < limit; i++) {
    const user = state.roomUsers[i];
    const av = document.createElement('div');
    av.className = 'online-avatar';
    av.appendChild(createAvatarElement(user.avatar || '🎤'));
    av.title = user.username;
    stack.appendChild(av);
  }
  document.getElementById('online-count-txt').textContent = `${state.roomUsers.length} 人在线`;

  // 2. Members panel on the left side
  const container = document.getElementById('members-list-container');
  clearChildren(container);

  const currentIsHost = state.currentUserId === state.currentHostUserId;
  const currentIsMod = state.currentModeratorUserIds.includes(state.currentUserId);

  state.roomUsers.forEach((u) => {
    const isHost = u.userId === state.currentHostUserId;
    const isMod = state.currentModeratorUserIds.includes(u.userId);

    let roleBadge = null;
    if (isHost) {
      roleBadge = createElement('span', { className: 'badge-host' }, [createIcon('fa-crown'), ' 主持人']);
    } else if (isMod) {
      roleBadge = createElement('span', { className: 'badge-mod' }, [createIcon('fa-shield-halved'), ' 房管']);
    }

    const row = document.createElement('div');
    row.className = 'member-row';

    const memberActions = createElement('div', { className: 'member-actions' });

    if (u.userId !== state.currentUserId) {
      // 1. Host Actions
      if (currentIsHost) {
        memberActions.appendChild(
          createElement(
            'button',
            {
              type: 'button',
              className: 'member-action-btn btn-action-mod',
              title: isMod ? '取消房管' : '设为房管',
              dataset: {
                userid: u.userId,
                ismod: isMod
              }
            },
            [createIcon(isMod ? 'fa-shield-slash' : 'fa-shield-halved')]
          )
        );

        memberActions.appendChild(
          createElement(
            'button',
            {
              type: 'button',
              className: 'member-action-btn btn-action-transfer',
              title: '移交主持人',
              dataset: { userid: u.userId }
            },
            [createIcon('fa-crown')]
          )
        );
      }

      // 2. Host & Moderator Kick Actions
      const currentCanKick = currentIsHost || (currentIsMod && !isHost && !isMod);
      if (currentCanKick) {
        memberActions.appendChild(
          createElement(
            'button',
            {
              type: 'button',
              className: 'member-action-btn btn-action-kick',
              title: '踢出房间',
              dataset: { socketid: u.socketId }
            },
            [createIcon('fa-user-slash'), ' 踢']
          )
        );
      }
    }

    const memberName = createElement('div', { className: 'member-name' });
    appendText(memberName, u.username || '');
    if (roleBadge) {
      appendText(memberName, ' ');
      memberName.appendChild(roleBadge);
    }

    const memberInfo = createElement('div', { className: 'member-info' }, [
      createElement('div', { className: 'member-avatar' }, [createAvatarElement(u.avatar)]),
      createElement('div', { className: 'member-text' }, [
        memberName,
        createElement('div', {
          className: 'member-id-label',
          text: `ID: ${u.userId}`
        })
      ])
    ]);

    row.appendChild(memberInfo);
    row.appendChild(memberActions);

    // Event Bindings
    if (u.userId !== state.currentUserId) {
      if (currentIsHost) {
        row.querySelector('.btn-action-mod').addEventListener('click', () => {
          state.socket.emit('promote-moderator', {
            targetUserId: u.userId
          });
        });

        row.querySelector('.btn-action-transfer').addEventListener('click', () => {
          if (
            confirm(
              `⚠️ 警告：您确定要将房主（主持人）权限完全移交给“${u.username}”吗？此操作将不可逆，您将被降为房管！`
            )
          ) {
            state.socket.emit('transfer-host', { targetUserId: u.userId });
          }
        });
      }

      const currentCanKick = currentIsHost || (currentIsMod && !isHost && !isMod);
      if (currentCanKick) {
        row.querySelector('.btn-action-kick').addEventListener('click', () => {
          if (confirm(`确定要踢出用户“${u.username}”吗？`)) {
            state.socket.emit('kick-user', { targetSocketId: u.socketId });
          }
        });
      }
    }

    container.appendChild(row);
  });
}

// Update the enlarged Now Playing Panel
function updateNowPlaying() {
  const titleElem = document.getElementById('playing-title');
  const singerElem = document.getElementById('playing-singer');
  const userElem = document.getElementById('playing-user-badge');
  const linkBtn = document.getElementById('playing-link-btn');
  const updateReactionCounts = (reacts) => {
    const countMap = {
      'count-rose': reacts.rose || 0,
      'count-clap': reacts.clap || 0,
      'count-egg': reacts.egg || 0,
      'count-shoe': reacts.shoe || 0
    };

    for (const [id, value] of Object.entries(countMap)) {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    }
  };

  if (state.playlist.length > 0) {
    const currentSong = state.playlist[0];
    titleElem.textContent = currentSong.title;
    singerElem.textContent = currentSong.singer ? `${currentSong.singer}` : '未指定歌手';
    clearChildren(userElem);
    userElem.appendChild(
      createElement(
        'span',
        {
          style:
            'display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; border-radius:50%; overflow:hidden; vertical-align:middle; margin-right:6px;'
        },
        [createAvatarElement(currentSong.requestedByAvatar)]
      )
    );
    appendText(userElem, formatUsername(currentSong.requestedBy));

    const dedicateBadge = document.getElementById('playing-dedicate-badge');
    if (dedicateBadge) {
      if (currentSong.dedicatedBy) {
        clearChildren(dedicateBadge);
        dedicateBadge.appendChild(createIcon('fa-gift'));
        appendText(dedicateBadge, ` ${currentSong.dedicatedBy} 指名`);
        dedicateBadge.classList.remove('hidden');
      } else {
        dedicateBadge.classList.add('hidden');
      }
    }

    // Accompaniment link setting
    const safeCurrentLink = getSafeHttpUrl(currentSong.link);
    if (safeCurrentLink) {
      linkBtn.href = safeCurrentLink;
      linkBtn.rel = 'noopener noreferrer';
      linkBtn.classList.remove('hidden');
    } else {
      linkBtn.classList.add('hidden');
      linkBtn.removeAttribute('href');
    }

    // Reactions counter
    const reacts = currentSong.reactions || { rose: 0, clap: 0, egg: 0, shoe: 0 };
    updateReactionCounts(reacts);

    // Show visualizer bars and spinning CD animation
    document.getElementById('visualizer-bars').style.opacity = '1';
    const noteIcon = document.getElementById('playing-music-note');
    const avatarDisc = document.getElementById('playing-avatar-disc');
    if (noteIcon && avatarDisc) {
      // Look up current avatar of the singer from active room users list first, then fall back to requestedByAvatar
      const singerUser = state.roomUsers.find((u) => u.username === currentSong.requestedBy);
      const av = String((singerUser && singerUser.avatar) || currentSong.requestedByAvatar || '🎤');

      const safeAvatarDiscSrc =
        av.startsWith('data:image/png') ||
        av.startsWith('data:image/jpeg') ||
        av.startsWith('data:image/gif') ||
        av.startsWith('data:image/webp')
          ? av
          : getSafeHttpUrl(av);
      if (safeAvatarDiscSrc) {
        noteIcon.classList.add('hidden');
        avatarDisc.src = safeAvatarDiscSrc;
        avatarDisc.classList.remove('hidden');
      } else {
        avatarDisc.classList.add('hidden');
        noteIcon.classList.remove('hidden');
        noteIcon.textContent = av || '🎤';
      }
    }
  } else {
    // Empty state
    titleElem.textContent = '暂无演唱歌曲';
    singerElem.textContent = '点歌后即可在此开启演唱';
    userElem.textContent = '--';
    linkBtn.classList.add('hidden');
    linkBtn.removeAttribute('href');

    const dedicateBadge = document.getElementById('playing-dedicate-badge');
    if (dedicateBadge) {
      dedicateBadge.classList.add('hidden');
    }

    updateReactionCounts({ rose: 0, clap: 0, egg: 0, shoe: 0 });

    document.getElementById('visualizer-bars').style.opacity = '0.2';
    const musicNote = document.querySelector('.playing-music-note-large i');
    if (musicNote) {
      musicNote.style.animationPlayState = 'paused';
    }
  }
}

// Floating emoji animation triggered on reactions
function triggerReactionFloat(type) {
  const container = document.getElementById('floating-reaction-container');
  if (!container) return;

  const emoji = document.createElement('span');
  emoji.className = 'floating-emoji';

  let emojiChar = '🌹';
  if (type === 'clap') emojiChar = '👏';
  else if (type === 'egg') emojiChar = '🥚';
  else if (type === 'shoe') emojiChar = '👞';

  emoji.textContent = emojiChar;

  // Random horizontal position, sizes, and drift paths
  const startX = Math.random() * 80 + 10; // 10% to 90%
  emoji.style.left = `${startX}%`;

  const randomDrift1 = Math.random() * 100 - 50 + 'px';
  const randomDrift2 = Math.random() * 150 - 75 + 'px';
  const randomDrift3 = Math.random() * 200 - 100 + 'px';

  emoji.style.setProperty('--drift-1', randomDrift1);
  emoji.style.setProperty('--drift-2', randomDrift2);
  emoji.style.setProperty('--drift-3', randomDrift3);

  const randomDuration = 2.5 + Math.random() * 1.5; // 2.5s to 4s
  emoji.style.animationDuration = `${randomDuration}s`;

  const randomSize = 1.5 + Math.random() * 1.5; // 1.5rem to 3rem
  emoji.style.fontSize = `calc(${randomSize}rem * var(--emoji-scale, 5))`;

  container.appendChild(emoji);

  // Auto clean up element
  setTimeout(() => {
    emoji.remove();
  }, randomDuration * 1000);
}

// Save successfully joined KTV room to localStorage history
function readHistoryRooms() {
  try {
    return JSON.parse(localStorage.getItem('shareq_history_rooms')) || [];
  } catch {
    return [];
  }
}

function saveRoomToHistory(roomId) {
  if (!roomId) return;
  let rooms = readHistoryRooms();

  // Filter out any existing occurrence of this room ID
  rooms = rooms.filter((r) => {
    const rId = typeof r === 'string' ? r : r.roomId;
    return rId !== roomId;
  });

  // Push new room to the front
  rooms.unshift({ roomId: roomId, joinedAt: Date.now() });

  // Limit list to last 10 rooms
  rooms = rooms.slice(0, 10);

  localStorage.setItem('shareq_history_rooms', JSON.stringify(rooms));
}

// Render history room list in the home lobby view
function renderHistoryRooms() {
  const section = document.getElementById('history-rooms-section');
  const list = document.getElementById('history-rooms-list');
  if (!section || !list) return;

  const rooms = readHistoryRooms();

  if (rooms.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  clearChildren(list);

  rooms.forEach((room) => {
    const roomId = typeof room === 'string' ? room : room.roomId;
    const joinedAt = typeof room === 'string' ? Date.now() : room.joinedAt || Date.now();

    const item = document.createElement('div');
    item.className = 'history-room-item';

    // Text info
    const textNode = document.createElement('div');
    textNode.style.display = 'flex';
    textNode.style.flexDirection = 'column';
    textNode.appendChild(
      createElement('span', {
        className: 'room-number',
        text: `房间号: ${roomId}`
      })
    );
    textNode.appendChild(
      createElement('span', {
        text: `上次进入: ${new Date(joinedAt).toLocaleDateString()}`,
        style: 'font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;'
      })
    );

    const joinBtn = document.createElement('button');
    joinBtn.type = 'button';
    joinBtn.className = 'btn-text';
    joinBtn.style.color = 'var(--color-primary)';
    joinBtn.style.fontSize = '0.85rem';
    joinBtn.style.fontWeight = '600';
    joinBtn.appendChild(createIcon('fa-right-to-bracket'));
    appendText(joinBtn, ' 快捷进入');

    // Make clicking the whole item or the button trigger the join
    const triggerJoin = (e) => {
      e.stopPropagation();
      document.getElementById('room-id-input').value = roomId;
      const joinTabBtn = document.querySelector('[data-tab="join"]');
      if (joinTabBtn) {
        joinTabBtn.click();
      }
      handleLoginJoin('join');
    };

    item.addEventListener('click', triggerJoin);
    joinBtn.addEventListener('click', triggerJoin);

    item.appendChild(textNode);
    item.appendChild(joinBtn);

    list.appendChild(item);
  });
}

// Update the dropdown list of users you can dedicate a song to
function updateDedicateSelect() {
  const select = document.getElementById('song-dedicate');
  if (!select) return;

  // Save current selection to restore it if possible
  const prevVal = select.value;

  // Clear but keep first option
  clearChildren(select);
  select.appendChild(
    createElement('option', {
      text: '-- 自己唱 (默认) --',
      attributes: { value: '' }
    })
  );

  state.roomUsers.forEach((u) => {
    if (u.userId !== state.currentUserId) {
      const opt = document.createElement('option');
      opt.value = u.userId;
      opt.textContent = `${u.username} (ID: ${u.userId})`;
      select.appendChild(opt);
    }
  });

  if (prevVal) {
    select.value = prevVal;
  }
}

function formatUsername(name) {
  const displayName = String(name || '');
  if (!displayName) return '';
  if (displayName.length > 20) {
    return displayName.substring(0, 3) + '...' + displayName.substring(displayName.length - 3);
  }
  return displayName;
}
