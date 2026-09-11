/**
 * TikTok & Douyin SDK — Tab Management & In-Tab Scripting Transport
 * Handles waiting for tab complete, orchestrating In-Tab Scripting (world: MAIN) and bypass anti-bot.
 */

/**
 * Đợi tab tải xong hoàn toàn (status === 'complete')
 * @param {number} tabId 
 * @param {number} [timeoutMs=15000] 
 * @returns {Promise<chrome.tabs.Tab|null>}
 */
export function waitForTabComplete(tabId, timeoutMs = 15000) {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.tabs) return resolve(null);

    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (chrome.tabs.onUpdated?.removeListener) {
          chrome.tabs.onUpdated.removeListener(listener);
        }
        chrome.tabs.get(tabId, (t) => resolve(t || null));
      }
    }, timeoutMs);

    const listener = (updatedTabId, changeInfo, tab) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(tab);
        }
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    // Kiểm tra trạng thái hiện tại ngay lập tức phòng khi đã complete
    chrome.tabs.get(tabId, (currentTab) => {
      if (chrome.runtime.lastError || !currentTab) return;
      if (!resolved && currentTab.status === 'complete') {
        resolved = true;
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(currentTab);
      }
    });
  });
}

/**
 * Thực thi request bên trong Tab TikTok/Douyin thật với world: 'MAIN'
 * Tận dụng native webmssdk tự động ký chữ ký hợp lệ
 * @param {number} tabId 
 * @param {string} rawUrl 
 * @returns {Promise<Object>}
 */
export async function executeTabScripting(tabId, rawUrl) {
  if (typeof chrome === 'undefined' || !chrome.scripting) {
    throw new Error('Chrome Scripting API không khả dụng');
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: async (fetchUrl) => {
      try {
        // 1. Xóa bất kỳ X-Bogus hoặc _signature cũ để native SDK của TikTok tự ký mới
        const u = new URL(fetchUrl, window.location.origin);
        u.searchParams.delete('X-Bogus');
        u.searchParams.delete('_signature');

        let requestPath = u.pathname + u.search;

        // 2. Nếu có hàm sign native trong window (byted_acrawler), gọi ký trực tiếp
        if (window.byted_acrawler && typeof window.byted_acrawler.sign === 'function') {
          try {
            const signed = window.byted_acrawler.sign({
              url: requestPath,
              userAgent: navigator.userAgent,
            });
            if (signed) {
              requestPath = signed;
            }
          } catch (signErr) {
            console.warn('In-tab byted_acrawler sign error:', signErr);
          }
        }

        // 3. Chuẩn hóa targetUrl hợp lệ
        let targetUrl = requestPath;
        if (!targetUrl.startsWith('http')) {
          targetUrl = window.location.origin + (targetUrl.startsWith('/') ? '' : '/') + targetUrl;
        }

        // 4. Fetch với credentials để gửi kèm cookies (ttwid, sessionid...)
        const response = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        const text = await response.text();
        return {
          ok: response.ok,
          status: response.status,
          text,
          usedUrl: targetUrl,
          hasBytedAcrawler: !!(window.byted_acrawler && typeof window.byted_acrawler.sign === 'function'),
          cookiesPresent: (document.cookie || '').length > 0,
        };
      } catch (err) {
        return { ok: false, status: 0, error: err.message || String(err) };
      }
    },
    args: [rawUrl],
  });

  const execution = results?.[0]?.result;
  if (!execution) throw new Error('Không nhận được dữ liệu phản hồi từ In-Tab Scripting');
  if (!execution.ok || !execution.text || execution.text.trim() === '') {
    const err = new Error(`In-Tab HTTP ${execution.status || 0}: ${execution.error || 'Empty body (0 bytes)'}`);
    err.status = execution.status;
    err.responseBody = execution.text || 'Trống';
    err.rawResponse = { status: execution.status, error: execution.error, text: execution.text };
    err.debugInfo = {
      tabId,
      rawUrl,
      usedUrl: execution.usedUrl,
      hasBytedAcrawler: execution.hasBytedAcrawler,
      cookiesPresent: execution.cookiesPresent,
      mode: 'In-Tab Scripting (world: MAIN)',
    };
    throw err;
  }

  try {
    return JSON.parse(execution.text);
  } catch (parseErr) {
    const err = new Error(`In-Tab trả về phản hồi không phải JSON: ${execution.text.substring(0, 100)}`);
    err.responseBody = execution.text;
    err.rawResponse = { text: execution.text };
    err.debugInfo = { tabId, usedUrl: execution.usedUrl, mode: 'In-Tab Scripting (world: MAIN)' };
    throw err;
  }
}
