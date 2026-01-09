const API_BASE = 'https://yhcway.com';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'yhc-add-task',
    title: 'Add as Task to YHC Way',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'yhc-ask-ai',
    title: 'Ask YHC AI about this',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'yhc-save-link',
    title: 'Save to YHC Way',
    contexts: ['link', 'page']
  });
  
  chrome.contextMenus.create({
    id: 'yhc-lookup-customer',
    title: 'Look up in Perkville',
    contexts: ['selection']
  });
  
  chrome.alarms.create('check-notifications', { periodInMinutes: 5 });
  chrome.alarms.create('sync-data', { periodInMinutes: 15 });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { authToken } = await chrome.storage.local.get('authToken');
  if (!authToken) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon128.png',
      title: 'YHC Way',
      message: 'Please sign in to use this feature'
    });
    return;
  }
  
  switch (info.menuItemId) {
    case 'yhc-add-task':
      await createTask(info.selectionText);
      break;
    case 'yhc-ask-ai':
      await askAI(info.selectionText);
      break;
    case 'yhc-save-link':
      await saveLink(info.linkUrl || info.pageUrl, tab.title);
      break;
    case 'yhc-lookup-customer':
      await lookupCustomer(info.selectionText);
      break;
  }
});

async function createTask(text) {
  try {
    const { authToken } = await chrome.storage.local.get('authToken');
    const response = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      credentials: 'include',
      body: JSON.stringify({ title: text.substring(0, 200) })
    });
    
    if (response.ok) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '../icons/icon128.png',
        title: 'Task Created',
        message: `Added: ${text.substring(0, 50)}...`
      });
    }
  } catch (error) {
    console.error('Failed to create task:', error);
  }
}

async function askAI(text) {
  try {
    const { authToken } = await chrome.storage.local.get('authToken');
    const response = await fetch(`${API_BASE}/api/ai/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      credentials: 'include',
      body: JSON.stringify({ query: `Explain or analyze: ${text}` })
    });
    
    if (response.ok) {
      const data = await response.json();
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '../icons/icon128.png',
        title: 'YHC AI Response',
        message: (data.response || data.answer || '').substring(0, 200)
      });
    }
  } catch (error) {
    console.error('Failed to ask AI:', error);
  }
}

async function saveLink(url, title) {
  try {
    const { authToken } = await chrome.storage.local.get('authToken');
    await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      credentials: 'include',
      body: JSON.stringify({ 
        title: `Read: ${title || url}`.substring(0, 200),
        description: url
      })
    });
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon128.png',
      title: 'Link Saved',
      message: 'Added to your tasks'
    });
  } catch (error) {
    console.error('Failed to save link:', error);
  }
}

async function lookupCustomer(text) {
  const email = text.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0];
  if (!email) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon128.png',
      title: 'Customer Lookup',
      message: 'No email address found in selection'
    });
    return;
  }
  
  try {
    const { authToken } = await chrome.storage.local.get('authToken');
    const response = await fetch(`${API_BASE}/api/perkville/search?email=${encodeURIComponent(email)}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.points !== undefined) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '../icons/icon128.png',
          title: 'Perkville Customer',
          message: `${data.firstName || ''} ${data.lastName || ''}: ${data.points} points`
        });
      } else {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '../icons/icon128.png',
          title: 'Customer Not Found',
          message: `No Perkville account for ${email}`
        });
      }
    }
  } catch (error) {
    console.error('Failed to lookup customer:', error);
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'check-notifications') {
    await checkNotifications();
  }
  if (alarm.name === 'sync-data') {
    await syncData();
  }
});

async function checkNotifications() {
  try {
    const { authToken, lastNotificationCheck } = await chrome.storage.local.get(['authToken', 'lastNotificationCheck']);
    if (!authToken) return;
    
    const response = await fetch(`${API_BASE}/api/notifications/unread`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      credentials: 'include'
    });
    
    if (response.ok) {
      const notifications = await response.json();
      const newNotifications = notifications.filter(n => 
        !lastNotificationCheck || new Date(n.createdAt) > new Date(lastNotificationCheck)
      );
      
      if (newNotifications.length > 0) {
        chrome.action.setBadgeText({ text: String(newNotifications.length) });
        chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
        
        newNotifications.slice(0, 3).forEach(notification => {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: '../icons/icon128.png',
            title: notification.title || 'YHC Way',
            message: notification.message || notification.body || ''
          });
        });
      }
      
      await chrome.storage.local.set({ lastNotificationCheck: new Date().toISOString() });
    }
  } catch (error) {
    console.error('Failed to check notifications:', error);
  }
}

async function syncData() {
  try {
    const { authToken } = await chrome.storage.local.get('authToken');
    if (!authToken) return;
    
    const [tasks, events] = await Promise.all([
      fetch(`${API_BASE}/api/tasks?limit=20&completed=false`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        credentials: 'include'
      }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/calendar/events?limit=10`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        credentials: 'include'
      }).then(r => r.ok ? r.json() : [])
    ]);
    
    await chrome.storage.local.set({
      cachedTasks: tasks,
      cachedEvents: events,
      lastSync: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to sync data:', error);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'setAuthToken') {
    chrome.storage.local.set({ authToken: message.token });
    sendResponse({ success: true });
  }
  
  if (message.action === 'logout') {
    chrome.storage.local.remove(['authToken', 'cachedTasks', 'cachedEvents']);
    chrome.action.setBadgeText({ text: '' });
    sendResponse({ success: true });
  }
  
  return true;
});

chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.tabs.create({ url: API_BASE });
});
