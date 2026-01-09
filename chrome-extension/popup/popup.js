const API_BASE = 'https://yhcway.com';

let currentUser = null;
let timerInterval = null;
let timerSeconds = 0;
let timerRunning = false;

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  setupEventListeners();
});

async function checkAuth() {
  try {
    const token = await chrome.storage.local.get('authToken');
    if (token.authToken) {
      const user = await fetchAPI('/api/auth/user');
      if (user && user.id) {
        currentUser = user;
        showMainView();
        loadData();
        return;
      }
    }
    showLoginView();
  } catch (error) {
    console.error('Auth check failed:', error);
    showLoginView();
  }
}

function showLoading() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('main-view').classList.add('hidden');
}

function showLoginView() {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('login-view').classList.remove('hidden');
  document.getElementById('main-view').classList.add('hidden');
}

function showMainView() {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('main-view').classList.remove('hidden');
  document.getElementById('user-name').textContent = currentUser?.firstName || currentUser?.email || 'User';
}

function setupEventListeners() {
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('refresh-btn').addEventListener('click', loadData);
  document.getElementById('settings-btn').addEventListener('click', openSettings);
  document.getElementById('open-app').addEventListener('click', () => chrome.tabs.create({ url: API_BASE }));
  
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  
  document.getElementById('quick-task').addEventListener('click', () => openQuickAdd('task'));
  document.getElementById('quick-note').addEventListener('click', () => openQuickAdd('note'));
  
  document.getElementById('add-task-btn').addEventListener('click', addTask);
  document.getElementById('new-task-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
  });
  
  document.getElementById('timer-start').addEventListener('click', startTimer);
  document.getElementById('timer-stop').addEventListener('click', stopTimer);
  
  document.getElementById('ai-submit').addEventListener('click', submitAIQuery);
  document.querySelectorAll('.ai-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => handleAIQuickAction(btn.dataset.action));
  });
  
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-save').addEventListener('click', saveModal);
  
  const todayDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', month: 'long', day: 'numeric' 
  });
  document.getElementById('today-date').textContent = todayDate;
}

function handleLogin() {
  chrome.tabs.create({ url: `${API_BASE}/auth/login?extension=true` });
}

function openSettings() {
  chrome.tabs.create({ url: `${API_BASE}/settings` });
}

function switchTab(tabId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
  document.getElementById(`tab-${tabId}`).classList.remove('hidden');
}

async function loadData() {
  await Promise.all([
    loadNotifications(),
    loadTasks(),
    loadEvents(),
    loadTimeSessions()
  ]);
}

async function loadNotifications() {
  const container = document.getElementById('notifications-list');
  try {
    const tasks = await fetchAPI('/api/tasks?limit=3');
    const events = await fetchAPI('/api/calendar/events?limit=3');
    
    const items = [];
    
    if (tasks && tasks.length > 0) {
      tasks.slice(0, 2).forEach(task => {
        items.push({
          type: 'task',
          title: task.title || task.name,
          subtitle: task.dueDate ? `Due ${formatDate(task.dueDate)}` : 'No due date'
        });
      });
    }
    
    if (events && events.length > 0) {
      events.slice(0, 2).forEach(event => {
        items.push({
          type: 'event',
          title: event.summary || event.title,
          subtitle: formatTime(event.start)
        });
      });
    }
    
    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state">No recent activity</div>';
      return;
    }
    
    container.innerHTML = items.map(item => `
      <div class="list-item">
        <div class="list-item-icon ${item.type}">
          ${item.type === 'task' ? '✓' : '📅'}
        </div>
        <div class="list-item-content">
          <div class="list-item-title">${escapeHtml(item.title)}</div>
          <div class="list-item-subtitle">${item.subtitle}</div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    container.innerHTML = '<div class="empty-state">Unable to load notifications</div>';
  }
}

async function loadTasks() {
  const container = document.getElementById('tasks-list');
  try {
    const tasks = await fetchAPI('/api/tasks?limit=10&completed=false');
    
    if (!tasks || tasks.length === 0) {
      container.innerHTML = '<div class="empty-state">No tasks yet</div>';
      return;
    }
    
    container.innerHTML = tasks.map(task => `
      <div class="list-item" data-task-id="${task.id}">
        <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask('${task.id}')"></div>
        <div class="list-item-content">
          <div class="list-item-title task-title ${task.completed ? 'completed' : ''}">${escapeHtml(task.title || task.name)}</div>
          <div class="list-item-subtitle">${task.dueDate ? `Due ${formatDate(task.dueDate)}` : 'No due date'}</div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    container.innerHTML = '<div class="empty-state">Unable to load tasks</div>';
  }
}

