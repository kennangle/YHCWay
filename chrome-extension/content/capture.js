let captureModal = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getPageContent') {
    const content = {
      text: document.body.innerText.substring(0, 5000),
      title: document.title,
      url: window.location.href
    };
    sendResponse(content);
  }
  
  if (message.action === 'showCaptureModal') {
    showCaptureModal(message.type, message.text);
    sendResponse({ success: true });
  }
  
  return true;
});

document.addEventListener('keydown', (e) => {
  if (e.altKey && e.shiftKey && e.key === 'T') {
    e.preventDefault();
    const selection = window.getSelection().toString().trim();
    showCaptureModal('task', selection);
  }
  
  if (e.altKey && e.shiftKey && e.key === 'A') {
    e.preventDefault();
    const selection = window.getSelection().toString().trim();
    showCaptureModal('ai', selection);
  }
});

function showCaptureModal(type, initialText = '') {
  if (captureModal) {
    captureModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.id = 'yhc-capture-modal';
  
  const overlay = document.createElement('div');
  overlay.className = 'yhc-modal-overlay';
  
  const content = document.createElement('div');
  content.className = 'yhc-modal-content';
  
  const header = document.createElement('div');
  header.className = 'yhc-modal-header';
  
  const logo = document.createElement('img');
  logo.src = chrome.runtime.getURL('icons/icon32.png');
  logo.className = 'yhc-modal-logo';
  
  const title = document.createElement('span');
  title.className = 'yhc-modal-title';
  title.textContent = type === 'task' ? 'Quick Task' : type === 'ai' ? 'Ask AI' : 'Capture';
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'yhc-modal-close';
  closeBtn.textContent = '×';
  
  header.appendChild(logo);
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  const input = document.createElement('textarea');
  input.className = 'yhc-modal-input';
  input.placeholder = type === 'task' ? 'What needs to be done?' : 'Ask a question...';
  input.value = initialText;
  
  const actions = document.createElement('div');
  actions.className = 'yhc-modal-actions';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'yhc-btn yhc-btn-secondary yhc-modal-cancel';
  cancelBtn.textContent = 'Cancel';
  
  const submitBtn = document.createElement('button');
  submitBtn.className = 'yhc-btn yhc-btn-primary yhc-modal-submit';
  submitBtn.textContent = type === 'task' ? 'Add Task' : 'Submit';
  
  actions.appendChild(cancelBtn);
  actions.appendChild(submitBtn);
  
  content.appendChild(header);
  content.appendChild(input);
  content.appendChild(actions);
  
  overlay.appendChild(content);
  modal.appendChild(overlay);
  
  document.body.appendChild(modal);
  captureModal = modal;
  
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
  
  modal.querySelector('.yhc-modal-close').addEventListener('click', closeCaptureModal);
  modal.querySelector('.yhc-modal-cancel').addEventListener('click', closeCaptureModal);
  modal.querySelector('.yhc-modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeCaptureModal();
  });
  
  modal.querySelector('.yhc-modal-submit').addEventListener('click', async () => {
    const text = input.value.trim();
    if (!text) return;
    
    const submitBtn = modal.querySelector('.yhc-modal-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    
    try {
      const { authToken } = await chrome.storage.local.get('authToken');
      if (!authToken) {
        alert('Please sign in to YHC Way first');
        return;
      }
      
      const endpoint = type === 'task' ? '/api/tasks' : '/api/ai/query';
      const body = type === 'task' ? { title: text } : { query: text };
      
      const response = await fetch(`https://yhcway.com${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        if (type === 'ai') {
          const data = await response.json();
          input.value = data.response || data.answer || 'No response';
          submitBtn.textContent = 'Done';
          setTimeout(closeCaptureModal, 2000);
        } else {
          showToast('Task added successfully!');
          closeCaptureModal();
        }
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      alert('Failed to save. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = type === 'task' ? 'Add Task' : 'Submit';
    }
  });
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCaptureModal();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      modal.querySelector('.yhc-modal-submit').click();
    }
  });
}

function closeCaptureModal() {
  if (captureModal) {
    captureModal.remove();
    captureModal = null;
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'yhc-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('yhc-toast-show'), 10);
  setTimeout(() => {
    toast.classList.remove('yhc-toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
