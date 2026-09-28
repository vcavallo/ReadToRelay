# ReadToRelay

![icon](icons/icon128-dark.png)

A browser extension (Chrome and Firefox) **and website** that extracts readable content from web pages and posts it to Nostr as Markdown.

<https://github.com/user-attachments/assets/08eea680-c6de-4d72-a6fe-b757fb997192>

_The extension/website posts the notes to **your npub**. The "Archiver" npub above was just for that demonstration_.

## What it does

### Browser Extension

1. **Click the extension icon** on any web site - wiki pages, blog posts, "paywalled" news articles...
2. **Read the content** in a clean, distraction-free interface
3. **Login with your nsec** (stored locally only)
4. **Post to Nostr** as formatted Markdown

### Website

1. **Enter any URL** on the ReadToRelay website
2. **Read the extracted content** in a clean interface
3. **Login with your nsec** (stored locally in your browser)
4. **Post to Nostr** as formatted Markdown

**Note: the website will likely not work to extract most sites and won't have your auth to accounts for paid platforms.** We probably shouldn't include it at all, actually.

## Installation

### Browser Extension - Chrome/Brave

Find it on the [Chrome web store here](https://chromewebstore.google.com/detail/gfncdikmbmefjjbahjhgkodnhepikecj)

Or install it manually (for fun or development purposes):

1. Download or clone this repository
2. Run `npm install && npm run build` (assembles `dist/chrome/` and `dist/firefox/`)
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" (top right toggle)
5. Click "Load unpacked" and select the `dist/chrome/` folder
6. The extension icon will appear in your toolbar

### Browser Extension - Firefox

_Firefox Add-ons listing coming soon. **Now in review!**_

Install it manually (temporary add-on, removed when Firefox restarts):

1. Download or clone this repository
2. Run `npm install && npm run build`
3. Open Firefox and go to `about:debugging#/runtime/this-firefox`
4. Click "Load Temporary Add-on…" and select `dist/firefox/manifest.json`
5. The extension icon will appear in your toolbar (you may need to pin it from the puzzle-piece menu)

Alternatively, `npx web-ext run --source-dir dist/firefox` launches a fresh Firefox profile with the extension pre-loaded.

## Development

The Chrome and Firefox builds share all their code; only the manifest differs:

- `manifest.chrome.json` — uses a `background.service_worker`
- `manifest.firefox.json` — uses `background.scripts` (Firefox MV3 doesn't support service workers) plus the `browser_specific_settings.gecko` block required by Mozilla: the pinned add-on ID, `strict_min_version` (142, the first version supporting `data_collection_permissions` on Android), and the `data_collection_permissions` declaration that AMO requires for new submissions

Scripts:

- `npm run build` — assembles `dist/chrome/` and `dist/firefox/`, each loadable unpacked
- `npm run package` — builds, then zips both as `dist/readtorelay-<browser>-v<version>.zip` for store submission
- `npm run lint:firefox` — runs Mozilla's `web-ext lint` against the Firefox build

To bump the version, update it in **both** manifest files.

### Website

1. Open the `website/index.html` file in your browser, or
2. Host the `website/` folder on any web server (GitHub Pages, Netlify, etc.)

The website uses:

- CDN-hosted libraries (nostr-tools, turndown, readability)
- A CORS proxy (allorigins.win) to fetch pages from other domains
- LocalStorage for your nsec, preferences, and relay settings

#### URL Parameter / Bookmarklet Usage

You can pass URLs directly to ReadToRelay by appending them to the URL:

```
file:///path/to/website/index.html#url=https://example.com/article
```

Or if hosted:

```
https://yoursite.com/#url=https://example.com/article
```

This works great as a **bookmarklet**! Create a bookmark with this JavaScript:

```javascript
javascript:(function(){window.open('file:///path/to/ReadToRelay/website/index.html#url='+encodeURIComponent(window.location.href));})();
```

Replace `file:///path/to/ReadToRelay/website/index.html` with your actual path or hosted URL.

#### Mobile Share Target (PWA)

Like the website note above, as a PWA, it won't be logged in to any sites for which you have a privileged account, removing a lot of the utility of the tool...

When hosted on a server with HTTPS:

1. Open the website on your mobile device
2. **"Add to Home Screen"** from your browser menu
3. Now when you **"Share" any webpage** from your browser or apps, you'll see **ReadToRelay** as a share option!
4. Sharing to ReadToRelay will automatically extract and load the article

**Note:** The share target feature requires:

- HTTPS hosting (not available when opening index.html locally)
- Installing the PWA to your home screen
- Modern mobile browser (Chrome, Safari, Edge, etc.)

## Privacy

**Your nsec is never sent anywhere.** It's stored locally (extension storage or browser localStorage) and only used to sign events on your device. See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

You can verify this by checking the code:

- **Extension Storage**: `saveSecretKey()` in `reader.js` (saves to extension-local storage: `chrome.storage.local` / `browser.storage.local`)
- **Website Storage**: `website/app.js` (saves to `localStorage`)
- **Signing**: Uses local key with `NostrTools.finalizeEvent`
- **No network calls** except to Nostr relays for posting (and the CORS proxy for the website)

## Features

- Clean reading interface with dark mode
- Adjustable font size
- HTML to Markdown conversion
- Relay management with "public" defaults

![icon](icon-with-bg.jpg)
