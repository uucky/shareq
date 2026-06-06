// ShareQ - KTV Client App Logic

// Web Audio API Synthesizer for high fidelity offline KTV sound effects
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let isSoundMuted = localStorage.getItem("shareq_gift_muted") === "true";

function playSound(type) {
  if (isSoundMuted && type !== 'chime') {
    return;
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  const now = audioCtx.currentTime;
  
  if (type === 'rose') {
    // Elegant Sparkle/Chime cascade
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode1 = audioCtx.createGain();
    const gainNode2 = audioCtx.createGain();
    
    osc1.connect(gainNode1);
    gainNode1.connect(audioCtx.destination);
    osc2.connect(gainNode2);
    gainNode2.connect(audioCtx.destination);
    
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.35);
    gainNode1.gain.setValueAtTime(0.15, now);
    gainNode1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    osc2.frequency.setValueAtTime(1100, now + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(2200, now + 0.43);
    gainNode2.gain.setValueAtTime(0.12, now + 0.08);
    gainNode2.gain.exponentialRampToValueAtTime(0.001, now + 0.43);
    
    osc1.start(now);
    osc1.stop(now + 0.36);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.44);
    
  } else if (type === 'clap') {
    // Synthesized Handclap (Noise sweep bandpass filtered)
    const bufferSize = audioCtx.sampleRate * 0.12; // 120ms
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 3.0;
    
    const clapGain = audioCtx.createGain();
    clapGain.gain.setValueAtTime(0.3, now);
    clapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    
    noise.connect(filter);
    filter.connect(clapGain);
    clapGain.connect(audioCtx.destination);
    
    noise.start(now);
    noise.stop(now + 0.12);
    
  } else if (type === 'egg') {
    // Muffled wet impact (sawtooth frequency slide + lowpass)
    const osc = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(60, now + 0.2);
    
    filter.type = 'lowpass';
    filter.frequency.value = 250;
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.linearRampToValueAtTime(0.001, now + 0.2);
    
    osc.start(now);
    osc.stop(now + 0.2);
    
  } else if (type === 'shoe') {
    // Heavy hollow thud (triangle deep pitch sweep)
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);
    
    gainNode.connect(audioCtx.destination);
    osc.connect(gainNode);
    
    gainNode.gain.setValueAtTime(0.35, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    osc.start(now);
    osc.stop(now + 0.35);
  } else if (type === 'chime') {
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode1 = audioCtx.createGain();
    const gainNode2 = audioCtx.createGain();
    
    osc1.connect(gainNode1);
    gainNode1.connect(audioCtx.destination);
    osc2.connect(gainNode2);
    gainNode2.connect(audioCtx.destination);
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gainNode1.gain.setValueAtTime(0, now);
    gainNode1.gain.linearRampToValueAtTime(0.12, now + 0.05);
    gainNode1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.1);
    gainNode2.gain.setValueAtTime(0, now + 0.1);
    gainNode2.gain.linearRampToValueAtTime(0.12, now + 0.15);
    gainNode2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    
    osc1.start(now);
    osc1.stop(now + 0.45);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.65);
  }
}

// Preset Random Data
const randomNames = ["情歌王子", "麦霸本麦", "灵魂歌手", "寂寞的麦霸", "浴室歌神", "深情歌者", "高音之王", "走音大师", "假音大师", "摇滚狂人", "KTV小王子", "麦克风终结者", "电音之王", "情歌王", "说唱新星", "民谣诗人", "甜歌皇后", "摇滚大姐大", "金曲制造机", "原唱杀手"];
const emojis = [
  '🎤', '🎵', '🎶', '🎧', '🎸', '🎹', '🕺', '💃', '👑', '🌟', 
  '🍻', '🍿', '🔥', '✨', '👾', '🌈', '🐱', '🦊', '🐼', '🐨', 
  '🐯', '🐰', '🦁', '🦄', '🐶', '🐸', '🐵', '🐣', '🦖', '🐉', 
  '🍀', '🌸', '🍕', '🍟', '🍦', '🍩', '🥑', '🍔', '🍺', '🍷', 
  '🥂', '🍹', '🎈', '🎉', '🎁', '🎭', '🎪', '🎷', '🎺', '🎻', 
  '🥁', '📻', '📺', '📱', '🕶️', '💅', '💄', '💍', '💎', '❤️', 
  '💖', '💥', '🚀', '🛸', '⭐', '🌊', '⚡', '👻', '👽', '🤖'
];

// Helper: Render avatar as either image (if base64) or emoji
function renderAvatarHTML(avatarData, className = "") {
  const av = avatarData || '🎤';
  if (av.startsWith("data:image/") || av.startsWith("http://") || av.startsWith("https://")) {
    return `<img src="${av}" class="${className}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; display:block;" onerror="this.onerror=null; this.outerHTML='🎤';">`;
  }
  return `<span class="${className}" style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; font-size:inherit;">${av}</span>`;
}

// Helper: Compress and resize user uploaded avatar
function resizeAndSetAvatar(file, callback) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement("canvas");
      const size = 128;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      
      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2;
      const sy = (img.height - minSide) / 2;
      
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
      
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      callback(dataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
const hotSongs = [
  { title: "七里香", singer: "周杰伦" },
  { title: "晴天", singer: "周杰伦" },
  { title: "后来", singer: "刘若英" },
  { title: "十年", singer: "陈奕迅" },
  { title: "江南", singer: "林俊杰" },
  { title: "倒带", singer: "蔡依林" },
  { title: "泡沫", singer: "邓紫棋" },
  { title: "吻别", singer: "张学友" },
  { title: "消愁", singer: "毛不易" },
  { title: "小情歌", singer: "苏打绿" }
];

// App State
let socket;
let currentRoomId = "";
let currentUsername = "";
let currentAvatar = "🎤";
let currentUserId = "";

let playlist = [];
let historyPlaylist = [];
let roomUsers = [];
let currentHostUserId = "";
let currentModeratorUserIds = [];
const toastHistory = [];
let unreadToastsCount = 0;
let lastSingingSongId = "";

// Initialize Elements
document.addEventListener("DOMContentLoaded", () => {
  // Generate or Load Persistent User ID (6-digit numeric ID)
  currentUserId = localStorage.getItem("shareq_userid");
  if (!currentUserId) {
    currentUserId = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem("shareq_userid", currentUserId);
  }

  // Load username & avatar from localStorage
  currentUsername = localStorage.getItem("shareq_username") || "";
  currentAvatar = localStorage.getItem("shareq_avatar") || "🎤";

  // Pre-fill fields
  document.getElementById("setup-username").value = currentUsername;
  updateAvatarPreview("setup-avatar-preview", currentAvatar);

  // Render previously joined rooms on home lobby
  renderHistoryRooms();

  // Initialize Socket.io
  socket = io();

  // Socket Core Receivers
  socket.on("room-data", (data) => {
    currentRoomId = data.roomId;
    playlist = data.songs;
    historyPlaylist = data.alreadySung || [];
    roomUsers = data.users;
    currentHostUserId = data.hostUserId;
    currentModeratorUserIds = data.moderatorUserIds || [];

    // Save room to local storage history list
    saveRoomToHistory(currentRoomId);

    // Switch view
    document.getElementById("login-view").classList.add("hidden");
    document.getElementById("room-view").classList.remove("hidden");

    // Update displays
    document.getElementById("display-room-id").textContent = currentRoomId;
    updateWidgetUI();
    renderPlaylist();
    renderHistory();
    renderMembers();
    updateNowPlaying();
    checkSingingTurn();

    // Check URL queries and append room if not present
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("room") !== currentRoomId) {
      window.history.pushState({}, "", `?room=${currentRoomId}`);
    }
  });

  socket.on("playlist-updated", (updatedSongs) => {
    playlist = updatedSongs;
    renderPlaylist();
    updateNowPlaying();
    updateWidgetUI();
    checkSingingTurn();
    if (document.getElementById("tab-stats-btn") && document.getElementById("tab-stats-btn").classList.contains("active")) {
      renderStats();
    }
  });

  socket.on("history-updated", (updatedHistory) => {
    historyPlaylist = updatedHistory || [];
    renderHistory();
    if (document.getElementById("tab-stats-btn") && document.getElementById("tab-stats-btn").classList.contains("active")) {
      renderStats();
    }
  });

  socket.on("users-updated", (users) => {
    roomUsers = users;
    renderMembers();
  });

  socket.on("roles-updated", (data) => {
    currentHostUserId = data.hostUserId;
    currentModeratorUserIds = data.moderatorUserIds || [];
    renderMembers();
    updateWidgetUI();
  });

  socket.on("system-message", (msg) => {
    showToast(msg.type, msg.text);
  });

  socket.on("session-ended", () => {
    alert("📢 主持人或房管已结束并关闭了本次 KTV 歌会会话。");
    window.location.href = window.location.origin + window.location.pathname;
  });

  socket.on("join-failed", (data) => {
    alert(data.message);
  });

  socket.on("kicked", (data) => {
    if (data.reason === 'kicked_by_admin') {
      alert("您已被房主或管理员移出当前房间！");
    } else if (data.reason === 'session_takeover') {
      alert("您的歌手ID在另一个窗口重新登入，当前连接已断开！");
    }
    // Redirect back to home without queries
    window.location.href = window.location.origin + window.location.pathname;
  });

  socket.on("trigger-reaction-effect", (data) => {
    triggerReactionFloat(data.type);
    playSound(data.type);
  });

  // Render Login Emojis selector
  renderEmojiGrid("avatar-grid", (emoji) => {
    currentAvatar = emoji;
    localStorage.setItem("shareq_avatar", emoji);
    updateAvatarPreview("setup-avatar-preview", emoji);
  }, currentAvatar);

  renderEmojiGrid("modal-avatar-grid", (emoji) => {
    const preview = document.getElementById("modal-avatar-preview");
    preview.innerHTML = renderAvatarHTML(emoji);
    preview.dataset.selectedEmoji = emoji;
  }, currentAvatar);

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
  setupEventListeners();
});

