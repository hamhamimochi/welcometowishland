const HERO_CONFIG = {
  title: "NCT WISH 'I SPY' MV",
  description: " NCT WISH's 4th mini album \"I SPY\" is out! ",
  youtubeUrl: "https://youtu.be/xIlFjHHUfI0"
};

let allVideos = [];
let currentMember = "ALL";
let currentSeries = "ALL";
let currentSearch = "";

function extractYouTubeID(url) {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.trim().match(regExp);
  return match ? match[1] : null;
}

function getThumbnailUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

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

function loadCSVData() {
  Papa.parse("data.csv", {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
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
        .filter(item => item.videoId && item.title);

      allVideos.sort((a, b) => (b.date > a.date ? 1 : -1));

      populateCategoryMenu();
      renderContent();
    },
    error: function(err) {
      document.getElementById("content-container").innerHTML =
        `<div class="empty-state">找不到 data.csv 檔案，請確認已將匯出的檔案命名為 data.csv 並放在同一資料夾中。</div>`;
    }
  });
}

function populateCategoryMenu() {
  const menu = document.getElementById("category-menu");
  if (!menu) return;

  const seriesOldestDate = {};
  allVideos.forEach(video => {
    if (!video.date) return;
    if (!seriesOldestDate[video.series] || video.date < seriesOldestDate[video.series]) {
      seriesOldestDate[video.series] = video.date;
    }
  });

  const uniqueSeries = [...new Set(allVideos.map(v => v.series))].sort((a, b) => {
    if (a === "外部綜藝") return 1;
    if (b === "外部綜藝") return -1;
    const dateA = seriesOldestDate[a] || "9999-99-99";
    const dateB = seriesOldestDate[b] || "9999-99-99";
    return dateA.localeCompare(dateB);
  });

  menu.innerHTML = `<button type="button" class="category-item active" data-series="ALL">全部類別</button>`;
  uniqueSeries.forEach(series => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "category-item";
    btn.dataset.series = series;
    btn.textContent = series;
    menu.appendChild(btn);
  });
}

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

