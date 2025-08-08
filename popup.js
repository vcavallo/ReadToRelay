(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Nostr key management
  let secretKey = null;
  let publicKeyHex = null;

  // Load stored secret key
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

  // Save secret key to storage
  async function saveSecretKey(sk) {
    secretKey = sk;
    publicKeyHex = window.NostrTools.getPublicKey(sk);
    chrome.storage.local.set({ secretKey: Array.from(sk) });
    updateLoginUI(true);
  }

  // Clear stored key
  async function clearSecretKey() {
    secretKey = null;
    publicKeyHex = null;
    chrome.storage.local.remove("secretKey");
    updateLoginUI(false);
  }

  // Update login UI based on auth state
  function updateLoginUI(loggedIn) {
    const loginForm = document.getElementById("login-form");
    const loggedInStatus = document.getElementById("logged-in-status");
    const postBtn = document.getElementById("post");
    const pubkeyDisplay = document.getElementById("pubkey-display");

    if (loggedIn) {
      loginForm.classList.add("hidden");
      loggedInStatus.classList.remove("hidden");
      document.getElementById("login-section").classList.add("logged-in");
      postBtn.disabled = false;
      pubkeyDisplay.textContent = `npub: ${window.NostrTools.nip19.npubEncode(publicKeyHex)}`;
    } else {
      loginForm.classList.remove("hidden");
      loggedInStatus.classList.add("hidden");
      document.getElementById("login-section").classList.remove("logged-in");
      postBtn.disabled = true;
    }
  }

  // Login handler
  document.getElementById("login-btn").addEventListener("click", async () => {
    const input = document.getElementById("nsec-input");
    const error = document.getElementById("login-error");
    const nsecValue = input.value.trim();
    
    error.textContent = "";

    if (!nsecValue) {
      error.textContent = "Please enter your nsec or private key";
      return;
    }

    try {
      let sk;
      
      if (nsecValue.startsWith("nsec1")) {
        // Decode nsec
        const decoded = window.NostrTools.nip19.decode(nsecValue);
        if (decoded.type !== "nsec") {
          throw new Error("Invalid nsec format");
        }
        sk = decoded.data;
      } else {
        // Assume hex private key
        sk = window.NostrTools.hexToBytes(nsecValue);
        if (sk.length !== 32) {
          throw new Error("Invalid private key length");
        }
      }

      await saveSecretKey(sk);
      input.value = "";
      console.log("Logged in successfully");
    } catch (err) {
      console.error("Login error:", err);
      error.textContent = "Invalid nsec or private key format";
    }
  });

  // Logout handler
  document.getElementById("logout-btn").addEventListener("click", async () => {
    await clearSecretKey();
    console.log("Logged out");
  });

  // Load stored key on startup
  await loadStoredKey();

  // Relay management (same as before)
  function renderRelays(relays) {
    const list = document.getElementById("relay-list");
    list.innerHTML = "";
    relays.forEach((relay, i) => {
      const li = document.createElement("li");
      li.textContent = relay;
      const del = document.createElement("button");
      del.textContent = "x";
      del.style.marginLeft = "5px";
      del.onclick = () => {
        relays.splice(i, 1);
        chrome.storage.local.set({ relays });
        renderRelays(relays);
      };
      li.appendChild(del);
      list.appendChild(li);
    });
  }

  const defaultRelays = [
    "wss://relay.damus.io",
    "wss://nostr.wine",
    "wss://relay.primal.net",
    "wss://nostr.lol",
    "wss://nostr.mom"
  ];

  let relays = await new Promise(resolve => {
    chrome.storage.local.get("relays", res => {
      resolve(res.relays || defaultRelays);
    });
  });

  renderRelays(relays);

  document.getElementById("add-relay").addEventListener("click", () => {
    const input = document.getElementById("new-relay");
    const url = input.value.trim();
    if (url && !relays.includes(url)) {
      relays.push(url);
      chrome.storage.local.set({ relays });
      renderRelays(relays);
      input.value = "";
    }
  });

  // Article extraction
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['readability.js']
    });

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const docClone = document.cloneNode(true);
        const article = new Readability(docClone).parse();
        return {
          title: article?.title || document.title,
          content: article?.content || "Could not extract article content",
          url: window.location.href
        };
      },
    }, async (results) => {
      const article = results[0].result;
      if (!article || !article.content) {
        document.getElementById("preview").innerHTML = "<p>Could not extract article content from this page.</p>";
        return;
      }
      
      // Show preview (truncated)
      const previewContent = article.content.length > 500 
        ? article.content.substring(0, 500) + "..."
        : article.content;
      document.getElementById("preview").innerHTML = previewContent;

      // Post to Nostr handler
      document.getElementById("post").addEventListener("click", async () => {
        if (!secretKey) {
          alert("Please login with your nsec first");
          return;
        }

        console.log("Posting to Nostr...");
        try {
          // Create Nostr event
          const event = {
            kind: 30023,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
              ["title", article.title],
              ["url", article.url],
              ["published_at", String(Math.floor(Date.now() / 1000))]
            ],
            content: article.content
          };

          // Sign event
          const signedEvent = window.NostrTools.finalizeEvent(event, secretKey);
          console.log("Signed event:", signedEvent);

          // Post to relays
          const promises = relays.map(url => {
            return new Promise((resolve, reject) => {
              console.log("Connecting to:", url);
              const ws = new WebSocket(url);
              
              ws.onopen = () => {
                console.log("Connected to:", url);
                ws.send(JSON.stringify(["EVENT", signedEvent]));
                setTimeout(() => ws.close(), 1000);
                resolve({ url, success: true });
              };
              
              ws.onerror = (error) => {
                console.error("WebSocket error for", url, ":", error);
                reject({ url, error });
              };
              
              ws.onclose = () => {
                console.log("Disconnected from:", url);
              };
            });
          });

          const results = await Promise.allSettled(promises);
          const successful = results.filter(r => r.status === 'fulfilled').length;
          const failed = results.filter(r => r.status === 'rejected').length;
          
          console.log(`Posted to ${successful}/${relays.length} relays`);
          alert(`Posted to Nostr!\nSuccessful: ${successful}/${relays.length} relays`);
          
          if (failed > 0) {
            console.warn("Failed relays:", results.filter(r => r.status === 'rejected'));
          }
        } catch (error) {
          console.error("Error posting to Nostr:", error);
          alert("Error posting to Nostr: " + error.message);
        }
      });
    });
  } catch (error) {
    console.error("Error extracting article:", error);
    document.getElementById("preview").innerHTML = "<p>Error extracting article content.</p>";
  }
})();
