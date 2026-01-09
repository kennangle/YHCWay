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
  modal.innerHTML = `
    <div class="yhc-modal-overlay">
      <div class="yhc-modal-content">
        <div class="yhc-modal-header">
          <img src="${chrome.runtime.getURL('icons/icon32.png')}" class="yhc-modal-logo">
          <span class="yhc-modal-title">${type === 'task' ? 'Quick Task' : type === 'ai' ? 'Ask AI' : 'Capture'}</span>
          <button class="yhc-modal-close">&times;</button>
        </div>
        <textarea class="yhc-modal-input" placeholder="${type === 'task' ? 'What needs to be done?' : 'Ask a question...'}">${initialText}</textarea>
        <div class="yhc-modal-actions">
          <button class="yhc-btn yhc-btn-secondary yhc-modal-cancel">Cancel</button>
          <button class="yhc-btn yhc-btn-primary yhc-modal-submit">${type === 'task' ? 'Add Task' : 'Submit'}</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  captureModal = modal;
  
  const input = modal.querySelector('.yhc-modal-input');
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
