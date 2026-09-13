# YT Favorites — LG webOS TV App

A YouTube app for LG webOS TVs: search for channels, save favorites, and
resume recently watched videos from the home screen.

## What it does

- **Home screen** (landing page):
  - Top row: **Continue Watching** — your 3 most recently watched videos,
    with a progress bar, resuming from where you left off.
  - Below: your **Favorite Channels**, as a browsable row.
- **Search**: look up any YouTube channel by name.
- **Channel page**: browse a channel's recent uploads and add/remove it
  as a favorite.
- **Player**: plays video via the YouTube IFrame Player API, full remote
  control support (D-pad to navigate, OK to select, Back to go back /
  exit).

Favorites and watch history are stored locally on the TV (`localStorage`),
so nothing needs a backend server.

## 1. Get a YouTube Data API key

This app calls the YouTube Data API v3 directly from the TV, so you need
your own key:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or use an existing one).
3. Enable **YouTube Data API v3** under "APIs & Services" → "Library".
4. Create an API key under "APIs & Services" → "Credentials".
5. (Recommended) Restrict the key to the YouTube Data API v3.
6. Open `js/config.js` and paste your key into `YT_API_KEY`.

Notes:
- The free quota is 10,000 units/day. A channel search costs 100 units;
  loading a channel's videos costs ~2 units. That's plenty for personal use.
- Because the key ships inside the app package, don't publish this app
  publicly with your personal key — restrict it (by API) at minimum, and
  treat this as a personal/sideloaded app.

## 2. Install the webOS TV SDK tooling

You need the `ares-cli` command-line tools from LG:

```bash
npm install -g @webosose/ares-cli
```

Full setup guide: https://webostv.developer.lge.com/develop/tools/cli-installation

Enable **Developer Mode** on your LG TV via the Developer Mode app
(available on LG Content Store), and note the IP address it shows.

## 3. Register your TV as a target device

```bash
ares-setup-device
```

Follow the prompts to add your TV using the IP address and passphrase
shown in the Developer Mode app on the TV.

## 4. Package and install the app

From the project root (the folder containing `appinfo.json`):

```bash
ares-package .
# produces something like com.khaled.ytfavorites_1.0.0_all.ipk

ares-install com.khaled.ytfavorites_1.0.0_all.ipk -d <device-name>

ares-launch com.khaled.ytfavorites -d <device-name>
```

`<device-name>` is whatever name you gave the TV during `ares-setup-device`
(default is often `tv`).

## 5. For active development (no repackaging every change)

```bash
ares-launch com.khaled.ytfavorites -d <device-name> -o
```

Or use `ares-server` / the webOS Studio VS Code extension for live reload
while iterating on `index.html` / `css` / `js`.

## Project structure

```
webos-youtube-app/
├── appinfo.json        # webOS app manifest
├── index.html          # app shell, all views
├── css/style.css        # TV-optimized styling + focus states
├── js/
│   ├── config.js        # <- put your YouTube API key here
│   ├── storage.js        # favorites + watch history (localStorage)
│   ├── youtubeApi.js     # YouTube Data API v3 calls
│   ├── navigation.js     # D-pad spatial navigation for remote control
│   ├── player.js         # YouTube IFrame Player + progress tracking
│   └── app.js            # view routing & rendering
└── icons/               # app icons + splash (placeholders — swap these out)
```

## Remote control mapping

| Remote button | Behavior |
|---|---|
| D-pad (arrows) | Move focus between cards/buttons |
| OK / Enter | Select focused item |
| Back | Go back one view; exits the app from the Home screen |

## Known limitations / things to customize before real use

- **Icons** in `icons/` are plain placeholders — replace with real artwork
  (webOS wants 80×80 and 130×130 PNGs, plus a splash image).
- **No OAuth / private data**: this only uses the public YouTube Data API
  (search, channel info, playlist items), so it can't show subscriptions
  tied to a Google account — only channels the user explicitly searches
  for and favorites inside the app.
- **Continue Watching** resumes based on a locally-tracked timestamp
  saved every 5 seconds during playback — it's a good approximation, not
  frame-accurate.
- Search only matches by channel name (as requested); it doesn't do
  general video search.
