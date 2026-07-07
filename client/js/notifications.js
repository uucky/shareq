import { appendText, clearChildren, createElement } from './dom.js';
import { t } from './i18n.js';
import { state } from './state.js';

function getToastIcon(type) {
  if (type === 'add') return 'fa-circle-plus';
  if (type === 'pin') return 'fa-angles-up';
  if (type === 'delete') return 'fa-trash-can';
  if (type === 'shuffle') return 'fa-shuffle';
  if (type === 'next') return 'fa-forward-step';
  if (type === 'dedicate') return 'fa-gift';
  return 'fa-circle-info';
}

function getToastClassType(type) {
  if (['add', 'pin', 'delete', 'shuffle', 'next', 'dedicate'].includes(type)) {
    return type;
  }

  return 'system';
}

function createIcon(iconClass) {
  return createElement('i', { className: `fa-solid ${iconClass}` });
}

// System toasts popups
export function showToast(type, text) {
  const toastType = String(type || 'info');

  // Save to toast history
  state.toastHistory.push({ type: toastType, text, time: Date.now() });

  if (toastType === 'dedicate') {
    state.unreadToastsCount++;
  }
  updateToastHistoryUI();

  // Only show floating toast popups for direct 'dedicate' notifications
  if (toastType !== 'dedicate') return;

  const container = document.getElementById('notification-center');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${getToastClassType(toastType)}`;

  const closeBtn = createElement('button', {
    type: 'button',
    className: 'toast-close',
    text: '×'
  });

  toast.appendChild(createElement('span', { className: 'toast-icon' }, [createIcon(getToastIcon(toastType))]));
  toast.appendChild(
    createElement('span', {
      className: 'toast-text',
      text
    })
  );
  toast.appendChild(closeBtn);

  // Bind close click
  closeBtn.addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  // Auto hide after 4.5s
  setTimeout(() => {
    toast.style.animation = 'fadeIn 0.3s reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// Update the Toast notifications sidebar list
export function updateToastHistoryUI() {
  const badge = document.getElementById('toast-history-badge');
  const list = document.getElementById('toast-history-list');
  if (!list) return;

  if (badge) {
    if (state.unreadToastsCount > 0) {
      badge.textContent = state.unreadToastsCount > 99 ? '99+' : state.unreadToastsCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  const mobileBadge = document.getElementById('mobile-toast-badge');
  if (mobileBadge) {
    if (state.unreadToastsCount > 0) {
      mobileBadge.textContent = state.unreadToastsCount > 99 ? '99+' : state.unreadToastsCount;
      mobileBadge.classList.remove('hidden');
    } else {
      mobileBadge.classList.add('hidden');
    }
  }

  // Get active filter
  const activeBtn = document.querySelector('.toast-filter-link.active');
  const filter = activeBtn ? activeBtn.dataset.filter : 'all';

  clearChildren(list);

  // Filter history items
  const filteredHistory = state.toastHistory.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'add') return item.type === 'add';
    if (filter === 'pin') return item.type === 'pin';
    if (filter === 'delete') return item.type === 'delete';
    if (filter === 'next') return item.type === 'next';
    if (filter === 'other') {
      return !['add', 'pin', 'delete', 'next'].includes(item.type);
    }
    return true;
  });

  if (filteredHistory.length === 0) {
    list.appendChild(
      createElement('div', {
        className: 'no-history-msg',
        text: t('empty-filter-history')
      })
    );
    return;
  }

  // Display newest items on top
  const displayedHistory = [...filteredHistory].reverse();

  for (let i = 0; i < displayedHistory.length; i++) {
    const item = displayedHistory[i];
    const classType = getToastClassType(item.type);
    const el = document.createElement('div');
    el.className = `history-toast-item toast-${classType}`;

    const timeStr = new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    el.appendChild(
      createElement(
        'span',
        {
          className: `chat-badge toast-badge-${classType}`,
          style:
            'font-size:0.7rem; padding: 2px 6px; border-radius: 4px; margin-right: 6px; font-weight: bold; flex-shrink: 0;'
        },
        [createIcon(getToastIcon(item.type))]
      )
    );
    el.appendChild(
      createElement('span', {
        className: 'chat-text',
        text: item.text,
        style: 'font-size:0.85rem; line-height: 1.4; word-break: break-all; flex-grow: 1;'
      })
    );
    el.appendChild(
      createElement('span', {
        className: 'chat-time',
        text: timeStr,
        style:
          'font-size:0.7rem; opacity:0.4; margin-left: 6px; flex-shrink: 0; align-self: flex-start; margin-top: 2px;'
      })
    );
    list.appendChild(el);
  }
}

// Show the interactive dedication request modal
export function updateMessagesEmptyState() {
  const list = document.getElementById('pending-dedications-list');
  if (!list) return;
  const cards = list.querySelectorAll('.pending-dedication-card');
  let emptyMsg = document.getElementById('no-messages-msg');
  if (cards.length === 0) {
    if (!emptyMsg) {
      emptyMsg = document.createElement('div');
      emptyMsg.id = 'no-messages-msg';
      emptyMsg.className = 'no-history-msg';
      emptyMsg.textContent = t('no-messages-msg');
      list.appendChild(emptyMsg);
    }
    emptyMsg.style.display = 'block';
  } else {
    if (emptyMsg) emptyMsg.style.display = 'none';
  }
}

export function showDedicationRequestModal(data) {
  // Add to toast history with type "dedicate" so it appears in the activity feed
  showToast('dedicate', t('dedication-toast', { username: data.fromUsername, title: data.title }));

  const list = document.getElementById('pending-dedications-list');
  if (!list) return;

  const card = document.createElement('div');
  card.className = 'pending-dedication-card animate-glow';
  card.style =
    'background: var(--card-bg); border-radius: 8px; padding: 12px; border-left: 4px solid var(--color-primary); box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 8px;';

  const titleRow = createElement(
    'div',
    {
      style: 'font-size: 0.95rem; font-weight: 600; margin-bottom: 4px;'
    },
    [
      createElement('i', {
        className: 'fa-solid fa-gift',
        style: 'color: var(--color-primary);'
      })
    ]
  );
  appendText(titleRow, ` ${data.fromUsername || ''} `);
  titleRow.appendChild(
    createElement('span', {
      text: t('dedicate-for-you'),
      style: 'font-weight: normal; font-size: 0.85rem; color: var(--text-secondary);'
    })
  );

  const actions = createElement(
    'div',
    {
      style: 'display: flex; gap: 8px;'
    },
    [
      createElement('button', {
        type: 'button',
        className: 'btn btn-primary accept-dedication-btn',
        text: t('dedicate-accept'),
        style: 'flex: 1; padding: 6px; font-size: 0.85rem; border-radius: 6px;'
      }),
      createElement('button', {
        type: 'button',
        className: 'btn decline-dedication-btn',
        text: t('dedicate-decline'),
        style:
          'flex: 1; padding: 6px; font-size: 0.85rem; border-radius: 6px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444;'
      })
    ]
  );

  card.appendChild(titleRow);
  card.appendChild(
    createElement('div', {
      text: `《${data.title}》- ${data.singer || t('unknown-singer-short')}`,
      style: 'font-size: 0.9rem; margin-bottom: 12px;'
    })
  );
  card.appendChild(actions);
  list.appendChild(card);
  updateMessagesEmptyState();

  card.querySelector('.accept-dedication-btn').addEventListener('click', () => {
    state.socket.emit('respond-dedication', { id: data.id, accept: true });
    card.remove();
    updateMessagesEmptyState();
  });

  card.querySelector('.decline-dedication-btn').addEventListener('click', () => {
    state.socket.emit('respond-dedication', { id: data.id, accept: false });
    card.remove();
    updateMessagesEmptyState();
  });
}
