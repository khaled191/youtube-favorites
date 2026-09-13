// ---------------------------------------------------------------
// Storage: favorite channels + watch history.
// Uses localStorage, which persists on webOS across app restarts.
// ---------------------------------------------------------------
const Storage = (() => {
  const FAV_KEY = "yt_favorites";
  const HISTORY_KEY = "yt_history";

  function _read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error("Storage read failed for", key, e);
      return fallback;
    }
  }

  function _write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Storage write failed for", key, e);
    }
  }

  // ---------------- Favorites ----------------
  function getFavorites() {
    return _read(FAV_KEY, []);
  }

  function isFavorite(channelId) {
    return getFavorites().some(c => c.channelId === channelId);
  }

  function addFavorite(channel) {
    const favs = getFavorites();
    if (!favs.some(c => c.channelId === channel.channelId)) {
      favs.unshift(channel); // newest favorite first
      _write(FAV_KEY, favs);
    }
  }

  function removeFavorite(channelId) {
    const favs = getFavorites().filter(c => c.channelId !== channelId);
    _write(FAV_KEY, favs);
  }

  function toggleFavorite(channel) {
    if (isFavorite(channel.channelId)) {
      removeFavorite(channel.channelId);
      return false;
    }
    addFavorite(channel);
    return true;
  }

  // ---------------- Watch history ----------------
  // Each entry: { videoId, title, thumbnail, channelId, channelTitle,
  //               durationSeconds, progressSeconds, watchedAt }
  function getHistory() {
    return _read(HISTORY_KEY, []);
  }

  function getContinueWatching(limit) {
    return getHistory()
      .sort((a, b) => b.watchedAt - a.watchedAt)
      .slice(0, limit || window.APP_CONFIG.CONTINUE_WATCHING_COUNT);
  }

  function recordWatch(entry) {
    let history = getHistory();
    history = history.filter(h => h.videoId !== entry.videoId); // dedupe
    entry.watchedAt = Date.now();
    history.unshift(entry);
    history = history.slice(0, window.APP_CONFIG.HISTORY_LIMIT);
    _write(HISTORY_KEY, history);
  }

  function updateProgress(videoId, progressSeconds, durationSeconds) {
    const history = getHistory();
    const item = history.find(h => h.videoId === videoId);
    if (item) {
      item.progressSeconds = progressSeconds;
      if (durationSeconds) item.durationSeconds = durationSeconds;
      item.watchedAt = Date.now();
      _write(HISTORY_KEY, history);
    }
  }

  return {
    getFavorites, isFavorite, addFavorite, removeFavorite, toggleFavorite,
    getHistory, getContinueWatching, recordWatch, updateProgress
  };
})();
