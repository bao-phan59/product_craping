/**
 * ticker.js — Live Thumbnail Ticker Module
 * Quản lý và hiển thị dải thẻ ảnh cuộn ngang thời gian thực mỗi khi tìm thấy sản phẩm 1688, Shopee hoặc Video TikTok.
 */

let tickerContainer = null;

/**
 * Khởi tạo container cho Live Ticker
 * @param {HTMLElement|string} elementOrId
 */
export function initTicker(elementOrId = 'liveThumbnailTicker') {
  tickerContainer = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
}

/**
 * Thêm một item mới vào dải ảnh cuộn ngang
 * @param {Object} item
 * @param {string} item.type - '1688' | 'shopee' | 'tiktok'
 * @param {string} item.title - Tiêu đề sản phẩm hoặc mô tả video
 * @param {string} item.image - URL ảnh thumbnail
 * @param {string} item.label - Nhãn hiển thị (VD: '1688 #1', 'Shopee #2', '1.5k tym')
 * @param {string} [item.link] - Đường dẫn trực tiếp khi click vào item
 */
export function addTickerItem({ type = '1688', title = '', image = '', label = '', link = '' }) {
  if (!tickerContainer && typeof document !== 'undefined') {
    tickerContainer = document.getElementById('liveThumbnailTicker');
  }
  if (!tickerContainer) return;

  const card = document.createElement('div');
  card.className = `ticker-card ticker-type-${type}`;
  card.title = title || label;

  let badgeColorClass = 'badge-1688';
  if (type === 'shopee') badgeColorClass = 'badge-shopee';
  if (type === 'tiktok') badgeColorClass = 'badge-tiktok';

  const defaultImg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';

  card.innerHTML = `
    <div class="ticker-thumb-wrap">
      <img src="${image || defaultImg}" alt="${label}" onerror="this.src='${defaultImg}'" />
      <span class="ticker-badge ${badgeColorClass}">${label || type}</span>
    </div>
    <div class="ticker-info">
      <span class="ticker-title">${(title || '').slice(0, 32)}</span>
    </div>
  `;

  if (link) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      window.open(link, '_blank');
    });
  }

  // Thêm vào container và cuộn ngang tới vị trí mới nhất
  tickerContainer.appendChild(card);
  tickerContainer.scrollTo({
    left: tickerContainer.scrollWidth,
    behavior: 'smooth'
  });
}

/**
 * Xóa sạch dải ảnh cuộn
 */
export function clearTicker() {
  if (!tickerContainer && typeof document !== 'undefined') {
    tickerContainer = document.getElementById('liveThumbnailTicker');
  }
  if (tickerContainer) {
    tickerContainer.innerHTML = '';
  }
}
