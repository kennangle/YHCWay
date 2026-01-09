# The YHC Way Chrome Extension

A browser extension that brings The YHC Way unified workspace to your fingertips.

## Features

### Quick Access Popup
- View upcoming tasks, calendar events, and notifications
- Create new tasks instantly
- Track time directly from any tab
- AI assistant for quick queries

### Context Menu Integration
- Right-click selected text to create a task
- Ask AI about any selected content
- Save links to your workspace
- Look up customers in Perkville by email

### Gmail Integration
- "Create Task" button on emails
- AI-powered email summarization
- Quick task creation from email content

### Keyboard Shortcuts
- `Alt+Shift+T` - Quick task capture from any page
- `Alt+Shift+A` - Ask AI about selected text

### Background Features
- Notification sync every 5 minutes
- Data caching for offline access
- Desktop notifications for new items

## Installation

### For Development

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. The extension icon will appear in your toolbar

### First Time Setup

1. Click the YHC Way extension icon
2. Click "Sign In" to connect your YHC Way account
3. Once authenticated, you'll see your workspace data

## File Structure

```
chrome-extension/
├── manifest.json        # Extension configuration
├── icons/               # Extension icons
├── popup/               # Popup UI
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/          # Service worker
│   └── background.js
└── content/             # Content scripts
    ├── capture.js       # Quick capture on any page
    ├── capture.css
    ├── gmail.js         # Gmail-specific features
    └── gmail.css
```

## Permissions Explained

- `storage` - Save authentication and cached data locally
- `notifications` - Show desktop notifications
- `alarms` - Schedule periodic sync
- `contextMenus` - Add right-click menu options
- `activeTab` - Access current tab for content capture
- `scripting` - Inject content scripts dynamically

## Notes

- The extension connects to yhcway.com for all API calls
- Your session is stored securely in Chrome's local storage
- Time tracking continues even when popup is closed
- Data syncs automatically every 15 minutes
