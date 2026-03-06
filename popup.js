// Open Pluck — popup.js v2

chrome.storage.sync.get("answerService", ({ answerService }) => {
  const service = answerService || "chatgpt";
  const isClaude = service === "claude";

  const logo     = document.getElementById("active-logo");
  const name     = document.getElementById("active-name");
  const siteBtn  = document.getElementById("open-site-label");
  const openSite = document.getElementById("open-site");

  if (isClaude) {
    logo.textContent  = "A";
    logo.className    = "service-logo logo-claude";
    name.textContent  = "Claude.ai";
    siteBtn.textContent = "Open Claude.ai";
    openSite.onclick = () => { chrome.tabs.create({ url: "https://claude.ai" }); window.close(); };
  } else {
    logo.textContent  = "⊕";
    logo.className    = "service-logo logo-chatgpt";
    name.textContent  = "ChatGPT";
    siteBtn.textContent = "Open ChatGPT";
    openSite.onclick = () => { chrome.tabs.create({ url: "https://chatgpt.com" }); window.close(); };
  }
});

document.getElementById("open-settings").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

document.getElementById("open-privacy").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL("privacy.html") });
  window.close();
});
