/**
 * pipeline.js — Workflow Master Orchestrator (10-Step State Machine Facade)
 * Điều phối chuỗi 10 bước tự động hóa từ ảnh & SKU tới bộ dữ liệu thành phẩm.
 * Hỗ trợ Tạm dừng / Tiếp tục, Hủy bỏ, Quét 100% từ khóa hàng ngách và phân trang TikTok lazy-load.
 */

import * as ticker from './ticker.js';
import * as logger from './logger.js';
import {
  pipelineState,
  resetPipelineState,
  pausePipeline,
  resumePipeline,
  abortPipeline,
  checkPauseOrAbort
} from './pipeline/pipelineState.js';
import {
  runStep0_AutoTabs,
  runStep1_1688VisualSearch,
  runStep2_1688Filter,
  runStep3_1688OfferDetail,
  runStep4_GeminiKeywords,
  runStep5_ShopeeSearch,
  runStep6_ReviewVerification,
  runStep7_TikTokVideos,
  runStep8_EnrichData,
  runStep9_PackageManifest
} from './pipeline/pipelineSteps.js';

export { pipelineState, pausePipeline, resumePipeline, abortPipeline };

/**
 * Khởi chạy chuỗi Pipeline 10 bước
 * @param {Object} config - { sku: string, originalImage: string, exchangeRates?: Object, clients: Object }
 * @param {Object} callbacks - { onProgress, onLog, onTickerItem, onComplete, onError, onCaptcha }
 */
export async function runPipeline(config, callbacks = {}) {
  const { sku, originalImage, clients } = config;
  const { alibaba, shopee, tiktok, gemini } = clients || {};

  resetPipelineState(sku, originalImage);

  ticker.clearTicker();
  logger.clearLogs();
  logger.info('PIPELINE', `Bắt đầu xử lý mã SKU: ${pipelineState.sku}`);

  const updateProgress = (step, percent, title, detail) => {
    pipelineState.currentStep = step;
    pipelineState.progressPercent = percent;
    if (callbacks.onProgress) {
      callbacks.onProgress(step, percent, title, detail);
    }
  };

  try {
    // Bước 0: Chuẩn bị tab nền
    await runStep0_AutoTabs(checkPauseOrAbort, updateProgress);

    // Bước 1: Tìm nguồn sỉ 1688 bằng ảnh
    const step1Res = await runStep1_1688VisualSearch(alibaba, originalImage, checkPauseOrAbort, updateProgress, callbacks);
    const { rawOffers, uploadResult } = step1Res || {};

    // Bước 2: Lọc thị giác Gemini cấp 1 & Paging vòng lặp (Tối đa 5 trang)
    const selected1688 = await runStep2_1688Filter(alibaba, gemini, originalImage, uploadResult, rawOffers, checkPauseOrAbort, updateProgress);

    // Bước 3: Cào chi tiết 1688 & Chống bẫy bán Combo / SKU phụ (Gallery Ratio Check)
    const { topOffer, primaryOfferDetail } = await runStep3_1688OfferDetail(alibaba, gemini, originalImage, selected1688, checkPauseOrAbort, updateProgress);

    // Bước 4: Multimodal Keyword Engine: Khử Brand TQ & Sinh Generic Keywords
    const generatedKeywords = await runStep4_GeminiKeywords(gemini, originalImage, topOffer, primaryOfferDetail, checkPauseOrAbort, updateProgress);

    // Bước 5: Tìm kiếm Shopee PH & Gemini Vision lọc đúng sản phẩm
    const shopeeShops = await runStep5_ShopeeSearch(shopee, gemini, originalImage, generatedKeywords.shopeeKeywords, checkPauseOrAbort, updateProgress);

    // Bước 6: Thẩm định Review người mua bằng Text + Ảnh thực tế (Bỏ qua video)
    const verifiedReviews = await runStep6_ReviewVerification(shopee, gemini, originalImage, shopeeShops, checkPauseOrAbort, updateProgress);

    // Bước 7: Thu hoạch Video TikTok/Douyin chuyên sâu & Gemini Vision phân tích ảnh bìa video
    const formattedVideos = await runStep7_TikTokVideos(tiktok, gemini, originalImage, generatedKeywords, topOffer, checkPauseOrAbort, updateProgress);

    // Bước 8: Ghép dữ liệu Specs, giá vốn CNY, giá lẻ PHP/VND & Biên lợi nhuận %
    await runStep8_EnrichData(pipelineState.cleaned1688, shopeeShops, shopee, pipelineState.sku, verifiedReviews, checkPauseOrAbort, updateProgress);

    // Bước 9: Đóng gói Metadata Manifest & Bảng TSV 24 cột
    await runStep9_PackageManifest(topOffer, primaryOfferDetail, selected1688, pipelineState.cleaned1688, generatedKeywords, shopeeShops, formattedVideos, checkPauseOrAbort, updateProgress);

    // Bước 10: Hoàn tất 100%
    await checkPauseOrAbort();
    pipelineState.status = 'COMPLETED';
    updateProgress(10, 100, 'Hoàn thành 100%', 'Pipeline đã hoàn tất thành công. Sẵn sàng xuất file.');
    logger.success('PIPELINE', `Chúc mừng! Quy trình hoàn tất cho SKU: ${pipelineState.sku}`);

    // Gọi callback onComplete khi thành công trọn vẹn
    if (callbacks.onComplete) {
      callbacks.onComplete(pipelineState);
    }

    return pipelineState;
  } catch (err) {
    if (err.message === 'PIPELINE_ABORTED') {
      logger.warn('PIPELINE', 'Quy trình đã dừng theo yêu cầu của người dùng.');
      return pipelineState;
    }

    pipelineState.status = 'ERROR';
    pipelineState.errors.push(err.message);
    logger.error('PIPELINE', `Quy trình bị gián đoạn: ${err.message}`);

    if (callbacks.onError) {
      callbacks.onError(err, pipelineState.currentStep || 1, err.rawDetails || null);
    }
    throw err;
  }
}
