const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Rename Tabs
html = html.replace('待播歌单 <span id="song-count-badge"', '已点 <span id="song-count-badge"');
html = html.replace('已唱历史 <span id="history-count-badge"', '已唱 <span id="history-count-badge"');

// 2. Dev Badge
html = html.replace('<h1 class="brand-title">ShareQ</h1>', '<h1 class="brand-title">ShareQ <span style="font-size: 0.4em; opacity: 0.5; font-weight: normal; vertical-align: middle;">测试服</span></h1>');

// 3. Right Panel Refactor
const oldRightCol = `        <!-- THIRD COLUMN: SYSTEM MESSAGES / NOTIFICATIONS -->
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

const newRightCol = `        <!-- THIRD COLUMN: SYSTEM MESSAGES / NOTIFICATIONS -->
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

if (html.includes(oldRightCol)) {
    html = html.replace(oldRightCol, newRightCol);
    console.log("Successfully replaced right panel");
} else {
    console.log("Failed to find right panel snippet");
}

// 4. Center Now Playing Card
const oldNowPlaying = `            <div class="playing-header">
              <div class="playing-label">
                <span class="indicator-dot blinking"></span> 正在演唱 / Now Playing
              </div>
              <!-- Accompaniment Link Button -->
              <a href="#" target="_blank" id="playing-link-btn" class="accompaniment-btn hidden" title="打开点歌人提供的伴奏链接">
                <i class="fa-solid fa-up-right-from-square"></i> 打开伴奏链接
              </a>
            </div>
            
            <div class="playing-content-wrapper" id="now-playing-content">
              <div class="playing-music-note-large">
                <i class="fa-solid fa-compact-disc spin-animation"></i>
              </div>
              <div class="playing-details-large">
                <h3 id="playing-title" class="playing-title-large">暂无演唱歌曲</h3>
                <p id="playing-singer" class="playing-singer-large">点歌后即可在歌单开始</p>
                <div class="playing-meta-info">
                  <div class="playing-request-by-large" style="display: inline-flex; align-items: center; flex-wrap: wrap; gap: 6px;">
                    点歌人: <span id="playing-user-badge" class="badge-user">--</span>
                    <span id="playing-dedicate-badge" class="dedicate-tag hidden"></span>
                  </div>
                  <!-- Reaction Count Stats Display -->
                  <div class="playing-reaction-summary" id="playing-reaction-summary">
                    <span class="stat-reaction" title="收到的玫瑰"><span class="reaction-emoji">🌹</span> <span id="count-rose">0</span></span>
                    <span class="stat-reaction" title="收到的掌声"><span class="reaction-emoji">👏</span> <span id="count-clap">0</span></span>
                    <span class="stat-reaction" title="被扔的鸡蛋"><span class="reaction-emoji">🥚</span> <span id="count-egg">0</span></span>
                    <span class="stat-reaction" title="被扔的皮鞋"><span class="reaction-emoji">👞</span> <span id="count-shoe">0</span></span>
                  </div>
                </div>
              </div>
              
              <!-- Large Visualizer Bars -->
              <div class="music-visualizer-large" id="visualizer-bars">
                <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
              </div>
            </div>`;

const newNowPlaying = `            <div class="playing-header">
              <div class="playing-label">
                <span class="indicator-dot blinking"></span> 正在演唱 / Now Playing
              </div>
              <!-- Accompaniment Link Button -->
              <a href="#" target="_blank" id="playing-link-btn" class="accompaniment-btn hidden" title="打开点歌人提供的伴奏链接">
                <i class="fa-solid fa-up-right-from-square"></i> 打开伴奏链接
              </a>
            </div>
            
            <div class="playing-content-wrapper" id="now-playing-content" style="display:flex; flex-direction:row; align-items:center; justify-content:space-between; width:100%; padding: 10px 0;">
              <!-- Left side: Disc -->
              <div class="playing-icon-wrapper" style="position:relative; width: 110px; height: 110px; flex-shrink:0;">
                <i id="playing-music-note" class="fa-solid fa-compact-disc playing-music-note-large pulse-glow fa-spin" style="position:absolute; inset:0; font-size:110px; color:var(--color-primary); line-height: 110px;"></i>
                <img id="playing-avatar-disc" src="" class="playing-avatar-disc hidden" style="position:absolute; top:27px; left:27px; width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid var(--color-secondary); animation: spin 4s linear infinite; z-index: 2;">
              </div>
              
              <!-- Center side: Details -->
              <div class="playing-details-large" style="flex-grow:1; text-align:center; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                <h3 id="playing-title" class="playing-title-large" style="font-size: 2.2rem; margin-bottom: 4px;">等待点歌...</h3>
                <p id="playing-singer" class="playing-singer-large" style="font-size: 1.1rem; opacity: 0.8; margin-bottom: 12px;">点歌后即可在歌单开始</p>
                <div class="playing-request-by-large" style="display: flex; justify-content: center; width: 100%;">
                  <span id="playing-user-badge" class="badge-user-singing" style="background: linear-gradient(135deg, #00f0ff, #ff2a85); padding: 6px 16px; border-radius: 20px; color: white; font-weight: bold; display: flex; align-items: center; gap: 8px;"><i class="fa-solid fa-microphone"></i> --</span>
                  <span id="playing-dedicate-badge" class="dedicate-tag hidden" style="margin-left: 10px; vertical-align: middle;"></span>
                </div>
              </div>
              
              <!-- Right side: Visualizer -->
              <div class="music-visualizer-large" id="visualizer-bars" style="flex-shrink:0; transform: scale(0.9);">
                <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
              </div>
            </div>`;

if (html.includes(oldNowPlaying)) {
    html = html.replace(oldNowPlaying, newNowPlaying);
    console.log("Successfully replaced Now Playing card");
} else {
    console.log("Failed to find Now Playing card snippet");
    fs.writeFileSync('failed_nowplaying.txt', html);
}

fs.writeFileSync('public/index.html', html, 'utf8');
console.log('HTML fixes applied!');
