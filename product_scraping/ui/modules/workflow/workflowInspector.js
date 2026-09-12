/**
 * workflowInspector.js — Progress, Stepper, Error Diagnostics & Captcha Inspector
 * Quản lý thanh tiến trình (Stepper 10 bước), hộp chẩn đoán lỗi chuyên sâu (Debug Drawer),
 * màn hình cảnh báo Captcha và các nút điều khiển luồng (Pause, Resume, Abort, Logs).
 */

import * as logger from '../logger.js';
import * as exporter from '../exporter.js';
import { showToast } from './workflowToast.js';

/**
 * Cập nhật giao diện thanh tiến trình và stepper 10 bước
 */
export function updateProgressUI(stepIndex, percent, title, detail) {
  const bar = document.getElementById('wfProgressBar');
  const pctText = document.getElementById('wfProgressPercent');
  const stepNameEl = document.getElementById('wfProgressStepName');
  const detailEl = document.getElementById('wfProgressDetail');

  if (bar) bar.style.width = `${percent}%`;
  if (pctText) pctText.textContent = `${percent}%`;
  if (stepNameEl) stepNameEl.textContent = title;
  if (detailEl) detailEl.textContent = detail;

  // Cập nhật 10 bước trong stepper
  const stepItems = document.querySelectorAll('.wf-step-item');
  stepItems.forEach((item, idx) => {
    const stepNum = idx + 1;
    item.classList.remove('active', 'completed');
    if (stepNum < stepIndex) {
      item.classList.add('completed');
    } else if (stepNum === stepIndex) {
      item.classList.add('active');
    }
  });
}

/**
 * Hiển thị Banner Hoàn tất & Mở khóa các nút thao tác xuất file trực tiếp trên Màn 2
 * @param {Object} state - pipelineState
 */
export function showProgressCompletionBanner(state) {
  const banner = document.getElementById('wfProgressCompleteBanner');
  const footer = document.getElementById('wfProgressCompleteFooter');
  const controlBar = document.getElementById('wfControlBar');
  const titleEl = document.getElementById('wfCompleteTitle');
  const btnZip = document.getElementById('wfBtnQuickDownloadZip');

  if (titleEl && state?.sku) {
    titleEl.textContent = `QUY TRÌNH THU THẬP ĐÃ HOÀN TẤT 100%! (${state.sku})`;
  }
  if (btnZip && state?.sku) {
    btnZip.innerHTML = `Tải File ZIP ${state.sku}.zip`;
  }

  if (banner) banner.style.display = 'block';
  if (controlBar) controlBar.style.display = 'none';
  if (footer) footer.style.display = 'flex';

  // Đánh dấu tất cả 10 bước trong stepper là completed
  document.querySelectorAll('.wf-step-item').forEach(it => {
    it.classList.remove('active', 'error');
    it.classList.add('completed');
  });
}

/**
 * Ẩn Banner Hoàn tất và khôi phục thanh điều khiển tiến trình bình thường
 */
export function hideProgressCompletionBanner() {
  const banner = document.getElementById('wfProgressCompleteBanner');
  const footer = document.getElementById('wfProgressCompleteFooter');
  const controlBar = document.getElementById('wfControlBar');

  if (banner) banner.style.display = 'none';
  if (footer) footer.style.display = 'none';
  if (controlBar) controlBar.style.display = 'flex';
}

/**
 * Hiển thị cụ thể lỗi ra màn hình để người dùng debug (bao gồm cả LỖI THÔ / RAW ERROR)
 */
