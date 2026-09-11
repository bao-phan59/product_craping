/**
 * workflowView.js — Presentation Controller & Facade for Workflow Pipeline
 * Điều phối luồng giao diện giữa 4 màn hình: Input -> Progress -> Result -> Warning.
 * Kiến trúc module hóa sạch:
 * - workflowInput: Quản lý kéo thả ảnh, nhập URL, SKU & form validation
 * - workflowFeeds: Luồng dữ liệu 5 tầng thời gian thực
 * - workflowResultView: Màn hình kết quả, specs, stats & log preservation
 * - workflowInspector: Thanh tiến trình, hộp debug lỗi, banner hoàn tất & captcha
 * - workflowHistory: Quản lý lưu trữ lịch sử dữ liệu đa phiên và khôi phục
 * - workflowToast: Quản lý toast notification
 */

import * as pipeline from './pipeline.js';
import * as autoTabs from './autoTabs.js';
import * as ticker from './ticker.js';
import * as logger from './logger.js';
import * as exporter from './exporter.js';
import * as workflowHistory from './workflowHistory.js';
import { showToast } from './workflow/workflowToast.js';

import {
  bindInputEvents,
  resetInputForm,
  getCurrentImageSource,
  getCurrentSku
} from './workflow/workflowInput.js';

import { resetVerticalFeedUI, updateDataInspectorUI } from './workflow/workflowFeeds.js';
import { renderResultScreen, bindResultEvents } from './workflow/workflowResultView.js';
import {
  updateProgressUI,
  showErrorDebugUI,
  showCaptchaWarning,
  showProgressCompletionBanner,
  hideProgressCompletionBanner,
  bindProgressEvents,
  bindWarningEvents
} from './workflow/workflowInspector.js';

let activeSubScreen = 'screenWorkflowInput';
let clientsRef = null;

/**
 * Khởi tạo module view Workflow
 * @param {Object} clients - { alibaba, shopee, tiktok, gemini }
 */
export function initWorkflowView(clients) {
  clientsRef = clients;
  ticker.initTicker('liveThumbnailTicker');
  logger.initLogger('terminalLogOutput');

  bindInputEvents({
    onStart: startPipelineExecution
  });

  bindProgressEvents({
    pipeline,
    startPipelineExecution,
    switchWorkflowScreen
  });

  bindResultEvents({
    onNewProduct: handleResetForNewProduct,
    getPipelineState: () => pipeline.pipelineState,
    switchWorkflowScreen
  });

  bindWarningEvents({
    pipeline,
    switchWorkflowScreen
  });

  // Khởi tạo các sự kiện Modal Lịch Sử Dữ Liệu
  bindHistoryModalEvents();
  updateHistoryCountBadge();

  // Kiểm tra tab các sàn và cập nhật dải badge
  refreshPlatformBadges();
  setInterval(refreshPlatformBadges, 5000);
}

/**
 * Chuyển đổi màn hình con trong Tab Workflow
 * @param {'screenWorkflowInput'|'screenWorkflowProgress'|'screenWorkflowResult'|'screenWorkflowWarning'} screenId
 */
export function switchWorkflowScreen(screenId) {
  activeSubScreen = screenId;
  const screens = ['screenWorkflowInput', 'screenWorkflowProgress', 'screenWorkflowResult', 'screenWorkflowWarning'];
  for (const id of screens) {
    const el = document.getElementById(id);
    if (el) {
      if (id === screenId) {
        el.classList.add('wf-screen-active');
        el.style.display = 'flex';
      } else {
        el.classList.remove('wf-screen-active');
        el.style.display = 'none';
      }
    }
  }
}

/**
 * Cập nhật số lượng phiên đã lưu trên Badge nút Lịch sử
 */
async function updateHistoryCountBadge() {
  const badge = document.getElementById('wfHistoryCount');
  if (!badge) return;
  try {
    const runs = await workflowHistory.getHistoryRuns();
    badge.textContent = String(runs.length);
  } catch (e) {
    badge.textContent = '0';
  }
}

/**
 * Cập nhật màu sắc dải badge tình trạng phiên các sàn
 */
async function refreshPlatformBadges() {
  const sessions = await autoTabs.checkAllSessions();

  const updateBadge = (id, isOnline) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (isOnline) {
      el.className = 'wf-tab-badge wf-badge-online';
      el.title = 'Đã mở tab và sẵn sàng';
    } else {
      el.className = 'wf-tab-badge wf-badge-offline';
      el.title = 'Chưa mở tab (sẽ tự động mở ngầm khi chạy)';
    }
  };

  updateBadge('wfBadge1688', sessions['1688']);
  updateBadge('wfBadgeShopee', sessions['shopee']);
  updateBadge('wfBadgeTiktok', sessions['tiktok']);
  updateBadge('wfBadgeGemini', sessions['gemini']);
}

/**
 * Reset dữ liệu chuẩn bị cho sản phẩm mới
 */
function handleResetForNewProduct() {
  hideProgressCompletionBanner();
  resetInputForm();
  switchWorkflowScreen('screenWorkflowInput');
}

