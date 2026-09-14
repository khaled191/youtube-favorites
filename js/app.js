// ---------------------------------------------------------------
// App controller: view routing, rendering, and event wiring.
// ---------------------------------------------------------------
const App = (() => {
  let viewStack = ["view-home"];
  let currentChannel = null; // { channelId, title, thumbnail, uploadsPlaylistId }

  function fmtDuration(sec) {
    if (!sec) return "";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function showView(viewId, { pushHistory = true } = {}) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById(viewId).classList.add("active");
    if (pushHistory) {
      viewStack.push(viewId);
    }
    if (viewId !== "view-player") Player.stop();
    setTimeout(Nav.focusFirst, 50);
  }

  function goBack() {
    if (viewStack.length > 1) {
      viewStack.pop();
      const prev = viewStack[viewStack.length - 1];
      showView(prev, { pushHistory: false });
    } else {
      // At home with nothing to go back to -> exit the app.
      // webOS intercepts window.close() on an app's root window and
      // terminates the app with it — this works whether or not the
      // webOSTV.js helper library is loaded, so it's safe for both
      // packaged and hosted apps.
      window.close();
    }
  }

  // ---------------- Card builders ----------------
  function buildVideoCard(video, { showProgress = false } = {}) {
    const card = document.createElement("div");
    card.className = "card focusable";
    card.tabIndex = 0;

    const progressPct = (showProgress && video.durationSeconds)
      ? Math.min(100, Math.floor((video.progressSeconds / video.durationSeconds) * 100))
      : 0;

    card.innerHTML = `
      <img src="${video.thumbnail}" alt="">
      <div class="card-title">${video.title}</div>
      <div class="card-sub">${video.channelTitle || ""}</div>
      ${showProgress ? `<div class="progress-bar"><div class="progress-fill" style="width:${progressPct}%"></div></div>` : ""}
    `;
    card.addEventListener("click", () => {
      Player.playVideo({
        videoId: video.videoId,
        title: video.title,
        thumbnail: video.thumbnail,
        channelId: video.channelId,
        channelTitle: video.channelTitle,
        resumeSeconds: showProgress ? video.progressSeconds : 0,
        durationSeconds: video.durationSeconds
      });
      showView("view-player");
    });
    return card;
  }

  function buildChannelCard(channel) {
    const card = document.createElement("div");
    card.className = "card channel-card focusable";
    card.tabIndex = 0;
    card.innerHTML = `
      <img src="${channel.thumbnail}" alt="">
      <div class="card-title">${channel.title}</div>
    `;
    card.addEventListener("click", () => openChannel(channel.channelId));
    return card;
  }

  // ---------------- Home ----------------
  function renderHome() {
    const historyRow = document.getElementById("history-row");
    const favRow = document.getElementById("favorites-row");
    const favEmpty = document.getElementById("favorites-empty");

    historyRow.innerHTML = "";
    const recent = Storage.getContinueWatching(window.APP_CONFIG.CONTINUE_WATCHING_COUNT);
    if (!recent.length) {
      document.getElementById("section-continue").style.display = "none";
    } else {
      document.getElementById("section-continue").style.display = "";
      recent.forEach(v => historyRow.appendChild(buildVideoCard(v, { showProgress: true })));
    }

    favRow.innerHTML = "";
    const favs = Storage.getFavorites();
    favEmpty.style.display = favs.length ? "none" : "block";
    favs.forEach(c => favRow.appendChild(buildChannelCard(c)));
  }

  // ---------------- Search ----------------
  async function doSearch() {
    const input = document.getElementById("search-input");
    const query = input.value.trim();
    const resultsEl = document.getElementById("search-results");
    if (!query) return;

    resultsEl.innerHTML = `<p class="empty-hint">Searching...</p>`;
    try {
      const channels = await YouTubeAPI.searchChannels(query);
      resultsEl.innerHTML = "";
      if (!channels.length) {
        resultsEl.innerHTML = `<p class="empty-hint">No channels found for "${query}".</p>`;
        return;
      }
      channels.forEach(c => resultsEl.appendChild(buildChannelCard(c)));
      setTimeout(Nav.focusFirst, 50);
    } catch (e) {
      console.error(e);
      resultsEl.innerHTML = `<p class="empty-hint">Search failed. Check your API key / network connection.</p>`;
    }
  }

  // ---------------- Channel ----------------
  async function openChannel(channelId) {
    showView("view-channel");
    const videosEl = document.getElementById("channel-videos");
    videosEl.innerHTML = `<p class="empty-hint">Loading channel...</p>`;

    try {
      const details = await YouTubeAPI.getChannelDetails(channelId);
      currentChannel = details;

      document.getElementById("channel-thumb").src = details.thumbnail;
      document.getElementById("channel-title").textContent = details.title;

      const favBtn = document.getElementById("channel-fav-btn");
      _refreshFavButton(favBtn, details.channelId);
      favBtn.onclick = () => {
        Storage.toggleFavorite({
          channelId: details.channelId,
          title: details.title,
          thumbnail: details.thumbnail
        });
        _refreshFavButton(favBtn, details.channelId);
      };

      const videos = await YouTubeAPI.getChannelVideos(details.uploadsPlaylistId);
      videosEl.innerHTML = "";
      if (!videos.length) {
        videosEl.innerHTML = `<p class="empty-hint">No videos found for this channel.</p>`;
      } else {
        videos.forEach(v => videosEl.appendChild(buildVideoCard(v)));
      }
      setTimeout(Nav.focusFirst, 50);
    } catch (e) {
      console.error(e);
      videosEl.innerHTML = `<p class="empty-hint">Could not load channel. Check your API key / network connection.</p>`;
    }
  }

  function _refreshFavButton(btn, channelId) {
    btn.textContent = Storage.isFavorite(channelId) ? "Remove from Favorites" : "Add to Favorites";
  }

  // ---------------- Init ----------------
  function init() {
    Nav.init();

    document.getElementById("nav-home").addEventListener("click", () => {
      renderHome();
      viewStack = ["view-home"];
      showView("view-home", { pushHistory: false });
    });
    document.getElementById("nav-search").addEventListener("click", () => {
      showView("view-search");
      setTimeout(() => Nav.setFocus(document.getElementById("search-input")), 60);
    });

    document.getElementById("search-btn").addEventListener("click", doSearch);
    document.getElementById("search-input").addEventListener("keydown", (e) => {
      if (e.keyCode === KEY.ENTER) doSearch();
    });

    document.addEventListener("app:back", goBack);

    // webOS: refresh "Continue Watching" progress whenever we return to Home
    document.getElementById("nav-home").addEventListener("focus", renderHome);

    renderHome();
    showView("view-home", { pushHistory: false });
  }

  return { init, renderHome, showView, goBack, openChannel };
})();

document.addEventListener("DOMContentLoaded", App.init);