// Helper: Setup Client Interaction DOM Listeners
function setupEventListeners() {
  // Random Name button inside Login
  document.getElementById("randomize-name-btn").addEventListener("click", () => {
    const idx = Math.floor(Math.random() * randomNames.length);
    const code = Math.floor(100 + Math.random() * 900); // add number tag
    const randomNick = randomNames[idx] + "#" + code;
    document.getElementById("setup-username").value = randomNick;
  });

  // Random Avatar button inside Login
  document.getElementById("randomize-avatar-btn").addEventListener("click", () => {
    const idx = Math.floor(Math.random() * emojis.length);
    currentAvatar = emojis[idx];
    localStorage.setItem("shareq_avatar", currentAvatar);
    updateAvatarPreview("setup-avatar-preview", currentAvatar);
  });

  // Join Room trigger
  document.getElementById("join-room-btn").addEventListener("click", () => {
    handleLoginJoin("join");
  });

  // Create Room trigger
  document.getElementById("create-room-btn").addEventListener("click", () => {
    handleLoginJoin("create");
  });

  // Leave Room trigger with confirm alert
  document.getElementById("leave-room-btn").addEventListener("click", () => {
    if (confirm("您确定要离开当前 KTV 点歌房返回首页吗？")) {
      window.location.href = window.location.origin + window.location.pathname;
    }
  });

  // Double click User Count Badge -> Hidden Egg
  document.getElementById("users-stack-trigger").addEventListener("dblclick", () => {
    openArchiveModal();
  });

  // Click logo -> Tooltip info
  const showLogoTip = () => {
    showToast("shuffle", "🎵 ShareQ 共享卡拉OK歌单系统 by uucky");
  };

  const lobbyLogo = document.getElementById("lobby-logo");
  if (lobbyLogo) {
    lobbyLogo.addEventListener("click", showLogoTip);
  }

  const brandLogo = document.getElementById("brand-logo-egg");
  if (brandLogo) {
    brandLogo.addEventListener("click", showLogoTip);
  }

  // Corner Easter Egg Button -> openArchiveModal
  const cornerEggBtn = document.getElementById("corner-egg-btn");
  if (cornerEggBtn) {
    cornerEggBtn.addEventListener("click", () => {
      openArchiveModal();
    });
  }

  // Custom Avatar Upload for Lobby Setup
  const setupFileInput = document.getElementById("setup-avatar-file");
  const setupUploadBtn = document.getElementById("setup-upload-avatar-btn");
  if (setupUploadBtn && setupFileInput) {
    setupUploadBtn.addEventListener("click", () => setupFileInput.click());
    setupFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        resizeAndSetAvatar(file, (dataUrl) => {
          currentAvatar = dataUrl;
          localStorage.setItem("shareq_avatar", currentAvatar);
          updateAvatarPreview("setup-avatar-preview", currentAvatar);
        });
      }
    });
  }

  // Custom Avatar Upload for Edit Profile Modal
  const modalFileInput = document.getElementById("modal-avatar-file");
  const modalUploadBtn = document.getElementById("modal-upload-avatar-btn");
  if (modalUploadBtn && modalFileInput) {
    modalUploadBtn.addEventListener("click", () => modalFileInput.click());
    modalFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        resizeAndSetAvatar(file, (dataUrl) => {
          const preview = document.getElementById("modal-avatar-preview");
          preview.innerHTML = renderAvatarHTML(dataUrl);
          preview.dataset.selectedEmoji = dataUrl;
        });
      }
    });
  }

  // Copy Room Link Badge click
  document.getElementById("room-badge-btn").addEventListener("click", () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast("shuffle", "📋 分享链接已复制到剪贴板！可以直接发送给好友！");
    }).catch(err => {
      console.error("Copy failed", err);
      // Fallback alert
      alert(`当前分享链接：${shareUrl}`);
    });
  });

  // Request Form submit
  document.getElementById("song-request-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const titleVal = document.getElementById("song-title").value.trim();
    const singerVal = document.getElementById("song-singer").value.trim();
    const linkVal = document.getElementById("song-link").value.trim();

    if (!titleVal) return;

    socket.emit("add-song", {
      title: titleVal,
      singer: singerVal,
      link: linkVal
    });

    // Reset inputs
    document.getElementById("song-title").value = "";
    document.getElementById("song-singer").value = "";
    document.getElementById("song-link").value = "";
  });

  // Profile modal toggle
  const widget = document.getElementById("user-profile-widget");
  const modal = document.getElementById("profile-modal");
  
  widget.addEventListener("click", () => {
    document.getElementById("modal-username").value = currentUsername;
    const preview = document.getElementById("modal-avatar-preview");
    preview.innerHTML = renderAvatarHTML(currentAvatar);
    preview.dataset.selectedEmoji = currentAvatar;
    
    // Select the correct one in modal grid
    const options = document.querySelectorAll("#modal-avatar-grid .avatar-option");
    options.forEach(opt => {
      if (opt.textContent === currentAvatar) {
        opt.classList.add("selected");
      } else {
        opt.classList.remove("selected");
      }
    });

    modal.classList.remove("hidden");
  });

  // Modal Cancel
  document.getElementById("close-modal-btn").addEventListener("click", () => modal.classList.add("hidden"));
  document.getElementById("modal-cancel-btn").addEventListener("click", () => modal.classList.add("hidden"));

  // Modal Randomize
  document.getElementById("modal-random-avatar-btn").addEventListener("click", () => {
    const idx = Math.floor(Math.random() * emojis.length);
    const preview = document.getElementById("modal-avatar-preview");
    const targetEmoji = emojis[idx];
    preview.innerHTML = renderAvatarHTML(targetEmoji);
    preview.dataset.selectedEmoji = targetEmoji;
    
    // Highlight
    const options = document.querySelectorAll("#modal-avatar-grid .avatar-option");
    options.forEach(opt => {
      if (opt.textContent === targetEmoji) {
        opt.classList.add("selected");
      } else {
        opt.classList.remove("selected");
      }
    });
  });

  // Modal Save Changes
  document.getElementById("modal-save-btn").addEventListener("click", () => {
    const newName = document.getElementById("modal-username").value.trim();
    const newAvatar = document.getElementById("modal-avatar-preview").dataset.selectedEmoji || currentAvatar;

    if (!newName) {
      alert("昵称不能为空！");
      return;
    }

    currentUsername = newName;
    currentAvatar = newAvatar;

    localStorage.setItem("shareq_username", currentUsername);
    localStorage.setItem("shareq_avatar", currentAvatar);

    socket.emit("update-profile", {
      username: currentUsername,
      avatar: currentAvatar
    });

    updateWidgetUI();
    modal.classList.add("hidden");
  });

  // Playlist tabs toggle
  const upcomingTabBtn = document.getElementById("tab-upcoming-btn");
  const historyTabBtn = document.getElementById("tab-history-btn");
  const statsTabBtn = document.getElementById("tab-stats-btn");
  const upcomingCont = document.getElementById("playlist-container");
  const historyCont = document.getElementById("history-playlist-container");
  const statsCont = document.getElementById("stats-playlist-container");

  upcomingTabBtn.addEventListener("click", () => {
    upcomingTabBtn.classList.add("active");
    historyTabBtn.classList.remove("active");
    statsTabBtn.classList.remove("active");
    upcomingCont.classList.remove("hidden");
    historyCont.classList.add("hidden");
    statsCont.classList.add("hidden");
  });

  historyTabBtn.addEventListener("click", () => {
    upcomingTabBtn.classList.remove("active");
    historyTabBtn.classList.add("active");
    statsTabBtn.classList.remove("active");
    upcomingCont.classList.add("hidden");
    historyCont.classList.remove("hidden");
    statsCont.classList.add("hidden");
  });

  statsTabBtn.addEventListener("click", () => {
    upcomingTabBtn.classList.remove("active");
    historyTabBtn.classList.remove("active");
    statsTabBtn.classList.add("active");
    upcomingCont.classList.add("hidden");
    historyCont.classList.add("hidden");
    statsCont.classList.remove("hidden");
    renderStats();
  });

  // Play controls
  document.getElementById("shuffle-btn").addEventListener("click", () => {
    socket.emit("shuffle-playlist");
  });

  document.getElementById("next-btn").addEventListener("click", () => {
    socket.emit("next-song");
  });

  document.getElementById("prev-btn").addEventListener("click", () => {
    socket.emit("prev-song");
  });

  document.getElementById("undo-btn").addEventListener("click", () => {
    socket.emit("undo-playlist");
  });

  document.getElementById("redo-btn").addEventListener("click", () => {
    socket.emit("redo-playlist");
  });

  // Admin three-dots dropdown menu actions
  const adminMenuBtn = document.getElementById("admin-menu-btn");
  const adminDropdownMenu = document.getElementById("admin-dropdown-menu");
  
  adminMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    adminDropdownMenu.classList.toggle("hidden");
  });

  // Dismiss dropdown menu when clicking anywhere else
  document.addEventListener("click", (e) => {
    if (!adminDropdownMenu.classList.contains("hidden")) {
      const isClickInside = adminMenuBtn.contains(e.target) || adminDropdownMenu.contains(e.target);
      if (!isClickInside) {
        adminDropdownMenu.classList.add("hidden");
      }
    }
  });

  // End Session Confirmation (3 times)
  const endSessionBtn = document.getElementById("end-session-btn");
  if (endSessionBtn) {
    endSessionBtn.addEventListener("click", () => {
      if (confirm("⚠️ 警告：您确定要结束本次歌会吗？这将会清空所有歌单、切歌历史并重置房间状态！")) {
        if (confirm("⚠️⚠️ 请再次确认：此操作将清空整个房间的歌单，所有排队歌曲以及历史记录均会丢失！确定继续吗？")) {
          if (confirm("🚨🚨🚨 最终安全确认：您真的要立即结束本次 KTV 歌会吗？")) {
            socket.emit("end-session");
          }
        }
      }
    });
  }

  // Theme Mode Toggle (Light / Dark)
  const themeToggleBtn = document.getElementById("dropdown-theme-toggle-btn");
  const savedTheme = localStorage.getItem("shareq_theme") || "dark";
  
  const updateThemeButtonUI = (isLight) => {
    if (!themeToggleBtn) return;
    if (isLight) {
      themeToggleBtn.innerHTML = `<i class="fa-solid fa-moon"></i> 切换为暗色主题`;
    } else {
      themeToggleBtn.innerHTML = `<i class="fa-solid fa-sun"></i> 切换为亮色主题`;
    }
  };

  if (savedTheme === "light") {
    document.body.classList.add("light-theme");
    updateThemeButtonUI(true);
  } else {
    document.body.classList.remove("light-theme");
    updateThemeButtonUI(false);
  }

  themeToggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isLightNow = document.body.classList.toggle("light-theme");
    localStorage.setItem("shareq_theme", isLightNow ? "light" : "dark");
    updateThemeButtonUI(isLightNow);
    adminDropdownMenu.classList.add("hidden");
  });

  // Dropdown Stats Button
  const dropdownStatsBtn = document.getElementById("dropdown-stats-btn");
  if (dropdownStatsBtn) {
    dropdownStatsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const tabStatsBtn = document.getElementById("tab-stats-btn");
      if (tabStatsBtn) {
        tabStatsBtn.click();
      }
      adminDropdownMenu.classList.add("hidden");
    });
  }

  // Dropdown About Button
  const dropdownAboutBtn = document.getElementById("dropdown-about-btn");
  if (dropdownAboutBtn) {
    dropdownAboutBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.getElementById("about-modal").classList.remove("hidden");
      adminDropdownMenu.classList.add("hidden");
    });
  }

  // About modal close buttons
  document.getElementById("close-about-modal-btn").addEventListener("click", () => {
    document.getElementById("about-modal").classList.add("hidden");
  });
  document.getElementById("close-about-ok-btn").addEventListener("click", () => {
    document.getElementById("about-modal").classList.add("hidden");
  });

  // Toast History Panel Events
  const toastTriggerBtn = document.getElementById("toast-history-trigger-btn");
  const toastPanel = document.getElementById("toast-history-panel");
  const closeToastHistoryBtn = document.getElementById("close-toast-history-btn");

  toastTriggerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = toastPanel.classList.toggle("hidden");
    if (!isHidden) {
      unreadToastsCount = 0;
      updateToastHistoryUI();
    }
  });

  closeToastHistoryBtn.addEventListener("click", () => {
    toastPanel.classList.add("hidden");
  });

  // Toast filter tabs
  document.querySelectorAll(".toast-filter-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".toast-filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      updateToastHistoryUI();
    });
  });

  // Dismiss toast history panel when clicking anywhere else
  document.addEventListener("click", (e) => {
    if (!toastPanel.classList.contains("hidden")) {
      const isClickInside = toastTriggerBtn.contains(e.target) || toastPanel.contains(e.target);
      if (!isClickInside) {
        toastPanel.classList.add("hidden");
      }
    }
  });

  // Reactions Gift Panel
  const giftButtons = document.querySelectorAll(".btn-reaction-gift");
  giftButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      if (playlist.length === 0) {
        showToast("delete", "❌ 当前没有正在演唱的歌曲，无法发送互动！");
        return;
      }
      const reactionType = btn.dataset.reaction;
      socket.emit("send-reaction", { type: reactionType });
    });
  });

  // Reactions Gift Mute Button
  const muteBtn = document.getElementById("btn-reaction-mute");
  if (muteBtn) {
    if (isSoundMuted) {
      muteBtn.classList.add("muted");
      muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    }
    muteBtn.addEventListener("click", () => {
      isSoundMuted = !isSoundMuted;
      localStorage.setItem("shareq_gift_muted", isSoundMuted);
      if (isSoundMuted) {
        muteBtn.classList.add("muted");
        muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
        showToast("info", "🔇 互动礼物音效已静音");
      } else {
        muteBtn.classList.remove("muted");
        muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        showToast("info", "🔊 互动礼物音效已开启");
        playSound('rose');
      }
    });
  }

  // Easter Egg modal cancel/close
  document.getElementById("close-archive-modal-btn").addEventListener("click", closeArchiveModal);
  document.getElementById("archive-cancel-btn").addEventListener("click", closeArchiveModal);
  
  // Easter Egg download run
  document.getElementById("archive-download-btn").addEventListener("click", () => {
    downloadSessionArchive();
    closeArchiveModal();
  });
}

