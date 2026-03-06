// Open Pluck — content.js v2 (free, no API keys)
// Dual mode:
//   1. SELECTION MODE  — normal browsing, detect highlight → show popover → open popup
//   2. AUTO-SUBMIT MODE — runs inside Open Pluck popup window, injects & submits question

(function () {
  "use strict";

  const IS_CHATGPT = location.hostname.includes("chatgpt.com") || location.hostname.includes("chat.openai.com");
  const IS_CLAUDE  = location.hostname.includes("claude.ai");

  // ─── Detect if this tab is a Open Pluck popup ───────────────────────────
  // We flag it via sessionStorage so it survives SPA navigation
  if (sessionStorage.getItem("ha_popup") === "1") {
    initAutoSubmitMode();
    return;
  }

  // Also check URL param (set when window first opens)
  if (new URLSearchParams(location.search).has("ha")) {
    sessionStorage.setItem("ha_popup", "1");
    initAutoSubmitMode();
    return;
  }

  // ─── SELECTION MODE ───────────────────────────────────────────────────────
  let popoverEl  = null;
  let sidebarEl  = null;
  let isSidebarOpen = false;

  const MSG_SELECTORS = [
    '[data-message-author-role="assistant"]',
    ".markdown.prose",
    '[data-is-streaming]',
    ".font-claude-message",
    ".prose",
  ];

  function isInsideLLMMessage(node) {
    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (el && el !== document.body) {
      for (const sel of MSG_SELECTORS) {
        try { if (el.matches?.(sel)) return true; } catch (_) {}
      }
      el = el.parentElement;
    }
    return false;
  }

  // ── Popover ──────────────────────────────────────────────────────────────
  function removePopover() { popoverEl?.remove(); popoverEl = null; }

  function createPopover(clientX, clientY, text) {
    removePopover();
    const short = text.length > 22 ? text.slice(0, 22) + "…" : text;

    popoverEl = document.createElement("div");
    popoverEl.id = "ha-popover";
    popoverEl.setAttribute("data-ha", "true");
    popoverEl.innerHTML = `
      <div class="ha-pop-header">
        <span class="ha-pop-label">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20 8 6h8l3 14"/><path d="M7 16h10" stroke-width="2.5"/></svg>
          Ask about selection
        </span>
        <button class="ha-icon-btn ha-pop-close">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="ha-pop-highlight">"${esc(short)}"</div>
      <div id="ha-pop-main" class="ha-pop-actions">
        <button class="ha-btn ha-btn-primary" id="ha-quick-ask">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
          What is "${short}"?
        </button>
        <button class="ha-btn ha-btn-ghost" id="ha-explain-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>
          Explain this
        </button>
        <button class="ha-btn ha-btn-ghost" id="ha-custom-toggle">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          Custom…
        </button>
      </div>
      <div id="ha-pop-custom" class="ha-pop-custom" style="display:none;">
        <input class="ha-input" id="ha-custom-input" type="text"
          placeholder="Ask anything about this…" autocomplete="off" />
        <div class="ha-pop-custom-actions">
          <button class="ha-btn ha-btn-ghost ha-btn-sm" id="ha-cancel-custom">Cancel</button>
          <button class="ha-btn ha-btn-primary ha-btn-sm" id="ha-submit-custom">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            Ask
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(popoverEl);

    requestAnimationFrame(() => {
      if (!popoverEl) return;
      const rect = popoverEl.getBoundingClientRect();
      let left = Math.max(8, Math.min(clientX, window.innerWidth - rect.width - 16));
      let top  = clientY + 14;
      if (top + rect.height > window.innerHeight - 16) top = clientY - rect.height - 8;
      if (top < 8) top = 8;
      popoverEl.style.left = left + "px";
      popoverEl.style.top  = top + "px";
      popoverEl.classList.add("ha-pop-visible");
    });

    popoverEl.querySelector(".ha-pop-close").onclick = (e) => { e.stopPropagation(); removePopover(); };

    document.getElementById("ha-quick-ask").onclick = (e) => {
      e.stopPropagation();
      openQuestion(`What is "${text}"?`, text);
    };
    document.getElementById("ha-explain-btn").onclick = (e) => {
      e.stopPropagation();
      openQuestion(`Explain "${text}" in simple terms.`, text);
    };
    document.getElementById("ha-custom-toggle").onclick = (e) => {
      e.stopPropagation();
      document.getElementById("ha-pop-main").style.display = "none";
      document.getElementById("ha-pop-custom").style.display = "block";
      document.getElementById("ha-custom-input").focus();
    };
    document.getElementById("ha-cancel-custom").onclick = (e) => {
      e.stopPropagation();
      document.getElementById("ha-pop-main").style.display = "flex";
      document.getElementById("ha-pop-custom").style.display = "none";
    };
    document.getElementById("ha-submit-custom").onclick = (e) => {
      e.stopPropagation();
      const q = document.getElementById("ha-custom-input").value.trim();
      if (q) openQuestion(q, text);
    };
    document.getElementById("ha-custom-input").addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") { const q = e.target.value.trim(); if (q) openQuestion(q, text); }
      if (e.key === "Escape") removePopover();
    });

    popoverEl.addEventListener("mousedown", (e) => e.stopPropagation());
    popoverEl.addEventListener("click",     (e) => e.stopPropagation());
  }

  // ── Sidebar ───────────────────────────────────────────────────────────────
  function buildSidebar() {
    if (sidebarEl) return;
    sidebarEl = document.createElement("div");
    sidebarEl.id = "ha-sidebar";
    sidebarEl.setAttribute("data-ha", "true");
    sidebarEl.innerHTML = `
      <div class="ha-sb-header">
        <div class="ha-sb-title">
          <span class="ha-sb-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20 8 6h8l3 14"/><path d="M7 16h10" stroke-width="2.5"/></svg>
          </span>
          Open Pluck
        </div>
        <div class="ha-sb-controls">
          <button class="ha-icon-btn" id="ha-sb-clear" title="Clear">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
          <button class="ha-icon-btn" id="ha-sb-close" title="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
      <div class="ha-sb-body" id="ha-sb-body">
        <div class="ha-sb-empty" id="ha-sb-empty">
          <div class="ha-sb-empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <p>Highlight any text in the conversation, then ask a question.</p>
          <p class="ha-sb-empty-sub">A fresh chat window opens with your question — your main conversation stays clean.</p>
        </div>
        <div id="ha-sb-cards"></div>
      </div>
    `;
    document.body.appendChild(sidebarEl);
    document.getElementById("ha-sb-close").onclick = closeSidebar;
    document.getElementById("ha-sb-clear").onclick = () => {
      document.getElementById("ha-sb-cards").innerHTML = "";
      document.getElementById("ha-sb-empty").style.display = "flex";
    };
    sidebarEl.addEventListener("mousedown", (e) => e.stopPropagation());
  }

  function openSidebar()  { buildSidebar(); sidebarEl.classList.add("ha-sb-open"); isSidebarOpen = true; }
  function closeSidebar() { sidebarEl?.classList.remove("ha-sb-open"); isSidebarOpen = false; }

  // ── Core: open question in popup ──────────────────────────────────────────
  async function openQuestion(question, highlightedText) {
    removePopover();
    openSidebar();

    const empty   = document.getElementById("ha-sb-empty");
    const cardsEl = document.getElementById("ha-sb-cards");
    if (empty) empty.style.display = "none";

    // Get preferred service
    const prefs     = await chrome.storage.sync.get(["answerService"]);
    const service   = prefs.answerService || (IS_CLAUDE ? "claude" : "chatgpt");
    const serviceLabel = service === "claude" ? "Claude.ai" : "ChatGPT";
    const serviceLogo  = service === "claude"
      ? `<span style="color:#cd895d;font-weight:800;">A</span>`
      : `<span style="color:#19c37d;font-weight:800;">⊕</span>`;

    const shortRef = highlightedText.length > 48 ? highlightedText.slice(0, 48) + "…" : highlightedText;
    const cardId   = "ha-card-" + Date.now();

    // Build card showing the pending question
    const card = document.createElement("div");
    card.className = "ha-card";
    card.id = cardId;
    card.innerHTML = `
      <div class="ha-card-q">
        <span class="ha-card-q-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
        </span>
        <span class="ha-card-q-text">${esc(question)}</span>
      </div>
      <div class="ha-card-ref">"${esc(shortRef)}"</div>
      <div class="ha-card-ans" id="${cardId}-ans">
        <div class="ha-card-popup-status" id="${cardId}-status">
          <div class="ha-popup-spinner">
            <div class="ha-typing"><span></span><span></span><span></span></div>
          </div>
          <div class="ha-popup-info">
            <span class="ha-popup-service-badge">
              <span class="ha-popup-logo">${serviceLogo}</span>
              Opening ${serviceLabel}…
            </span>
            <button class="ha-popup-focus-btn" id="${cardId}-focus" style="display:none;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Focus chat window
            </button>
          </div>
        </div>
      </div>
    `;

    cardsEl.appendChild(card);
    card.scrollIntoView({ behavior: "smooth", block: "end" });

    // Store the question for the popup to pick up
    const questionData = {
      question,
      highlightedText,
      service,
      timestamp: Date.now(),
    };
    await chrome.storage.local.set({ ha_pending: questionData });

    // Determine URL
    const popupUrl = service === "claude"
      ? "https://claude.ai/new?ha=1"
      : "https://chatgpt.com/?ha=1";

    // Ask background to open/reuse popup window
    chrome.runtime.sendMessage({ type: "openChatPopup", url: popupUrl }, (resp) => {
      // Once popup is open, show the focus button
      const statusEl = document.getElementById(cardId + "-status");
      const focusBtn = document.getElementById(cardId + "-focus");
      if (!statusEl) return;

      statusEl.querySelector(".ha-popup-service-badge").innerHTML = `
        <span class="ha-popup-logo">${serviceLogo}</span>
        Question sent to <strong>${serviceLabel}</strong>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:#34d399"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      `;
      statusEl.querySelector(".ha-typing")?.remove();

      if (focusBtn) {
        focusBtn.style.display = "inline-flex";
        focusBtn.onclick = () => {
          chrome.runtime.sendMessage({ type: "focusPopup" });
        };
      }
    });
  }

  // ── Event listeners ───────────────────────────────────────────────────────
  document.addEventListener("mouseup", (e) => {
    if (e.target.closest("[data-ha]")) return;
    setTimeout(() => {
      const sel  = window.getSelection();
      const text = sel?.toString().trim();
      if (!text || text.length < 2) { if (!e.target.closest("[data-ha]")) removePopover(); return; }
      try {
        const range = sel.getRangeAt(0);
        if (!isInsideLLMMessage(range.commonAncestorContainer)) { removePopover(); return; }
      } catch (_) { return; }
      createPopover(e.clientX, e.clientY, text);
    }, 30);
  });

  document.addEventListener("mousedown", (e) => { if (!e.target.closest("[data-ha]")) removePopover(); });
  document.addEventListener("keydown",   (e) => {
    if (e.key === "Escape") { removePopover(); if (isSidebarOpen) closeSidebar(); }
  });

  buildSidebar();


  // ─────────────────────────────────────────────────────────────────────────
  // AUTO-SUBMIT MODE (runs inside the Open Pluck popup window)
  // ─────────────────────────────────────────────────────────────────────────
  function initAutoSubmitMode() {
    // Show a subtle loading overlay while we wait for the page to load
    const overlay = document.createElement("div");
    overlay.id = "ha-overlay";
    overlay.setAttribute("data-ha", "true");
    overlay.innerHTML = `
      <div class="ha-overlay-inner">
        <div class="ha-overlay-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20 8 6h8l3 14"/><path d="M7 16h10" stroke-width="2.5"/></svg>
        </div>
        <div class="ha-overlay-text">Open Pluck</div>
        <div class="ha-overlay-sub">Preparing your question…</div>
        <div class="ha-typing ha-overlay-dots"><span></span><span></span><span></span></div>
      </div>
    `;

    // Wait for body to be available
    const insertOverlay = () => {
      if (document.body) {
        document.body.appendChild(overlay);
      } else {
        setTimeout(insertOverlay, 50);
      }
    };
    insertOverlay();

    // Load the pending question and submit
    chrome.storage.local.get("ha_pending", async ({ ha_pending }) => {
      if (!ha_pending || Date.now() - ha_pending.timestamp > 60000) {
        removeOverlay(overlay);
        return;
      }

      const { question, highlightedText } = ha_pending;
      const fullQuestion = `${question}\n\nContext — highlighted text: "${highlightedText}"`;

      try {
        if (IS_CHATGPT) {
          await submitToChatGPT(fullQuestion, overlay);
        } else if (IS_CLAUDE) {
          await submitToClaude(fullQuestion, overlay);
        }
        // Clear pending after successful submit
        chrome.storage.local.remove("ha_pending");
      } catch (err) {
        updateOverlay(overlay, "error", "Could not auto-submit. Please type your question manually.");
        setTimeout(() => removeOverlay(overlay), 4000);
      }
    });
  }

  // ── ChatGPT auto-submit ───────────────────────────────────────────────────
  async function submitToChatGPT(question, overlay) {
    updateOverlay(overlay, "loading", "Waiting for ChatGPT to load…");

    // ChatGPT uses a ProseMirror contenteditable div
    const input = await waitForElement([
      "#prompt-textarea",
      "div[contenteditable='true'][data-lexical-editor]",
      "div[contenteditable='true'][id*='prompt']",
      "textarea[data-id]",
    ], 15000);

    updateOverlay(overlay, "loading", "Submitting your question…");
    await sleep(600);

    input.focus();

    // Try ProseMirror approach first
    if (input.getAttribute("contenteditable") === "true") {
      // Clear and set content
      input.innerHTML = `<p>${esc(question)}</p>`;
      input.dispatchEvent(new InputEvent("input",  { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event("change",       { bubbles: true }));
    } else {
      // Textarea fallback
      const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
      nativeInputSetter?.call(input, question);
      input.dispatchEvent(new InputEvent("input",  { bubbles: true }));
      input.dispatchEvent(new Event("change",       { bubbles: true }));
    }

    await sleep(500);

    // Find and click the send button
    const sendBtn = await waitForElement([
      'button[data-testid="send-button"]',
      'button[aria-label="Send message"]',
      'button[aria-label*="Send"]',
      'button[class*="send"]',
    ], 5000);

    sendBtn.click();
    removeOverlay(overlay);
  }

  // ── Claude.ai auto-submit ─────────────────────────────────────────────────
  async function submitToClaude(question, overlay) {
    updateOverlay(overlay, "loading", "Waiting for Claude to load…");

    // Claude uses a ProseMirror contenteditable
    const input = await waitForElement([
      "div[contenteditable='true'].ProseMirror",
      "div[contenteditable='true'][data-placeholder]",
      "div.ProseMirror[contenteditable]",
      '[data-testid="composer-input"]',
    ], 15000);

    updateOverlay(overlay, "loading", "Submitting your question…");
    await sleep(800);

    input.focus();

    // Insert text using execCommand (most reliable cross-site approach)
    document.execCommand("selectAll", false, null);
    document.execCommand("delete",    false, null);
    document.execCommand("insertText", false, question);

    // Also dispatch React-friendly events
    input.dispatchEvent(new InputEvent("input",  { bubbles: true, cancelable: true, inputType: "insertText", data: question }));
    input.dispatchEvent(new Event("change",       { bubbles: true }));

    await sleep(600);

    // Find send button
    const sendBtn = await waitForElement([
      'button[aria-label="Send message"]',
      'button[aria-label*="Send"]',
      'button[data-testid="send-button"]',
      'button[type="submit"]',
    ], 5000);

    sendBtn.click();
    removeOverlay(overlay);
  }

  // ── Overlay helpers ───────────────────────────────────────────────────────
  function updateOverlay(overlay, state, msg) {
    const sub = overlay?.querySelector(".ha-overlay-sub");
    if (sub) sub.textContent = msg;
    if (state === "error") {
      overlay.classList.add("ha-overlay-error");
      overlay.querySelector(".ha-overlay-dots")?.remove();
    }
  }

  function removeOverlay(overlay) {
    overlay?.classList.add("ha-overlay-exit");
    setTimeout(() => overlay?.remove(), 400);
  }

  // ── DOM helpers ───────────────────────────────────────────────────────────
  function waitForElement(selectors, timeout = 12000) {
    const sels = Array.isArray(selectors) ? selectors : [selectors];
    return new Promise((resolve, reject) => {
      const check = () => {
        for (const sel of sels) {
          const el = document.querySelector(sel);
          if (el) return el;
        }
        return null;
      };

      const found = check();
      if (found) { resolve(found); return; }

      const observer = new MutationObserver(() => {
        const el = check();
        if (el) { observer.disconnect(); clearTimeout(timer); resolve(el); }
      });
      observer.observe(document.body || document.documentElement, { childList: true, subtree: true });

      const timer = setTimeout(() => {
        observer.disconnect();
        reject(new Error("Element not found: " + sels[0]));
      }, timeout);
    });
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  // ── Shared utils ──────────────────────────────────────────────────────────
  function esc(t) {
    return String(t)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

})();