export function showErrorDebugUI(err, stepIndex = 1, rawDetails = null) {
  const errorBox = document.getElementById('wfErrorDebugBox');
  const errorTitle = document.getElementById('wfErrorTitle');
  const errorMsg = document.getElementById('wfErrorMessage');
  const bar = document.getElementById('wfProgressBar');
  const stepNameEl = document.getElementById('wfProgressStepName');
  const detailEl = document.getElementById('wfProgressDetail');

  if (stepNameEl) stepNameEl.textContent = `Đã Dừng: Lỗi Ở Bước ${stepIndex}`;
  if (detailEl) detailEl.textContent = err.message || 'Lỗi thực thi';
  if (bar) bar.style.background = '#ef4444';

  // Đánh dấu bước bị lỗi trong stepper
  const stepItem = document.querySelector(`.wf-step-item[data-step="${stepIndex}"]`);
  if (stepItem) {
    stepItem.classList.remove('completed', 'active');
    stepItem.classList.add('error');
  }

  if (errorTitle) {
    errorTitle.textContent = `DỪNG LẠI TẠI BƯỚC ${stepIndex}: GẶP LỖI THỰC THI`;
  }

  const rawObj = rawDetails || err.rawDetails || {
    name: err.name || 'Error',
    message: err.message,
    stack: err.stack || '',
    status: err.status || null,
    debugInfo: err.debugInfo || null,
    rawResponse: err.rawResponse || null
  };

  const rawJsonFormatted = JSON.stringify(rawObj, null, 2);

  if (errorMsg) {
    errorMsg.textContent = `[LỖI THÔ CHI TIẾT - RAW DEBUG INFO]:
----------------------------------------------------------------------
${rawJsonFormatted}
----------------------------------------------------------------------

[STACK TRACE]:
${err.stack || 'Không có stack trace'}

[HƯỚNG DẪN XỬ LÝ NHANH]:
1. Đảm bảo Tab 1688 (https://s.1688.com) đang mở trên trình duyệt và đã đăng nhập tài khoản.
2. Nếu gặp lỗi "Failed to fetch": Đảm bảo CORS header và tab origin được đồng bộ.
3. Bấm nút "Sao Chép Lỗi Để Debug" bên dưới để lấy toàn bộ thông tin kỹ thuật gửi cho lập trình viên.`;
  }

  if (errorBox) {
    errorBox.style.display = 'flex';
  }

  // Tự động cuộn xuống hộp lỗi và terminal console
  setTimeout(() => {
    errorBox?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}
let currentCaptchaUrl = 'https://www.1688.com';

/**
 * Hiển thị màn hình cảnh báo Captcha
 */
export function showCaptchaWarning(captchaInfo, switchWorkflowScreen) {
  const platform = captchaInfo?.platform || '1688';
  if (platform.toLowerCase().includes('shopee')) {
    currentCaptchaUrl = 'https://shopee.ph';
  } else if (platform.toLowerCase().includes('tiktok')) {
    currentCaptchaUrl = 'https://www.tiktok.com';
  } else {
    currentCaptchaUrl = 'https://www.1688.com';
  }

  const desc = document.getElementById('wfCaptchaDesc');
  if (desc) {
    desc.textContent = `Hệ thống ${platform} đang yêu cầu kéo thanh trượt Slider / Robot Test. Vui lòng giải captcha trên tab trình duyệt để tiếp tục.`;
  }
  if (switchWorkflowScreen) {
    switchWorkflowScreen('screenWorkflowWarning');
  }
}

/**
 * Gắn sự kiện cho Màn hình 2: Tiến trình & Logs
 */
export function bindProgressEvents({
  pipeline,
  startPipelineExecution,
  switchWorkflowScreen
}) {
  const btnPause = document.getElementById('wfBtnPauseResume');
  const btnAbort = document.getElementById('wfBtnAbort');
  const btnCopyLog = document.getElementById('wfBtnCopyLog');
  const btnClearLog = document.getElementById('wfBtnClearLog');
  const btnToggleScroll = document.getElementById('wfBtnToggleScroll');

  // Các nút trong Hộp Debug Lỗi
  const btnCopyError = document.getElementById('wfBtnCopyErrorDetails');
  const btnRetry = document.getElementById('wfBtnRetryPipeline');
  const btnBack = document.getElementById('wfBtnBackToInput');

  if (btnPause) {
    btnPause.addEventListener('click', () => {
      if (btnPause.textContent.includes('Tạm Dừng')) {
        const ok = pipeline.pausePipeline();
        if (ok) {
          btnPause.innerHTML = 'Tiếp Tục';
          btnPause.classList.add('btn-resume-glow');
        }
      } else {
        const ok = pipeline.resumePipeline();
        if (ok) {
          btnPause.innerHTML = 'Tạm Dừng';
          btnPause.classList.remove('btn-resume-glow');
        }
      }
    });
  }

  if (btnAbort) {
    btnAbort.addEventListener('click', () => {
      if (confirm('Bạn có chắc chắn muốn hủy bỏ quy trình đang chạy không?')) {
        pipeline.abortPipeline();
        showToast('Đã hủy bỏ quy trình.', 'warn');
        if (switchWorkflowScreen) switchWorkflowScreen('screenWorkflowInput');
      }
    });
  }

  if (btnCopyLog) {
    btnCopyLog.addEventListener('click', async () => {
      const ok = await logger.copyAllLogs();
      if (ok) {
        showToast('Đã sao chép toàn bộ Terminal Log vào Clipboard!');
      }
    });
  }

  if (btnClearLog) {
    btnClearLog.addEventListener('click', () => {
      logger.clearLogs();
    });
  }

  if (btnToggleScroll) {
    btnToggleScroll.addEventListener('click', () => {
      const isAuto = logger.toggleAutoScroll();
      btnToggleScroll.textContent = isAuto ? 'Tự động cuộn: BẬT' : 'Tự động cuộn: TẮT';
    });
  }

  if (btnCopyError) {
    btnCopyError.addEventListener('click', async () => {
      const errorMsg = document.getElementById('wfErrorMessage')?.textContent || '';
      const logs = (await logger.copyAllLogs()) ? '\n\n[TERMINAL LOGS]:\n' + (document.getElementById('terminalLogOutput')?.innerText || '') : '';
      const fullText = `=== BÁO CÁO LỖI DEBUG WORKFLOW PIPELINE ===\n${errorMsg}${logs}`;
      await navigator.clipboard.writeText(fullText);
      showToast('Đã sao chép toàn bộ lỗi & logs để debug!');
    });
  }

  if (btnRetry) {
    btnRetry.addEventListener('click', () => {
      const errorBox = document.getElementById('wfErrorDebugBox');
      if (errorBox) errorBox.style.display = 'none';
      if (startPipelineExecution) {
        startPipelineExecution(pipeline.pipelineState.sku, pipeline.pipelineState.originalImage);
      }
    });
  }

  if (btnBack) {
    btnBack.addEventListener('click', () => {
      if (switchWorkflowScreen) switchWorkflowScreen('screenWorkflowInput');
    });
  }

  // Helper thực hiện tải ZIP từ Màn 2
  const triggerZipDownload = async (btn) => {
    const state = pipeline?.pipelineState || {};
    try {
      const origHtml = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Đang nén...';
      }
      const blob = await exporter.createZipBundle(state);
      const blobUrl = URL.createObjectURL(blob);
      const filename = `${state.sku || 'PRODUCT'}.zip`;

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
      showToast(`Đã tải file: ${filename}`);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    } catch (err) {
      alert('Lỗi tải ZIP: ' + err.message);
      if (btn) btn.disabled = false;
    }
  };

  // Helper copy TSV từ Màn 2
  const triggerTsvCopy = async () => {
    const state = pipeline?.pipelineState || {};
    const tsv = exporter.generateTsvString(state);
    const ok = await exporter.copyTsvToClipboard(tsv);
    if (ok) {
      showToast('Đã sao chép 24 cột dữ liệu vào Clipboard!');
    } else {
      alert('Không thể sao chép vào Clipboard!');
    }
  };

  // Helper tải Logs từ Màn 2
  const triggerLogDownload = () => {
    const sku = pipeline?.pipelineState?.sku || 'WORKFLOW';
    logger.downloadLogsAsFile(sku);
    showToast('Đang tải xuống file log...');
  };

  // Nút Tải ZIP (Quick banner & Bottom footer)
  const btnQuickZip = document.getElementById('wfBtnQuickDownloadZip');
  const btnBottomZip = document.getElementById('wfBtnBottomDownloadZip');
  if (btnQuickZip) btnQuickZip.addEventListener('click', () => triggerZipDownload(btnQuickZip));
  if (btnBottomZip) btnBottomZip.addEventListener('click', () => triggerZipDownload(btnBottomZip));

  // Nút Copy TSV (Quick banner & Bottom footer)
  const btnQuickTsv = document.getElementById('wfBtnQuickCopyTsv');
  const btnBottomTsv = document.getElementById('wfBtnBottomCopyTsv');
  if (btnQuickTsv) btnQuickTsv.addEventListener('click', triggerTsvCopy);
  if (btnBottomTsv) btnBottomTsv.addEventListener('click', triggerTsvCopy);

  // Nút Chuyển sang Màn hình Kết quả (Dashboard & Specs)
  const btnGoResult = document.getElementById('wfBtnGoToResultDashboard');
  const btnBottomGoResult = document.getElementById('wfBtnBottomGoResult');
  const goToResult = () => {
    if (switchWorkflowScreen) switchWorkflowScreen('screenWorkflowResult');
  };
  if (btnGoResult) btnGoResult.addEventListener('click', goToResult);
  if (btnBottomGoResult) btnBottomGoResult.addEventListener('click', goToResult);

  // Nút Tải file log dạng text
  const btnQuickLog = document.getElementById('wfBtnQuickDownloadLog');
  const btnTermLog = document.getElementById('wfBtnDownloadTerminalLog');
  if (btnQuickLog) btnQuickLog.addEventListener('click', triggerLogDownload);
  if (btnTermLog) btnTermLog.addEventListener('click', triggerLogDownload);

  // Nút Sản phẩm mới trên footer của Màn 2
  const btnProgressNew = document.getElementById('wfBtnProgressNewProduct');
  if (btnProgressNew) {
    btnProgressNew.addEventListener('click', () => {
      hideProgressCompletionBanner();
      if (switchWorkflowScreen) switchWorkflowScreen('screenWorkflowInput');
    });
  }
}

/**
 * Gắn sự kiện cho Màn hình cảnh báo Captcha (Màn 4)
 */
export function bindWarningEvents({ pipeline, switchWorkflowScreen }) {
  const btnOpenTab = document.getElementById('wfBtnOpenCaptchaTab');
  const btnResume = document.getElementById('wfBtnResumeAfterCaptcha');
  const btnPause = document.getElementById('wfBtnPauseResume');

  if (btnOpenTab) {
    btnOpenTab.addEventListener('click', () => {
      chrome.tabs.create({ url: currentCaptchaUrl, active: true });
    });
  }

  if (btnResume) {
    btnResume.addEventListener('click', () => {
      if (btnPause) {
        btnPause.innerHTML = 'Tạm Dừng';
        btnPause.classList.remove('btn-resume-glow');
      }
      if (switchWorkflowScreen) switchWorkflowScreen('screenWorkflowProgress');
      if (pipeline) pipeline.resumePipeline();
    });
  }
}
