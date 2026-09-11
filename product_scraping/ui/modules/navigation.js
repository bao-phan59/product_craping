/**
 * Navigation & Window Controls Module
 */

export function setupWindowControls() {
  document.getElementById('btnOpenWindow')?.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ action: 'OPEN_WINDOW' });
    } else {
      window.open(window.location.href, '_blank', 'width=1200,height=850');
    }
  });

  document.getElementById('btnOpenFullTab')?.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ action: 'OPEN_FULL_TAB' });
    } else {
      window.open(window.location.href, '_blank');
    }
  });

  document.querySelectorAll('.btn-bypass').forEach(btn => {
    btn.addEventListener('click', () => {
      let url = '';
      if (btn.id === 'btnOpenShopeeTab') url = 'https://shopee.ph/';
      else if (btn.id === 'btnOpenTiktokTab') url = 'https://www.tiktok.com/';
      else if (btn.id === 'btnOpenDouyinTab') url = 'https://www.douyin.com/';
      else if (btn.id === 'btnOpen1688Tab') url = 'https://s.1688.com/';
      else if (btn.id === 'btnOpenLensWeb') url = 'https://lens.google.com/';
      else if (btn.id === 'btnOpenGeminiWeb') url = 'https://gemini.google.com/';

      if (url) {
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({ action: 'OPEN_URL', url });
        } else {
          window.open(url, '_blank');
        }
      }
    });
  });
}

export function setupNavigationTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const panels = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(targetId)?.classList.add('active');
    });
  });
}