// Logic: Handle User Login Join / Creation Action
function handleLoginJoin(mode) {
  const usernameInput = document.getElementById("setup-username").value.trim();
  if (!usernameInput) {
    alert("请在进入前设定歌手昵称！");
    return;
  }

  currentUsername = usernameInput;
  localStorage.setItem("shareq_username", currentUsername);
  localStorage.setItem("shareq_avatar", currentAvatar);

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
  socket.emit("join-room", {
    roomId: roomId,
    username: currentUsername,
    avatar: currentAvatar,
    userId: currentUserId
  });
}

// Helpers: Render grids
function renderEmojiGrid(containerId, onSelectCallback, selectedEmoji) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  grid.innerHTML = "";
  
  emojis.forEach(emoji => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "avatar-option";
    if (selectedEmoji && emoji === selectedEmoji) {
      cell.classList.add("selected");
    }
    cell.textContent = emoji;
    cell.addEventListener("click", () => {
      const parent = cell.parentElement;
      parent.querySelectorAll(".avatar-option").forEach(opt => opt.classList.remove("selected"));
      cell.classList.add("selected");
      onSelectCallback(emoji);
    });
    grid.appendChild(cell);
  });
}

function updateAvatarPreview(elemId, emoji) {
  document.getElementById(elemId).innerHTML = renderAvatarHTML(emoji);
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
  document.getElementById("user-widget-name").textContent = currentUsername;
  document.getElementById("user-widget-avatar").innerHTML = renderAvatarHTML(currentAvatar);
  document.getElementById("user-widget-id").textContent = `ID: ${currentUserId}`;

  // Admin visibility setup
  const isAdmin = (currentUserId === currentHostUserId) || currentModeratorUserIds.includes(currentUserId);
  
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

  // 2. The next-btn in playlist card header (切歌/下一首)
  // Visible to: admins, AND the person whose song is currently playing
  const nextBtn = document.getElementById("next-btn");
  const currentlyPlayingSong = playlist.length > 0 ? playlist[0] : null;
  const isCurrentSongMine = currentlyPlayingSong && currentlyPlayingSong.requestedBy === currentUsername;
  if (isAdmin || isCurrentSongMine) {
    nextBtn.classList.remove("hidden");
  } else {
    nextBtn.classList.add("hidden");
  }
}