function renderContent() {
  const container = document.getElementById("content-container");
  container.innerHTML = "";

  const filtered = allVideos.filter(video => {
    const matchMember =
      currentMember === "ALL" ||
      video.members.includes(currentMember);

    const matchSeries =
      currentSeries === "ALL" ||
      video.series === currentSeries;

    const keyword = currentSearch.toLowerCase();
    const matchSearch =
      !keyword ||
      video.title.toLowerCase().includes(keyword) ||
      video.series.toLowerCase().includes(keyword) ||
      video.date.includes(keyword);

    return matchMember && matchSeries && matchSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state">找不到符合條件的影片，試試看其他關鍵字或切換成員吧！</div>`;
    return;
  }

  if (currentSearch !== "" || currentMember !== "ALL" || currentSeries !== "ALL") {
    const header = document.createElement("div");
    header.className = "series-header";
    const headerTitle = currentSeries !== "ALL" ? currentSeries : "篩選結果";
    header.innerHTML = `
      <h2 class="series-title">${headerTitle}</h2>
      <span class="series-count">共 ${filtered.length} 部影片</span>
    `;
    container.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "grid-wall";
    filtered.forEach(video => grid.appendChild(createVideoCard(video)));
    container.appendChild(grid);
    return;
  }

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

  document.querySelectorAll(".filter-chip:not(.category-trigger)").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip:not(.category-trigger)").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentMember = chip.dataset.member;
      renderContent();
    });
  });

  const dropdown = document.getElementById("category-dropdown");
  const categoryBtn = document.getElementById("category-btn");
  const categoryMenu = document.getElementById("category-menu");
  const categoryLabel = document.getElementById("category-label");

  categoryBtn.addEventListener("click", e => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  categoryMenu.addEventListener("click", e => {
    const item = e.target.closest(".category-item");
    if (!item) return;

    categoryMenu.querySelectorAll(".category-item").forEach(i => i.classList.remove("active"));
    item.classList.add("active");

    currentSeries = item.dataset.series;
    if (currentSeries === "ALL") {
      categoryLabel.textContent = "類別";
      categoryBtn.classList.remove("has-selection");
    } else {
      categoryLabel.textContent = currentSeries;
      categoryBtn.classList.add("has-selection");
    }

    dropdown.classList.remove("open");
    renderContent();
  });

  document.addEventListener("click", () => {
    dropdown.classList.remove("open");
  });

  const randomModal = document.getElementById("random-modal");
  const randomThumb = document.getElementById("random-thumb");
  const randomSeries = document.getElementById("random-series");
  const randomDate = document.getElementById("random-date");
  const randomTitle = document.getElementById("random-title");
  const randomWatchBtn = document.getElementById("random-watch-btn");
  let lastRandomId = null;

  function pickAndShowRandomVideo() {
    if (allVideos.length === 0) return;

    const pool = allVideos.filter(video => {
      const matchMember = currentMember === "ALL" || video.members.includes(currentMember);
      const matchSeries = currentSeries === "ALL" || video.series === currentSeries;
      return matchMember && matchSeries;
    });

    const sourceList = pool.length > 0 ? pool : allVideos;
    let candidates = sourceList.filter(v => v.videoId !== lastRandomId);
    if (candidates.length === 0) candidates = sourceList;

    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    lastRandomId = picked.videoId;

    randomThumb.src = getThumbnailUrl(picked.videoId);
    randomThumb.onerror = function() {
      if (this.src.includes("maxresdefault")) {
        this.src = `https://img.youtube.com/vi/${picked.videoId}/hqdefault.jpg`;
      }
    };
    randomThumb.alt = picked.title;
    randomSeries.textContent = picked.series;
    randomDate.textContent = picked.date;
    randomTitle.textContent = picked.title;
    randomWatchBtn.href = picked.url;

    randomModal.classList.add("open");
  }

  document.getElementById("random-btn").addEventListener("click", pickAndShowRandomVideo);
  document.getElementById("random-reroll-btn").addEventListener("click", pickAndShowRandomVideo);

  document.getElementById("close-random").addEventListener("click", () => {
    randomModal.classList.remove("open");
  });

  randomModal.addEventListener("click", e => {
    if (e.target === randomModal) {
      randomModal.classList.remove("open");
    }
  });

  document.getElementById("reset-home").addEventListener("click", e => {
    e.preventDefault();
    searchInput.value = "";
    currentSearch = "";
    clearBtn.classList.remove("visible");
    currentMember = "ALL";
    document.querySelectorAll(".filter-chip:not(.category-trigger)").forEach(c => c.classList.remove("active"));
    document.querySelector('.filter-chip[data-member="ALL"]').classList.add("active");

    currentSeries = "ALL";
    categoryLabel.textContent = "類別";
    categoryBtn.classList.remove("has-selection");
    categoryMenu.querySelectorAll(".category-item").forEach(i => i.classList.remove("active"));
    const allCat = categoryMenu.querySelector('.category-item[data-series="ALL"]');
    if (allCat) allCat.classList.add("active");

    renderContent();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", () => {
    document.getElementById("navbar").classList.toggle("scrolled", window.scrollY > 40);
  });

  const helpBtn = document.getElementById("help-btn");
  const helpModal = document.getElementById("help-modal");
  const closeHelp = document.getElementById("close-help");

  if (helpBtn && helpModal && closeHelp) {
    helpBtn.addEventListener("click", () => {
      helpModal.classList.add("open");
    });

    closeHelp.addEventListener("click", () => {
      helpModal.classList.remove("open");
    });

    helpModal.addEventListener("click", e => {
      if (e.target === helpModal) {
        helpModal.classList.remove("open");
      }
    });
  }
});