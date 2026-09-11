/**
 * autoTabs.js — Platform Tab & Session Manager
 * Quản lý trạng thái tab ngầm và tự động mở các sàn TMĐT (1688, Shopee, TikTok, Gemini) nếu thiếu phiên.
 */

export const PLATFORMS = {
  '1688': {
    name: '1688 Sỉ',
    url: 'https://s.1688.com/',
    pattern: ['*://*.1688.com/*', '*://1688.com/*']
  },
  'shopee': {
    name: 'Shopee PH',
    url: 'https://shopee.ph/',
    pattern: ['*://*.shopee.ph/*', '*://shopee.ph/*', '*://*.shopee.vn/*', '*://shopee.vn/*']
  },
  'tiktok': {
    name: 'TikTok Global',
    url: 'https://www.tiktok.com/',
    pattern: ['*://*.tiktok.com/*', '*://tiktok.com/*', '*://*.douyin.com/*', '*://douyin.com/*']
  },
  'gemini': {
    name: 'Google Gemini',
    url: 'https://gemini.google.com/',
    pattern: ['*://gemini.google.com/*']
  }
};

/**
 * Quét toàn bộ tab Chrome để kiểm tra tình trạng các sàn
 * @returns {Promise<Object>} Ví dụ: { '1688': true, 'shopee': false, 'tiktok': true, 'gemini': true }
 */
export async function checkAllSessions() {
  const result = {
    '1688': false,
    'shopee': false,
    'tiktok': false,
    'gemini': false
  };

  if (!chrome.tabs || !chrome.tabs.query) {
    return result;
  }

  for (const [key, config] of Object.entries(PLATFORMS)) {
    try {
      const tabs = await chrome.tabs.query({ url: config.pattern });
      result[key] = Boolean(tabs && tabs.length > 0);
    } catch (err) {
      console.warn(`Lỗi kiểm tra tab ${key}:`, err);
    }
  }

  return result;
}

/**
 * Tự động mở ngầm các tab sàn còn thiếu trước khi pipeline chạy
 * @param {Array<string>} [platformKeys] - Danh sách key ['1688', 'shopee', 'tiktok', 'gemini']
 * @returns {Promise<Object>} Danh sách kết quả mở tab
 */
export async function openRequiredBackgroundTabs(platformKeys = ['1688', 'shopee', 'tiktok', 'gemini']) {
  const sessionStatus = await checkAllSessions();
  const openedTabs = {};

  for (const key of platformKeys) {
    if (!sessionStatus[key] && PLATFORMS[key]) {
      const platform = PLATFORMS[key];
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'ENSURE_TAB_OPEN',
          payload: {
            platform: key,
            url: platform.url,
            matchPattern: platform.pattern
          }
        });
        openedTabs[key] = response;
      } catch (err) {
        console.warn(`Không thể mở tab ngầm cho ${key}:`, err);
        openedTabs[key] = { success: false, error: err.message };
      }
    } else {
      openedTabs[key] = { success: true, existed: true };
    }
  }

  return openedTabs;
}
