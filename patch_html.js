const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Rename tabs
html = html.replace('待播歌单', '已点');
html = html.replace('已唱历史', '已唱');

// 2. Add dev badge
html = html.replace('<h1 class="brand-title">ShareQ</h1>', '<h1 class="brand-title">ShareQ <span style="font-size: 0.4em; opacity: 0.5; font-weight: normal; vertical-align: middle;">测试服</span></h1>');

// 3. Reorganize right column
// Find the THIRD COLUMN section
const oldSection = `        <!-- THIRD COLUMN: SYSTEM MESSAGES / NOTIFICATIONS -->
        <section class="grid-col notifications-section">
          <div id="toast-history-panel" class="glass-card">
            <div class="card-header" style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
              <h2><i class="fa-solid fa-bell"></i> 消息动态 / Activity</h2>
              <span id="toast-history-badge" class="history-badge hidden">0</span>
            </div>
            
            <!-- Filter Tabs -->
            <div class="toast-history-filters" style="display: flex; gap: 4px; padding: 6px 0 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); flex-wrap: wrap;">
              <button type="button" class="toast-filter-btn active" data-filter="all">全部</button>
              <button type="button" class="toast-filter-btn" data-filter="add">点歌</button>
              <button type="button" class="toast-filter-btn" data-filter="pin">优先</button>
              <button type="button" class="toast-filter-btn" data-filter="delete">删除</button>
              <button type="button" class="toast-filter-btn" data-filter="next">切歌</button>
              <button type="button" class="toast-filter-btn" data-filter="other">其他</button>
            </div>

            <div class="toast-history-list" id="toast-history-list" style="margin-top: 10px; max-height: 550px; overflow-y: auto;">
              <div class="no-history-msg">暂无历史消息记录</div>
            </div>
          </div>
        </section>`;

const newSection = `        <!-- THIRD COLUMN: SYSTEM MESSAGES / NOTIFICATIONS -->
        <section class="grid-col notifications-section" style="display:flex; flex-direction:column; gap:16px;">
          <!-- 消息 (Pending Dedications) -->
          <div id="messages-panel" class="glass-card" style="padding:16px;">
            <div class="card-header" style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
              <h2 style="font-size:1.1rem;"><i class="fa-solid fa-envelope"></i> 消息</h2>
              <span id="toast-history-badge" class="history-badge hidden">0</span>
            </div>
            <div id="pending-dedications-list" style="display:flex; flex-direction:column; gap:8px;">
              <!-- Javascript populates this -->
            </div>
          </div>
          
          <!-- 动态 (Activity Feed) -->
          <div id="activity-feed-panel" style="flex:1; display:flex; flex-direction:column;">
            <h3 style="font-size:0.9rem; opacity:0.6; margin-bottom:8px; text-transform:uppercase; letter-spacing:1px;">动态</h3>
            
            <!-- Filter Tabs -->
            <div class="toast-history-filters" style="display: flex; gap: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); flex-wrap: wrap; margin-bottom:12px;">
              <a href="#" class="toast-filter-link active" data-filter="all">全部</a>
              <a href="#" class="toast-filter-link" data-filter="add">点歌</a>
              <a href="#" class="toast-filter-link" data-filter="pin">优先</a>
              <a href="#" class="toast-filter-link" data-filter="delete">删除</a>
              <a href="#" class="toast-filter-link" data-filter="next">切歌</a>
            </div>

            <div class="toast-history-list" id="toast-history-list" style="flex:1; overflow-y: auto; display:flex; flex-direction:column; gap:4px;">
              <div class="no-history-msg">暂无动态记录</div>
            </div>
          </div>
        </section>`;

html = html.replace(oldSection, newSection);

// Re-arrange Now Playing Card elements
const oldNowPlaying = `          <!-- ENLARGED NOW PLAYING HIGHLIGHT PANEL -->
          <div class="now-playing-panel glass-card enlarged-playing" id="now-playing-panel">
            <div class="playing-header">
              <div class="playing-label">
                <span class="indicator-dot blinking"></span> 正在演唱 / Now Playing
              </div>
              <!-- Accompaniment Link Button -->
              <a href="#" target="_blank" id="playing-link-btn" class="accompaniment-btn hidden" title="打开点歌人提供的伴奏链接">
                <i class="fa-solid fa-up-right-from-square"></i> 打开伴奏链接
              </a>
            </div>
            <div class="playing-content">
              <div class="playing-icon-wrapper">
                <i id="playing-music-note" class="fa-solid fa-compact-disc playing-music-note-large pulse-glow fa-spin"></i>
                <img id="playing-avatar-disc" src="" class="playing-avatar-disc fa-spin hidden">
              </div>
              <div class="playing-details">
                <h2 id="playing-title" class="playing-title-large">等待点歌...</h2>
                <p id="playing-singer" class="playing-singer-large">--</p>
                <div class="playing-requester" style="display:flex; align-items:center; gap:8px;">
                  <span class="badge badge-user" id="playing-user" style="font-size:0.9rem;">--</span>
                  <span id="playing-dedicate-badge" class="badge dedicate-tag hidden" style="font-size:0.8rem;"></span>
                </div>
              </div>
            </div>`;

const newNowPlaying = `          <!-- ENLARGED NOW PLAYING HIGHLIGHT PANEL -->
          <div class="now-playing-panel glass-card enlarged-playing" id="now-playing-panel">
            <div class="playing-header" style="justify-content: flex-end;">
              <!-- Accompaniment Link Button -->
              <a href="#" target="_blank" id="playing-link-btn" class="accompaniment-btn hidden" title="打开点歌人提供的伴奏链接">
                <i class="fa-solid fa-up-right-from-square"></i> 打开伴奏链接
              </a>
            </div>
            <div class="playing-content" style="flex-direction: column; align-items: center; text-align: center; gap: 16px; margin-top: -10px;">
              <div class="playing-icon-wrapper" style="margin-bottom: 8px;">
                <i id="playing-music-note" class="fa-solid fa-compact-disc playing-music-note-large pulse-glow fa-spin"></i>
                <img id="playing-avatar-disc" src="" class="playing-avatar-disc hidden" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid var(--color-secondary); box-shadow: 0 0 20px rgba(139, 92, 246, 0.4); animation: spin 4s linear infinite;">
              </div>
              <div class="playing-details" style="display:flex; flex-direction:column; align-items:center; width:100%;">
                <div class="playing-label" style="margin-bottom: 8px; align-self: center;">
                  <span class="indicator-dot blinking"></span> 正在演唱
                </div>
                <h2 id="playing-title" class="playing-title-large" style="font-size: 2.2rem; margin-bottom: 4px;">等待点歌...</h2>
                <p id="playing-singer" class="playing-singer-large" style="font-size: 1.1rem; opacity: 0.8; margin-bottom: 12px;">--</p>
                <div class="playing-requester" style="display:flex; align-items:center; justify-content:center; gap:8px;">
                  <span class="badge badge-user" id="playing-user" style="font-size:0.9rem;">--</span>
                  <span id="playing-dedicate-badge" class="badge dedicate-tag hidden" style="font-size:0.8rem;"></span>
                </div>
              </div>
            </div>`;

html = html.replace(oldNowPlaying, newNowPlaying);

fs.writeFileSync('public/index.html', html, 'utf8');
console.log('index.html updated successfully.');