// Render upcoming playlist queue
function renderPlaylist() {
  const container = document.getElementById("playlist-container");
  container.innerHTML = "";
  
  // Update badges
  document.getElementById("song-count-badge").textContent = `${playlist.length} 首`;

  if (playlist.length <= 1) {
    // If only Now Playing exists or empty
    if (playlist.length === 0) {
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
  const isUserAdmin = (currentUserId === currentHostUserId) || currentModeratorUserIds.includes(currentUserId);

  for (let i = 1; i < playlist.length; i++) {
    const song = playlist[i];
    const isSongOwner = song.requestedBy === currentUsername;
    const canDelete = isUserAdmin || isSongOwner;

    const row = document.createElement("div");
    row.className = `song-card ${song.prioritized ? 'pinned-song' : ''}`;
    
    row.innerHTML = `
      <div class="song-index-col">${i}</div>
      <div class="song-details-col">
        <div class="song-title-row">
          <span class="song-title-text">${song.title}</span>
        </div>
        <div class="song-singer-text">${song.singer || '未知歌手'}</div>
        <div class="song-requester-row">
          <span class="song-requester-avatar">${renderAvatarHTML(song.requestedByAvatar)}</span>
          <span class="song-requester-name">${song.requestedBy}</span>
          ${song.link ? `<a class="song-accompaniment-link" href="${song.link}" target="_blank" title="伴奏链接"><i class="fa-solid fa-link"></i> 伴奏</a>` : ''}
        </div>
      </div>
      <div class="song-actions-col">
        <button type="button" class="action-icon-btn priority-btn" ${song.prioritized ? 'disabled title="已优先"' : 'title="设为优先 (移到最前)"'} data-id="${song.id}">
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
    if (!song.prioritized) {
      row.querySelector(".priority-btn").addEventListener("click", () => {
        socket.emit("prioritize-song", { songId: song.id });
      });
    }

    // Delete bind
    if (canDelete) {
      row.querySelector(".delete-btn").addEventListener("click", () => {
        socket.emit("delete-song", { songId: song.id });
      });
    }

    container.appendChild(row);
  }
}

// Check if the current user is next up or currently singing, and show reminder with sound
function checkSingingTurn() {
  if (playlist.length === 0) return;
  const currentSong = playlist[0];
  
  // If the now playing song is requested by current user, and we haven't reminded them yet
  if (currentSong.requestedBy === currentUsername) {
    if (lastSingingSongId !== currentSong.id) {
      lastSingingSongId = currentSong.id;
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

// Render history playlist
function renderHistory() {
  const container = document.getElementById("history-playlist-container");
  container.innerHTML = "";

  document.getElementById("history-count-badge").textContent = `${historyPlaylist.length} 首`;

  if (historyPlaylist.length === 0) {
    container.innerHTML = `
      <div class="text-center" style="padding: 40px; color: var(--text-muted);">
        <i class="fa-solid fa-microphone-slash" style="font-size: 2.5rem; margin-bottom: 15px;"></i>
        <p>暂无唱毕曲目历史记录。</p>
      </div>
    `;
    return;
  }

  // Show completed history in reverse order (newest sung first)
  for (let i = historyPlaylist.length - 1; i >= 0; i--) {
    const song = historyPlaylist[i];
    const item = document.createElement("div");
    item.className = "song-card";
    
    // Count total reactions
    const reactCount = song.reactions || { rose: 0, clap: 0, egg: 0, shoe: 0 };
    
    item.innerHTML = `
      <div class="song-index-col"><i class="fa-solid fa-circle-check" style="color: var(--color-secondary);"></i></div>
      <div class="song-details-col">
        <div class="song-title-row">
          <span class="song-title-text" style="text-decoration: line-through; opacity: 0.6;">${song.title}</span>
        </div>
        <div class="song-singer-text">${song.singer || '未知歌手'}</div>
        <div class="song-requester-row">
          <span class="song-requester-avatar">${renderAvatarHTML(song.requestedByAvatar)}</span>
          <span class="song-requester-name">${song.requestedBy}</span>
          <span class="history-time" style="margin-left: auto;"><i class="fa-solid fa-circle-play"></i> 唱毕: ${song.completedAt ? new Date(song.completedAt).toLocaleTimeString() : '--'}</span>
        </div>
        <div class="playing-reaction-summary" style="margin-top: 8px;">
          <span class="stat-reaction" style="font-size:0.7rem; padding: 2px 6px;"><span class="reaction-emoji">🌹</span> ${reactCount.rose || 0}</span>
          <span class="stat-reaction" style="font-size:0.7rem; padding: 2px 6px;"><span class="reaction-emoji">👏</span> ${reactCount.clap || 0}</span>
          <span class="stat-reaction" style="font-size:0.7rem; padding: 2px 6px;"><span class="reaction-emoji">🥚</span> ${reactCount.egg || 0}</span>
          <span class="stat-reaction" style="font-size:0.7rem; padding: 2px 6px;"><span class="reaction-emoji">👞</span> ${reactCount.shoe || 0}</span>
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
  const limit = Math.min(roomUsers.length, 5);
  for (let i = 0; i < limit; i++) {
    const user = roomUsers[i];
    const av = document.createElement("div");
    av.className = "online-avatar";
    av.innerHTML = renderAvatarHTML(user.avatar || '🎤');
    av.title = user.username;
    stack.appendChild(av);
  }
  document.getElementById("online-count-txt").textContent = `${roomUsers.length} 人在线`;

  // 2. Members panel on the left side
  const container = document.getElementById("members-list-container");
  container.innerHTML = "";

  const currentIsHost = currentUserId === currentHostUserId;
  const currentIsMod = currentModeratorUserIds.includes(currentUserId);

  roomUsers.forEach(u => {
    const isHost = u.userId === currentHostUserId;
    const isMod = currentModeratorUserIds.includes(u.userId);
    
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
    
    if (u.userId !== currentUserId) {
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
    if (u.userId !== currentUserId) {
      if (currentIsHost) {
        row.querySelector(".btn-action-mod").addEventListener("click", () => {
          socket.emit("promote-moderator", {
            targetUserId: u.userId
          });
        });

        row.querySelector(".btn-action-transfer").addEventListener("click", () => {
          if (confirm(`⚠️ 警告：您确定要将房主（主持人）权限完全移交给“${u.username}”吗？此操作将不可逆，您将被降为房管！`)) {
            socket.emit("transfer-host", { targetUserId: u.userId });
          }
        });
      }
      
      const currentCanKick = currentIsHost || (currentIsMod && !isHost && !isMod);
      if (currentCanKick) {
        row.querySelector(".btn-action-kick").addEventListener("click", () => {
          if (confirm(`确定要踢出用户“${u.username}”吗？`)) {
            socket.emit("kick-user", { targetSocketId: u.socketId });
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
  
  if (playlist.length > 0) {
    const currentSong = playlist[0];
    titleElem.textContent = currentSong.title;
    singerElem.textContent = currentSong.singer ? `${currentSong.singer}` : "未指定歌手";
    userElem.innerHTML = `<span style="display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; border-radius:50%; overflow:hidden; vertical-align:middle; margin-right:6px;">${renderAvatarHTML(currentSong.requestedByAvatar)}</span>${currentSong.requestedBy}`;
    
    // Accompaniment link setting
    if (currentSong.link) {
      linkBtn.href = currentSong.link;
      linkBtn.classList.remove("hidden");
    } else {
      linkBtn.classList.add("hidden");
    }

    // Reactions counter
    const reacts = currentSong.reactions || { rose: 0, clap: 0, egg: 0, shoe: 0 };
    document.getElementById("count-rose").textContent = reacts.rose || 0;
    document.getElementById("count-clap").textContent = reacts.clap || 0;
    document.getElementById("count-egg").textContent = reacts.egg || 0;
    document.getElementById("count-shoe").textContent = reacts.shoe || 0;

    // Show visualizer bars and spinning CD animation
    document.getElementById("visualizer-bars").style.opacity = "1";
    document.querySelector(".playing-music-note-large i").style.animationPlayState = "running";
  } else {
    // Empty state
    titleElem.textContent = "暂无演唱歌曲";
    singerElem.textContent = "点歌后即可在此开启演唱";
    userElem.textContent = "--";
    linkBtn.classList.add("hidden");

    document.getElementById("count-rose").textContent = 0;
    document.getElementById("count-clap").textContent = 0;
    document.getElementById("count-egg").textContent = 0;
    document.getElementById("count-shoe").textContent = 0;

    document.getElementById("visualizer-bars").style.opacity = "0.2";
    document.querySelector(".playing-music-note-large i").style.animationPlayState = "paused";
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

// System toasts popups
function showToast(type, text) {
  // Save to toast history
  toastHistory.push({ type, text, time: Date.now() });

  const toastPanel = document.getElementById("toast-history-panel");
  if (toastPanel && toastPanel.classList.contains("hidden")) {
    unreadToastsCount++;
  } else {
    unreadToastsCount = 0;
  }
  updateToastHistoryUI();

  const container = document.getElementById("notification-center");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  let icon = "fa-circle-info";
  if (type === 'add') icon = "fa-circle-plus";
  else if (type === 'pin') icon = "fa-angles-up";
  else if (type === 'delete') icon = "fa-trash-can";
  else if (type === 'shuffle') icon = "fa-shuffle";
  else if (type === 'next') icon = "fa-forward-step";

  toast.innerHTML = `
    <span class="toast-icon"><i class="fa-solid ${icon}"></i></span>
    <span class="toast-text">${text}</span>
    <button type="button" class="toast-close">&times;</button>
  `;

  // Bind close click
  toast.querySelector(".toast-close").addEventListener("click", () => {
    toast.remove();
  });

  container.appendChild(toast);

  // Auto hide after 4.5s
  setTimeout(() => {
    toast.style.animation = "fadeIn 0.3s reverse forwards";
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// Modal Toggle for Archive report
function openArchiveModal() {
  document.getElementById("archive-modal").classList.remove("hidden");
}

function closeArchiveModal() {
  document.getElementById("archive-modal").classList.add("hidden");
}

// EXPORT EGG: Generate high fidelity interactive HTML file with live column sorting
function downloadSessionArchive() {
  const allSongs = [];
  const exportTimestamp = Date.now();
  
  // Render completed history
  historyPlaylist.forEach((s, idx) => {
    allSongs.push({
      order: idx + 1,
      status: '已唱 (Sung)',
      title: s.title,
      singer: s.singer || '无',
      link: s.link || '',
      requestedBy: s.requestedBy,
      rose: s.reactions?.rose || 0,
      clap: s.reactions?.clap || 0,
      egg: s.reactions?.egg || 0,
      shoe: s.reactions?.shoe || 0,
      utc: s.completedAt || 0
    });
  });
  
  // Render current queue
  playlist.forEach((s, idx) => {
    allSongs.push({
      order: historyPlaylist.length + idx + 1,
      status: idx === 0 ? '正在演唱 (Now Playing)' : '排队中 (Queued)',
      title: s.title,
      singer: s.singer || '无',
      link: s.link || '',
      requestedBy: s.requestedBy,
      rose: s.reactions?.rose || 0,
      clap: s.reactions?.clap || 0,
      egg: s.reactions?.egg || 0,
      shoe: s.reactions?.shoe || 0,
      utc: idx === 0 ? -1 : 0 // -1 represents Now Playing, 0 represents Queued
    });
  });

  // Calculate Top Singers (by completed history songs)
  const singerCounts = {};
  historyPlaylist.forEach(s => {
    const name = s.requestedBy;
    singerCounts[name] = (singerCounts[name] || 0) + 1;
  });
  const topSingers = Object.entries(singerCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  let topSingersHtml = "";
  if (topSingers.length === 0) {
    topSingersHtml = "<li style='color: #676c8c; list-style: none; margin-left: -20px;'>暂无已唱歌曲</li>";
  } else {
    const medals = ["🥇", "🥈", "🥉", "🔹", "🔹"];
    topSingers.forEach((item, idx) => {
      topSingersHtml += `<li style='margin-bottom: 6px;'>${medals[idx] || "🔹"} <strong>${item.name}</strong> - 演唱了 ${item.count} 首</li>`;
    });
  }

  // Calculate Top Requested Artists
  const artistCounts = {};
  const addArtist = (s) => {
    if (!s.singer) return;
    const art = s.singer.trim();
    if (art && art !== '未知歌手' && art !== '无') {
      artistCounts[art] = (artistCounts[art] || 0) + 1;
    }
  };
  playlist.forEach(addArtist);
  historyPlaylist.forEach(addArtist);
  const topArtists = Object.entries(artistCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  let topArtistsHtml = "";
  if (topArtists.length === 0) {
    topArtistsHtml = "<li style='color: #676c8c; list-style: none; margin-left: -20px;'>暂无歌手点播数据</li>";
  } else {
    topArtists.forEach((item, idx) => {
      topArtistsHtml += `<li style='margin-bottom: 6px;'>🔥 <strong>${item.name}</strong> - 被点播 ${item.count} 次</li>`;
    });
  }

  // Calculate Top Liked Songs
  const songLikes = [];
  const addSongLikes = (s) => {
    const reacts = s.reactions || { rose: 0, clap: 0, egg: 0, shoe: 0 };
    const score = (reacts.rose || 0) + (reacts.clap || 0);
    songLikes.push({
      title: s.title,
      singer: s.singer || '未知',
      score: score
    });
  };
  if (playlist.length > 0) {
    addSongLikes(playlist[0]);
  }
  historyPlaylist.forEach(addSongLikes);
  
  const topSongs = songLikes
    .sort((a, b) => b.score - a.score)
    .filter(s => s.score > 0)
    .slice(0, 5);

  let topSongsHtml = "";
  if (topSongs.length === 0) {
    topSongsHtml = "<li style='color: #676c8c; list-style: none; margin-left: -20px;'>暂无点赞互动金曲</li>";
  } else {
    topSongs.forEach((item, idx) => {
      topSongsHtml += `<li style='margin-bottom: 6px;'>👍 <strong>${item.title}</strong> (${item.singer}) - 获赞 ${item.score} 次</li>`;
    });
  }

  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>KTV 演唱会话歌单存档 - ShareQ</title>
  <style>
    body {
      background: #080512;
      color: #e2e8f0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 1050px;
      margin: 0 auto;
      background: rgba(24, 18, 48, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 15px 40px rgba(0,0,0,0.65);
      backdrop-filter: blur(10px);
    }
    h1 {
      font-size: 2.4rem;
      margin-top: 0;
      background: linear-gradient(135deg, #00f0ff, #ff2a85);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      text-align: center;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 5px;
    }
    .subtitle {
      text-align: center;
      color: #9aa0c4;
      margin-bottom: 25px;
      font-size: 0.95rem;
    }
    .config-panel {
      background: rgba(139, 92, 246, 0.08);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 15px;
    }
    .timezone-picker {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .timezone-picker label {
      font-size: 0.88rem;
      font-weight: 600;
      color: #c084fc;
    }
    .timezone-picker select {
      background: #0f0a22;
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 6px 12px;
      border-radius: 8px;
      outline: none;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .timezone-picker select:focus {
      border-color: #00f0ff;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th {
      background: #8b5cf6;
      color: white;
      cursor: pointer;
      padding: 14px 12px;
      text-align: left;
      user-select: none;
      font-weight: 700;
      border-bottom: 2px solid rgba(255, 255, 255, 0.1);
      transition: background 0.2s;
    }
    th:hover {
      background: #ff2a85;
    }
    td {
      padding: 14px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 0.95rem;
    }
    tr:hover {
      background: rgba(255, 255, 255, 0.03);
    }
    .badge {
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .badge-sung { background: rgba(0, 240, 255, 0.15); color: #00f0ff; border: 1px solid rgba(0, 240, 255, 0.3); }
    .badge-singing { background: rgba(255, 42, 133, 0.15); color: #ff2a85; border: 1px solid rgba(255, 42, 133, 0.3); }
    .badge-queued { background: rgba(255, 255, 255, 0.05); color: #9aa0c4; border: 1px solid rgba(255, 255, 255, 0.1); }
    .link-btn {
      color: #00f0ff;
      text-decoration: none;
      font-weight: 600;
    }
    .link-btn:hover {
      text-decoration: underline;
    }
    .time-cell {
      font-family: monospace;
      font-size: 0.88rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎤 ShareQ KTV 歌单记录报告</h1>
    <div class="subtitle">
      存档时间：<span id="exportTime" data-utc="${exportTimestamp}">${new Date(exportTimestamp).toISOString()}</span> | 房间号：${currentRoomId}
    </div>

    <!-- 动态数据统计看板 -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 25px;">
      <div style="background: rgba(139, 92, 246, 0.05); border: 1px solid rgba(139, 92, 246, 0.15); border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
        <h3 style="margin-top:0; color: #c084fc; font-size: 1.1rem; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 8px; margin-bottom: 12px;">🎤 歌会麦霸排行</h3>
        <ul style="padding-left: 20px; margin: 0; line-height: 1.6; font-size: 0.92rem; color: #cbd5e1;">
          ${topSingersHtml}
        </ul>
      </div>
      <div style="background: rgba(255, 42, 133, 0.05); border: 1px solid rgba(255, 42, 133, 0.15); border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
        <h3 style="margin-top:0; color: #ff2a85; font-size: 1.1rem; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 8px; margin-bottom: 12px;">🌟 热门点播歌手</h3>
        <ul style="padding-left: 20px; margin: 0; line-height: 1.6; font-size: 0.92rem; color: #cbd5e1;">
          ${topArtistsHtml}
        </ul>
      </div>
      <div style="background: rgba(0, 240, 255, 0.05); border: 1px solid rgba(0, 240, 255, 0.15); border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
        <h3 style="margin-top:0; color: #00f0ff; font-size: 1.1rem; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 8px; margin-bottom: 12px;">❤️ 人气金曲</h3>
        <ul style="padding-left: 20px; margin: 0; line-height: 1.6; font-size: 0.92rem; color: #cbd5e1;">
          ${topSongsHtml}
        </ul>
      </div>
    </div>
    
    <div class="config-panel">
      <div style="font-size: 0.88rem; color: #9aa0c4;">
        💡 点击表格头部（如歌曲名、点歌人等）即可进行智能排序。
      </div>
      <div class="timezone-picker">
        <label for="tzSelect">切换时间戳时区 (Timezone):</label>
        <select id="tzSelect" onchange="changeTimezone(this.value)">
          <option value="local">本地时区 (Local Time)</option>
          <option value="UTC">格林威治时间 (UTC / Z)</option>
          <option value="Asia/Shanghai">北京时间 (CST / UTC+8)</option>
          <option value="Asia/Tokyo">东京时间 (JST / UTC+9)</option>
          <option value="America/New_York">纽约时间 (EST/EDT)</option>
          <option value="Europe/London">伦敦时间 (GMT/BST)</option>
        </select>
      </div>
    </div>
    
    <table id="songsTable">
      <thead>
        <tr>
          <th onclick="sortTable(0)">点歌顺序 ⇅</th>
          <th onclick="sortTable(1)">当前状态 ⇅</th>
          <th onclick="sortTable(2)">歌曲名 ⇅</th>
          <th onclick="sortTable(3)">歌手名字 ⇅</th>
          <th onclick="sortTable(4)">点播用户 ⇅</th>
          <th onclick="sortTable(5)">外部链接 ⇅</th>
          <th onclick="sortTable(6)">获赠点赞礼物 ⇅</th>
          <th onclick="sortTable(7)">唱毕完成时间 ⇅</th>
        </tr>
      </thead>
      <tbody>
  `;

  allSongs.forEach(s => {
    const badgeClass = s.status.includes('已唱') ? 'badge-sung' : (s.status.includes('正在') ? 'badge-singing' : 'badge-queued');
    const linkTag = s.link ? `<a class="link-btn" href="${s.link}" target="_blank">🔗 打开伴奏</a>` : '<span style="color: #676c8c;">-</span>';
    
    let initialTimeStr = "待唱";
    if (s.utc === -1) {
      initialTimeStr = "正在唱";
    } else if (s.utc > 0) {
      initialTimeStr = new Date(s.utc).toISOString();
    }

    html += `
        <tr>
          <td style="font-weight: bold; font-family: monospace;">${s.order}</td>
          <td><span class="badge ${badgeClass}">${s.status}</span></td>
          <td style="font-weight: bold; color: white;">${s.title}</td>
          <td>${s.singer}</td>
          <td>${s.requestedBy}</td>
          <td>${linkTag}</td>
          <td style="font-family: monospace;">🌹 ${s.rose} | 👏 ${s.clap} | 🥚 ${s.egg} | 👞 ${s.shoe}</td>
          <td class="time-cell" data-utc="${s.utc}">${initialTimeStr}</td>
        </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  </div>

  <script>
    let sortDirections = {};
    
    function changeTimezone(tz) {
      // 1. Update export time
      const exportTimeElem = document.getElementById("exportTime");
      const exportUtc = parseInt(exportTimeElem.dataset.utc);
      exportTimeElem.textContent = formatTimeISO(exportUtc, tz);

      // 2. Update all song row completion times
      const timeCells = document.querySelectorAll(".time-cell");
      timeCells.forEach(cell => {
        const utcMs = parseInt(cell.dataset.utc);
        if (utcMs > 0) {
          cell.textContent = formatTimeISO(utcMs, tz);
        } else if (utcMs === -1) {
          cell.textContent = "正在唱";
        } else {
          cell.textContent = "待唱";
        }
      });
    }

    function formatTimeISO(ms, tz) {
      if (!ms || isNaN(ms)) return '--';
      const date = new Date(ms);
      
      if (tz === 'UTC') {
        return date.toISOString();
      } else if (tz === 'local') {
        return formatLocalISO(date);
      } else {
        try {
          const dTF = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
          const parts = dTF.formatToParts(date);
          const map = {};
          parts.forEach(p => map[p.type] = p.value);
          
          const offsetStr = getTimezoneOffsetString(date, tz);
          // Format as YYYY-MM-DDTHH:mm:ss+HH:MM
          return map.year + "-" + map.month + "-" + map.day + "T" + map.hour + ":" + map.minute + ":" + map.second + offsetStr;
        } catch (e) {
          console.error(e);
          return date.toISOString();
        }
      }
    }

    function formatLocalISO(date) {
      const tzo = -date.getTimezoneOffset();
      const dif = tzo >= 0 ? '+' : '-';
      const pad = (num) => (num < 10 ? '0' : '') + num;
      return date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) +
        ':' + pad(date.getMinutes()) +
        ':' + pad(date.getSeconds()) +
        dif + pad(Math.floor(Math.abs(tzo) / 60)) +
        ':' + pad(Math.abs(tzo) % 60);
    }

    function getTimezoneOffsetString(date, tz) {
      try {
        const dTF = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          timeZoneName: 'longOffset'
        });
        const parts = dTF.formatToParts(date);
        const tzPart = parts.find(p => p.type === 'timeZoneName');
        if (tzPart) {
          let offset = tzPart.value.replace('GMT', '');
          if (offset === '') return '+00:00';
          return offset;
        }
      } catch (e) {}
      return 'Z';
    }

    function sortTable(colIndex) {
      const table = document.getElementById("songsTable");
      const tbody = table.tBodies[0];
      const rows = Array.from(tbody.rows);
      
      const currentDir = sortDirections[colIndex] || 'asc';
      const nextDir = currentDir === 'asc' ? 'desc' : 'asc';
      sortDirections[colIndex] = nextDir;
      
      rows.sort((rowA, rowB) => {
        let valA = rowA.cells[colIndex].textContent.trim();
        let valB = rowB.cells[colIndex].textContent.trim();
        
        // Numerical sort
        if (colIndex === 0) {
          return nextDir === 'asc' 
            ? parseInt(valA) - parseInt(valB)
            : parseInt(valB) - parseInt(valA);
        }
        
        // Sum scores sort
        if (colIndex === 6) {
          const getSum = (val) => {
            const matchNums = val.match(/\\d+/g);
            if (!matchNums) return 0;
            return matchNums.map(Number).reduce((sum, n) => sum + n, 0);
          };
          return nextDir === 'asc'
            ? getSum(valA) - getSum(valB)
            : getSum(valB) - getSum(valA);
        }

        return nextDir === 'asc'
          ? valA.localeCompare(valB, 'zh-CN')
          : valB.localeCompare(valA, 'zh-CN');
      });
      
      tbody.append(...rows);
    }

    window.onload = function() {
      // Try to auto-resolve browser local timezone name and insert custom entry
      try {
        const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (localTz) {
          const select = document.getElementById("tzSelect");
          let exists = false;
          for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === localTz) {
              exists = true;
              break;
            }
          }
          if (!exists) {
            const opt = document.createElement("option");
            opt.value = localTz;
            opt.textContent = "检测本地时区 (" + localTz + ")";
            select.insertBefore(opt, select.options[1] || null);
          }
        }
      } catch (e) {}

      document.getElementById("tzSelect").value = "local";
      changeTimezone("local");
    };
  </script>
</body>
</html>
  `;

  // Download logic trigger
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `ShareQ_KTV_${currentRoomId}_Session_Archive.html`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Update the Toast notifications sidebar list
function updateToastHistoryUI() {
  const badge = document.getElementById("toast-history-badge");
  const list = document.getElementById("toast-history-list");
  if (!badge || !list) return;

  if (unreadToastsCount > 0) {
    badge.textContent = unreadToastsCount;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }

  // Get active filter
  const activeBtn = document.querySelector(".toast-filter-btn.active");
  const filter = activeBtn ? activeBtn.dataset.filter : "all";

  list.innerHTML = "";
  
  // Filter history items
  const filteredHistory = toastHistory.filter(item => {
    if (filter === "all") return true;
    if (filter === "add") return item.type === "add";
    if (filter === "pin") return item.type === "pin";
    if (filter === "delete") return item.type === "delete";
    if (filter === "next") return item.type === "next";
    if (filter === "other") {
      return !["add", "pin", "delete", "next"].includes(item.type);
    }
    return true;
  });

  if (filteredHistory.length === 0) {
    list.innerHTML = `<div class="no-history-msg">暂无此类型的历史消息</div>`;
    return;
  }

  for (let i = filteredHistory.length - 1; i >= 0; i--) {
    const item = filteredHistory[i];
    const el = document.createElement("div");
    el.className = `history-toast-item toast-${item.type}`;
    
    let icon = "fa-circle-info";
    if (item.type === 'add') icon = "fa-circle-plus";
    else if (item.type === 'pin') icon = "fa-angles-up";
    else if (item.type === 'delete') icon = "fa-trash-can";
    else if (item.type === 'shuffle') icon = "fa-shuffle";
    else if (item.type === 'next') icon = "fa-forward-step";

    el.innerHTML = `
      <div class="toast-item-header" style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; opacity:0.75; margin-bottom:4px;">
        <span><i class="fa-solid ${icon}"></i> ${item.type.toUpperCase()}</span>
        <span>${new Date(item.time).toLocaleTimeString()}</span>
      </div>
      <div class="toast-item-body" style="font-size:0.85rem;">${item.text}</div>
    `;
    list.appendChild(el);
  }
}

// Compute KTV Session statistics
function renderStats() {
  const statsCont = document.getElementById("stats-playlist-container");
  if (statsCont) {
    const topSingerValCheck = document.getElementById("stat-top-singer");
    if (!topSingerValCheck) {
      statsCont.innerHTML = `
        <div class="stats-grid">
          <!-- Top Singer Card -->
          <div class="stats-card">
            <h3><i class="fa-solid fa-microphone-lines"></i> 今日麦霸</h3>
            <div class="stats-card-main-val" id="stat-top-singer">--</div>
            <div class="stats-card-sub-val" id="stat-top-singer-sub">暂无已唱歌曲</div>
            <div class="stats-list" id="stats-singers-list" style="margin-top: 15px;"></div>
          </div>

          <!-- Top Artist Card -->
          <div class="stats-card">
            <h3><i class="fa-solid fa-music"></i> 热门点播歌手</h3>
            <div class="stats-card-main-val" id="stat-top-artist">--</div>
            <div class="stats-card-sub-val" id="stat-top-artist-sub">暂无歌手点播数据</div>
            <div class="stats-list" id="stats-artists-list" style="margin-top: 15px;"></div>
          </div>

          <!-- Top Song Card -->
          <div class="stats-card">
            <h3><i class="fa-solid fa-heart"></i> 人气金曲</h3>
            <div class="stats-card-main-val" id="stat-top-song">--</div>
            <div class="stats-card-sub-val" id="stat-top-song-sub">暂无赠礼点赞</div>
          </div>
        </div>
      `;
    }
  }

  const topSingerVal = document.getElementById("stat-top-singer");
  const topSingerSub = document.getElementById("stat-top-singer-sub");
  const topArtistVal = document.getElementById("stat-top-artist");
  const topArtistSub = document.getElementById("stat-top-artist-sub");
  const topSongVal = document.getElementById("stat-top-song");
  const topSongSub = document.getElementById("stat-top-song-sub");

  const statsSingersList = document.getElementById("stats-singers-list");
  const statsArtistsList = document.getElementById("stats-artists-list");

  if (!topSingerVal || !statsSingersList) return;

  // 1. Calculate Top Singers (by completed history songs)
  const singerCounts = {};
  historyPlaylist.forEach(s => {
    const name = s.requestedBy;
    singerCounts[name] = (singerCounts[name] || 0) + 1;
  });
  const topSingers = Object.entries(singerCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  if (topSingers.length > 0) {
    topSingerVal.textContent = topSingers[0].name;
    topSingerSub.textContent = `演唱了 ${topSingers[0].count} 首歌曲`;
  } else {
    topSingerVal.textContent = "--";
    topSingerSub.textContent = "暂无已唱歌曲";
  }

  // Populate Singer list (top 5)
  statsSingersList.innerHTML = "";
  if (topSingers.length === 0) {
    statsSingersList.innerHTML = `<div class="no-stats-msg" style="color:var(--text-muted); font-size:0.85rem; padding:10px;">暂无歌手数据</div>`;
  } else {
    topSingers.slice(0, 5).forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "stats-row-item";
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.padding = "8px 12px";
      row.style.borderBottom = "1px solid var(--border-color)";
      row.style.fontSize = "0.9rem";
      
      const medals = ["🥇", "🥈", "🥉", "🔹", "🔹"];
      row.innerHTML = `
        <span class="stats-rank">${medals[idx] || "🔹"}</span>
        <span class="stats-name" style="flex:1; margin-left:10px;">${item.name}</span>
        <span class="stats-count" style="font-weight:600; color:var(--color-primary);">${item.count} 首</span>
      `;
      statsSingersList.appendChild(row);
    });
  }

  // 2. Calculate Top Requested Artists
  const artistCounts = {};
  const addArtist = (s) => {
    if (!s.singer) return;
    const art = s.singer.trim();
    if (art && art !== '未知歌手' && art !== '无') {
      artistCounts[art] = (artistCounts[art] || 0) + 1;
    }
  };
  playlist.forEach(addArtist);
  historyPlaylist.forEach(addArtist);

  const topArtists = Object.entries(artistCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  if (topArtists.length > 0) {
    topArtistVal.textContent = topArtists[0].name;
    topArtistSub.textContent = `被点播 ${topArtists[0].count} 次`;
  } else {
    topArtistVal.textContent = "--";
    topArtistSub.textContent = "暂无点歌记录";
  }

  // Populate Artist list (top 5)
  statsArtistsList.innerHTML = "";
  if (topArtists.length === 0) {
    statsArtistsList.innerHTML = `<div class="no-stats-msg" style="color:var(--text-muted); font-size:0.85rem; padding:10px;">暂无歌手点播数据</div>`;
  } else {
    topArtists.slice(0, 5).forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "stats-row-item";
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.padding = "8px 12px";
      row.style.borderBottom = "1px solid var(--border-color)";
      row.style.fontSize = "0.9rem";

      row.innerHTML = `
        <span class="stats-rank">🔥</span>
        <span class="stats-name" style="flex:1; margin-left:10px;">${item.name}</span>
        <span class="stats-count" style="font-weight:600; color:var(--color-secondary);">${item.count} 次</span>
      `;
      statsArtistsList.appendChild(row);
    });
  }

  // 3. Calculate Top Liked Songs (by reactions sum score: rose + clap)
  const songLikes = [];
  const addSongLikes = (s) => {
    const reacts = s.reactions || { rose: 0, clap: 0, egg: 0, shoe: 0 };
    const score = (reacts.rose || 0) + (reacts.clap || 0);
    songLikes.push({
      title: s.title,
      singer: s.singer || '未知',
      score: score
    });
  };
  if (playlist.length > 0) {
    addSongLikes(playlist[0]);
  }
  historyPlaylist.forEach(addSongLikes);

  const topSongs = songLikes
    .sort((a, b) => b.score - a.score)
    .filter(s => s.score > 0);

  if (topSongs.length > 0) {
    topSongVal.textContent = topSongs[0].title;
    topSongSub.textContent = `${topSongs[0].singer} - 获赞 ${topSongs[0].score} 次`;
  } else {
    topSongVal.textContent = "--";
    topSongSub.textContent = "暂无赠礼点赞";
  }
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

  // Limit list to last 5 rooms
  rooms = rooms.slice(0, 5);

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
