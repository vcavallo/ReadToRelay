// Assembles loadable extension directories for each browser:
//   dist/chrome  — load unpacked via chrome://extensions
//   dist/firefox — load temporary add-on via about:debugging
// `npm run package` then zips each directory for store submission.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

const shared = [
  'background.js',
  'reader.html',
  'reader.js',
  'readability.js',
  'turndown.js',
  'nostr-tools.js',
  'icons',
];

const targets = {
  chrome: 'manifest.chrome.json',
  firefox: 'manifest.firefox.json',
};

fs.rmSync(dist, { recursive: true, force: true });

for (const [browser, manifest] of Object.entries(targets)) {
  const out = path.join(dist, browser);
  fs.mkdirSync(out, { recursive: true });
  for (const entry of shared) {
    fs.cpSync(path.join(root, entry), path.join(out, entry), { recursive: true });
  }
  fs.copyFileSync(path.join(root, manifest), path.join(out, 'manifest.json'));
  console.log(`built dist/${browser}`);
}
