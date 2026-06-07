import { clearChildren, createElement, escapeHtml, getSafeHttpUrl } from './dom.js';

function getSafeAvatarImageSrc(avatarData) {
  const av = String(avatarData || '');
  if (
    av.startsWith('data:image/png') ||
    av.startsWith('data:image/jpeg') ||
    av.startsWith('data:image/gif') ||
    av.startsWith('data:image/webp')
  ) {
    return av;
  }

  return getSafeHttpUrl(av);
}

export function createAvatarElement(avatarData, className = '') {
  const av = String(avatarData || '🎤');
  const imageSrc = getSafeAvatarImageSrc(av);

  if (imageSrc) {
    const img = createElement('img', {
      className,
      attributes: { src: imageSrc },
      style: 'width:100%; height:100%; border-radius:50%; object-fit:cover; display:block;'
    });
    img.addEventListener('error', () => {
      const fallback = createAvatarElement('🎤', className);
      img.replaceWith(fallback);
    }, { once: true });
    return img;
  }

  return createElement('span', {
    className,
    text: av,
    style: 'display:flex; align-items:center; justify-content:center; width:100%; height:100%; font-size:inherit;'
  });
}

export function setAvatarElement(container, avatar, className = '') {
  clearChildren(container);
  container.appendChild(createAvatarElement(avatar, className));
}

export function renderAvatarHTML(avatarData, className = '') {
  const av = String(avatarData || '🎤');
  const imageSrc = getSafeAvatarImageSrc(av);
  const safeClassName = escapeHtml(className);

  if (imageSrc) {
    return `<img src="${escapeHtml(imageSrc)}" class="${safeClassName}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; display:block;" onerror="this.onerror=null; this.outerHTML='🎤';">`;
  }

  return `<span class="${safeClassName}" style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; font-size:inherit;">${escapeHtml(av)}</span>`;
}

export function resizeAndSetAvatar(file, callback) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const size = 128;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2;
      const sy = (img.height - minSide) / 2;

      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      callback(dataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

export function renderEmojiGrid(containerId, emojis, onSelectCallback, selectedEmoji) {
  const grid = document.getElementById(containerId);
  if (!grid) {
    return;
  }

  clearChildren(grid);

  emojis.forEach(emoji => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'avatar-option';
    if (selectedEmoji && emoji === selectedEmoji) {
      cell.classList.add('selected');
    }
    cell.textContent = emoji;
    cell.addEventListener('click', () => {
      const parent = cell.parentElement;
      parent.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
      cell.classList.add('selected');
      onSelectCallback(emoji);
    });
    grid.appendChild(cell);
  });
}

export function updateAvatarPreview(elemId, avatar) {
  setAvatarElement(document.getElementById(elemId), avatar);
}