async function loadEvents() {
  const container = document.getElementById('events-list');
  try {
    const events = await fetchAPI('/api/calendar/events?limit=5');
    
    if (!events || events.length === 0) {
      container.innerHTML = '<div class="empty-state">No upcoming events</div>';
      return;
    }
    
    container.innerHTML = events.map(event => `
      <div class="list-item">
        <div class="list-item-icon event">📅</div>
        <div class="list-item-content">
          <div class="list-item-title">${escapeHtml(event.summary || event.title)}</div>
          <div class="list-item-subtitle">${formatEventTime(event)}</div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    container.innerHTML = '<div class="empty-state">Unable to load events</div>';
  }
}

async function loadTimeSessions() {
  const container = document.getElementById('recent-sessions');
  try {
    const sessions = await fetchAPI('/api/yhctime/sessions?limit=5');
    
    if (!sessions || sessions.length === 0) {
      container.innerHTML = '<div class="empty-state">No recent time entries</div>';
      return;
    }
    
    container.innerHTML = sessions.slice(0, 5).map(session => `
      <div class="list-item">
        <div class="list-item-content">
          <div class="list-item-title">${escapeHtml(session.description || 'Time entry')}</div>
          <div class="list-item-subtitle">${formatDuration(session.duration)} - ${formatDate(session.date)}</div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    container.innerHTML = '<div class="empty-state">Unable to load time entries</div>';
  }
}

async function addTask() {
  const input = document.getElementById('new-task-input');
  const title = input.value.trim();
  if (!title) return;
  
  try {
    await fetchAPI('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title })
    });
    input.value = '';
    await loadTasks();
  } catch (error) {
    console.error('Failed to add task:', error);
  }
}

window.toggleTask = async function(taskId) {
  try {
    await fetchAPI(`/api/tasks/${taskId}/toggle`, { method: 'PATCH' });
    await loadTasks();
  } catch (error) {
    console.error('Failed to toggle task:', error);
  }
};

function startTimer() {
  timerRunning = true;
  document.getElementById('timer-start').classList.add('hidden');
  document.getElementById('timer-stop').classList.remove('hidden');
  
  timerInterval = setInterval(() => {
    timerSeconds++;
    updateTimerDisplay();
  }, 1000);
  
  chrome.storage.local.set({ 
    timerRunning: true, 
    timerStart: Date.now(),
    timerDescription: document.getElementById('timer-description').value
  });
}

async function stopTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  document.getElementById('timer-start').classList.remove('hidden');
  document.getElementById('timer-stop').classList.add('hidden');
  
  const description = document.getElementById('timer-description').value;
  const duration = timerSeconds;
  
  if (duration > 60) {
    try {
      await fetchAPI('/api/yhctime/sessions', {
        method: 'POST',
        body: JSON.stringify({
          description: description || 'Time entry from extension',
          duration: Math.floor(duration / 60),
          date: new Date().toISOString().split('T')[0]
        })
      });
      await loadTimeSessions();
    } catch (error) {
      console.error('Failed to save time entry:', error);
    }
  }
  
  timerSeconds = 0;
  updateTimerDisplay();
  document.getElementById('timer-description').value = '';
  chrome.storage.local.remove(['timerRunning', 'timerStart', 'timerDescription']);
}

