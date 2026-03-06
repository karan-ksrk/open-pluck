# Open Pluck

A Chrome extension that lets you highlight any text in a ChatGPT or Claude.ai conversation and ask follow-up questions about it — without cluttering your main chat, breaking your flow, or wasting context window tokens.

Completely free. No API keys. Uses your existing browser session.

---

## How it works

1. Open ChatGPT or Claude.ai and have any conversation
2. **Highlight** any text inside an AI response
3. A small **popover** appears with quick options — "What is this?", "Explain this", or a custom question
4. A **popup window** opens and auto-submits your question to ChatGPT or Claude using your logged-in session
5. A **sidebar** on the right tracks all your questions for the session with a "Focus chat window" button

Your main conversation stays completely untouched — no extra messages, no context pollution, no token waste.

---

## Features

- 🆓 **Completely free** — no API keys, no subscriptions, no configuration
- ⚡ **One-click questions** — "What is X?", "Explain this", or custom input
- 🪟 **Popup window** — answer opens in a dedicated window alongside your chat
- 📋 **Session sidebar** — tracks all your highlight questions in one place
- 🔒 **Private** — no data collected, no external servers, uses your own browser session
- 🎯 **Non-intrusive** — works on text inside AI responses only, ignores everything else

---

## Supported Sites

| Site      | URL         |
| --------- | ----------- |
| ChatGPT   | chatgpt.com |
| Claude.ai | claude.ai   |

---

## Installation

This extension is not yet on the Chrome Web Store. To install manually:

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer Mode** (toggle in the top right)
4. Click **Load unpacked**
5. Select the `highlight-ask-extension` folder
6. The settings page will open — choose ChatGPT or Claude.ai as your answer service

> **Requirement:** You must be logged in to your chosen service (ChatGPT or Claude.ai) in Chrome for the extension to work.

---

## Settings

Click the extension icon in the toolbar to access settings.

| Option             | Description                         |
| ------------------ | ----------------------------------- |
| **Answer Service** | Choose between ChatGPT or Claude.ai |

That's it. Nothing else to configure.

---

## Project Structure

```
highlight-ask-extension/
├── manifest.json       # MV3 extension config
├── content.js          # Selection detection, popover, sidebar, auto-submit logic
├── content.css         # All injected UI styles (dark/light mode aware)
├── background.js       # Service worker — manages popup windows
├── options.html/js     # Settings page
├── popup.html/js       # Toolbar icon popup
└── icons/              # Extension icons (16/48/128px)
```

---

## How auto-submit works

When you ask a question, the extension:

1. Stores the question in `chrome.storage.local`
2. Opens a new popup window pointed at `chatgpt.com/?ha=1` or `claude.ai/new?ha=1`
3. The content script in that window detects the `?ha=1` flag, reads the pending question, waits for the chat input to be ready, then injects and submits the text using DOM events

No API calls are made by the extension itself. Everything goes through the AI service's normal web interface using your own account.

---

## Privacy

- No data is sent to any third-party server
- API keys are not used or stored
- Questions are submitted directly through your browser session to ChatGPT or Claude.ai
- `chrome.storage.local` is used only to temporarily pass the question to the popup window

---

## Contributing

Pull requests are welcome. Some ideas for improvement:

- Support for additional sites (Gemini, Perplexity, etc.)
- Remember question history across sessions
- Keyboard shortcut to trigger popover
- Custom prompt templates

---

## License

MIT
