# YT Favorites — LG webOS TV App

A YouTube app for LG webOS TVs: search for channels, save favorites, and
resume recently watched videos from the home screen.

## Why this repo has two folders

YouTube's embedded player now **requires** a real `Referer`/origin on the
request, or it fails immediately with `Error 153 - Video player
configuration error`. A normal ("basic") packaged webOS app runs from a
`file://`-style context with no real origin — browsers never send a
`Referer` header from that context, for any app, on any platform. No
meta tag or player parameter can work around that; it's a browser
security rule, not a config option.

The fix LG's own docs recommend for this situation is a **hosted web
app**: a tiny app installed on the TV that just redirects to your real
content hosted on an actual `https://` server, which gives it a real
origin YouTube will accept. So this repo is split into:

```
webos-youtube-app/
├── launcher/       ← the small app you install on the TV (ares-package this)
│   ├── appinfo.json
│   ├── index.html   ← redirects to your hosted app's URL
│   └── icons/
└── webapp/         ← the actual app — deploy this to a real https:// host
    ├── index.html
    ├── css/style.css
    └── js/
```

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

Favorites and watch history are stored locally on the TV (`localStorage`,
scoped to the hosted app's origin), so nothing needs a backend server.

## 1. Get a YouTube Data API key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or use an existing one).
3. Enable **YouTube Data API v3** under "APIs & Services" → "Library".
4. Create an API key under "APIs & Services" → "Credentials".
5. Restrict the key to the YouTube Data API v3, and — since this key
   will be visible in your hosted app's source — restrict it by HTTP
   referrer to the domain you deploy `webapp/` to.
6. Open `webapp/js/config.js` and paste your key into `YT_API_KEY`.

## 2. Deploy `webapp/` to a real https:// host

Any static host works. The simplest option, since this is already a git
repo, is **GitHub Pages**:

```bash
# from the repo root
git subtree push --prefix webapp origin gh-pages
```

Then enable Pages for the `gh-pages` branch in your GitHub repo settings
(Settings → Pages → Branch: gh-pages). Your app will be live at:

```
https://<your-username>.github.io/<your-repo>/
```

Other equally good options: Netlify (drag-and-drop the `webapp` folder
at netlify.com/drop), Vercel, Cloudflare Pages, or your own server —
anything that serves static files over `https://`.

## 3. Point the launcher at your hosted app

Open `launcher/index.html` and replace the placeholder URL:

```js
var HOSTED_APP_URL = "https://YOUR-USERNAME.github.io/YOUR-REPO/";
```

with the real URL from step 2.

## 4. Install the webOS TV SDK tooling

```bash
npm install -g @webosose/ares-cli
```

Full guide: https://webostv.developer.lge.com/develop/tools/cli-installation

Enable **Developer Mode** on your LG TV via the Developer Mode app
(from the LG Content Store), and note the IP address it shows.

## 5. Register your TV as a target device

```bash
ares-setup-device
```

Follow the prompts using the IP address and passphrase shown in the
Developer Mode app on the TV.

## 6. Package and install the launcher

Note: you package the `launcher/` folder, not the repo root — the
launcher is the only part that actually gets installed on the TV.

```bash
ares-package launcher
# produces something like com.khaled.ytfavorites_1.0.0_all.ipk

ares-install com.khaled.ytfavorites_1.0.0_all.ipk -d <device-name>

ares-launch com.khaled.ytfavorites -d <device-name>
```

`<device-name>` is whatever name you gave the TV during `ares-setup-device`
(default is often `tv`).

## Updating the app afterwards

Because the real app lives on your host, most changes (UI, features, API
key) just need a re-deploy of `webapp/` — no repackaging or reinstalling
on the TV. You only need to repackage/reinstall the `launcher/` if you
change the redirect URL, icons, or `appinfo.json`.

## Troubleshooting

**Still see Error 153 after switching to a hosted app:**
- Confirm the TV is actually landing on your `https://` URL. If
  `launcher/index.html` still has the placeholder URL, it'll fail to
  redirect anywhere useful.
- Some specific videos have embedding disabled by the uploader — that's
  error 101/150, not 153, but looks similar; nothing app-side fixes that.
- Use the **webOS Inspector** for a real Chrome DevTools session on the
  running app:
  ```bash
  ares-inspect -d <device-name>
  ```
  Check the Network tab for the actual request to youtube.com/embed and
  confirm a `Referer` header is present.

**Back button doesn't exit the app:**
- `window.close()` is what closes a webOS app's root window; if your TV's
  webOS version handles this differently, check the Console via
  `ares-inspect` for errors when Back is pressed at the Home screen.

## Remote control mapping

| Remote button | Behavior |
|---|---|
| D-pad (arrows) | Move focus between cards/buttons |
| OK / Enter | Select focused item |
| Back | Go back one view; exits the app from the Home screen |

## Known limitations

- **Icons** in `launcher/icons/` are plain placeholders — replace with
  real artwork (webOS wants 80×80 and 130×130 PNGs, plus a splash image).
- **No OAuth / private data**: this only uses the public YouTube Data
  API (search, channel info, playlist items), so it can't show
  subscriptions tied to a Google account — only channels the user
  explicitly searches for and favorites inside the app.
- **Continue Watching** resumes based on a locally-tracked timestamp
  saved every 5 seconds during playback — it's a good approximation, not
  frame-accurate.
- Search only matches by channel name (as requested); it doesn't do
  general video search.