function updateTimerDisplay() {
  const hours = Math.floor(timerSeconds / 3600);
  const mins = Math.floor((timerSeconds % 3600) / 60);
  const secs = timerSeconds % 60;
  document.getElementById('timer-display').textContent = 
    `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function submitAIQuery() {
  const input = document.getElementById('ai-input');
  const query = input.value.trim();
  if (!query) return;
  
  const responseDiv = document.getElementById('ai-response');
  responseDiv.classList.remove('hidden');
  responseDiv.textContent = 'Thinking...';
  
  try {
    const response = await fetchAPI('/api/ai/query', {
      method: 'POST',
      body: JSON.stringify({ query })
    });
    responseDiv.textContent = response.response || response.answer || 'No response';
    input.value = '';
  } catch (error) {
    responseDiv.textContent = 'Sorry, I could not process that request.';
  }
}

async function handleAIQuickAction(action) {
  const responseDiv = document.getElementById('ai-response');
  responseDiv.classList.remove('hidden');
  responseDiv.textContent = 'Loading...';
  
  try {
    let endpoint = '/api/ai/';
    switch (action) {
      case 'briefing':
        endpoint += 'briefing';
        break;
      case 'prioritize':
        endpoint += 'prioritize-tasks';
        break;
      case 'summarize':
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const pageContent = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
        const response = await fetchAPI('/api/ai/summarize', {
          method: 'POST',
          body: JSON.stringify({ content: pageContent?.text || tab.url })
        });
        responseDiv.textContent = response.summary || 'Could not summarize this page.';
        return;
    }
    
    const response = await fetchAPI(endpoint);
    responseDiv.textContent = response.briefing || response.summary || response.result || JSON.stringify(response);
  } catch (error) {
    responseDiv.textContent = 'Failed to complete action.';
  }
}

let currentModalType = null;

function openQuickAdd(type) {
  currentModalType = type;
  const modal = document.getElementById('quick-add-modal');
  const title = document.getElementById('modal-title');
  const input = document.getElementById('modal-input');
  
  title.textContent = type === 'task' ? 'New Task' : 'Quick Note';
  input.placeholder = type === 'task' ? 'What needs to be done?' : 'Write your note...';
  input.value = '';
  modal.classList.remove('hidden');
  input.focus();
}

function closeModal() {
  document.getElementById('quick-add-modal').classList.add('hidden');
  currentModalType = null;
}

async function saveModal() {
  const input = document.getElementById('modal-input').value.trim();
  if (!input) return;
  
  try {
    if (currentModalType === 'task') {
      await fetchAPI('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: input })
      });
      await loadTasks();
    }
    closeModal();
  } catch (error) {
    console.error('Failed to save:', error);
  }
}

async function fetchAPI(endpoint, options = {}) {
  const { authToken } = await chrome.storage.local.get('authToken');
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      ...options.headers
    },
    credentials: 'include'
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      await chrome.storage.local.remove('authToken');
      showLoginView();
    }
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-US', { 
    hour: 'numeric', minute: '2-digit', hour12: true 
  });
}

function formatEventTime(event) {
  const start = new Date(event.start?.dateTime || event.start);
  const end = event.end ? new Date(event.end?.dateTime || event.end) : null;
  
  const dateStr = formatDate(start);
  const timeStr = formatTime(start);
  
  return `${dateStr} at ${timeStr}`;
}

function formatDuration(minutes) {
  if (!minutes) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

chrome.storage.local.get(['timerRunning', 'timerStart', 'timerDescription'], (data) => {
  if (data.timerRunning && data.timerStart) {
    timerSeconds = Math.floor((Date.now() - data.timerStart) / 1000);
    document.getElementById('timer-description').value = data.timerDescription || '';
    startTimer();
  }
});
