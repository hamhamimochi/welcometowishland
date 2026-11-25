
const HERO_CONFIG = {
  title: "NCT WISH 'I SPY' MV",
  description: " NCT WISH's 4th mini album \"I SPY\" is out! ",
  youtubeUrl: "https://youtu.be/xIlFjHHUfI0" // MV 
};


let allVideos = [];
let currentMember = "ALL";
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

      renderContent();
    },
    error: function(err) {
      document.getElementById("content-container").innerHTML =
        `<div class="empty-state">找不到 data.csv 檔案，請確認已將 Notion 匯出的檔案命名為 data.csv 並放在同一資料夾中。</div>`;
    }
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

  
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentMember = chip.dataset.member;
      renderContent();
    });
  });

  
  document.getElementById("random-btn").addEventListener("click", () => {
    if (allVideos.length === 0) return;
    const randomVideo = allVideos[Math.floor(Math.random() * allVideos.length)];
    window.open(randomVideo.url, "_blank", "noopener,noreferrer");
  });

  
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

 
  window.addEventListener("scroll", () => {
    document.getElementById("navbar").classList.toggle("scrolled", window.scrollY > 40);
  });
});