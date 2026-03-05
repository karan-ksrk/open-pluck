// HighlightAsk — background.js

let haPopupWindowId = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // Open settings page
  if (msg.type === "openOptions") {
    chrome.runtime.openOptionsPage();
    return;
  }

  // Open (or reuse) a HighlightAsk chat popup window
  if (msg.type === "openChatPopup") {
    const { url } = msg;

    // Check if existing popup is still open
    if (haPopupWindowId !== null) {
      chrome.windows.get(haPopupWindowId, (win) => {
        if (chrome.runtime.lastError || !win) {
          // Window was closed, open a new one
          openPopupWindow(url, sendResponse);
        } else {
          // Reuse existing window - navigate it to the new chat
          chrome.tabs.query({ windowId: haPopupWindowId }, (tabs) => {
            if (tabs.length > 0) {
              chrome.tabs.update(tabs[0].id, { url, active: true });
              chrome.windows.update(haPopupWindowId, { focused: true });
              sendResponse({ windowId: haPopupWindowId, tabId: tabs[0].id });
            } else {
              openPopupWindow(url, sendResponse);
            }
          });
        }
      });
    } else {
      openPopupWindow(url, sendResponse);
    }

    return true; // async response
  }

  // Focus existing popup
  if (msg.type === "focusPopup") {
    if (haPopupWindowId !== null) {
      chrome.windows.update(haPopupWindowId, { focused: true });
    }
  }
});

function openPopupWindow(url, sendResponse) {
  // Get screen dimensions for smart positioning
  chrome.windows.getCurrent((currentWin) => {
    const width  = 520;
    const height = 780;
    const left   = Math.max(0, (currentWin.left || 0) + (currentWin.width || 1200) - width - 20);
    const top    = (currentWin.top || 0) + 40;

    chrome.windows.create({
      url,
      type: "popup",
      width,
      height,
      left,
      top,
      focused: true,
    }, (win) => {
      haPopupWindowId = win.id;

      // Clear when closed
      chrome.windows.onRemoved.addListener(function onRemoved(windowId) {
        if (windowId === haPopupWindowId) {
          haPopupWindowId = null;
          chrome.windows.onRemoved.removeListener(onRemoved);
        }
      });

      sendResponse({ windowId: win.id, tabId: win.tabs[0].id });
    });
  });
}

// Open settings on first install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});
