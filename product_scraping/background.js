/**
 * Background Service Worker for Unified SDK Utility Suite
 * Hỗ trợ Side Panel ghim cố định và Cửa sổ độc lập (Không bị tự tắt khi đổi tab)
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('🚀 SDK Utility Suite - All-in-One Studio Installed.');
});

// Cấu hình để khi click vào icon Extension trên toolbar, Chrome sẽ mở Side Panel ghim cố định bên hông
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.warn('SidePanel behavior warning:', error));
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'OPEN_FULL_TAB') {
    chrome.tabs.create({ url: chrome.runtime.getURL('ui/index.html') });
    sendResponse({ status: 'ok' });
    return false;
  } else if (request.action === 'OPEN_WINDOW') {
    chrome.windows.create({
      url: chrome.runtime.getURL('ui/index.html'),
      type: 'popup',
      width: 1200,
      height: 850,
      focused: true
    });
    sendResponse({ status: 'ok' });
    return false;
  } else if (request.action === 'OPEN_SIDE_PANEL') {
    if (chrome.sidePanel && chrome.sidePanel.open && sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id });
    }
    sendResponse({ status: 'ok' });
    return false;
  } else if (request.action === 'OPEN_URL') {
    chrome.tabs.create({ url: request.url, active: true });
    sendResponse({ status: 'ok' });
    return false;
  } else if (request.action === 'ENSURE_TAB_OPEN') {
    ensureTabOpen(request.payload.url, request.payload.matchPattern)
      .then(tab => sendResponse({ success: true, tab }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Giữ channel async cho Chrome runtime
  } else if (request.action === 'TRIGGER_DOWNLOAD') {
    triggerDownload(request.payload.blobUrl, request.payload.filename)
      .then(downloadId => sendResponse({ success: true, downloadId }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  return false;
});

/**
 * Tìm tab đang mở theo pattern, nếu chưa có thì mở tab ngầm mới (active: false)
 */
async function ensureTabOpen(platformUrl, matchPattern) {
  try {
    const existing = await chrome.tabs.query({ url: matchPattern });
    if (existing && existing.length > 0) {
      return existing[0];
    }
    // Mở tab ngầm không chiếm active view
    const newTab = await chrome.tabs.create({ url: platformUrl, active: false });
    
    // Đợi tab tải xong (status === 'complete') hoặc bị đóng sớm
    await new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(updateListener);
        chrome.tabs.onRemoved.removeListener(removeListener);
      };

      const timeout = setTimeout(() => {
        cleanup();
        resolve(newTab);
      }, 15000); // 15 giây timeout tối đa

      function updateListener(tabId, changeInfo) {
        if (tabId === newTab.id && changeInfo.status === 'complete') {
          cleanup();
          resolve(newTab);
        }
      }

      function removeListener(tabId) {
        if (tabId === newTab.id) {
          cleanup();
          reject(new Error(`Tab (${platformUrl}) đã bị đóng trước khi hoàn tất tải.`));
        }
      }

      chrome.tabs.onUpdated.addListener(updateListener);
      chrome.tabs.onRemoved.addListener(removeListener);
    });

    return newTab;
  } catch (err) {
    console.error('ensureTabOpen error:', err);
    throw err;
  }
}

/**
 * Tải file xuống máy tính qua chrome.downloads API
 */
async function triggerDownload(urlOrBlob, filename) {
  if (!chrome.downloads || !chrome.downloads.download) {
    throw new Error('Chrome Downloads API không khả dụng.');
  }
  return new Promise((resolve, reject) => {
    chrome.downloads.download({
      url: urlOrBlob,
      filename: filename || 'product_data.zip',
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(downloadId);
      }
    });
  });
}

