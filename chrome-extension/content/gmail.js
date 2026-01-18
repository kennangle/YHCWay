let observer = null;
let buttonsInjected = new WeakSet();

function init() {
  observer = new MutationObserver(debounce(injectButtons, 200));
  observer.observe(document.body, { childList: true, subtree: true });
  injectButtons();
}

function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

function injectButtons() {
  const emailContainers = document.querySelectorAll('[data-message-id]');
  
  emailContainers.forEach(container => {
    if (buttonsInjected.has(container)) return;
    
    const toolbar = container.querySelector('[gh="mtb"]') || 
                    container.querySelector('.ade') ||
                    container.querySelector('[role="toolbar"]');
    
    if (toolbar && !toolbar.querySelector('.yhc-gmail-btn')) {
      const btnContainer = document.createElement('div');
      btnContainer.className = 'yhc-gmail-btn-container';
      btnContainer.innerHTML = `
        <button class="yhc-gmail-btn yhc-gmail-task" title="Create task from this email">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Task
        </button>
      `;
      
      toolbar.appendChild(btnContainer);
      
      btnContainer.querySelector('.yhc-gmail-task').addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await createTaskFromEmail(container);
      });
      
      buttonsInjected.add(container);
    }
  });
  
  const openEmail = document.querySelector('[data-message-id].ha') ||
                     document.querySelector('.adn.ads') ||
                     document.querySelector('.h7');
  
  if (openEmail && !document.querySelector('.yhc-email-actions')) {
    const actionsBar = document.querySelector('.amn') || 
                        document.querySelector('.G-atb') ||
                        document.querySelector('[gh="tm"]');
    
    if (actionsBar) {
      const yhcActions = document.createElement('div');
      yhcActions.className = 'yhc-email-actions';
      yhcActions.innerHTML = `
        <button class="yhc-action-btn yhc-create-task">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Create Task
        </button>
        <button class="yhc-action-btn yhc-summarize">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          Summarize
        </button>
      `;
      
      actionsBar.appendChild(yhcActions);
      
      yhcActions.querySelector('.yhc-create-task').addEventListener('click', () => createTaskFromOpenEmail());
      yhcActions.querySelector('.yhc-summarize').addEventListener('click', () => summarizeEmail());
    }
  }
}

async function createTaskFromEmail(container) {
  const subject = container.querySelector('[data-thread-perm-id]')?.textContent ||
                   container.querySelector('.hP')?.textContent ||
                   container.querySelector('.bog')?.textContent ||
                   'Email task';
  
  try {
    const { authToken } = await chrome.storage.local.get('authToken');
    if (!authToken) {
      alert('Please sign in to YHC Way first');
      return;
    }
    
    const response = await fetch('https://yhcway.com/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      credentials: 'include',
      body: JSON.stringify({
        title: `Follow up: ${subject}`.substring(0, 200),
        description: `Created from Gmail: ${window.location.href}`
      })
    });
    
    if (response.ok) {
      showGmailToast('Task created in YHC Way');
    } else {
      throw new Error('Failed');
    }
  } catch (error) {
    showGmailToast('Failed to create task', true);
  }
}

async function createTaskFromOpenEmail() {
  const subject = document.querySelector('.hP')?.textContent ||
                   document.querySelector('[data-thread-perm-id]')?.textContent ||
                   'Email task';
  
  const body = document.querySelector('.a3s.aiL')?.innerText?.substring(0, 500) || '';
  
  try {
    const { authToken } = await chrome.storage.local.get('authToken');
    if (!authToken) {
      alert('Please sign in to YHC Way first');
      return;
    }
    
    const response = await fetch('https://yhcway.com/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      credentials: 'include',
      body: JSON.stringify({
        title: `Follow up: ${subject}`.substring(0, 200),
        description: body ? `Email excerpt: ${body}` : `Created from Gmail`
      })
    });
    
    if (response.ok) {
      showGmailToast('Task created in YHC Way');
    }
  } catch (error) {
    showGmailToast('Failed to create task', true);
  }
}

async function summarizeEmail() {
  const subject = document.querySelector('.hP')?.textContent || '';
  const body = document.querySelector('.a3s.aiL')?.innerText || '';
  
  if (!body) {
    showGmailToast('No email content found', true);
    return;
  }
  
  showGmailToast('Summarizing email...');
  
  try {
    const { authToken } = await chrome.storage.local.get('authToken');
    if (!authToken) {
      alert('Please sign in to YHC Way first');
      return;
    }
    
    const response = await fetch('https://yhcway.com/api/ai/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      credentials: 'include',
      body: JSON.stringify({
        content: `Subject: ${subject}\n\n${body.substring(0, 3000)}`
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      showSummaryModal(subject, data.summary || 'No summary available');
    }
  } catch (error) {
    showGmailToast('Failed to summarize', true);
  }
}

function showSummaryModal(subject, summary) {
  const existing = document.querySelector('.yhc-summary-modal');
  if (existing) existing.remove();
  
  // Create modal structure using safe DOM methods
  const modal = document.createElement('div');
  modal.className = 'yhc-summary-modal';
  
  const overlay = document.createElement('div');
  overlay.className = 'yhc-summary-overlay';
  
  const content = document.createElement('div');
  content.className = 'yhc-summary-content';
  
  const header = document.createElement('div');
  header.className = 'yhc-summary-header';
  
  const headerSpan = document.createElement('span');
  headerSpan.textContent = 'Email Summary';
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'yhc-summary-close';
  closeBtn.innerHTML = '&times;';
  
  header.appendChild(headerSpan);
  header.appendChild(closeBtn);
  
  const subjectDiv = document.createElement('div');
  subjectDiv.className = 'yhc-summary-subject';
  subjectDiv.textContent = subject;
  
  const summaryDiv = document.createElement('div');
  summaryDiv.className = 'yhc-summary-text';
  summaryDiv.textContent = summary;
  
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'yhc-summary-actions';
  
  const taskBtn = document.createElement('button');
  taskBtn.className = 'yhc-summary-task';
  taskBtn.textContent = 'Create Task from Summary';
  
  actionsDiv.appendChild(taskBtn);
  
  content.appendChild(header);
  content.appendChild(subjectDiv);
  content.appendChild(summaryDiv);
  content.appendChild(actionsDiv);
  
  overlay.appendChild(content);
  modal.appendChild(overlay);
  
  document.body.appendChild(modal);
  
  closeBtn.addEventListener('click', () => modal.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) modal.remove();
  });
  taskBtn.addEventListener('click', async () => {
    await createTaskWithText(`Review: ${subject}`, summary);
    modal.remove();
  });
}

async function createTaskWithText(title, description) {
  try {
    const { authToken } = await chrome.storage.local.get('authToken');
    await fetch('https://yhcway.com/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      credentials: 'include',
      body: JSON.stringify({ title, description })
    });
    showGmailToast('Task created');
  } catch (error) {
    showGmailToast('Failed to create task', true);
  }
}

function showGmailToast(message, isError = false) {
  const existing = document.querySelector('.yhc-gmail-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `yhc-gmail-toast ${isError ? 'yhc-toast-error' : ''}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('yhc-toast-visible'), 10);
  setTimeout(() => {
    toast.classList.remove('yhc-toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
