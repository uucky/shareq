import { escapeHtml, getSafeHttpUrl } from './dom.js';
import { state } from './state.js';

function toCount(value) {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) {
    return 0;
  }

  return Math.floor(count);
}

// Modal Toggle for Archive report
export function openArchiveModal() {
  document.getElementById('archive-modal').classList.remove('hidden');
}

export function closeArchiveModal() {
  document.getElementById('archive-modal').classList.add('hidden');
}

// EXPORT EGG: Generate high fidelity interactive HTML file with live column sorting
export function downloadSessionArchive() {
  const allSongs = [];
  const exportTimestamp = Date.now();
  const roomIdForHtml = escapeHtml(state.currentRoomId);
  const roomIdForDownload = String(state.currentRoomId || 'ROOM').replace(/[^\w-]/g, '_') || 'ROOM';

  // Render completed history
  state.historyPlaylist.forEach((s, idx) => {
    allSongs.push({
      order: idx + 1,
      status: '已唱 (Sung)',
      title: s.title,
      singer: s.singer || '无',
      link: s.link || '',
      requestedBy: s.requestedBy,
      rose: toCount(s.reactions?.rose),
      clap: toCount(s.reactions?.clap),
      egg: toCount(s.reactions?.egg),
      shoe: toCount(s.reactions?.shoe),
      utc: Number(s.completedAt) || 0
    });
  });

  // Render current queue
  state.playlist.forEach((s, idx) => {
    allSongs.push({
      order: state.historyPlaylist.length + idx + 1,
      status: idx === 0 ? '正在演唱 (Now Playing)' : '排队中 (Queued)',
      title: s.title,
      singer: s.singer || '无',
      link: s.link || '',
      requestedBy: s.requestedBy,
      rose: toCount(s.reactions?.rose),
      clap: toCount(s.reactions?.clap),
      egg: toCount(s.reactions?.egg),
      shoe: toCount(s.reactions?.shoe),
      utc: idx === 0 ? -1 : 0 // -1 represents Now Playing, 0 represents Queued
    });
  });

  // Calculate Top Singers (by completed history songs)
  const singerCounts = {};
  state.historyPlaylist.forEach((s) => {
    const name = s.requestedBy;
    singerCounts[name] = (singerCounts[name] || 0) + 1;
  });
  const topSingers = Object.entries(singerCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  let topSingersHtml = '';
  if (topSingers.length === 0) {
    topSingersHtml = "<li style='color: #676c8c; list-style: none; margin-left: -20px;'>暂无已唱歌曲</li>";
  } else {
    const medals = ['🥇', '🥈', '🥉', '🔹', '🔹'];
    topSingers.forEach((item, idx) => {
      topSingersHtml += `<li style='margin-bottom: 6px;'>${medals[idx] || '🔹'} <strong>${escapeHtml(item.name)}</strong> - 演唱了 ${item.count} 首</li>`;
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
  state.playlist.forEach(addArtist);
  state.historyPlaylist.forEach(addArtist);
  const topArtists = Object.entries(artistCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  let topArtistsHtml = '';
  if (topArtists.length === 0) {
    topArtistsHtml = "<li style='color: #676c8c; list-style: none; margin-left: -20px;'>暂无歌手点播数据</li>";
  } else {
    topArtists.forEach((item) => {
      topArtistsHtml += `<li style='margin-bottom: 6px;'>🔥 <strong>${escapeHtml(item.name)}</strong> - 被点播 ${item.count} 次</li>`;
    });
  }

  // Calculate Top Liked Songs
  const songLikes = [];
  const addSongLikes = (s) => {
    const reacts = s.reactions || { rose: 0, clap: 0, egg: 0, shoe: 0 };
    const score = toCount(reacts.rose) + toCount(reacts.clap);
    songLikes.push({
      title: s.title,
      singer: s.singer || '未知',
      score: score
    });
  };
  if (state.playlist.length > 0) {
    addSongLikes(state.playlist[0]);
  }
  state.historyPlaylist.forEach(addSongLikes);

  const topSongs = songLikes
    .sort((a, b) => b.score - a.score)
    .filter((s) => s.score > 0)
    .slice(0, 5);

  let topSongsHtml = '';
  if (topSongs.length === 0) {
    topSongsHtml = "<li style='color: #676c8c; list-style: none; margin-left: -20px;'>暂无点赞互动金曲</li>";
  } else {
    topSongs.forEach((item) => {
      topSongsHtml += `<li style='margin-bottom: 6px;'>👍 <strong>${escapeHtml(item.title)}</strong> (${escapeHtml(item.singer)}) - 获赞 ${item.score} 次</li>`;
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
      存档时间：<span id="exportTime" data-utc="${exportTimestamp}">${new Date(exportTimestamp).toISOString()}</span> | 房间号：${roomIdForHtml}
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

  allSongs.forEach((s) => {
    const badgeClass = s.status.includes('已唱')
      ? 'badge-sung'
      : s.status.includes('正在')
        ? 'badge-singing'
        : 'badge-queued';
    const safeLink = getSafeHttpUrl(s.link);
    const linkTag = safeLink
      ? `<a class="link-btn" href="${escapeHtml(safeLink)}" target="_blank" rel="noopener noreferrer">🔗 打开伴奏</a>`
      : '<span style="color: #676c8c;">-</span>';
    const utc = Number(s.utc) || 0;

    let initialTimeStr = '待唱';
    if (utc === -1) {
      initialTimeStr = '正在唱';
    } else if (utc > 0) {
      initialTimeStr = new Date(utc).toISOString();
    }

    html += `
        <tr>
          <td style="font-weight: bold; font-family: monospace;">${s.order}</td>
          <td><span class="badge ${badgeClass}">${escapeHtml(s.status)}</span></td>
          <td style="font-weight: bold; color: white;">${escapeHtml(s.title)}</td>
          <td>${escapeHtml(s.singer)}</td>
          <td>${escapeHtml(s.requestedBy)}</td>
          <td>${linkTag}</td>
          <td style="font-family: monospace;">🌹 ${s.rose} | 👏 ${s.clap} | 🥚 ${s.egg} | 👞 ${s.shoe}</td>
          <td class="time-cell" data-utc="${utc}">${escapeHtml(initialTimeStr)}</td>
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
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `ShareQ_KTV_${roomIdForDownload}_Session_Archive.html`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
