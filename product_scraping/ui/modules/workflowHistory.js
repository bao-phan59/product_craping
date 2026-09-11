/**
 * workflowHistory.js — Persistent Storage & Workflow Run Archive
 * Quản lý lưu trữ, truy xuất và phục hồi lịch sử các phiên chạy Workflow.
 * Sử dụng chrome.storage.local (kèm fallback sang localStorage cho môi trường kiểm thử).
 */

const STORAGE_KEY = 'workflow_pipeline_history_v1';
const MAX_HISTORY_RUNS = 50;

/**
 * Lấy đối tượng storage phù hợp (chrome.storage.local hoặc mock qua localStorage)
 */
function getStorage() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return {
      async get(key) {
        return new Promise(resolve => {
          chrome.storage.local.get([key], res => resolve(res ? res[key] : null));
        });
      },
      async set(key, value) {
        return new Promise(resolve => {
          chrome.storage.local.set({ [key]: value }, resolve);
        });
      },
      async remove(key) {
        return new Promise(resolve => {
          chrome.storage.local.remove([key], resolve);
        });
      }
    };
  }

  // Fallback sang localStorage
  return {
    async get(key) {
      try {
        const item = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
        return item ? JSON.parse(item) : null;
      } catch (e) {
        return null;
      }
    },
    async set(key, value) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, JSON.stringify(value));
        }
      } catch (e) {}
    },
    async remove(key) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch (e) {}
    }
  };
}

/**
 * Lưu một phiên Pipeline hoàn tất vào lịch sử
 * @param {Object} state - pipelineState
 * @param {string} logText - Chuỗi toàn bộ log ghi lại được
 * @returns {Promise<Object>} Run entry vừa được lưu
 */
export async function saveRunToHistory(state, logText = '') {
  if (!state || !state.sku) return null;

  const storage = getStorage();
  const history = (await storage.get(STORAGE_KEY)) || [];

  const now = new Date();
  const dateStr = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

  const runEntry = {
    id: `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sku: state.sku,
    timestamp: Date.now(),
    dateStr,
    status: state.status || 'COMPLETED',
    originalImage: state.originalImage || '',
    stats: {
      shop1688Count: (state.valid1688Shops || []).length,
      shopeeCount: (state.shopeeShops || []).length,
      videoCount: (state.formattedVideos || []).length,
      reviewCount: (state.topReviews || []).length,
      margin: state.enrichedData?.pricing?.marginPercent || 0,
      wholesaleCNY: state.enrichedData?.pricing?.wholesaleCNY || 0,
      retailPHP: state.enrichedData?.pricing?.retailPHP || 0
    },
    // Dữ liệu chi tiết từng bước
    raw1688Offers: state.raw1688Offers || [],
    valid1688Shops: state.valid1688Shops || [],
    cleaned1688: state.cleaned1688 || {},
    keywords: state.keywords || {},
    shopeeShops: state.shopeeShops || [],
    rawVideos: state.rawVideos || [],
    formattedVideos: state.formattedVideos || [],
    topReviews: state.topReviews || [],
    enrichedData: state.enrichedData || {},
    logs: logText || ''
  };

  // Đẩy vào đầu danh sách (mới nhất trước)
  history.unshift(runEntry);

  // Giới hạn tối đa số bản ghi
  if (history.length > MAX_HISTORY_RUNS) {
    history.length = MAX_HISTORY_RUNS;
  }

  await storage.set(STORAGE_KEY, history);
  return runEntry;
}

/**
 * Lấy toàn bộ danh sách lịch sử thu thập
 * @returns {Promise<Array>}
 */
export async function getHistoryRuns() {
  const storage = getStorage();
  const list = await storage.get(STORAGE_KEY);
  return Array.isArray(list) ? list : [];
}

/**
 * Lấy chi tiết một phiên thu thập theo ID
 * @param {string} runId
 * @returns {Promise<Object|null>}
 */
export async function getRunById(runId) {
  const list = await getHistoryRuns();
  return list.find(it => it.id === runId) || null;
}

/**
 * Xóa một bản ghi lịch sử
 * @param {string} runId
 * @returns {Promise<boolean>}
 */
export async function deleteRunById(runId) {
  const storage = getStorage();
  let list = await getHistoryRuns();
  list = list.filter(it => it.id !== runId);
  await storage.set(STORAGE_KEY, list);
  return true;
}

/**
 * Xóa toàn bộ lịch sử
 * @returns {Promise<boolean>}
 */
export async function clearAllHistory() {
  const storage = getStorage();
  await storage.remove(STORAGE_KEY);
  return true;
}

/**
 * Tải toàn bộ nội dung logs của một phiên ra file text (.txt)
 * @param {string} logContent
 * @param {string} sku
 */
export function downloadLogsFile(logContent, sku = 'PRODUCT') {
  if (!logContent) {
    alert('Chưa có dữ liệu log để tải về.');
    return;
  }

  const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const filename = `${sku}_workflow_terminal_log.txt`;

  if (typeof chrome !== 'undefined' && chrome.downloads && chrome.downloads.download) {
    chrome.downloads.download({ url: blobUrl, filename, saveAs: false }, () => {
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    });
  } else if (typeof document !== 'undefined') {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  }
}
