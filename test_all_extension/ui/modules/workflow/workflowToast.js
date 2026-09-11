/**
 * workflowToast.js — Notification Toast Utility
 * Hiển thị thông báo toast nổi ở góc màn hình cho UI Workflow
 */

export function showToast(message) {
  let toast = document.getElementById('wfGlobalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'wfGlobalToast';
    toast.className = 'wf-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}
