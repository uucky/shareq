import { resizeAndSetAvatar, setAvatarElement, updateAvatarPreview } from './avatar.js';
import { emojis, randomNames } from './data.js';
import { state } from './state.js';

// Helper: Setup Client Interaction DOM Listeners
export function setupEventListeners(deps) {
  const {
    closeArchiveModal,
    downloadSessionArchive,
    handleLoginJoin,
    openArchiveModal,
    playSound,
    renderStats,
    showToast,
    updateToastHistoryUI,
    updateWidgetUI
  } = deps;
  // Random Name button inside Login
  document.getElementById('randomize-name-btn').addEventListener('click', () => {
    const idx = Math.floor(Math.random() * randomNames.length);
    const code = Math.floor(100 + Math.random() * 900); // add number tag
    const randomNick = randomNames[idx] + '#' + code;
    document.getElementById('setup-username').value = randomNick;
  });

  // Random Avatar button inside Login
  document.getElementById('randomize-avatar-btn').addEventListener('click', () => {
    const idx = Math.floor(Math.random() * emojis.length);
    state.currentAvatar = emojis[idx];
    localStorage.setItem('shareq_avatar', state.currentAvatar);
    updateAvatarPreview('setup-avatar-preview', state.currentAvatar);
  });

  // Join Room trigger
  document.getElementById('join-room-btn').addEventListener('click', () => {
    handleLoginJoin('join');
  });

  // Create Room trigger
  document.getElementById('create-room-btn').addEventListener('click', () => {
    handleLoginJoin('create');
  });

  // Leave Room trigger
  document.getElementById('leave-room-btn').addEventListener('click', () => {
    localStorage.removeItem('shareq_last_room');
    window.location.href = window.location.origin + window.location.pathname;
  });

  // Click logo -> Back to home
  const brandLogo = document.getElementById('brand-logo-egg');
  if (brandLogo) {
    brandLogo.addEventListener('click', () => {
      localStorage.removeItem('shareq_last_room');
      window.location.href = window.location.origin + window.location.pathname;
    });
  }

  // Corner Easter Egg Button -> openArchiveModal
  const cornerEggBtn = document.getElementById('corner-egg-btn');
  if (cornerEggBtn) {
    cornerEggBtn.addEventListener('click', () => {
      openArchiveModal();
    });
  }

  // Custom Avatar Upload for Lobby Setup
  const setupFileInput = document.getElementById('setup-avatar-file');
  const setupUploadBtn = document.getElementById('setup-upload-avatar-btn');
  if (setupUploadBtn && setupFileInput) {
    setupUploadBtn.addEventListener('click', () => {
      setupFileInput.value = ''; // Clear value so selecting same file always fires change event
      setupFileInput.click();
    });
    setupFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        resizeAndSetAvatar(file, (dataUrl) => {
          state.currentAvatar = dataUrl;
          localStorage.setItem('shareq_avatar', state.currentAvatar);
          updateAvatarPreview('setup-avatar-preview', state.currentAvatar);
        });
      }
    });
  }

  // Custom Avatar Upload for Edit Profile Modal
  const modalFileInput = document.getElementById('modal-avatar-file');
  const modalUploadBtn = document.getElementById('modal-upload-avatar-btn');
  if (modalUploadBtn && modalFileInput) {
    modalUploadBtn.addEventListener('click', () => {
      modalFileInput.value = ''; // Clear value so selecting same file always fires change event
      modalFileInput.click();
    });
    modalFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        resizeAndSetAvatar(file, (dataUrl) => {
          const preview = document.getElementById('modal-avatar-preview');
          setAvatarElement(preview, dataUrl);
          preview.dataset.selectedEmoji = dataUrl;
        });
      }
    });
  }

  // Copy Room Link Badge click
  document.getElementById('room-badge-btn').addEventListener('click', () => {
    const shareUrl = window.location.href;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        showToast('shuffle', '📋 分享链接已复制到剪贴板！可以直接发送给好友！');
      })
      .catch((err) => {
        console.error('Copy failed', err);
        // Fallback alert
        alert(`当前分享链接：${shareUrl}`);
      });
  });

  // Request Form submit
  document.getElementById('song-request-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const titleVal = document.getElementById('song-title').value.trim();
    const singerVal = document.getElementById('song-singer').value.trim();
    const linkVal = document.getElementById('song-link').value.trim();
    const dedicateUserIdVal = document.getElementById('song-dedicate').value;

    if (!titleVal) return;

    if (dedicateUserIdVal) {
      state.socket.emit('dedicate-song', {
        title: titleVal,
        singer: singerVal,
        link: linkVal,
        targetUserId: dedicateUserIdVal
      });
    } else {
      state.socket.emit('add-song', {
        title: titleVal,
        singer: singerVal,
        link: linkVal
      });
    }

    // Reset inputs
    document.getElementById('song-title').value = '';
    document.getElementById('song-singer').value = '';
    document.getElementById('song-link').value = '';
    document.getElementById('song-dedicate').value = '';
  });

  // Profile modal toggle
  const widget = document.getElementById('user-profile-widget');
  const modal = document.getElementById('profile-modal');

  widget.addEventListener('click', () => {
    document.getElementById('modal-username').value = state.currentUsername;
    const preview = document.getElementById('modal-avatar-preview');
    setAvatarElement(preview, state.currentAvatar);
    preview.dataset.selectedEmoji = state.currentAvatar;

    // Select the correct one in modal grid
    const options = document.querySelectorAll('#modal-avatar-grid .avatar-option');
    options.forEach((opt) => {
      if (opt.textContent === state.currentAvatar) {
        opt.classList.add('selected');
      } else {
        opt.classList.remove('selected');
      }
    });

    modal.classList.remove('hidden');
  });

  // Mobile Toast Notification Trigger
  const mobileToastTrigger = document.getElementById('mobile-toast-trigger');
  if (mobileToastTrigger) {
    mobileToastTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const section = document.querySelector('.notifications-section');
      if (section) {
        section.classList.toggle('open-on-mobile');
        if (section.classList.contains('open-on-mobile')) {
          state.unreadToastsCount = 0;
          updateToastHistoryUI();
        }
      }
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
      const section = document.querySelector('.notifications-section');
      if (section && section.classList.contains('open-on-mobile')) {
        if (!section.contains(e.target) && !mobileToastTrigger.contains(e.target)) {
          section.classList.remove('open-on-mobile');
        }
      }
    });
  }

  // Modal Cancel
  document.getElementById('close-modal-btn').addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('modal-cancel-btn').addEventListener('click', () => modal.classList.add('hidden'));

  // Modal Randomize
  document.getElementById('modal-random-avatar-btn').addEventListener('click', () => {
    const idx = Math.floor(Math.random() * emojis.length);
    const preview = document.getElementById('modal-avatar-preview');
    const targetEmoji = emojis[idx];
    setAvatarElement(preview, targetEmoji);
    preview.dataset.selectedEmoji = targetEmoji;

    // Highlight
    const options = document.querySelectorAll('#modal-avatar-grid .avatar-option');
    options.forEach((opt) => {
      if (opt.textContent === targetEmoji) {
        opt.classList.add('selected');
      } else {
        opt.classList.remove('selected');
      }
    });
  });

  // Modal Save Changes
  document.getElementById('modal-save-btn').addEventListener('click', () => {
    const newName = document.getElementById('modal-username').value.trim();
    const newAvatar = document.getElementById('modal-avatar-preview').dataset.selectedEmoji || state.currentAvatar;

    if (!newName) {
      alert('昵称不能为空！');
      return;
    }

    state.currentUsername = newName;
    state.currentAvatar = newAvatar;

    localStorage.setItem('shareq_username', state.currentUsername);
    localStorage.setItem('shareq_avatar', state.currentAvatar);

    state.socket.emit('update-profile', {
      username: state.currentUsername,
      avatar: state.currentAvatar
    });

    updateWidgetUI();
    modal.classList.add('hidden');
  });

  // Playlist tabs toggle
  const upcomingTabBtn = document.getElementById('tab-upcoming-btn');
  const historyTabBtn = document.getElementById('tab-history-btn');
  const statsTabBtn = document.getElementById('tab-stats-btn');
  const upcomingCont = document.getElementById('playlist-container');
  const historyCont = document.getElementById('history-playlist-container');
  const statsCont = document.getElementById('stats-playlist-container');

  upcomingTabBtn.addEventListener('click', () => {
    upcomingTabBtn.classList.add('active');
    historyTabBtn.classList.remove('active');
    statsTabBtn.classList.remove('active');
    upcomingCont.classList.remove('hidden');
    historyCont.classList.add('hidden');
    statsCont.classList.add('hidden');
  });

  historyTabBtn.addEventListener('click', () => {
    upcomingTabBtn.classList.remove('active');
    historyTabBtn.classList.add('active');
    statsTabBtn.classList.remove('active');
    upcomingCont.classList.add('hidden');
    historyCont.classList.remove('hidden');
    statsCont.classList.add('hidden');
  });

  statsTabBtn.addEventListener('click', () => {
    upcomingTabBtn.classList.remove('active');
    historyTabBtn.classList.remove('active');
    statsTabBtn.classList.add('active');
    upcomingCont.classList.add('hidden');
    historyCont.classList.add('hidden');
    statsCont.classList.remove('hidden');
    renderStats();
  });

  // Play controls
  document.getElementById('shuffle-btn').addEventListener('click', () => {
    state.socket.emit('shuffle-playlist');
  });

  document.getElementById('next-btn').addEventListener('click', () => {
    state.socket.emit('next-song');
  });

  document.getElementById('prev-btn').addEventListener('click', () => {
    state.socket.emit('prev-song');
  });

  document.getElementById('undo-btn').addEventListener('click', () => {
    state.socket.emit('undo-playlist');
  });

  document.getElementById('redo-btn').addEventListener('click', () => {
    state.socket.emit('redo-playlist');
  });

  // Admin three-dots dropdown menu actions
  const adminMenuBtn = document.getElementById('admin-menu-btn');
  const adminDropdownMenu = document.getElementById('admin-dropdown-menu');

  adminMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    adminDropdownMenu.classList.toggle('hidden');
  });

  // Dismiss dropdown menu when clicking anywhere else
  document.addEventListener('click', (e) => {
    if (!adminDropdownMenu.classList.contains('hidden')) {
      const isClickInside = adminMenuBtn.contains(e.target) || adminDropdownMenu.contains(e.target);
      if (!isClickInside) {
        adminDropdownMenu.classList.add('hidden');
      }
    }
  });

  // End Session Confirmation (3 times)
  const endSessionBtn = document.getElementById('end-session-btn');
  if (endSessionBtn) {
    endSessionBtn.addEventListener('click', () => {
      if (confirm('⚠️ 警告：您确定要结束本次歌会吗？这将会清空所有歌单、切歌历史并重置房间状态！')) {
        if (confirm('⚠️⚠️ 请再次确认：此操作将清空整个房间的歌单，所有排队歌曲以及历史记录均会丢失！确定继续吗？')) {
          if (confirm('🚨🚨🚨 最终安全确认：您真的要立即结束本次 KTV 歌会吗？')) {
            state.socket.emit('end-session');
          }
        }
      }
    });
  }

  // Theme Mode Toggle (Light / Dark)
  const themeToggleBtn = document.getElementById('dropdown-theme-toggle-btn');
  const savedTheme = localStorage.getItem('shareq_theme') || 'dark';

  const updateThemeButtonUI = (isLight) => {
    if (!themeToggleBtn) return;
    if (isLight) {
      themeToggleBtn.innerHTML = `<i class="fa-solid fa-moon"></i> 切换为暗色主题`;
    } else {
      themeToggleBtn.innerHTML = `<i class="fa-solid fa-sun"></i> 切换为亮色主题`;
    }
  };

  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    updateThemeButtonUI(true);
  } else {
    document.body.classList.remove('light-theme');
    updateThemeButtonUI(false);
  }

  themeToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isLightNow = document.body.classList.toggle('light-theme');
    localStorage.setItem('shareq_theme', isLightNow ? 'light' : 'dark');
    updateThemeButtonUI(isLightNow);
    adminDropdownMenu.classList.add('hidden');
  });

  // Compact Mode Toggle
  const compactToggleBtn = document.getElementById('dropdown-compact-toggle-btn');
  const savedCompact = localStorage.getItem('shareq_compact_mode') || 'false';

  const updateCompactButtonUI = (isCompact) => {
    if (!compactToggleBtn) return;
    if (isCompact) {
      compactToggleBtn.innerHTML = `<i class="fa-solid fa-expand"></i> 切换为常规模式`;
    } else {
      compactToggleBtn.innerHTML = `<i class="fa-solid fa-compress"></i> 切换为紧凑模式`;
    }
  };

  if (savedCompact === 'true') {
    document.body.classList.add('compact-mode');
    updateCompactButtonUI(true);
  } else {
    document.body.classList.remove('compact-mode');
    updateCompactButtonUI(false);
  }

  if (compactToggleBtn) {
    compactToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isCompactNow = document.body.classList.toggle('compact-mode');
      localStorage.setItem('shareq_compact_mode', isCompactNow ? 'true' : 'false');
      updateCompactButtonUI(isCompactNow);
      adminDropdownMenu.classList.add('hidden');
    });
  }

  // Dropdown Stats Button
  const dropdownStatsBtn = document.getElementById('dropdown-stats-btn');
  if (dropdownStatsBtn) {
    dropdownStatsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tabStatsBtn = document.getElementById('tab-stats-btn');
      if (tabStatsBtn) {
        tabStatsBtn.click();
      }
      adminDropdownMenu.classList.add('hidden');
    });
  }

  // Dropdown About Button
  const dropdownAboutBtn = document.getElementById('dropdown-about-btn');
  if (dropdownAboutBtn) {
    dropdownAboutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('about-modal').classList.remove('hidden');
      adminDropdownMenu.classList.add('hidden');
    });
  }

  // About modal close buttons
  document.getElementById('close-about-modal-btn').addEventListener('click', () => {
    document.getElementById('about-modal').classList.add('hidden');
  });
  document.getElementById('close-about-ok-btn').addEventListener('click', () => {
    document.getElementById('about-modal').classList.add('hidden');
  });

  // Toast filter tabs
  document.querySelectorAll('.toast-filter-link').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      document.querySelectorAll('.toast-filter-link').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      updateToastHistoryUI();
    });
  });

  // Reactions Gift Panel
  const giftButtons = document.querySelectorAll('.btn-reaction-gift');
  giftButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (state.playlist.length === 0) {
        showToast('delete', '❌ 当前没有正在演唱的歌曲，无法发送互动！');
        return;
      }
      const reactionType = btn.dataset.reaction;
      state.socket.emit('send-reaction', { type: reactionType });
    });
  });

  // Reactions Gift Mute Button
  const muteBtn = document.getElementById('btn-reaction-mute');
  if (muteBtn) {
    if (state.isSoundMuted) {
      muteBtn.classList.add('muted');
      muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    }
    muteBtn.addEventListener('click', () => {
      state.isSoundMuted = !state.isSoundMuted;
      localStorage.setItem('shareq_gift_muted', state.isSoundMuted);
      if (state.isSoundMuted) {
        muteBtn.classList.add('muted');
        muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
        showToast('info', '🔇 互动礼物音效已静音');
      } else {
        muteBtn.classList.remove('muted');
        muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        showToast('info', '🔊 互动礼物音效已开启');
        playSound('rose');
      }
    });
  }

  // Easter Egg modal cancel/close
  document.getElementById('close-archive-modal-btn').addEventListener('click', closeArchiveModal);
  document.getElementById('archive-cancel-btn').addEventListener('click', closeArchiveModal);

  // Easter Egg download run
  document.getElementById('archive-download-btn').addEventListener('click', () => {
    downloadSessionArchive();
    closeArchiveModal();
  });
}
