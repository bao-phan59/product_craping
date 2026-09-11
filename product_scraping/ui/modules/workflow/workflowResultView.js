/**
 * workflowResultView.js — Result Screen & Export Controller
 * Quản lý Màn hình Kết quả (Screen 3): Thống kê tổng hợp, Video TikTok, Review Shopee,
 * So sánh giá Specs, Bảng phân tích chi tiết, Bảo lưu toàn bộ Terminal Log & Xuất ZIP/TSV.
 */

import * as exporter from '../exporter.js';
import * as logger from '../logger.js';
import { showToast } from './workflowToast.js';

/**
 * Gắn sự kiện cho Màn hình 3: Kết quả & Xuất file
 * @param {Object} options
 * @param {Function} options.onNewProduct - Callback khi bấm nút "Làm việc với sản phẩm mới"
 * @param {Object} options.getPipelineState - Callback trả về pipelineState hiện tại
 * @param {Function} options.switchWorkflowScreen - Callback chuyển màn hình
 */
export function bindResultEvents({ onNewProduct, getPipelineState, switchWorkflowScreen }) {
  const btnDownloadZip = document.getElementById('wfBtnDownloadZip');
  const btnCopyTsv = document.getElementById('wfBtnCopyTsv');
  const btnNewProduct = document.getElementById('wfBtnNewProduct');
  const btnBackToProgress = document.getElementById('wfBtnBackToProgress');
  const btnDownloadResultLog = document.getElementById('wfBtnDownloadResultLog');

  // Nút quay lại Màn hình Tiến trình (Màn 2) - Bảo lưu 100% dữ liệu
  if (btnBackToProgress) {
    btnBackToProgress.addEventListener('click', () => {
      if (switchWorkflowScreen) {
        switchWorkflowScreen('screenWorkflowProgress');
      }
    });
  }

  // Nút tải toàn bộ Log dạng text file từ Màn 3
  if (btnDownloadResultLog) {
    btnDownloadResultLog.addEventListener('click', () => {
      const state = getPipelineState ? getPipelineState() : {};
      logger.downloadLogsAsFile(state.sku || 'WORKFLOW');
      showToast('📥 Đang tải xuống toàn bộ file log...');
    });
  }

  // Chuyển tab con trong Màn hình 3
  const tabBtns = document.querySelectorAll('.wf-res-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      document.querySelectorAll('.wf-res-tab-panel').forEach(panel => {
        panel.style.display = panel.id === targetId ? 'block' : 'none';
      });

      // Nếu chuyển sang tab Logs, bảo lưu và sao chép logs sang ngay lập tức
      if (targetId === 'wfPanelLogs') {
        syncTerminalLogsToResult();
      }
    });
  });

  // Nút Tải file ZIP
  if (btnDownloadZip) {
    btnDownloadZip.addEventListener('click', async () => {
      const state = getPipelineState ? getPipelineState() : {};
      try {
        btnDownloadZip.disabled = true;
        btnDownloadZip.textContent = '⏳ Đang nén file ZIP...';
        const blob = await exporter.createZipBundle(state);
        const blobUrl = URL.createObjectURL(blob);
        const filename = `${state.sku || 'PRODUCT'}.zip`;

        // Tải trực tiếp trong trang Extension bằng chrome.downloads hoặc thẻ <a> fallback
        if (typeof chrome !== 'undefined' && chrome.downloads && chrome.downloads.download) {
          try {
            await chrome.downloads.download({ url: blobUrl, filename, saveAs: false });
          } catch (dlErr) {
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        } else {
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }

        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        showToast(`Đã lưu file: ${filename}`);
      } catch (err) {
        alert('Lỗi tải file ZIP: ' + err.message);
      } finally {
        btnDownloadZip.disabled = false;
        btnDownloadZip.innerHTML = '<span>📦</span> Tải File ZIP';
      }
    });
  }

  // Nút Sao chép TSV cho Sheets / Excel
  if (btnCopyTsv) {
    btnCopyTsv.addEventListener('click', async () => {
      const state = getPipelineState ? getPipelineState() : {};
      const tsv = exporter.generateTsvString(state);
      const ok = await exporter.copyTsvToClipboard(tsv);
      if (ok) {
        showToast('📋 Đã sao chép 24 cột dữ liệu vào Clipboard! Hãy dán (Ctrl+V) vào Google Sheets hoặc Excel.');
      } else {
        alert('Không thể sao chép vào Clipboard!');
      }
    });
  }

  // Nút Làm việc với sản phẩm mới
  if (btnNewProduct && onNewProduct) {
    btnNewProduct.addEventListener('click', onNewProduct);
  }
}

