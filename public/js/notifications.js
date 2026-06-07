import { state } from './state.js';

// System toasts popups
export function showToast(type, text) {
  // Save to toast history
  state.toastHistory.push({ type, text, time: Date.now() });

  if (type === 'dedicate') {
    state.unreadToastsCount++;
  }
  updateToastHistoryUI();

  // Only show floating toast popups for direct 'dedicate' notifications
  if (type !== 'dedicate') return;

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
  else if (type === 'dedicate') icon = "fa-gift";

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

// Update the Toast notifications sidebar list
export function updateToastHistoryUI() {
  const badge = document.getElementById("toast-history-badge");
  const list = document.getElementById("toast-history-list");
  if (!list) return;

  if (badge) {
    if (state.unreadToastsCount > 0) {
      badge.textContent = state.unreadToastsCount > 99 ? '99+' : state.unreadToastsCount;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }

  const mobileBadge = document.getElementById("mobile-toast-badge");
  if (mobileBadge) {
    if (state.unreadToastsCount > 0) {
      mobileBadge.textContent = state.unreadToastsCount > 99 ? '99+' : state.unreadToastsCount;
      mobileBadge.classList.remove("hidden");
    } else {
      mobileBadge.classList.add("hidden");
    }
  }

  // Get active filter
  const activeBtn = document.querySelector(".toast-filter-link.active");
  const filter = activeBtn ? activeBtn.dataset.filter : "all";

  list.innerHTML = "";
  
  // Filter history items
  const filteredHistory = state.toastHistory.filter(item => {
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

  // Display newest items on top
  const displayedHistory = [...filteredHistory].reverse();

  for (let i = 0; i < displayedHistory.length; i++) {
    const item = displayedHistory[i];
    const el = document.createElement("div");
    el.className = `history-toast-item toast-${item.type}`;
    
    let icon = "fa-circle-info";
    if (item.type === 'add') icon = "fa-circle-plus";
    else if (item.type === 'pin') icon = "fa-angles-up";
    else if (item.type === 'delete') icon = "fa-trash-can";
    else if (item.type === 'shuffle') icon = "fa-shuffle";
    else if (item.type === 'next') icon = "fa-forward-step";
    else if (item.type === 'dedicate') icon = "fa-gift";

    const timeStr = new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    el.innerHTML = `
      <span class="chat-badge toast-badge-${item.type}" style="font-size:0.7rem; padding: 2px 6px; border-radius: 4px; margin-right: 6px; font-weight: bold; flex-shrink: 0;"><i class="fa-solid ${icon}"></i></span>
      <span class="chat-text" style="font-size:0.85rem; line-height: 1.4; word-break: break-all; flex-grow: 1;">${item.text}</span>
      <span class="chat-time" style="font-size:0.7rem; opacity:0.4; margin-left: 6px; flex-shrink: 0; align-self: flex-start; margin-top: 2px;">${timeStr}</span>
    `;
    list.appendChild(el);
  }
}

// Show the interactive dedication request modal
export function updateMessagesEmptyState() {
  const list = document.getElementById("pending-dedications-list");
  if (!list) return;
  const cards = list.querySelectorAll(".pending-dedication-card");
  let emptyMsg = document.getElementById("no-messages-msg");
  if (cards.length === 0) {
    if (!emptyMsg) {
      emptyMsg = document.createElement("div");
      emptyMsg.id = "no-messages-msg";
      emptyMsg.className = "no-history-msg";
      emptyMsg.textContent = "暂无消息";
      list.appendChild(emptyMsg);
    }
    emptyMsg.style.display = "block";
  } else {
    if (emptyMsg) emptyMsg.style.display = "none";
  }
}

export function showDedicationRequestModal(data) {
  // Add to toast history with type "dedicate" so it appears in the activity feed
  showToast("dedicate", `🎁 ${data.fromUsername} 为你指名点播了《${data.title}》`);

  const list = document.getElementById("pending-dedications-list");
  if (!list) return;

  const card = document.createElement("div");
  card.className = "pending-dedication-card animate-glow";
  card.style = "background: var(--card-bg); border-radius: 8px; padding: 12px; border-left: 4px solid var(--color-primary); box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 8px;";
  card.innerHTML = `
    <div style="font-size: 0.95rem; font-weight: 600; margin-bottom: 4px;">
      <i class="fa-solid fa-gift" style="color: var(--color-primary);"></i> ${data.fromUsername} 
      <span style="font-weight: normal; font-size: 0.85rem; color: var(--text-secondary);">为你指名</span>
    </div>
    <div style="font-size: 0.9rem; margin-bottom: 12px;">
      《${data.title}》- ${data.singer || '未知'}
    </div>
    <div style="display: flex; gap: 8px;">
      <button type="button" class="btn btn-primary accept-dedication-btn" style="flex: 1; padding: 6px; font-size: 0.85rem; border-radius: 6px;">接受</button>
      <button type="button" class="btn decline-dedication-btn" style="flex: 1; padding: 6px; font-size: 0.85rem; border-radius: 6px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444;">拒绝</button>
    </div>
  `;
  list.appendChild(card);
  updateMessagesEmptyState();

  card.querySelector(".accept-dedication-btn").addEventListener("click", () => {
    state.socket.emit("respond-dedication", { id: data.id, accept: true });
    card.remove();
    updateMessagesEmptyState();
  });

  card.querySelector(".decline-dedication-btn").addEventListener("click", () => {
    state.socket.emit("respond-dedication", { id: data.id, accept: false });
    card.remove();
    updateMessagesEmptyState();
  });
}
