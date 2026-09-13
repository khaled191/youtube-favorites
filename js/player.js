// ---------------------------------------------------------------
// Wraps the YouTube IFrame Player API and records watch progress
// into Storage so "Continue Watching" can resume later.
// ---------------------------------------------------------------
const Player = (() => {
  let ytPlayer = null;
  let progressTimer = null;
  let currentMeta = null; // { videoId, title, thumbnail, channelId, channelTitle }
  let apiReady = false;
  let apiLoadPromise = null;

  function _loadIframeApi() {
    if (apiLoadPromise) return apiLoadPromise;
    apiLoadPromise = new Promise((resolve) => {
      if (window.YT && window.YT.Player) {
        apiReady = true;
        resolve();
        return;
      }
      window.onYouTubeIframeAPIReady = () => {
        apiReady = true;
        resolve();
      };
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    });
    return apiLoadPromise;
  }

  function _startProgressTracking() {
    _stopProgressTracking();
    progressTimer = setInterval(() => {
      if (!ytPlayer || !currentMeta) return;
      try {
        const t = ytPlayer.getCurrentTime();
        const d = ytPlayer.getDuration();
        Storage.updateProgress(currentMeta.videoId, Math.floor(t), Math.floor(d));
      } catch (e) { /* player not ready yet */ }
    }, 5000);
  }

  function _stopProgressTracking() {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  }

  // meta: { videoId, title, thumbnail, channelId, channelTitle, resumeSeconds }
  async function playVideo(meta) {
    currentMeta = meta;
    await _loadIframeApi();

    document.getElementById("player-title").textContent = meta.title;
    document.getElementById("player-channel").textContent = meta.channelTitle || "";

    Storage.recordWatch({
      videoId: meta.videoId,
      title: meta.title,
      thumbnail: meta.thumbnail,
      channelId: meta.channelId,
      channelTitle: meta.channelTitle,
      progressSeconds: meta.resumeSeconds || 0,
      durationSeconds: meta.durationSeconds || 0
    });

    const startAt = meta.resumeSeconds || 0;

    if (ytPlayer) {
      ytPlayer.loadVideoById({ videoId: meta.videoId, startSeconds: startAt });
    } else {
      ytPlayer = new YT.Player("player-container", {
        width: "1920",
        height: "810",
        videoId: meta.videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          start: startAt,
          rel: 0
        },
        events: {
          onReady: () => _startProgressTracking(),
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.ENDED) {
              Storage.updateProgress(meta.videoId, Math.floor(ytPlayer.getDuration()), Math.floor(ytPlayer.getDuration()));
            }
          }
        }
      });
    }
  }

  function stop() {
    _stopProgressTracking();
    if (ytPlayer) {
      try {
        // Save final progress before leaving the player view
        const t = ytPlayer.getCurrentTime();
        const d = ytPlayer.getDuration();
        if (currentMeta) Storage.updateProgress(currentMeta.videoId, Math.floor(t), Math.floor(d));
        ytPlayer.stopVideo();
      } catch (e) { /* ignore */ }
    }
  }

  return { playVideo, stop };
})();
