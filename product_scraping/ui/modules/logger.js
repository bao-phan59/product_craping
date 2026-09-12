/**
 * logger.js — Terminal Console Log Engine
 * Hiển thị log thời gian thực với màu sắc chuyên nghiệp, hỗ trợ lọc, auto-scroll và sao chép toàn bộ log.
 */

let logOutputElement = null;
let autoScroll = true;
const logHistory = [];

/**
 * Khởi tạo logger gắn vào DOM
 * @param {HTMLElement|string} elementOrId
 */
export function initLogger(elementOrId = 'terminalLogOutput') {
  logOutputElement = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
}

/**
 * Ghi log mới vào Terminal Console
 * @param {'INFO'|'SUCCESS'|'WARN'|'ERROR'} level
 * @param {string} tag - Thẻ phân loại (ví dụ: '1688', 'SHOPEE', 'TIKTOK', 'GEMINI', 'PIPELINE')
 * @param {string} message - Nội dung log
 */
export function log(level = 'INFO', tag = 'SYS', message = '') {
  if (!logOutputElement && typeof document !== 'undefined') {
    logOutputElement = document.getElementById('terminalLogOutput');
  }

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(Math.floor(now.getMilliseconds() / 100))}`;
  
  const textLine = `[${timeStr}] [${level}] [${tag}] ${message}`;
  logHistory.push(textLine);
  if (logHistory.length > 500) {
    logHistory.shift();
  }

  if (logOutputElement) {
    const row = document.createElement('div');
    row.className = `terminal-line line-${level.toLowerCase()}`;

    let levelBadgeColor = 'color-info';
    if (level === 'SUCCESS') levelBadgeColor = 'color-success';
    if (level === 'WARN') levelBadgeColor = 'color-warn';
    if (level === 'ERROR') levelBadgeColor = 'color-error';

    row.innerHTML = `
      <span class="log-time">${timeStr}</span>
      <span class="log-badge ${levelBadgeColor}">[${level}]</span>
      <span class="log-tag">[${tag}]</span>
      <span class="log-msg">${escapeHtml(message)}</span>
    `;

    logOutputElement.appendChild(row);
    while (logOutputElement.childNodes.length > 500) {
      logOutputElement.removeChild(logOutputElement.firstChild);
    }

    if (autoScroll) {
      logOutputElement.scrollTop = logOutputElement.scrollHeight;
    }
  }

  // Ghi đồng thời ra console chuẩn của devtools (dùng console.log cho WARN để không kích hoạt cờ lỗi của chrome://extensions)
  const cMethod = level === 'ERROR' ? console.error : console.log;
  cMethod(`[${level}] [${tag}] ${message}`);
}

export function info(tag, message) { log('INFO', tag, message); }
export function success(tag, message) { log('SUCCESS', tag, message); }
export function warn(tag, message) { log('WARN', tag, message); }
export function error(tag, message) { log('ERROR', tag, message); }

/**
 * Bật / tắt chế độ tự động cuộn
 * @param {boolean} [enable]
 * @returns {boolean}
 */
export function toggleAutoScroll(enable) {
  autoScroll = enable !== undefined ? Boolean(enable) : !autoScroll;
  return autoScroll;
}

export function isAutoScroll() {
  return autoScroll;
}

/**
 * Lấy toàn bộ nội dung lịch sử log dưới dạng chuỗi
 * @returns {string}
 */
export function getLogHistory() {
  return logHistory.join('\n');
}

/**
 * Sao chép toàn bộ nội dung log ra Clipboard
 * @returns {Promise<boolean>}
 */
export async function copyAllLogs() {
  const content = getLogHistory();
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Xóa trắng danh sách log
 */
export function clearLogs() {
  logHistory.length = 0;
  if (!logOutputElement && typeof document !== 'undefined') {
    logOutputElement = document.getElementById('terminalLogOutput');
  }
  if (logOutputElement) {
    logOutputElement.innerHTML = '';
  }
}

/**
 * Tải toàn bộ log hiện tại ra file .txt
 * @param {string} sku
 */
export function downloadLogsAsFile(sku = 'WORKFLOW') {
  const content = getLogHistory();
  if (!content) {
    alert('Chưa có dữ liệu log để tải về.');
    return;
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const filename = `${sku}_terminal_log_${Date.now()}.txt`;

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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
