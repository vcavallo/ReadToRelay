(async () => {
  // State management
  let secretKey = null;
  let publicKeyHex = null;
  let currentArticle = null;
  let currentTheme = 'light';
  let currentFontSize = 18;

  // DOM elements
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
  const errorState = document.getElementById("error-state");
  const emptyState = document.getElementById("empty-state");
  const articleSection = document.getElementById("article-section");
  const errorMessage = document.getElementById("error-message");
  
  const articleTitle = document.getElementById("article-title");
  const articleByline = document.getElementById("article-byline");
  const articleUrl = document.getElementById("article-url");
  const articleContent = document.getElementById("article-content");
  
  const relayList = document.getElementById("relay-list");
  const newRelayInput = document.getElementById("new-relay");
  const addRelayBtn = document.getElementById("add-relay-btn");
  
  const themeToggle = document.getElementById("theme-toggle");
  const fontDecrease = document.getElementById("font-decrease");
  const fontIncrease = document.getElementById("font-increase");
  const fontSizeDisplay = document.getElementById("font-size-display");

  // Authentication functions
  async function loadStoredKey() {
    return new Promise(resolve => {
      chrome.storage.local.get("secretKey", res => {
        if (res.secretKey) {
          secretKey = new Uint8Array(res.secretKey);
          publicKeyHex = window.NostrTools.getPublicKey(secretKey);
          updateLoginUI(true);
        }
        resolve();
      });
    });
  }

  async function saveSecretKey(sk) {
    secretKey = sk;
    publicKeyHex = window.NostrTools.getPublicKey(sk);
    await chrome.storage.local.set({ secretKey: Array.from(sk) });
    updateLoginUI(true);
  }

  async function clearSecretKey() {
    secretKey = null;
    publicKeyHex = null;
    await chrome.storage.local.remove("secretKey");
    updateLoginUI(false);
  }

  function updateLoginUI(loggedIn) {
    if (loggedIn) {
      loginForm.classList.add("hidden");
      loggedInStatus.classList.remove("hidden");
      loginSection.classList.add("logged-in");
      postBtn.disabled = !currentArticle;
      pubkeyDisplay.textContent = `npub: ${window.NostrTools.nip19.npubEncode(publicKeyHex)}`;
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
        const decoded = window.NostrTools.nip19.decode(nsecValue);
        if (decoded.type !== "nsec") {
          throw new Error("Invalid nsec format");
        }
        sk = decoded.data;
      } else {
        sk = window.NostrTools.hexToBytes(nsecValue);
        if (sk.length !== 32) {
          throw new Error("Invalid private key length");
        }
      }

      await saveSecretKey(sk);
      nsecInput.value = "";
      console.log("Logged in successfully");
    } catch (err) {
      console.error("Login error:", err);
      loginError.textContent = "Invalid nsec or private key format";
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await clearSecretKey();
    console.log("Logged out");
  });

  // Allow Enter key to login
  nsecInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      loginBtn.click();
    }
  });

  // Theme and font size functions
  async function loadPreferences() {
    const data = await chrome.storage.local.get(['theme', 'fontSize']);
    currentTheme = data.theme || 'light';
    currentFontSize = data.fontSize || 18;
    
    // Apply theme
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.textContent = currentTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    
    // Apply font size
    document.documentElement.style.setProperty('--font-size-base', currentFontSize + 'px');
    fontSizeDisplay.textContent = currentFontSize + 'px';
  }

  async function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.textContent = currentTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    await chrome.storage.local.set({ theme: currentTheme });
  }

  async function changeFontSize(delta) {
    currentFontSize = Math.max(12, Math.min(28, currentFontSize + delta));
    document.documentElement.style.setProperty('--font-size-base', currentFontSize + 'px');
    fontSizeDisplay.textContent = currentFontSize + 'px';
    await chrome.storage.local.set({ fontSize: currentFontSize });
  }

  // Theme and font size event listeners
  themeToggle.addEventListener("click", toggleTheme);
  fontIncrease.addEventListener("click", () => changeFontSize(2));
  fontDecrease.addEventListener("click", () => changeFontSize(-2));

  // Article loading
  async function loadArticle() {
    try {
      const data = await chrome.storage.local.get(["currentArticle", "extractedAt"]);
      
      if (!data.currentArticle) {
        showEmptyState();
        return;
      }

      // Check if data is too old (5 minutes)
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      if (data.extractedAt && data.extractedAt < fiveMinutesAgo) {
        showEmptyState("Article data has expired. Please extract again.");
        return;
      }

      currentArticle = data.currentArticle;

      if (!currentArticle.success || (!currentArticle.content && !currentArticle.textContent)) {
        showErrorState(currentArticle.error || "Could not extract readable content from the page");
        return;
      }

      displayArticle();
      
    } catch (error) {
      console.error("Failed to load article:", error);
      showErrorState("Failed to load article data");
    }
  }

  function showLoadingState() {
    loadingState.classList.remove("hidden");
    errorState.classList.add("hidden");
    emptyState.classList.add("hidden");
    articleSection.classList.add("hidden");
  }

  function showErrorState(message) {
    loadingState.classList.add("hidden");
    errorState.classList.remove("hidden");
    emptyState.classList.add("hidden");
    articleSection.classList.add("hidden");
    errorMessage.textContent = message || "An error occurred";
  }

  function showEmptyState(message) {
    loadingState.classList.add("hidden");
    errorState.classList.add("hidden");
    emptyState.classList.remove("hidden");
    articleSection.classList.add("hidden");
    
    if (message) {
      emptyState.querySelector("p").textContent = message;
    }
  }

  function displayArticle() {
    loadingState.classList.add("hidden");
    errorState.classList.add("hidden");
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

    // Set content - prefer HTML content, fallback to text
    const content = currentArticle.content || currentArticle.textContent || "";
    if (content) {
      articleContent.innerHTML = content;
    } else {
      showEmptyState("No readable content found on this page");
      return;
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
        // Initialize Turndown service for HTML to Markdown conversion
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

        // Convert HTML to Markdown
        content = turndownService.turndown(currentArticle.content);
        console.log("Converted HTML to Markdown:", content);
      } else {
        // Fallback to text content if no HTML
        content = currentArticle.textContent || "";
      }

      // Add metadata header to the content
      const metadata = [
        `**Original source:** [${currentArticle.url || 'Unknown'}](${currentArticle.url || ''})`,
        `**Shared with:** Reader to Nostr`,
        ``,
        `---`,
        ``
      ].join('\n');

      content = metadata + content;

      // Create Nostr event
      const event = {
        kind: 30023, // Long-form content
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["title", currentArticle.title || "Untitled"],
          ["url", currentArticle.url || ""],
          ["published_at", String(Math.floor(Date.now() / 1000))],
          ["t", "web-archive"],
          ["t", "wayback"]
          ["t", "ReadToRelay"]
        ],
        content: content
      };

      // Add byline if available
      if (currentArticle.byline) {
        event.tags.push(["author", currentArticle.byline]);
      }

      // Sign event
      const signedEvent = window.NostrTools.finalizeEvent(event, secretKey);
      console.log("Signed event:", signedEvent);

      // Get relays
      const relayData = await chrome.storage.local.get("relays");
      const relays = relayData.relays || getDefaultRelays();

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
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`Posted to ${successful}/${relays.length} relays`);
      postStatus.textContent = `Posted to ${successful}/${relays.length} relays successfully!`;
      
      if (failed > 0) {
        console.warn("Failed relays:", results.filter(r => r.status === 'rejected'));
        postStatus.textContent += ` (${failed} failed)`;
      }

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
      "wss://nostr.lol",
      "wss://nostr.mom"
    ];
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
      delBtn.onclick = async () => {
        relays.splice(i, 1);
        await chrome.storage.local.set({ relays });
        renderRelays(relays);
      };
      li.appendChild(delBtn);
      
      relayList.appendChild(li);
    });
  }

  async function loadRelays() {
    const data = await chrome.storage.local.get("relays");
    const relays = data.relays || getDefaultRelays();
    renderRelays(relays);
    return relays;
  }

  addRelayBtn.addEventListener("click", async () => {
    const url = newRelayInput.value.trim();
    if (!url) return;
    
    if (!url.startsWith("wss://") && !url.startsWith("ws://")) {
      alert("Relay URL must start with wss:// or ws://");
      return;
    }

    const data = await chrome.storage.local.get("relays");
    const relays = data.relays || getDefaultRelays();
    
    if (relays.includes(url)) {
      alert("Relay already added");
      return;
    }

    relays.push(url);
    await chrome.storage.local.set({ relays });
    renderRelays(relays);
    newRelayInput.value = "";
  });

  // Allow Enter key to add relay
  newRelayInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addRelayBtn.click();
    }
  });

  // Initialize everything
  showLoadingState();
  
  // Load preferences first
  await loadPreferences();
  
  // Load stored authentication
  await loadStoredKey();
  
  // Load relays
  await loadRelays();
  
  // Load and display article
  await loadArticle();
})();
