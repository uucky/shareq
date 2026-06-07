// ShareQ - KTV Client App Logic
import { playSound } from './js/audio.js';
import {
  renderAvatarHTML,
  renderEmojiGrid,
  updateAvatarPreview
} from './js/avatar.js';
import { emojis, hotSongs } from './js/data.js';
import { state } from './js/state.js';
import { closeArchiveModal, downloadSessionArchive, openArchiveModal } from './js/archive.js';
import { showDedicationRequestModal, showToast, updateMessagesEmptyState, updateToastHistoryUI } from './js/notifications.js';
import { renderStats } from './js/stats.js';
import { initializeSocketHandlers } from './js/socket-handlers.js';
import { setupEventListeners } from './js/events.js';

// Initialize Elements
document.addEventListener("DOMContentLoaded", () => {
  updateMessagesEmptyState();

  // Generate or Load Persistent User ID (6-digit numeric ID)
  state.currentUserId = localStorage.getItem("shareq_userid");
  if (!state.currentUserId) {
    state.currentUserId = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem("shareq_userid", state.currentUserId);
  }

  // Load username & avatar from localStorage
  state.currentUsername = localStorage.getItem("shareq_username") || "";
  state.currentAvatar = localStorage.getItem("shareq_avatar");
  if (!state.currentAvatar) {
    const randomIdx = Math.floor(Math.random() * emojis.length);
    state.currentAvatar = emojis[randomIdx];
    localStorage.setItem("shareq_avatar", state.currentAvatar);
  }

  // Pre-fill fields
  document.getElementById("setup-username").value = state.currentUsername;
  updateAvatarPreview("setup-avatar-preview", state.currentAvatar);

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
  renderEmojiGrid("avatar-grid", emojis, (emoji) => {
    state.currentAvatar = emoji;
    localStorage.setItem("shareq_avatar", emoji);
    updateAvatarPreview("setup-avatar-preview", emoji);
  }, state.currentAvatar);

  renderEmojiGrid("modal-avatar-grid", emojis, (emoji) => {
    const preview = document.getElementById("modal-avatar-preview");
    preview.innerHTML = renderAvatarHTML(emoji);
    preview.dataset.selectedEmoji = emoji;
  }, state.currentAvatar);

  // Hot song suggestions
  renderSuggestions();

  // Tab setup login view
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const target = btn.dataset.tab;
      document.getElementById("tab-join-content").classList.remove("active");
      document.getElementById("tab-create-content").classList.remove("active");
      document.getElementById(`tab-${target}-content`).classList.add("active");
    });
  });

  // URL Query check auto-join room ID
  const urlParams = new URLSearchParams(window.location.search);
  const queryRoom = urlParams.get("room");
  if (queryRoom) {
    document.getElementById("room-id-input").value = queryRoom.trim().toUpperCase();
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

// Logic: Handle User Login Join / Creation Action
function handleLoginJoin(mode) {
  const usernameInput = document.getElementById("setup-username").value.trim();
  if (!usernameInput) {
    alert("请在进入前设定歌手昵称！");
    return;
  }

  state.currentUsername = usernameInput;
  localStorage.setItem("shareq_username", state.currentUsername);
  localStorage.setItem("shareq_avatar", state.currentAvatar);

  let roomId = "";

  if (mode === "join") {
    roomId = document.getElementById("room-id-input").value.trim().toUpperCase();
    if (!roomId) {
      alert("请输入正确的房间号！");
      return;
    }
  } else {
    // Generate a random 5 digit room ID
    roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
  }

  // Join Room Socket Emit
  state.socket.emit("join-room", {
    roomId: roomId,
    username: state.currentUsername,
    avatar: state.currentAvatar,
    userId: state.currentUserId
  });
}

function renderSuggestions() {
  const container = document.getElementById("suggestions-tags");
  container.innerHTML = "";

  hotSongs.forEach(song => {
    const tag = document.createElement("button");
    tag.type = "button";
    tag.className = "suggestion-tag";
    tag.textContent = `${song.title} - ${song.singer}`;
    tag.addEventListener("click", () => {
      document.getElementById("song-title").value = song.title;
      document.getElementById("song-singer").value = song.singer;
    });
    container.appendChild(tag);
  });
}

// Update widget details
function updateWidgetUI() {
  document.getElementById("user-widget-name").textContent = state.currentUsername;
  document.getElementById("user-widget-avatar").innerHTML = renderAvatarHTML(state.currentAvatar);
  document.getElementById("user-widget-id").textContent = `ID: ${state.currentUserId}`;

  // Admin visibility setup
  const isAdmin = (state.currentUserId === state.currentHostUserId) || state.currentModeratorUserIds.includes(state.currentUserId);
  
  // 1. The three-dots menu container in top-right (visible to everyone)
  const adminMenuContainer = document.getElementById("admin-menu-container");
  if (adminMenuContainer) {
    adminMenuContainer.classList.remove("hidden");
  }

  // Hide or show admin-only options section in dropdown
  const adminOnlySection = document.getElementById("admin-only-section");
  if (adminOnlySection) {
    if (isAdmin) {
      adminOnlySection.classList.remove("hidden");
    } else {
      adminOnlySection.classList.add("hidden");
    }
  }

  // 2. The next-btn in state.playlist card header (切歌/下一首)
  // Visible to: admins, AND the person whose song is currently playing
  const nextBtn = document.getElementById("next-btn");
  const currentlyPlayingSong = state.playlist.length > 0 ? state.playlist[0] : null;
  const isCurrentSongMine = currentlyPlayingSong && currentlyPlayingSong.requestedBy === state.currentUsername;
  if (isAdmin || isCurrentSongMine) {
    nextBtn.classList.remove("hidden");
  } else {
    nextBtn.classList.add("hidden");
  }
}

// Render upcoming state.playlist queue
function renderPlaylist() {
  const container = document.getElementById("playlist-container");
  container.innerHTML = "";
  
  // Update badges
  document.getElementById("song-count-badge").textContent = `${state.playlist.length} 首`;

  if (state.playlist.length <= 1) {
    // If only Now Playing exists or empty
    if (state.playlist.length === 0) {
      container.innerHTML = `
        <div class="text-center" style="padding: 40px; color: var(--text-muted);">
          <i class="fa-solid fa-guitar" style="font-size: 2.5rem; margin-bottom: 15px;"></i>
          <p>歌单空空如也，快来点歌展示你的歌喉吧！</p>
        </div>
      `;
      return;
    }
  }

  // Render index 1 to length (upcoming ones, since index 0 is Singing)
  const isUserAdmin = (state.currentUserId === state.currentHostUserId) || state.currentModeratorUserIds.includes(state.currentUserId);

  for (let i = 1; i < state.playlist.length; i++) {
    const song = state.playlist[i];
    const isSongOwner = song.requestedBy === state.currentUsername;
    const canDelete = isUserAdmin || isSongOwner;

    const row = document.createElement("div");
    row.className = "song-card";
    if (state.lastPinnedSongId === song.id) {
      row.classList.add("slide-in-top-anim");
      state.lastPinnedSongId = null;
      setTimeout(() => {
        if(row && row.classList) row.classList.remove("slide-in-top-anim");
      }, 1000);
    }
    
    row.innerHTML = `
      <div class="song-index-col">${i}</div>
      <div class="song-details-col song-single-row">
        <span class="song-title-text">${song.title}</span>
        <span class="song-divider">•</span>
        <span class="song-singer-text">${song.singer || '未知歌手'}</span>
        <span class="song-requester-row">
          <span class="song-requester-avatar">${renderAvatarHTML(song.requestedByAvatar)}</span>
          <span class="song-requester-name">${formatUsername(song.requestedBy)}</span>
          ${song.dedicatedBy ? `<span class="dedicate-tag"><i class="fa-solid fa-gift"></i> ${song.dedicatedBy} 指名</span>` : ''}
          ${song.link ? `<a class="song-accompaniment-link" href="${song.link}" target="_blank" title="伴奏链接"><i class="fa-solid fa-link"></i> 伴奏</a>` : ''}
        </span>
      </div>
      <div class="song-actions-col">
        <button type="button" class="action-icon-btn priority-btn" title="置顶这首歌 (移到最前)" data-id="${song.id}">
          <i class="fa-solid fa-angles-up"></i>
        </button>
        ${canDelete ? `
          <button type="button" class="action-icon-btn delete-btn" title="删除该歌曲" data-id="${song.id}">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        ` : ''}
      </div>
    `;

    // Priority bind
    row.querySelector(".priority-btn").addEventListener("click", () => {
      state.lastPinnedSongId = song.id;
      state.socket.emit("prioritize-song", { songId: song.id });
    });

    // Delete bind
    if (canDelete) {
      row.querySelector(".delete-btn").addEventListener("click", () => {
        state.socket.emit("delete-song", { songId: song.id });
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
  playSound("chime");
  
  // Show toast notification
  showToast("shuffle", `🎤 轮到你唱歌啦！当前播放歌曲：《${song.title}》`);
  
  // Also show a beautiful overlay reminder card for a few seconds
  const overlay = document.createElement("div");
  overlay.className = "singing-turn-overlay";
  overlay.innerHTML = `
    <div class="singing-turn-card animate-glow">
      <div class="singing-icon"><i class="fa-solid fa-microphone-lines"></i></div>
      <h2>轮到你上台啦！</h2>
      <p>正在播放你点的歌曲：</p>
      <div class="song-info">《${song.title}》 - ${song.singer || '未知歌手'}</div>
      <button type="button" class="btn btn-primary btn-block close-overlay-btn" style="margin-top: 20px; background: var(--color-primary); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s;">我已准备好</button>
    </div>
  `;
  document.body.appendChild(overlay);
  
  const closeBtn = overlay.querySelector(".close-overlay-btn");
  closeBtn.addEventListener("click", () => {
    overlay.classList.add("fade-out");
    setTimeout(() => overlay.remove(), 400);
  });
  
  // Auto dismiss after 6 seconds
  setTimeout(() => {
    if (overlay.parentNode) {
      overlay.classList.add("fade-out");
      setTimeout(() => overlay.remove(), 400);
    }
  }, 6000);
}

// Render history state.playlist
function renderHistory() {
  const container = document.getElementById("history-playlist-container");
  container.innerHTML = "";

  document.getElementById("history-count-badge").textContent = `${state.historyPlaylist.length} 首`;

  if (state.historyPlaylist.length === 0) {
    container.innerHTML = `
      <div class="text-center" style="padding: 40px; color: var(--text-muted);">
        <i class="fa-solid fa-microphone-slash" style="font-size: 2.5rem; margin-bottom: 15px;"></i>
        <p>暂无唱毕曲目历史记录。</p>
      </div>
    `;
    return;
  }

  // Show completed history in reverse order (newest sung first)
  for (let i = state.historyPlaylist.length - 1; i >= 0; i--) {
    const song = state.historyPlaylist[i];
    const item = document.createElement("div");
    item.className = "song-card";
    
    // Count total reactions
    const reactCount = song.reactions || { rose: 0, clap: 0, egg: 0, shoe: 0 };
    
    item.innerHTML = `
      <div class="song-index-col">${state.historyPlaylist.length - i}</div>
      <div class="song-details-col song-single-row">
        <span class="song-title-text" style="opacity: 0.6;">${song.title}</span>
        <span class="song-divider">•</span>
        <span class="song-singer-text">${song.singer || '未知歌手'}</span>
        <span class="song-requester-row">
          <span class="song-requester-avatar">${renderAvatarHTML(song.requestedByAvatar)}</span>
          <span class="song-requester-name">${formatUsername(song.requestedBy)}</span>
        </span>
        <span class="history-time" style="margin-left: auto; font-size: 0.78rem; opacity: 0.75;"><i class="fa-solid fa-circle-play"></i> 唱毕: ${song.completedAt ? new Date(song.completedAt).toLocaleTimeString() : '--'}</span>
        <div class="playing-reaction-summary" style="margin-top: 4px; width: 100%;">
          <span class="stat-reaction" style="font-size:0.7rem; padding: 2px 6px; border: none; background: transparent;"><span class="reaction-emoji">🌹</span> ${reactCount.rose || 0}</span>
          <span class="stat-reaction" style="font-size:0.7rem; padding: 2px 6px; border: none; background: transparent;"><span class="reaction-emoji">👏</span> ${reactCount.clap || 0}</span>
          <span class="stat-reaction" style="font-size:0.7rem; padding: 2px 6px; border: none; background: transparent;"><span class="reaction-emoji">🥚</span> ${reactCount.egg || 0}</span>
          <span class="stat-reaction" style="font-size:0.7rem; padding: 2px 6px; border: none; background: transparent;"><span class="reaction-emoji">👞</span> ${reactCount.shoe || 0}</span>
        </div>
      </div>
    `;
    container.appendChild(item);
  }
}

// Render user avatars in header stack & sidebar list
function renderMembers() {
  // 1. Stack inside header
  const stack = document.getElementById("users-stack");
  stack.innerHTML = "";
  
  // Render up to 5 overlapping avatars
  const limit = Math.min(state.roomUsers.length, 5);
  for (let i = 0; i < limit; i++) {
    const user = state.roomUsers[i];
    const av = document.createElement("div");
    av.className = "online-avatar";
    av.innerHTML = renderAvatarHTML(user.avatar || '🎤');
    av.title = user.username;
    stack.appendChild(av);
  }
  document.getElementById("online-count-txt").textContent = `${state.roomUsers.length} 人在线`;

  // 2. Members panel on the left side
  const container = document.getElementById("members-list-container");
  container.innerHTML = "";

  const currentIsHost = state.currentUserId === state.currentHostUserId;
  const currentIsMod = state.currentModeratorUserIds.includes(state.currentUserId);

  state.roomUsers.forEach(u => {
    const isHost = u.userId === state.currentHostUserId;
    const isMod = state.currentModeratorUserIds.includes(u.userId);
    
    let roleBadgeHtml = "";
    if (isHost) {
      roleBadgeHtml = `<span class="badge-host"><i class="fa-solid fa-crown"></i> 主持人</span>`;
    } else if (isMod) {
      roleBadgeHtml = `<span class="badge-mod"><i class="fa-solid fa-shield-halved"></i> 房管</span>`;
    }

    const row = document.createElement("div");
    row.className = "member-row";
    
    // Add admin buttons
    let actionButtonsHtml = "";
    
    if (u.userId !== state.currentUserId) {
      // 1. Host Actions
      if (currentIsHost) {
        actionButtonsHtml += `
          <button type="button" class="member-action-btn btn-action-mod" title="${isMod ? '取消房管' : '设为房管'}" data-userid="${u.userId}" data-ismod="${isMod}">
            <i class="fa-solid ${isMod ? 'fa-shield-slash' : 'fa-shield-halved'}"></i>
          </button>
          <button type="button" class="member-action-btn btn-action-transfer" title="移交主持人" data-userid="${u.userId}">
            <i class="fa-solid fa-crown"></i>
          </button>
        `;
      }
      
      // 2. Host & Moderator Kick Actions
      const currentCanKick = currentIsHost || (currentIsMod && !isHost && !isMod);
      if (currentCanKick) {
        actionButtonsHtml += `
          <button type="button" class="member-action-btn btn-action-kick" title="踢出房间" data-socketid="${u.socketId}">
            <i class="fa-solid fa-user-slash"></i> 踢
          </button>
        `;
      }
    }

    row.innerHTML = `
      <div class="member-info">
        <div class="member-avatar">${renderAvatarHTML(u.avatar)}</div>
        <div class="member-text">
          <div class="member-name">
            ${u.username} ${roleBadgeHtml}
          </div>
          <div class="member-id-label">ID: ${u.userId}</div>
        </div>
      </div>
      <div class="member-actions">
        ${actionButtonsHtml}
      </div>
    `;

    // Event Bindings
    if (u.userId !== state.currentUserId) {
      if (currentIsHost) {
        row.querySelector(".btn-action-mod").addEventListener("click", () => {
          state.socket.emit("promote-moderator", {
            targetUserId: u.userId
          });
        });

        row.querySelector(".btn-action-transfer").addEventListener("click", () => {
          if (confirm(`⚠️ 警告：您确定要将房主（主持人）权限完全移交给“${u.username}”吗？此操作将不可逆，您将被降为房管！`)) {
            state.socket.emit("transfer-host", { targetUserId: u.userId });
          }
        });
      }
      
      const currentCanKick = currentIsHost || (currentIsMod && !isHost && !isMod);
      if (currentCanKick) {
        row.querySelector(".btn-action-kick").addEventListener("click", () => {
          if (confirm(`确定要踢出用户“${u.username}”吗？`)) {
            state.socket.emit("kick-user", { targetSocketId: u.socketId });
          }
        });
      }
    }

    container.appendChild(row);
  });
}

// Update the enlarged Now Playing Panel
function updateNowPlaying() {
  const titleElem = document.getElementById("playing-title");
  const singerElem = document.getElementById("playing-singer");
  const userElem = document.getElementById("playing-user-badge");
  const linkBtn = document.getElementById("playing-link-btn");
  const updateReactionCounts = (reacts) => {
    const countMap = {
      "count-rose": reacts.rose || 0,
      "count-clap": reacts.clap || 0,
      "count-egg": reacts.egg || 0,
      "count-shoe": reacts.shoe || 0
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
    singerElem.textContent = currentSong.singer ? `${currentSong.singer}` : "未指定歌手";
    userElem.innerHTML = `<span style="display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; border-radius:50%; overflow:hidden; vertical-align:middle; margin-right:6px;">${renderAvatarHTML(currentSong.requestedByAvatar)}</span>${formatUsername(currentSong.requestedBy)}`;
    
    const dedicateBadge = document.getElementById("playing-dedicate-badge");
    if (dedicateBadge) {
      if (currentSong.dedicatedBy) {
        dedicateBadge.innerHTML = `<i class="fa-solid fa-gift"></i> ${currentSong.dedicatedBy} 指名`;
        dedicateBadge.classList.remove("hidden");
      } else {
        dedicateBadge.classList.add("hidden");
      }
    }

    // Accompaniment link setting
    if (currentSong.link) {
      linkBtn.href = currentSong.link;
      linkBtn.classList.remove("hidden");
    } else {
      linkBtn.classList.add("hidden");
    }

    // Reactions counter
    const reacts = currentSong.reactions || { rose: 0, clap: 0, egg: 0, shoe: 0 };
    updateReactionCounts(reacts);

    // Show visualizer bars and spinning CD animation
    document.getElementById("visualizer-bars").style.opacity = "1";
    const noteIcon = document.getElementById("playing-music-note");
    const avatarDisc = document.getElementById("playing-avatar-disc");
    if(noteIcon && avatarDisc) {
      // Look up current avatar of the singer from active room users list first, then fall back to requestedByAvatar
      let av = "";
      const singerUser = state.roomUsers.find(u => u.username === currentSong.requestedBy);
      if (singerUser && singerUser.avatar) {
        av = singerUser.avatar;
      } else {
        av = currentSong.requestedByAvatar || "🎤";
      }

      const isImage = av.startsWith("data:image") || av.startsWith("http://") || av.startsWith("https://");
      if (isImage) {
        noteIcon.classList.add("hidden");
        avatarDisc.src = av;
        avatarDisc.classList.remove("hidden");
      } else {
        avatarDisc.classList.add("hidden");
        noteIcon.classList.remove("hidden");
        noteIcon.innerHTML = av || "🎤";
      }
    }
  } else {
    // Empty state
    titleElem.textContent = "暂无演唱歌曲";
    singerElem.textContent = "点歌后即可在此开启演唱";
    userElem.textContent = "--";
    linkBtn.classList.add("hidden");

    const dedicateBadge = document.getElementById("playing-dedicate-badge");
    if (dedicateBadge) {
      dedicateBadge.classList.add("hidden");
    }

    updateReactionCounts({ rose: 0, clap: 0, egg: 0, shoe: 0 });

    document.getElementById("visualizer-bars").style.opacity = "0.2";
    const musicNote = document.querySelector(".playing-music-note-large i");
    if (musicNote) {
      musicNote.style.animationPlayState = "paused";
    }
  }
}

// Floating emoji animation triggered on reactions
function triggerReactionFloat(type) {
  const container = document.getElementById("floating-reaction-container");
  if (!container) return;

  const emoji = document.createElement("span");
  emoji.className = "floating-emoji";
  
  let emojiChar = "🌹";
  if (type === 'clap') emojiChar = "👏";
  else if (type === 'egg') emojiChar = "🥚";
  else if (type === 'shoe') emojiChar = "👞";

  emoji.textContent = emojiChar;

  // Random horizontal position, sizes, and drift paths
  const startX = Math.random() * 80 + 10; // 10% to 90%
  emoji.style.left = `${startX}%`;
  
  const randomDrift1 = (Math.random() * 100 - 50) + 'px';
  const randomDrift2 = (Math.random() * 150 - 75) + 'px';
  const randomDrift3 = (Math.random() * 200 - 100) + 'px';
  
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
function saveRoomToHistory(roomId) {
  if (!roomId) return;
  let rooms = [];
  try {
    rooms = JSON.parse(localStorage.getItem("shareq_history_rooms")) || [];
  } catch (e) {}

  // Filter out any existing occurrence of this room ID
  rooms = rooms.filter(r => {
    const rId = typeof r === 'string' ? r : r.roomId;
    return rId !== roomId;
  });

  // Push new room to the front
  rooms.unshift({ roomId: roomId, joinedAt: Date.now() });

  // Limit list to last 10 rooms
  rooms = rooms.slice(0, 10);

  localStorage.setItem("shareq_history_rooms", JSON.stringify(rooms));
}

// Render history room list in the home lobby view
function renderHistoryRooms() {
  const section = document.getElementById("history-rooms-section");
  const list = document.getElementById("history-rooms-list");
  if (!section || !list) return;

  let rooms = [];
  try {
    rooms = JSON.parse(localStorage.getItem("shareq_history_rooms")) || [];
  } catch (e) {}

  if (rooms.length === 0) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  list.innerHTML = "";

  rooms.forEach(room => {
    const roomId = typeof room === 'string' ? room : room.roomId;
    const joinedAt = typeof room === 'string' ? Date.now() : (room.joinedAt || Date.now());

    const item = document.createElement("div");
    item.className = "history-room-item";

    // Text info
    const textNode = document.createElement("div");
    textNode.style.display = "flex";
    textNode.style.flexDirection = "column";
    textNode.innerHTML = `
      <span class="room-number">房间号: ${roomId}</span>
      <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">上次进入: ${new Date(joinedAt).toLocaleDateString()}</span>
    `;

    const joinBtn = document.createElement("button");
    joinBtn.type = "button";
    joinBtn.className = "btn-text";
    joinBtn.style.color = "var(--color-primary)";
    joinBtn.style.fontSize = "0.85rem";
    joinBtn.style.fontWeight = "600";
    joinBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> 快捷进入`;

    // Make clicking the whole item or the button trigger the join
    const triggerJoin = (e) => {
      e.stopPropagation();
      document.getElementById("room-id-input").value = roomId;
      const joinTabBtn = document.querySelector('[data-tab="join"]');
      if (joinTabBtn) {
        joinTabBtn.click();
      }
      handleLoginJoin("join");
    };

    item.addEventListener("click", triggerJoin);
    joinBtn.addEventListener("click", triggerJoin);

    item.appendChild(textNode);
    item.appendChild(joinBtn);

    list.appendChild(item);
  });
}

// Update the dropdown list of users you can dedicate a song to
function updateDedicateSelect() {
  const select = document.getElementById("song-dedicate");
  if (!select) return;
  
  // Save current selection to restore it if possible
  const prevVal = select.value;
  
  // Clear but keep first option
  select.innerHTML = '<option value="">-- 自己唱 (默认) --</option>';
  
  state.roomUsers.forEach(u => {
    if (u.userId !== state.currentUserId) {
      const opt = document.createElement("option");
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
  if (!name) return "";
  if (name.length > 20) {
    return name.substring(0, 3) + "..." + name.substring(name.length - 3);
  }
  return name;
}