/**
 * Hiển thị dữ liệu thực tế lên Màn hình 3 khi Pipeline hoàn thành
 * @param {Object} state - Trạng thái cuối cùng của pipeline
 */
export function renderResultScreen(state) {
  const skuDisplay = document.getElementById('wfResultSkuTitle');
  if (skuDisplay) skuDisplay.textContent = `Mã SKU: ${state.sku}`;

  // 1. Thống kê nhanh Header
  renderQuickStats(state);

  // 2. Tab 1: Video phân loại theo Tym
  renderVideosTab(state);

  // 3. Tab 2: 10 Review 5 sao Shopee có Media
  renderReviewsTab(state);

  // 4. Tab 3: Đối sánh giá & Specs
  renderPricingAndSpecsTab(state);

  // 5. Tab 4: Toàn bộ quá trình & Lọc dữ liệu chi tiết
  renderProcessDataResult(state);

  // 6. Tab 5: Sao chép toàn bộ Terminal Log sang màn hình kết quả để KHÔNG bị mất log
  syncTerminalLogsToResult();
}

/**
 * Đồng bộ log từ Terminal sang Result Log tab
 */
export function syncTerminalLogsToResult() {
  const targetLog = document.getElementById('wfResultLogOutput');
  const sourceLog = document.getElementById('terminalLogOutput');
  if (targetLog && sourceLog) {
    targetLog.innerHTML = sourceLog.innerHTML;
    targetLog.scrollTop = targetLog.scrollHeight;
  }
}

