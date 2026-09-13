// ---------------------------------------------------------------
// Put your own YouTube Data API v3 key here.
// Get one at: https://console.cloud.google.com/apis/credentials
// (enable "YouTube Data API v3" on the project first)
// ---------------------------------------------------------------
window.APP_CONFIG = {
  YT_API_KEY: "PUT_YOUR_YOUTUBE_DATA_API_KEY_HERE",
  YT_API_BASE: "https://www.googleapis.com/youtube/v3",
  MAX_SEARCH_RESULTS: 12,
  MAX_CHANNEL_VIDEOS: 24,
  HISTORY_LIMIT: 20,          // how many watched videos to remember total
  CONTINUE_WATCHING_COUNT: 3  // how many to show on the home row
};
