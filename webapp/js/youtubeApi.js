// ---------------------------------------------------------------
// Thin wrapper around the YouTube Data API v3.
// Requires window.APP_CONFIG.YT_API_KEY to be set (see config.js).
// ---------------------------------------------------------------
const YouTubeAPI = (() => {
  const { YT_API_BASE, YT_API_KEY } = window.APP_CONFIG;

  async function _get(endpoint, params) {
    const url = new URL(`${YT_API_BASE}/${endpoint}`);
    params.key = YT_API_KEY;
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`YouTube API error ${res.status}: ${body}`);
    }
    return res.json();
  }

  // Search for channels by name -> normalized list
  async function searchChannels(query) {
    const data = await _get("search", {
      part: "snippet",
      type: "video",
      q: query,
      maxResults: window.APP_CONFIG.MAX_SEARCH_RESULTS
    });
    return (data.items || []).map(item => ({
      channelId: item.snippet.channelId || item.id.channelId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      description: item.snippet.description
    }));
  }

  // Get a channel's uploads playlist ID + basic info
  async function getChannelDetails(channelId) {
    const data = await _get("channels", {
      part: "snippet,contentDetails",
      id: channelId
    });
    const item = data.items && data.items[0];
    if (!item) throw new Error("Channel not found");
    return {
      channelId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads
    };
  }

  // Get recent videos from a channel's uploads playlist
  async function getChannelVideos(uploadsPlaylistId) {
    const data = await _get("playlistItems", {
      part: "snippet,contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: window.APP_CONFIG.MAX_CHANNEL_VIDEOS
    });
    return (data.items || [])
      .filter(item => item.snippet.thumbnails) // skip removed/private videos
      .map(item => ({
        videoId: item.contentDetails.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle
      }));
  }

  return { searchChannels, getChannelDetails, getChannelVideos };
})();
