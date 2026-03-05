// HighlightAsk — options.js v2

const statusEl = document.getElementById("status");

// Load saved preference
chrome.storage.sync.get("answerService", ({ answerService }) => {
  const service = answerService || "chatgpt";
  selectService(service);
});

// Card click
document.getElementById("card-chatgpt").addEventListener("click", () => selectService("chatgpt"));
document.getElementById("card-claude").addEventListener("click",  () => selectService("claude"));

function selectService(service) {
  const chatgptCard = document.getElementById("card-chatgpt");
  const claudeCard  = document.getElementById("card-claude");

  chatgptCard.classList.remove("active-chatgpt", "active-claude");
  claudeCard.classList.remove("active-chatgpt", "active-claude");

  if (service === "chatgpt") {
    chatgptCard.classList.add("active-chatgpt");
    chatgptCard.querySelector("input").checked = true;
  } else {
    claudeCard.classList.add("active-claude");
    claudeCard.querySelector("input").checked = true;
  }
}

function getSelected() {
  return document.querySelector('input[name="service"]:checked')?.value || "chatgpt";
}

// Save
document.getElementById("save-btn").addEventListener("click", async () => {
  const service = getSelected();
  await chrome.storage.sync.set({ answerService: service });

  const label = service === "chatgpt" ? "ChatGPT" : "Claude.ai";
  statusEl.className = "status success";
  statusEl.textContent = `✓ Answer service set to ${label}`;
  setTimeout(() => { statusEl.className = "status"; }, 3500);
});