/**
 * Bắt đầu chạy quy trình tự động
 */
async function startPipelineExecution() {
  const sku = getCurrentSku();
  const originalImage = getCurrentImageSource();

  // Ẩn hộp lỗi & banner hoàn tất cũ nếu có
  const errorBox = document.getElementById('wfErrorDebugBox');
  if (errorBox) errorBox.style.display = 'none';
  hideProgressCompletionBanner();

  const bar = document.getElementById('wfProgressBar');
  if (bar) {
    bar.style.background = 'linear-gradient(90deg, #6366f1, #06b6d4, #10b981)';
  }

  const stepItems = document.querySelectorAll('.wf-step-item');
  stepItems.forEach(it => it.classList.remove('error'));

  switchWorkflowScreen('screenWorkflowProgress');

  // Reset UI tiến độ & Dòng chảy dữ liệu
  updateProgressUI(0, 0, 'Khởi động Pipeline', 'Đang thiết lập môi trường...');
  resetVerticalFeedUI();

  try {
    await pipeline.runPipeline({
      sku,
      originalImage,
      clients: clientsRef
    }, {
      onProgress: (step, percent, title, detail) => {
        updateProgressUI(step, percent, title, detail);
        updateDataInspectorUI(pipeline.pipelineState);
      },
      onComplete: async (state) => {
        // 1. TỰ ĐỘNG LƯU VÀO KHO LƯU TRỮ VĨNH VIỄN (STORAGE ARCHIVE)
        const fullLogs = logger.getLogHistory();
        await workflowHistory.saveRunToHistory(state, fullLogs);
        updateHistoryCountBadge();

        // 2. CHUẨN BỊ SẴN DỮ LIỆU LÊN MÀN HÌNH 3
        renderResultScreen(state);

        // 3. KHÔNG CƯỠNG BỨC THOÁT MÀN HÌNH!
        // Giữ nguyên Màn hình 2 để người dùng xem lại toàn bộ 5 tầng thẻ data & log bao lâu tùy ý.
        showProgressCompletionBanner(state);
        showToast(`✅ Đã thu thập xong ${state.sku}! Dữ liệu & logs đã được lưu giữ.`);
      },
      onError: (err, stepIndex, rawDetails) => {
        // GIỮ NGUYÊN MÀN HÌNH LOGS VÀ HIỂN THỊ HỘP DEBUG LỖI CỤ THỂ
        showErrorDebugUI(err, stepIndex, rawDetails);
      },
      onCaptcha: (captchaInfo) => {
        showCaptchaWarning(captchaInfo, switchWorkflowScreen);
      }
    });
  } catch (err) {
    if (err.message !== 'PIPELINE_ABORTED') {
      console.error('Pipeline stopped with error:', err);
    }
  }
}

/**
 * Khôi phục dữ liệu của một phiên cũ trong lịch sử lên giao diện
 * @param {Object} runEntry
 */
export function restoreHistoricalRunToUI(runEntry) {
  if (!runEntry) return;

  // 1. Khôi phục pipelineState
  Object.assign(pipeline.pipelineState, {
    sku: runEntry.sku,
    originalImage: runEntry.originalImage,
    status: runEntry.status || 'COMPLETED',
    currentStep: 10,
    progressPercent: 100,
    raw1688Offers: runEntry.raw1688Offers || [],
    valid1688Shops: runEntry.valid1688Shops || [],
    cleaned1688: runEntry.cleaned1688 || {},
    keywords: runEntry.keywords || {},
    shopeeShops: runEntry.shopeeShops || [],
    rawVideos: runEntry.rawVideos || [],
    formattedVideos: runEntry.formattedVideos || [],
    topReviews: runEntry.topReviews || [],
    enrichedData: runEntry.enrichedData || {}
  });

  // 2. Khôi phục Stepper & Tiến trình
  updateProgressUI(10, 100, `Hoàn tất: ${runEntry.sku}`, `Đã nạp lại dữ liệu thu thập lúc: ${runEntry.dateStr || ''}`);

  // 3. Khôi phục 5 tầng Dòng Chảy Dữ Liệu
  updateDataInspectorUI(pipeline.pipelineState);

  // 4. Khôi phục ảnh Live Ticker
  ticker.clearTicker();
  (runEntry.valid1688Shops || []).forEach(s => {
    if (s.imageUrl) ticker.addTickerItem(s.imageUrl, s.title, s.price);
  });

  // 5. Khôi phục Terminal Logs
  logger.clearLogs();
  if (runEntry.logs) {
    const lines = runEntry.logs.split('\n');
    lines.forEach(l => {
      if (l.trim()) {
        const row = document.createElement('div');
        row.className = 'terminal-line line-info';
        row.textContent = l;
        document.getElementById('terminalLogOutput')?.appendChild(row);
      }
    });
  }

  // 6. Khôi phục Màn hình Kết quả (Màn 3)
  renderResultScreen(pipeline.pipelineState);

  // 7. Bật Banner Hoàn tất trên Màn 2
  showProgressCompletionBanner(pipeline.pipelineState);

  // 8. Chuyển sang Màn hình Tiến trình (Màn 2) để xem lại trọn vẹn
  switchWorkflowScreen('screenWorkflowProgress');
  showToast(`👁️ Đã khôi phục dữ liệu phiên: ${runEntry.sku}`);
}