function renderQuickStats(state) {
  const stat1688 = document.getElementById('wfStat1688Count');
  const statShopee = document.getElementById('wfStatShopeeCount');
  const statVideos = document.getElementById('wfStatVideosCount');
  const statReviews = document.getElementById('wfStatReviewsCount');

  if (stat1688) stat1688.textContent = `${(state.valid1688Shops || []).length} Shop`;
  if (statShopee) statShopee.textContent = `${(state.shopeeShops || []).length} Shop`;
  if (statVideos) statVideos.textContent = `${(state.formattedVideos || []).length} Video`;
  if (statReviews) statReviews.textContent = `${(state.topReviews || []).length} Đánh giá`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const SAFE_THUMB_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='80' fill='%23333'%3E%3Crect width='60' height='80' fill='%23222'/%3E%3Ctext x='50%25' y='50%25' fill='%23666' font-size='10' text-anchor='middle' dy='.3em'%3ENo Video%3C/text%3E%3C/svg%3E";

function renderVideosTab(state) {
  const vidContainer = document.getElementById('wfResultVideosList');
  if (!vidContainer) return;
  vidContainer.innerHTML = '';
  (state.formattedVideos || []).forEach((v, idx) => {
    const card = document.createElement('div');
    card.className = 'wf-video-card';
    const isDouyin = v.platform === 'Douyin' || v.videoUrl?.includes('douyin.com');
    const platformName = isDouyin ? 'Douyin' : 'TikTok';
    const likesText = v.formattedLikes || v.label || '0';
    const safeTitle = escapeHtml(v.title || `Video ${platformName} #${idx + 1}`);
    const safeCover = v.coverUrl || SAFE_THUMB_SVG;
    const safeVideoUrl = v.videoUrl || '#';

    card.innerHTML = `
      <img src="${safeCover}" class="wf-video-thumb" onerror="this.src='${SAFE_THUMB_SVG}'" loading="lazy" />
      <div class="wf-video-meta">
        <div class="wf-video-badge-row" style="display:flex; gap:6px; align-items:center; margin-bottom:4px;">
          <span class="wf-video-badge" style="background:#ff0050; color:#fff; border-radius:4px; padding:2px 6px; font-size:11px; font-weight:bold;">❤️ ${likesText}</span>
          <span class="wf-platform-tag" style="background:${isDouyin ? '#fe2c55' : '#25f4ee'}; color:#000; border-radius:4px; padding:2px 6px; font-size:10px; font-weight:bold;">${platformName}</span>
        </div>
        <div class="wf-video-title" title="${safeTitle}" style="font-weight:600; font-size:12px; margin-bottom:4px; line-height:1.3; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${safeTitle}</div>
        <a href="${safeVideoUrl}" target="_blank" rel="noopener noreferrer" class="wf-video-link" style="color:#00e5ff; font-size:11px; text-decoration:none;">🔗 Xem trên ${platformName}</a>
      </div>
    `;
    vidContainer.appendChild(card);
  });
}

function renderReviewsTab(state) {
  const revContainer = document.getElementById('wfResultReviewsList');
  if (!revContainer) return;
  revContainer.innerHTML = '';
  (state.topReviews || []).forEach((r, idx) => {
    const card = document.createElement('div');
    card.className = 'wf-review-card';
    const imagesHtml = (r.images || []).map(img => `<img src="${img}" class="wf-review-img-thumb" />`).join('');
    card.innerHTML = `
      <div class="wf-review-head">
        <span class="wf-review-author">⭐ #${idx + 1} - ${r.author}</span>
        <span class="wf-review-stars">⭐⭐⭐⭐⭐</span>
      </div>
      <div class="wf-review-body">${r.comment}</div>
      <div class="wf-review-media">${imagesHtml}</div>
    `;
    revContainer.appendChild(card);
  });
}

function renderPricingAndSpecsTab(state) {
  const specsContainer = document.getElementById('wfResultSpecsTable');
  if (!specsContainer) return;

  const enriched = state.enrichedData || {};
  const p = enriched.pricing || {};
  specsContainer.innerHTML = `
    <div class="wf-pricing-grid">
      <div class="wf-price-box">
        <div class="wf-price-label">Giá Buôn 1688</div>
        <div class="wf-price-val">¥${p.wholesaleCNY || 0} (~${(p.wholesaleVND || 0).toLocaleString()} đ)</div>
      </div>
      <div class="wf-price-box">
        <div class="wf-price-label">Giá Bán Lẻ Shopee PH</div>
        <div class="wf-price-val">₱${p.retailPHP || 0} (~${(p.retailVND || 0).toLocaleString()} đ)</div>
      </div>
      <div class="wf-price-box wf-price-highlight">
        <div class="wf-price-label">Biên Lợi Nhuận Gộp</div>
        <div class="wf-price-val">${p.marginPercent || 0}%</div>
      </div>
    </div>
    <div class="wf-specs-detail">
      <h4>📋 Thuộc Tính Kỹ Thuật Hợp Nhất (Specs):</h4>
      <ul>
        ${Object.entries(enriched.specifications || {}).map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`).join('') || '<li>Chưa có thông số chi tiết</li>'}
      </ul>
    </div>
  `;
}

/**
 * Hiển thị dữ liệu toàn bộ quá trình xử lý lên Tab 4 của Màn hình Kết quả
 * So sánh chi tiết: Dữ liệu thô chưa lọc vs Dữ liệu sau khi qua Gemini Vision
 */
export function renderProcessDataResult(state) {
  const container = document.getElementById('wfResultProcessDataContent');
  if (!container) return;

  const raw1688 = state.rawOffers1688 || [];
  const verified1688 = state.valid1688Shops || [];
  const rawShopee = state.rawShopeeItems || [];
  const verifiedShopee = state.shopeeShops || [];
  const rawVideos = state.rawVideoCandidates || state.rawTikTokVideos || [];
  const verifiedVideos = state.formattedVideos || [];
  const rawReviews = state.shopeeReviewsRaw || [];
  const topReviews = state.topReviews || [];
  const kws = state.keywords || {};

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      
      <!-- 1. SO SÁNH 1688: DỮ LIỆU THÔ VS GEMINI VISION ĐÃ LỌC -->
      <div class="wf-insp-content-box">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="color: #60a5fa; font-weight: bold; font-size: 13px;">📸 1. NGUỒN SỈ 1688: THÔ (${raw1688.length || verified1688.length} Xưởng) VS GEMINI VISION (${verified1688.length} Xưởng Đạt Chuẩn)</span>
          <span class="wf-feed-pill pill-orange">${verified1688.length} Shop Chuẩn</span>
        </div>
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">
          Danh sách toàn bộ ảnh thô cào về từ 1688 Visual API. Gemini Vision đối soát từng ảnh thumbnail với ảnh gốc để chọn 5 xưởng chuẩn xác nhất:
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; max-height: 220px; overflow-y: auto; padding: 2px;">
          ${(raw1688.length > 0 ? raw1688 : verified1688).map((s, idx) => {
            const isMatch = verified1688.some(v => String(v.offerId || v.id) === String(s.offerId || s.id));
            const badge = isMatch
              ? '<span class="wf-status-badge pass">✓ Gemini Chọn</span>'
              : (verified1688.length > 0 ? '<span class="wf-status-badge reject">✗ Không Khớp</span>' : '<span class="wf-status-badge pending">📦 Thô</span>');
            return `
              <div style="background: rgba(2,6,23,0.7); border: 1px solid ${isMatch ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.08)'}; border-radius: 6px; overflow: hidden; padding: 4px;">
                <div style="position: relative; width: 100%; height: 75px;">
                  <img src="${s.imageUrl || SAFE_THUMB_SVG}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;" loading="lazy" />
                  <div style="position: absolute; bottom: 2px; left: 2px;">${badge}</div>
                </div>
                <div style="font-size: 10px; font-weight: bold; color: #34d399; margin-top: 3px;">¥${s.price || s.pricing?.priceCny || 'N/A'}</div>
                <div style="font-size: 9px; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(s.title || '')}">#${idx + 1}. ${escapeHtml(s.title || '1688 Offer')}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- 2. SO SÁNH SHOPEE PH: DỮ LIỆU THÔ VS GEMINI VISION ĐÃ CHỌN -->
      <div class="wf-insp-content-box">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="color: #38bdf8; font-weight: bold; font-size: 13px;">🛒 2. BÁN LẺ SHOPEE PH: THÔ (${rawShopee.length || verifiedShopee.length} SP) VS GEMINI VISION (${verifiedShopee.length} SP Khớp Mẫu)</span>
          <span class="wf-feed-pill pill-green">${verifiedShopee.length} SP Chuẩn Mẫu</span>
        </div>
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">
          Sản phẩm tìm thấy qua các từ khóa generic trên Shopee PH được Gemini Vision thẩm định thị giác để loại bỏ các biến thể lệch model:
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; max-height: 220px; overflow-y: auto; padding: 2px;">
          ${(rawShopee.length > 0 ? rawShopee : verifiedShopee).map((s, idx) => {
            const isMatch = verifiedShopee.some(v => String(v.itemId) === String(s.itemId));
            const badge = isMatch
              ? '<span class="wf-status-badge pass">✓ Khớp Mẫu</span>'
              : (verifiedShopee.length > 0 ? '<span class="wf-status-badge reject">✗ Lệch Mẫu</span>' : '<span class="wf-status-badge pending">📦 Thô</span>');
            return `
              <div style="background: rgba(2,6,23,0.7); border: 1px solid ${isMatch ? 'rgba(56,189,248,0.5)' : 'rgba(255,255,255,0.08)'}; border-radius: 6px; overflow: hidden; padding: 4px;">
                <div style="position: relative; width: 100%; height: 75px;">
                  <img src="${s.coverImage || s.imageUrl || SAFE_THUMB_SVG}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;" loading="lazy" />
                  <div style="position: absolute; bottom: 2px; left: 2px;">${badge}</div>
                </div>
                <div style="font-size: 10px; font-weight: bold; color: #f59e0b; margin-top: 3px;">${s.priceFormatted || ('₱' + (s.price || 0))}</div>
                <div style="font-size: 9px; color: #cbd5e1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.2;" title="${escapeHtml(s.title || '')}">#${idx + 1}. ${escapeHtml(s.title || 'Shopee Item')}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- 3. SO SÁNH VIDEO DOUYIN & TIKTOK: THÔ VS GEMINI VISION XÁC NHẬN -->
      <div class="wf-insp-content-box">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="color: #f43f5e; font-weight: bold; font-size: 13px;">🎬 3. VIDEO DOUYIN & TIKTOK: THÔ (${rawVideos.length || verifiedVideos.length} Video) VS GEMINI VISION (${verifiedVideos.length} Video Chuẩn)</span>
          <span class="wf-feed-pill pill-pink">${verifiedVideos.length} Video Đã Duyệt</span>
        </div>
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">
          Toàn bộ video cào được từ Douyin và TikTok. Gemini Vision đóng vai trò Auditor kiểm tra ảnh bìa có quay đúng sản phẩm mục tiêu:
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; max-height: 240px; overflow-y: auto; padding: 2px;">
          ${(rawVideos.length > 0 ? rawVideos : verifiedVideos).map((v, idx) => {
            const isMatch = verifiedVideos.some(ver => String(ver.videoId) === String(v.videoId));
            const badge = isMatch
              ? '<span class="wf-status-badge pass">✓ Gemini Xác Nhận</span>'
              : (verifiedVideos.length > 0 ? '<span class="wf-status-badge reject">✗ Không Thấy SP</span>' : '<span class="wf-status-badge pending">📦 Video Thô</span>');
            const reason = v.visionReason ? `<div style="font-size: 8px; color: #34d399; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(v.visionReason)}">${escapeHtml(v.visionReason)}</div>` : '';
            return `
              <div style="background: rgba(2,6,23,0.7); border: 1px solid ${isMatch ? 'rgba(244,63,94,0.5)' : 'rgba(255,255,255,0.08)'}; border-radius: 6px; overflow: hidden; padding: 4px;">
                <div style="position: relative; width: 100%; height: 80px;">
                  <img src="${v.coverUrl || SAFE_THUMB_SVG}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;" loading="lazy" />
                  <div style="position: absolute; bottom: 2px; left: 2px;">${badge}</div>
                  <span style="position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.75); color: #fff; font-size: 8px; padding: 1px 4px; border-radius: 3px;">❤️ ${v.formattedLikes || v.likeCount || v.diggCount || '0'}</span>
                </div>
                <div style="font-size: 9px; font-weight: 600; color: #cbd5e1; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(v.title || '')}">#${idx + 1}. ${escapeHtml(v.title || 'Video')}</div>
                ${reason}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- 4. TỪ KHÓA ĐA KÊNH DO GEMINI TẠO RA -->
      <div class="wf-insp-content-box">
        <div style="color:#a78bfa; font-weight:bold; font-size:12px; margin-bottom: 6px;">🤖 4. BỘ TỪ KHÓA ĐA KÊNH (DOUYIN, TIKTOK, SHOPEE)</div>
        <div style="margin-bottom: 6px;">
          <div style="font-size:10px; color:#fb923c; font-weight:600;">🇨🇳 Douyin Tiếng Trung:</div>
          <div class="wf-tag-cloud">
            ${(kws.douyinKeywords || []).map(k => `<span class="wf-data-tag" style="background:rgba(251,146,60,0.15); border-color:rgba(251,146,60,0.4); color:#fdba74;">🔍 ${escapeHtml(k)}</span>`).join('')}
          </div>
        </div>
        <div style="margin-bottom: 6px;">
          <div style="font-size:10px; color:#38bdf8; font-weight:600;">🛒 Shopee PH:</div>
          <div class="wf-tag-cloud">
            ${(kws.shopeeKeywords || []).map(k => `<span class="wf-data-tag">🔍 ${escapeHtml(k)}</span>`).join('')}
          </div>
        </div>
        <div>
          <div style="font-size:10px; color:#fb7185; font-weight:600;">🎵 TikTok:</div>
          <div class="wf-tag-cloud">
            ${(kws.tiktokKeywords || []).map(q => `<span class="wf-data-tag-tiktok">🎵 ${escapeHtml(q)}</span>`).join('')}
          </div>
        </div>
      </div>

    </div>
  `;
}
