import { clearChildren, createElement } from './dom.js';
import { state } from './state.js';

// Compute KTV Session statistics
export function renderStats() {
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
  state.historyPlaylist.forEach(s => {
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
  clearChildren(statsSingersList);
  if (topSingers.length === 0) {
    statsSingersList.appendChild(createElement("div", {
      className: "no-stats-msg",
      text: "暂无歌手数据",
      style: "color:var(--text-muted); font-size:0.85rem; padding:10px;"
    }));
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
      row.appendChild(createElement("span", {
        className: "stats-rank",
        text: medals[idx] || "🔹"
      }));
      row.appendChild(createElement("span", {
        className: "stats-name",
        text: item.name,
        style: "flex:1; margin-left:10px;"
      }));
      row.appendChild(createElement("span", {
        className: "stats-count",
        text: `${item.count} 首`,
        style: "font-weight:600; color:var(--color-primary);"
      }));
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
  state.playlist.forEach(addArtist);
  state.historyPlaylist.forEach(addArtist);

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
  clearChildren(statsArtistsList);
  if (topArtists.length === 0) {
    statsArtistsList.appendChild(createElement("div", {
      className: "no-stats-msg",
      text: "暂无歌手点播数据",
      style: "color:var(--text-muted); font-size:0.85rem; padding:10px;"
    }));
  } else {
    topArtists.slice(0, 5).forEach(item => {
      const row = document.createElement("div");
      row.className = "stats-row-item";
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.padding = "8px 12px";
      row.style.borderBottom = "1px solid var(--border-color)";
      row.style.fontSize = "0.9rem";

      row.appendChild(createElement("span", {
        className: "stats-rank",
        text: "🔥"
      }));
      row.appendChild(createElement("span", {
        className: "stats-name",
        text: item.name,
        style: "flex:1; margin-left:10px;"
      }));
      row.appendChild(createElement("span", {
        className: "stats-count",
        text: `${item.count} 次`,
        style: "font-weight:600; color:var(--color-secondary);"
      }));
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
  if (state.playlist.length > 0) {
    addSongLikes(state.playlist[0]);
  }
  state.historyPlaylist.forEach(addSongLikes);

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