/**
 * Gắn sự kiện cho Modal Lịch Sử Dữ Liệu
 */
function bindHistoryModalEvents() {
  const btnOpen = document.getElementById('wfBtnOpenHistory');
  const btnClose = document.getElementById('wfBtnCloseHistory');
  const modal = document.getElementById('wfHistoryModal');
  const btnClearAll = document.getElementById('wfBtnClearAllHistory');
  const container = document.getElementById('wfHistoryListContainer');
  const totalLabel = document.getElementById('wfHistoryTotalLabel');

  const openModal = async () => {
    if (!modal) return;
    modal.style.display = 'flex';
    await renderHistoryList();
  };

  const closeModal = () => {
    if (!modal) return;
    modal.style.display = 'none';
  };

  if (btnOpen) btnOpen.addEventListener('click', openModal);
  if (btnClose) btnClose.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (btnClearAll) {
    btnClearAll.addEventListener('click', async () => {
      if (confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ lịch sử thu thập không?')) {
        await workflowHistory.clearAllHistory();
        await updateHistoryCountBadge();
        await renderHistoryList();
        showToast('Đã xóa toàn bộ lịch sử.');
      }
    });
  }

  async function renderHistoryList() {
    if (!container) return;
    const runs = await workflowHistory.getHistoryRuns();
    if (totalLabel) totalLabel.textContent = `Tổng cộng: ${runs.length} phiên đã lưu`;

    if (runs.length === 0) {
      container.innerHTML = '<div class="wf-history-empty">Chưa có phiên dữ liệu nào được lưu trong bộ nhớ.</div>';
      return;
    }

    container.innerHTML = '';
    runs.forEach(entry => {
      const stats = entry.stats || {};
      const card = document.createElement('div');
      card.className = 'wf-history-card';
      card.innerHTML = `
        <div class="wf-history-head">
          <span class="wf-history-sku">📦 ${entry.sku}</span>
          <span class="wf-history-time">${entry.dateStr || ''}</span>
        </div>
        <div class="wf-history-stats-bar">
          <span class="wf-history-stat-tag">🏭 1688: ${stats.shop1688Count || 0}</span>
          <span class="wf-history-stat-tag">🛒 Shopee: ${stats.shopeeCount || 0}</span>
          <span class="wf-history-stat-tag">🎵 Video: ${stats.videoCount || 0}</span>
          <span class="wf-history-stat-tag">⭐ Review: ${stats.reviewCount || 0}</span>
          <span class="wf-history-stat-tag wf-history-stat-margin">Margin: +${stats.margin || 0}%</span>
        </div>
        <div class="wf-history-actions">
          <button class="wf-btn-mini wf-btn-primary btn-restore-run" data-id="${entry.id}">
            👁️ Xem Lại Toàn Bộ
          </button>
          <button class="wf-btn-mini wf-btn-download btn-zip-run" data-id="${entry.id}">
            📦 Tải ZIP
          </button>
          <button class="wf-btn-mini wf-btn-copy btn-tsv-run" data-id="${entry.id}">
            📋 Copy TSV
          </button>
          <button class="wf-btn-mini wf-btn-danger btn-del-run" data-id="${entry.id}">
            🗑️ Xóa
          </button>
        </div>
      `;

      // Nút Xem Lại
      card.querySelector('.btn-restore-run')?.addEventListener('click', () => {
        closeModal();
        restoreHistoricalRunToUI(entry);
      });

      // Nút Tải ZIP
      card.querySelector('.btn-zip-run')?.addEventListener('click', async () => {
        try {
          const blob = await exporter.createZipBundle(entry);
          const blobUrl = URL.createObjectURL(blob);
          const filename = `${entry.sku || 'PRODUCT'}.zip`;
          if (typeof chrome !== 'undefined' && chrome.downloads && chrome.downloads.download) {
            chrome.downloads.download({ url: blobUrl, filename, saveAs: false });
          } else {
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
          showToast(`Đã tải ZIP: ${filename}`);
        } catch (err) {
          alert('Lỗi tải ZIP: ' + err.message);
        }
      });

      // Nút Copy TSV
      card.querySelector('.btn-tsv-run')?.addEventListener('click', async () => {
        const tsv = exporter.generateTsvString(entry);
        const ok = await exporter.copyTsvToClipboard(tsv);
        if (ok) {
          showToast(`📋 Đã copy 24 cột TSV cho SKU: ${entry.sku}`);
        }
      });

      // Nút Xóa bản ghi
      card.querySelector('.btn-del-run')?.addEventListener('click', async () => {
        if (confirm(`Xóa bản ghi lịch sử của SKU ${entry.sku}?`)) {
          await workflowHistory.deleteRunById(entry.id);
          await updateHistoryCountBadge();
          await renderHistoryList();
          showToast(`Đã xóa SKU ${entry.sku}`);
        }
      });

      container.appendChild(card);
    });
  }
}
