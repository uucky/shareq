export function renderAvatarHTML(avatarData, className = '') {
  const av = avatarData || '🎤';
  if (av.startsWith('data:image/') || av.startsWith('http://') || av.startsWith('https://')) {
    return `<img src="${av}" class="${className}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; display:block;" onerror="this.onerror=null; this.outerHTML='🎤';">`;
  }
  return `<span class="${className}" style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; font-size:inherit;">${av}</span>`;
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

  grid.innerHTML = '';

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
  document.getElementById(elemId).innerHTML = renderAvatarHTML(avatar);
}
