# ReadToRelay

https://github.com/user-attachments/assets/08eea680-c6de-4d72-a6fe-b757fb997192

A Chrome extension that extracts readable content from web pages and posts it to Nostr, in Markdown, as a Kind 30023 long-form article.

**_Disclaimer: This app was vibe-coded pretty quickly. It is safe with nsecs, but the code is kind of a mess. It does what it claims to, though._**

## What it does

1. **Click the extension icon** on any article/blog post
2. **Read the content** in a clean, distraction-free interface
3. **Login with your nsec** (stored locally only)
4. **Post to Nostr** as formatted Markdown with source attribution

## Installation

_For now, you have to manually install this in Chrome/Brave/etc. I'll package it up as an official extension some day_.

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked" and select the extension folder
5. The extension icon will appear in your toolbar

## Privacy

**Your nsec is never sent anywhere.** It's stored locally in Chrome's extension storage and only used to sign events on your device.

You can verify this by checking the code:
- **Storage**: `reader.js` lines 24-35 (saves to `chrome.storage.local`)
- **Signing**: `reader.js` lines 285-286 (uses local key with `finalizeEvent`)
- **No network calls** except to Nostr relays for posting

## Features

- Clean reading interface with dark mode
- Adjustable font size
- HTML to Markdown conversion
- Custom relay management
- Source attribution on all posts

