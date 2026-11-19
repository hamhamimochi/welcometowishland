// ==========================================
// 【設定區】首頁大看板 (Hero Banner) 最新 MV 設定
// 未來出新歌時，只需修改這裡的標題與 YouTube 連結即可！
// ==========================================
const HERO_CONFIG = {
  title: "NCT WISH 'I SPY' MV",
  description: " NCT WISH's 4th mini album \"I SPY\" is out! ",
  youtubeUrl: "https://youtu.be/xIlFjHHUfI0" // 請替換成你想置頂的最新 MV 連結
};

// 全域變數儲存所有影片資料
let allVideos = [];
let currentMember = "ALL";
let currentSearch = "";

// 1. 從各種 YouTube 網址格式中萃取出 11 碼 Video ID
function extractYouTubeID(url) {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.trim().match(regExp);
  return match ? match[1] : null;
}

// 2. 取得高畫質 YouTube 縮圖網址（含自動降級備援，避免舊影片沒有 maxresdefault 變黑畫面）
function getThumbnailUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// 3. 初始化首頁大看板 (Hero Banner)
function initHeroBanner() {
  const heroId = extractYouTubeID(HERO_CONFIG.youtubeUrl);
  const heroBg = document.getElementById("hero-bg");
  document.getElementById("hero-title").textContent = HERO_CONFIG.title;
  document.getElementById("hero-desc").textContent = HERO_CONFIG.description;
  document.getElementById("hero-link").href = HERO_CONFIG.youtubeUrl;

  if (heroId) {
    heroBg.style.backgroundImage = `url('https://img.youtube.com/vi/${heroId}/maxresdefault.jpg')`;
  }
}

// 4. 讀取 Notion 匯出的 data.csv
function loadCSVData() {
  Papa.parse("data.csv", {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      // 整理欄位（相容大小寫與空白）
      allVideos = results.data
        .map(row => {
          const title = (row.Title || row.title || row["名稱"] || "").trim();
          const series = (row.Series || row.series || row["系列"] || "其他企劃").trim();
          const url = (row.URL || row.url || row["連結"] || "").trim();
          const date = (row.Date || row.date || row["日期"] || "").trim();
          const membersRaw = (row.Members || row.members || row["成員"] || "OT6").trim();
          const videoId = extractYouTubeID(url);

          return {
            title,
            series,
            url,
            date,
            members: membersRaw.split(",").map(m => m.trim().toUpperCase()),
            videoId
          };
        })
        .filter(item => item.videoId && item.title); // 過濾掉沒有有效 YouTube 連結的資料

      // 依日期由新到舊排序
      allVideos.sort((a, b) => (b.date > a.date ? 1 : -1));

      renderContent();
    },
    error: function(err) {
      document.getElementById("content-container").innerHTML =
        `<div class="empty-state">找不到 data.csv 檔案，請確認已將 Notion 匯出的檔案命名為 data.csv 並放在同一資料夾中。</div>`;
    }
  });
}

// 5. 建立單張純圖片影片卡片（無常駐文字，懸停才浮現資訊）
function createVideoCard(video) {
  const card = document.createElement("a");
  card.className = "video-card";
  card.href = video.url;
  card.target = "_blank";
  card.rel = "noopener noreferrer";
  card.setAttribute("aria-label", video.title);

  const img = document.createElement("img");
  img.src = getThumbnailUrl(video.videoId);
  img.alt = video.title;
  img.loading = "lazy";
  // 若該影片沒有 1280x720 縮圖，自動降級為 hqdefault.jpg
  img.onerror = function() {
    if (this.src.includes("maxresdefault")) {
      this.src = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
    }
  };

  const overlay = document.createElement("div");
  overlay.className = "card-hover-overlay";
  overlay.innerHTML = `
    <div class="hover-title">${video.title}</div>
    <div class="hover-meta">
      <span>${video.series}</span>
      <span>${video.date}</span>
    </div>
  `;

  card.appendChild(img);
  card.appendChild(overlay);
  return card;
}

// 6. 渲染畫面（無篩選時顯示 Netflix 橫向分類列；有搜尋或成員篩選時顯示網格牆）
function renderContent() {
  const container = document.getElementById("content-container");
  container.innerHTML = "";

  // 進行條件過濾
  const filtered = allVideos.filter(video => {
    const matchMember =
      currentMember === "ALL" ||
      video.members.includes(currentMember);

    const keyword = currentSearch.toLowerCase();
    const matchSearch =
      !keyword ||
      video.title.toLowerCase().includes(keyword) ||
      video.series.toLowerCase().includes(keyword) ||
      video.date.includes(keyword);

    return matchMember && matchSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state">找不到符合條件的影片，試試看其他關鍵字或切換成員吧！</div>`;
    return;
  }

  // 模式 A：正在搜尋或篩選特定成員 -> 用整齊的網格牆展示結果
  if (currentSearch !== "" || currentMember !== "ALL") {
    const header = document.createElement("div");
    header.className = "series-header";
    header.innerHTML = `
      <h2 class="series-title">篩選結果</h2>
      <span class="series-count">共 ${filtered.length} 部影片</span>
    `;
    container.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "grid-wall";
    filtered.forEach(video => grid.appendChild(createVideoCard(video)));
    container.appendChild(grid);
    return;
  }

  // 模式 B：首頁預設模式 -> 依 Series 自動分組為橫向滑動列
  const seriesGroups = {};
  filtered.forEach(video => {
    if (!seriesGroups[video.series]) {
      seriesGroups[video.series] = [];
    }
    seriesGroups[video.series].push(video);
  });

  Object.keys(seriesGroups).forEach(seriesName => {
    const videos = seriesGroups[seriesName];
    const section = document.createElement("section");
    section.className = "series-section";

    section.innerHTML = `
      <div class="series-header">
        <h2 class="series-title">${seriesName}</h2>
        <span class="series-count">${videos.length} 集</span>
      </div>
    `;

    const slider = document.createElement("div");
    slider.className = "row-slider";
    videos.forEach(video => slider.appendChild(createVideoCard(video)));

    section.appendChild(slider);
    container.appendChild(section);
  });
}

// 7. 綁定互動事件（搜尋、成員篩選、隨機播放、導覽列滾動）
document.addEventListener("DOMContentLoaded", () => {
  initHeroBanner();
  loadCSVData();

  const searchInput = document.getElementById("search-input");
  const clearBtn = document.getElementById("clear-search");

  searchInput.addEventListener("input", e => {
    currentSearch = e.target.value.trim();
    clearBtn.classList.toggle("visible", currentSearch.length > 0);
    renderContent();
  });

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    currentSearch = "";
    clearBtn.classList.remove("visible");
    renderContent();
  });

  // 成員篩選按鈕
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentMember = chip.dataset.member;
      renderContent();
    });
  });

  // 隨機看一集按鈕
  document.getElementById("random-btn").addEventListener("click", () => {
    if (allVideos.length === 0) return;
    const randomVideo = allVideos[Math.floor(Math.random() * allVideos.length)];
    window.open(randomVideo.url, "_blank", "noopener,noreferrer");
  });

  // 點擊 Logo 重置篩選
  document.getElementById("reset-home").addEventListener("click", e => {
    e.preventDefault();
    searchInput.value = "";
    currentSearch = "";
    clearBtn.classList.remove("visible");
    currentMember = "ALL";
    document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
    document.querySelector('.filter-chip[data-member="ALL"]').classList.add("active");
    renderContent();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // 導覽列滾動變色
  window.addEventListener("scroll", () => {
    document.getElementById("navbar").classList.toggle("scrolled", window.scrollY > 40);
  });
});