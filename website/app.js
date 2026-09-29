(async () => {
  // State management
  let secretKey = null;
  let publicKeyHex = null;
  let currentArticle = null;
  let currentTheme = 'light';
  let currentFontSize = 18;

  // DOM elements
  const urlInput = document.getElementById("url-input");
  const extractBtn = document.getElementById("extract-btn");
  const extractStatus = document.getElementById("extract-status");

  const loginForm = document.getElementById("login-form");
  const loggedInStatus = document.getElementById("logged-in-status");
  const loginSection = document.getElementById("login-section");
  const nsecInput = document.getElementById("nsec-input");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginError = document.getElementById("login-error");
  const pubkeyDisplay = document.getElementById("pubkey-display");
  const postBtn = document.getElementById("post-btn");
  const postStatus = document.getElementById("post-status");

  const loadingState = document.getElementById("loading");
  const emptyState = document.getElementById("empty-state");
  const articleSection = document.getElementById("article-section");

  const articleTitle = document.getElementById("article-title");
  const articleByline = document.getElementById("article-byline");
  const articleUrl = document.getElementById("article-url");
  const articleContent = document.getElementById("article-content");

  const relayList = document.getElementById("relay-list");
  const newRelayInput = document.getElementById("new-relay");
  const addRelayBtn = document.getElementById("add-relay-btn");

  const tagList = document.getElementById("tag-list");
  const newTagInput = document.getElementById("new-tag");
  const addTagBtn = document.getElementById("add-tag-btn");

  const themeToggle = document.getElementById("theme-toggle");
  const fontDecrease = document.getElementById("font-decrease");
  const fontIncrease = document.getElementById("font-increase");
  const fontSizeDisplay = document.getElementById("font-size-display");

  // Authentication functions
  function loadStoredKey() {
    const stored = localStorage.getItem("secretKey");
    if (stored) {
      try {
        secretKey = new Uint8Array(JSON.parse(stored));
        publicKeyHex = NostrTools.getPublicKey(secretKey);
        updateLoginUI(true);
      } catch (e) {
        console.error("Failed to load stored key:", e);
      }
    }
  }

  function saveSecretKey(sk) {
    secretKey = sk;
    publicKeyHex = NostrTools.getPublicKey(sk);
    localStorage.setItem("secretKey", JSON.stringify(Array.from(sk)));
    updateLoginUI(true);
  }

  function clearSecretKey() {
    secretKey = null;
    publicKeyHex = null;
    localStorage.removeItem("secretKey");
    updateLoginUI(false);
  }

  function updateLoginUI(loggedIn) {
    if (loggedIn) {
      loginForm.classList.add("hidden");
      loggedInStatus.classList.remove("hidden");
      loginSection.classList.add("logged-in");
      postBtn.disabled = !currentArticle;
      pubkeyDisplay.textContent = `npub: ${NostrTools.nip19.npubEncode(publicKeyHex)}`;
    } else {
      loginForm.classList.remove("hidden");
      loggedInStatus.classList.add("hidden");
      loginSection.classList.remove("logged-in");
      postBtn.disabled = true;
    }
  }

  // Login handlers
  loginBtn.addEventListener("click", async () => {
    const nsecValue = nsecInput.value.trim();
    loginError.textContent = "";

    if (!nsecValue) {
      loginError.textContent = "Please enter your nsec or private key";
      return;
    }

    try {
      let sk;

      if (nsecValue.startsWith("nsec1")) {
        const decoded = NostrTools.nip19.decode(nsecValue);
        if (decoded.type !== "nsec") {
          throw new Error("Invalid nsec format");
        }
        sk = decoded.data;
      } else {
        sk = NostrTools.hexToBytes(nsecValue);
        if (sk.length !== 32) {
          throw new Error("Invalid private key length");
        }
      }

      saveSecretKey(sk);
      nsecInput.value = "";
      console.log("Logged in successfully");
    } catch (err) {
      console.error("Login error:", err);
      loginError.textContent = "Invalid nsec or private key format";
    }
  });

  logoutBtn.addEventListener("click", () => {
    clearSecretKey();
    console.log("Logged out");
  });

  // Allow Enter key to login
  nsecInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      loginBtn.click();
    }
  });

  // Theme and font size functions
  function loadPreferences() {
    currentTheme = localStorage.getItem('theme') || 'light';
    currentFontSize = parseInt(localStorage.getItem('fontSize')) || 18;

    // Apply theme
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.textContent = currentTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';

    // Apply font size
    document.documentElement.style.setProperty('--font-size-base', currentFontSize + 'px');
    fontSizeDisplay.textContent = currentFontSize + 'px';
  }

  function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.textContent = currentTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    localStorage.setItem('theme', currentTheme);
  }

  function changeFontSize(delta) {
    currentFontSize = Math.max(12, Math.min(28, currentFontSize + delta));
    document.documentElement.style.setProperty('--font-size-base', currentFontSize + 'px');
    fontSizeDisplay.textContent = currentFontSize + 'px';
    localStorage.setItem('fontSize', currentFontSize);
  }

  // Theme and font size event listeners
  themeToggle.addEventListener("click", toggleTheme);
  fontIncrease.addEventListener("click", () => changeFontSize(2));
  fontDecrease.addEventListener("click", () => changeFontSize(-2));

  // Article extraction
  async function extractArticle(url) {
    try {
      // Validate URL
      new URL(url);
    } catch (e) {
      throw new Error("Invalid URL format");
    }

    extractStatus.textContent = "Fetching page...";
    extractStatus.className = "info-message";

    // Use a CORS proxy to fetch the page
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    extractStatus.textContent = "Parsing content...";

    // Parse HTML using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Use Readability to extract article content
    const documentClone = doc.cloneNode(true);
    const reader = new Readability(documentClone);
    const article = reader.parse();

    if (!article || !article.content) {
      throw new Error("Could not extract readable content from this page");
    }

    return {
      title: article.title || doc.title || 'Untitled',
      content: article.content || '',
      textContent: article.textContent || '',
      excerpt: article.excerpt || '',
      byline: article.byline || '',
      url: url,
      success: true
    };
  }

  // URL extraction handler
  extractBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();

    if (!url) {
      extractStatus.textContent = "Please enter a URL";
      extractStatus.className = "error-message";
      return;
    }

    extractBtn.disabled = true;
    extractBtn.textContent = "Extracting...";
    showLoadingState();

    try {
      currentArticle = await extractArticle(url);
      extractStatus.textContent = "Article extracted successfully!";
      extractStatus.className = "success-message";
      displayArticle();
    } catch (error) {
      console.error("Extraction error:", error);
      extractStatus.textContent = error.message || "Failed to extract article";
      extractStatus.className = "error-message";
      showEmptyState();
    } finally {
      extractBtn.disabled = false;
      extractBtn.textContent = "Extract";
    }
  });

  // Allow Enter key to extract
  urlInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      extractBtn.click();
    }
  });

  function showLoadingState() {
    loadingState.classList.remove("hidden");
    emptyState.classList.add("hidden");
    articleSection.classList.add("hidden");
  }

  function showEmptyState() {
    loadingState.classList.add("hidden");
    emptyState.classList.remove("hidden");
    articleSection.classList.add("hidden");
  }

  function displayArticle() {
    loadingState.classList.add("hidden");
    emptyState.classList.add("hidden");
    articleSection.classList.remove("hidden");

    // Set article metadata
    articleTitle.textContent = currentArticle.title || "Untitled";
    articleUrl.textContent = currentArticle.url || "";

    // Set byline if available
    if (currentArticle.byline) {
      articleByline.textContent = `By ${currentArticle.byline}`;
      articleByline.style.display = "block";
    } else {
      articleByline.style.display = "none";
    }

    // Set content
    const content = currentArticle.content || currentArticle.textContent || "";
    if (content) {
      articleContent.innerHTML = content;
    }

    // Enable post button if logged in
    if (secretKey) {
      postBtn.disabled = false;
    }
  }

  // Posting to Nostr
  postBtn.addEventListener("click", async () => {
    if (!secretKey) {
      alert("Please login with your nsec first");
      return;
    }

    if (!currentArticle) {
      alert("No article to post");
      return;
    }

    postBtn.disabled = true;
    postBtn.textContent = "Posting...";
    postStatus.textContent = "";

    try {
      // Convert HTML content to Markdown
      let content = "";
      if (currentArticle.content) {
        const turndownService = new TurndownService({
          headingStyle: 'atx',
          bulletListMarker: '-',
          codeBlockStyle: 'fenced',
          fence: '```',
          emDelimiter: '*',
          strongDelimiter: '**',
          linkStyle: 'inlined',
          linkReferenceStyle: 'full'
        });

        // Configure Turndown to handle common elements better
        turndownService.addRule('removeEmptyParagraphs', {
          filter: function (node) {
            return node.nodeName === 'P' && /^\s*$/.test(node.textContent);
          },
          replacement: function () {
            return '';
          }
        });

        content = turndownService.turndown(currentArticle.content);
        console.log("Converted HTML to Markdown:", content);
      } else {
        content = currentArticle.textContent || "";
      }

      // Add metadata header to the content
      const metadata = [
        `**Original source:** [${currentArticle.url || 'Unknown'}](${currentArticle.url || ''})`,
        `**Shared with:** [ReadToRelay](https://github.com/vcavallo/ReadToRelay)`,
        ``,
        `---`,
        ``
      ].join('\n\n');

      content = metadata + content;

      // Get custom tags
      const customTags = getStoredTags();

      // Create Nostr event
      const timestamp = Math.floor(Date.now() / 1000);
      const event = {
        kind: 30023, // Long-form content
        created_at: timestamp,
        tags: [
          ["d", `${currentArticle.url}-${timestamp}`],
          ["r", currentArticle.url],
          ["title", currentArticle.title || "Untitled"],
          ["url", currentArticle.url || ""],
          ["published_at", String(timestamp)],
          ...customTags.map(tag => ["t", tag])
        ],
        content: content
      };

      // Add byline if available
      if (currentArticle.byline) {
        event.tags.push(["author", currentArticle.byline]);
      }

      // Sign event
      const signedEvent = NostrTools.finalizeEvent(event, secretKey);
      console.log("Signed event:", signedEvent);

      // Get relays
      const relays = getStoredRelays();

      // Post to relays
      const promises = relays.map(url => {
        return new Promise((resolve, reject) => {
          console.log("Connecting to:", url);
          const ws = new WebSocket(url);

          const timeout = setTimeout(() => {
            ws.close();
            reject({ url, error: "Connection timeout" });
          }, 5000);

          ws.onopen = () => {
            console.log("Connected to:", url);
            clearTimeout(timeout);
            ws.send(JSON.stringify(["EVENT", signedEvent]));
            setTimeout(() => {
              ws.close();
              resolve({ url, success: true });
            }, 1000);
          };

          ws.onerror = (error) => {
            console.error("WebSocket error for", url, ":", error);
            clearTimeout(timeout);
            reject({ url, error: error.message || "Connection failed" });
          };
        });
      });

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failedResults = results.filter(r => r.status === 'rejected');

      console.log(`Posted to ${successful}/${relays.length} relays`);

      // Show event ID and success message
      const eventId = signedEvent.id;
      postStatus.innerHTML = `Posted to ${successful}/${relays.length} relays successfully!<br><br>Event: <a href="https://njump.me/${eventId}" target="_blank" style="color: var(--accent-color); text-decoration: underline;">njump.me</a>`;

      if (failedResults.length > 0) {
        const failedRelays = failedResults.map(r => r.reason?.url || 'Unknown relay');
        console.warn("Failed relays:", failedResults);
        postStatus.innerHTML += `<br><br>Failed relays:<br>${failedRelays.join('<br>')}`;
      }

      // Reset tags to defaults after successful post
      resetTagsToDefault();

    } catch (error) {
      console.error("Error posting to Nostr:", error);
      postStatus.textContent = "Error posting to Nostr: " + error.message;
      postStatus.className = "error-message";
    } finally {
      postBtn.disabled = false;
      postBtn.textContent = "Post to Nostr";
    }
  });

  // Relay management
  function getDefaultRelays() {
    return [
      "wss://relay.damus.io",
      "wss://nostr.wine",
      "wss://relay.primal.net",
      "wss://nos.lol",
      "wss://nostr.mom"
    ];
  }

  function getStoredRelays() {
    const stored = localStorage.getItem("relays");
    return stored ? JSON.parse(stored) : getDefaultRelays();
  }

  function saveRelays(relays) {
    localStorage.setItem("relays", JSON.stringify(relays));
  }

  // Tag management
  function getDefaultTags() {
    return [
      "web-archive",
      "budget-wayback-machine",
      "ReadToRelay"
    ];
  }

  function getStoredTags() {
    const stored = localStorage.getItem("customTags");
    return stored ? JSON.parse(stored) : getDefaultTags();
  }

  function saveTags(tags) {
    localStorage.setItem("customTags", JSON.stringify(tags));
  }

  function renderRelays(relays) {
    relayList.innerHTML = "";
    relays.forEach((relay, i) => {
      const li = document.createElement("li");

      const span = document.createElement("span");
      span.textContent = relay;
      li.appendChild(span);

      const delBtn = document.createElement("button");
      delBtn.textContent = "Remove";
      delBtn.onclick = () => {
        relays.splice(i, 1);
        saveRelays(relays);
        renderRelays(relays);
      };
      li.appendChild(delBtn);

      relayList.appendChild(li);
    });
  }

  function renderTags(tags) {
    tagList.innerHTML = "";
    tags.forEach((tag, i) => {
      const li = document.createElement("li");

      const span = document.createElement("span");
      span.textContent = tag;
      li.appendChild(span);

      const delBtn = document.createElement("button");
      delBtn.textContent = "Remove";
      delBtn.onclick = () => {
        tags.splice(i, 1);
        saveTags(tags);
        renderTags(tags);
      };
      li.appendChild(delBtn);

      tagList.appendChild(li);
    });
  }

  function resetTagsToDefault() {
    const defaultTags = getDefaultTags();
    saveTags(defaultTags);
    renderTags(defaultTags);
  }

  addRelayBtn.addEventListener("click", () => {
    const url = newRelayInput.value.trim();
    if (!url) return;

    if (!url.startsWith("wss://") && !url.startsWith("ws://")) {
      alert("Relay URL must start with wss:// or ws://");
      return;
    }

    const relays = getStoredRelays();

    if (relays.includes(url)) {
      alert("Relay already added");
      return;
    }

    relays.push(url);
    saveRelays(relays);
    renderRelays(relays);
    newRelayInput.value = "";
  });

  // Allow Enter key to add relay
  newRelayInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addRelayBtn.click();
    }
  });

  addTagBtn.addEventListener("click", () => {
    const tag = newTagInput.value.trim();
    if (!tag) return;

    const tags = getStoredTags();

    if (tags.includes(tag)) {
      alert("Tag already added");
      return;
    }

    tags.push(tag);
    saveTags(tags);
    renderTags(tags);
    newTagInput.value = "";
  });

  // Allow Enter key to add tag
  newTagInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addTagBtn.click();
    }
  });

  // Register service worker for PWA and share target
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('Service Worker registered'))
      .catch(err => console.error('Service Worker registration failed:', err));
  }

  // Handle share target - check URL params and hash for shared content
  // Supports both query params (?url=...) and hash (#url=...)
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));

  const sharedUrl = urlParams.get('url') || hashParams.get('url');
  const sharedText = urlParams.get('text') || hashParams.get('text');
  const sharedTitle = urlParams.get('title') || hashParams.get('title');

  if (sharedUrl) {
    // Clear the params from the address bar
    window.history.replaceState({}, document.title, window.location.pathname);

    // Populate the URL input and auto-extract
    urlInput.value = sharedUrl;
    extractBtn.click();
  } else if (sharedText) {
    // If text was shared (which might contain a URL), try to extract URL
    const urlMatch = sharedText.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      urlInput.value = urlMatch[0];
      extractBtn.click();
    }
  }

  // Initialize everything
  loadPreferences();
  loadStoredKey();
  renderRelays(getStoredRelays());
  renderTags(getStoredTags());
})();
