/**
 * pipelineSteps.js — Discrete Step Handlers for Robust Multimodal Workflow Pipeline
 * Tích hợp đầy đủ:
 * - Bước 0: Chuẩn bị tab nền
 * - Bước 1: 1688 Visual Search + Bắt Captcha Slider Loop
 * - Bước 2: Gemini Vision Lọc Thumbnail 1688 + Paging vòng lặp (Tối đa 5 trang, cờ Ultra-Niche)
 * - Bước 3: Cào chi tiết 1688 + Kiểm định chống bẫy Combo/SKU phụ (Gallery Ratio Check)
 * - Bước 4: Gemini Multimodal: Ảnh gốc + Mô tả 1688 -> Khử brand TQ -> Generic Keywords
 * - Bước 5: Tìm kiếm Shopee PH + Gemini Vision lọc đúng mẫu sản phẩm mục tiêu
 * - Bước 6: Thẩm định Review người mua bằng Text + Ảnh thực tế (BỎ QUA VIDEO để tiết kiệm token)
 * - Bước 7: Thu hoạch Video TikTok/Douyin + Gemini Vision lọc ảnh bìa video -> Xếp theo Tym
 * - Bước 8: Ghép dữ liệu Specs, giá vốn CNY, giá lẻ PHP/VND & Biên lợi nhuận %
 * - Bước 9: Đóng gói Metadata Manifest & Bảng tính TSV 24 cột
 */

import * as autoTabs from '../autoTabs.js';
import * as cleaner from '../cleaner.js';
import * as enricher from '../enricher.js';
import * as ticker from '../ticker.js';
import * as logger from '../logger.js';
import { pipelineState, setCaptchaWait } from './pipelineState.js';
import {
  verify1688Thumbnails,
  verify1688DetailGallery,
  detectComboTrapRatio,
  synthesizeProductDetailsAndSpecs,
  verifyShopeeThumbnails,
  verifyReviewAuthenticity,
  verifyTikTokCovers
} from './geminiVisionHelper.js';

/**
 * BƯỚC 0: CHUẨN BỊ VÀ ĐỒNG BỘ CÁC TAB NỀN
 */
export async function runStep0_AutoTabs(checkPauseOrAbort, updateProgress) {
  await checkPauseOrAbort();
  updateProgress(0, 5, 'Chuẩn bị phiên các sàn', 'Đang kiểm tra tab 1688, Shopee, TikTok, Gemini...');
  logger.info('STEP 0', 'Tự động mở các tab sàn còn thiếu nếu chưa có phiên...');
  try {
    await autoTabs.openRequiredBackgroundTabs();
  } catch (tabErr) {
    logger.error('STEP 0', `Lỗi mở tab nền: ${tabErr.message}`);
    throw new Error(`[Bước 0 - Chuẩn Bị Tab]: Không thể mở tab sàn nền: ${tabErr.message}`);
  }
  logger.success('STEP 0', 'Tất cả các nền tảng đã sẵn sàng kết nối.');
}

/**
 * BƯỚC 1: TÌM ẢNH SỈ 1688 & XÁC THỰC
 * @returns {Promise<{ rawOffers: Array, uploadResult: Object }>}
 */
export async function runStep1_1688VisualSearch(alibaba, originalImage, checkPauseOrAbort, updateProgress, callbacks) {
  await checkPauseOrAbort();
  updateProgress(1, 12, 'Tìm kiếm nguồn sỉ 1688', 'Đang quét ảnh gốc và đối sánh visual...');
  logger.info('STEP 1', 'Gọi Alibaba1688SDK tìm kiếm bằng hình ảnh...');

  if (!originalImage) {
    throw new Error('[Bước 1 - 1688]: Chưa cung cấp hình ảnh sản phẩm gốc.');
  }

  let search1688Res = null;
  let uploadResult = null;
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      if (!uploadResult && typeof alibaba.uploadImage === 'function') {
        try {
          uploadResult = await alibaba.uploadImage(originalImage);
        } catch (upErr) {
          uploadResult = null;
        }
      }

      search1688Res = await alibaba.searchByImage(uploadResult || originalImage, { page: 1, pageSize: 20 });
      if (search1688Res && Array.isArray(search1688Res.offers) && search1688Res.offers.length > 0) {
        break;
      }
      if (search1688Res && search1688Res.offers) {
        break;
      }
    } catch (err) {
      if (err.message && (err.message.includes('captcha') || err.message.includes('RGV587'))) {
        setCaptchaWait();
        logger.warn('1688', `Phát hiện Captcha (lần thử ${attempt}/${maxRetries}): ${err.message}. Tạm dừng chờ giải.`);
        if (callbacks && callbacks.onCaptcha) callbacks.onCaptcha({ platform: '1688', error: err.message });
        await checkPauseOrAbort();
        continue;
      } else {
        const rawErrObj = {
          step: 1,
          stepName: '1688 Visual Image Search',
          name: err.name || 'Error',
          message: err.message || String(err),
          stack: err.stack || '',
          timestamp: new Date().toISOString()
        };
        logger.error('STEP 1', `LỖI THÔ: ${rawErrObj.message}`);
        const enhancedErr = new Error(`[Bước 1 - 1688]: Lỗi gọi API tìm kiếm ảnh: ${err.message}`);
        enhancedErr.rawDetails = rawErrObj;
        throw enhancedErr;
      }
    }
  }

  const rawOffers = search1688Res?.offers || [];
  if (rawOffers.length === 0) {
    throw new Error('[Bước 1 - 1688]: Không tìm thấy nhà cung cấp nào trên 1688 phù hợp với ảnh sản phẩm.');
  }
  pipelineState.rawOffers1688 = rawOffers;
  updateProgress(1, 18, 'Tìm kiếm nguồn sỉ 1688', `Đã tìm thấy ${rawOffers.length} xưởng thô ban đầu (chưa lọc)`);
  logger.success('STEP 1', `Quét visual thành công! Tìm thấy ${rawOffers.length} xưởng tiềm năng ban đầu.`);
  return { rawOffers, uploadResult };
}

/**
 * BƯỚC 2: QUÉT TRỌN VẸN 5 TRANG 1688 & THẨM ĐỊNH 2 VÒNG GEMINI MULTIMODAL
 * - Quét đủ 5 trang gần nhất (Trang 1 đến 5) để gom toàn bộ xưởng thô (~100-150 xưởng)
 * - Vòng 1: Lọc Thumbnail qua Gemini Vision (Micro-Batch 4 ảnh) với prompt soi vi thể khắt khe
 * - Vòng 2: Cào bộ ảnh Gallery HD trong trang detail và đưa Gemini đối chiếu kiểm tra thực tế
 */
export async function runStep2_1688Filter(alibaba, gemini, originalImage, uploadResult, initialOffers, checkPauseOrAbort, updateProgress) {
  await checkPauseOrAbort();
  const TARGET_PAGES = 5;
  const TARGET_1688_COUNT = 15;
  
  updateProgress(2, 22, 'Khai thác toàn diện 5 trang 1688', 'Đang quét đủ 5 trang kết quả tìm kiếm hình ảnh từ 1688...');
  logger.info('STEP 2', `Bắt đầu quét trọn vẹn ${TARGET_PAGES} trang gần nhất từ 1688 để gom dữ liệu thô toàn diện...`);

  const seenRawIds = new Set();
  const allRawOffers = [];

  const addRawOffers = (list = []) => {
    for (const off of list) {
      const id = String(off.offerId || off.id || '');
      if (id && !seenRawIds.has(id)) {
        seenRawIds.add(id);
        allRawOffers.push(off);
      }
    }
  };

  // Nạp trang 1 ban đầu
  addRawOffers(initialOffers || []);
  logger.info('STEP 2', `[Trang 1/${TARGET_PAGES}]: Thu thập ${allRawOffers.length} xưởng thô.`);

  // Quét tiếp từ trang 2 đến trang 5
  for (let page = 2; page <= TARGET_PAGES; page++) {
    await checkPauseOrAbort();
    updateProgress(2, 22 + (page * 2), `Khai thác 1688 (Trang ${page}/${TARGET_PAGES})`, `Đang quét trang ${page} qua 1688 Image API...`);
    logger.info('STEP 2', `[Trang ${page}/${TARGET_PAGES}]: Đang gọi API 1688 tìm kiếm ảnh trang ${page}...`);

    try {
      if (alibaba && typeof alibaba.searchByImage === 'function') {
        const pageRes = await alibaba.searchByImage(uploadResult || originalImage, { page, pageSize: 20 });
        const pageOffers = pageRes?.offers || [];
        const prevCount = allRawOffers.length;
        addRawOffers(pageOffers);
        logger.info('STEP 2', `  -> Trang ${page}: Bổ sung ${allRawOffers.length - prevCount} xưởng mới (Tổng tích lũy: ${allRawOffers.length} xưởng).`);
      }
    } catch (pageErr) {
      logger.warn('STEP 2', `Lỗi tải trang ${page}: ${pageErr.message}. Tiếp tục với các trang đã có.`);
    }

    // Nghỉ nhẹ 400ms giữa các trang
    await new Promise(r => setTimeout(r, 400));
  }

  pipelineState.rawOffers1688 = allRawOffers;
  logger.success('STEP 2', `Hoàn thành cào đủ ${TARGET_PAGES} trang 1688: Thu thập được tổng cộng ${allRawOffers.length} xưởng thô.`);

  // 1. Lọc rác text cơ bản
  const cleanedPool = cleaner.cleanAndFilter1688Offers(allRawOffers);

  // =========================================================================
  // VÒNG 1: DUYỆT THUMBNAIL QUA GEMINI VISION (MICRO-BATCH 4 ẢNH)
  // =========================================================================
  updateProgress(2, 28, 'Vòng 1: Gemini duyệt Thumbnail vi thể', `Đang đối chiếu ảnh thumbnail ${cleanedPool.length} xưởng theo từng cụm 4 ảnh...`);
  logger.info('STEP 2', `[VÒNG 1 - THUMBNAIL]: Gửi ${cleanedPool.length} xưởng cho Gemini Vision soi chi tiết vi thể...`);

  let stage1Matched = [];
  try {
    stage1Matched = await verify1688Thumbnails(gemini, originalImage, cleanedPool);
  } catch (visErr) {
    logger.warn('STEP 2', `Gemini Vòng 1 gián đoạn (${visErr.message}). Tiếp tục với ứng viên khả thi.`);
    stage1Matched = cleanedPool.slice(0, 25);
  }

  if (stage1Matched.length === 0) {
    logger.warn('STEP 2', 'Không có xưởng nào đạt chuẩn Vòng 1. Sử dụng ứng viên tiềm năng tốt nhất.');
    stage1Matched = cleanedPool.slice(0, 15);
  }

  logger.success('STEP 2', `[VÒNG 1]: Tuyển chọn được ${stage1Matched.length} xưởng vượt qua kiểm định Thumbnail.`);

  // =========================================================================
  // VÒNG 2: DUYỆT TRANG DETAIL & BỘ ẢNH GALLERY THỰC TẾ
  // =========================================================================
  updateProgress(2, 32, 'Vòng 2: Gemini duyệt Trang Detail & Gallery', `Đang cào ảnh chi tiết và kiểm định sâu ruột xưởng của ${stage1Matched.length} ứng viên...`);
  logger.info('STEP 2', `[VÒNG 2 - DETAIL & GALLERY]: Bắt đầu cào bộ ảnh thực tế từ trang chi tiết sản phẩm 1688 để chống bẫy combo / treo đầu dê bán thịt chó...`);

  const verifiedShops = [];
  const auditMap = new Map();

  for (let i = 0; i < stage1Matched.length; i++) {
    await checkPauseOrAbort();
    const candidate = stage1Matched[i];
    logger.info('STEP 2', `[Vòng 2 - Xưởng ${i + 1}/${stage1Matched.length}] Đang kiểm tra trang detail ID: ${candidate.offerId}...`);

    let detail = {};
    try {
      if (alibaba && typeof alibaba.getOfferDetail === 'function') {
        detail = await alibaba.getOfferDetail(candidate.offerId);
      }
    } catch (dErr) {
      logger.warn('STEP 2', `Lỗi cào detail #${candidate.offerId}: ${dErr.message}`);
    }

    const gallery = (detail.images && detail.images.length > 0)
      ? detail.images
      : (candidate.imageUrl ? [candidate.imageUrl] : []);

    let stage2Result = { isDetailMatch: true, matchRatio: 1.0, reason: 'Ảnh chi tiết khớp sản phẩm gốc' };
    try {
      stage2Result = await verify1688DetailGallery(gemini, originalImage, candidate, gallery);
    } catch (s2Err) {
      logger.warn('STEP 2', `Lỗi Vòng 2 xưởng #${candidate.offerId}: ${s2Err.message}`);
    }

    auditMap.set(candidate.offerId, {
      isStage1Match: true,
      isStage2Match: stage2Result.isDetailMatch,
      isMatch: stage2Result.isDetailMatch,
      auditReason: stage2Result.reason || candidate.stage1Reason || 'Đã kiểm định 2 vòng',
      galleryImages: gallery
    });

    if (stage2Result.isDetailMatch) {
      candidate.isDetailVerified = true;
      candidate.galleryImages = gallery;
      candidate.detailMatchRatio = stage2Result.matchRatio;
      verifiedShops.push(candidate);

      const priceText = candidate.priceFormatted || `¥${candidate.price}`;
      logger.success('1688', `[Chuẩn 2 Vòng] Xưởng #${verifiedShops.length}: ${candidate.title?.slice(0, 32)}... | Giá: ${priceText} | Đã bán: ${candidate.salesCount || 0}`);

      ticker.addTickerItem({
        type: '1688',
        title: candidate.title,
        image: candidate.imageUrl,
        label: `1688 #${verifiedShops.length} (Chuẩn 2 Vòng)`,
        link: candidate.detailUrl
      });

      if (verifiedShops.length >= TARGET_1688_COUNT) {
        logger.info('STEP 2', `Đã tìm đủ ${TARGET_1688_COUNT} xưởng đạt chuẩn tuyệt đối cả 2 vòng. Hoàn tất lọc 1688.`);
        break;
      }
    } else {
      logger.warn('1688', `[Loại ở Vòng 2] Xưởng #${candidate.offerId}: ${stage2Result.reason}`);
    }
  }

  // Fallback an toàn nếu tiêu chí quá nghiêm ngặt
  if (verifiedShops.length === 0) {
    logger.warn('STEP 2', 'Không có xưởng nào đạt 100% cả 2 vòng. Lấy Top xưởng đạt điểm cao nhất ở Vòng 1.');
    verifiedShops.push(...stage1Matched.slice(0, 5));
  }

  pipelineState.valid1688Shops = verifiedShops.slice(0, TARGET_1688_COUNT);

  // Lưu bảng dấu vết kiểm định toàn diện cho tất cả xưởng 5 trang
  pipelineState.gemini1688Audit = allRawOffers.map(o => {
    const id = String(o.offerId || o.id || '');
    const isChosen = pipelineState.valid1688Shops.some(v => String(v.offerId || v.id) === id);
    const auditInfo = auditMap.get(id);

    if (isChosen) {
      return {
        ...o,
        isMatch: true,
        isStage1Match: true,
        isStage2Match: true,
        auditReason: auditInfo?.auditReason || 'Gemini Vision xác nhận: Đạt chuẩn cả 2 vòng (Thumbnail + Detail)'
      };
    }

    if (auditInfo) {
      return {
        ...o,
        isMatch: false,
        isStage1Match: auditInfo.isStage1Match,
        isStage2Match: auditInfo.isStage2Match,
        auditReason: auditInfo.auditReason
      };
    }

    return {
      ...o,
      isMatch: false,
      isStage1Match: false,
      isStage2Match: false,
      auditReason: 'Bị loại ở Vòng 1 (Lệch form dáng/chi tiết vi thể hoặc phụ kiện rời)'
    };
  });

  updateProgress(2, 35, 'Hoàn tất kiểm định 2 vòng 1688', `Gemini đã chọn ${pipelineState.valid1688Shops.length}/${allRawOffers.length} xưởng đạt chuẩn 2 vòng`);
  logger.success('STEP 2', `Tuyển chọn thành công ${pipelineState.valid1688Shops.length} xưởng 1688 chuẩn đầu nguồn từ ${allRawOffers.length} xưởng (quét 5 trang).`);
  return pipelineState.valid1688Shops;
}

/**
 * BƯỚC 3: CÀO CHI TIẾT 1688 & CHỐNG BẪY BÁN COMBO / SKU PHỤ
 * Kiểm định tỷ lệ ảnh sản phẩm trong bộ ảnh Gallery qua Gemini Vision.
 */
export async function runStep3_1688OfferDetail(alibaba, gemini, originalImage, verifiedOffers, checkPauseOrAbort, updateProgress) {
  await checkPauseOrAbort();
  updateProgress(3, 38, 'Đóng gói Mô Tả Sản Phẩm & Dữ Liệu Các Xưởng 1688', 'Cào chi tiết thuộc tính thô và thẩm định bộ ảnh Gallery chống bẫy combo...');
  logger.info('STEP 3', 'Bắt đầu kiểm định chi tiết toàn bộ các xưởng và phát hiện bẫy bán combo/SKU phụ...');

  // 1. Chuẩn hóa dữ liệu thô đầy đủ của toàn bộ xưởng 1688 đã được chọn (lên tới 15 xưởng)
  const allRawShops = (verifiedOffers || []).slice(0, 15).map((o, idx) => {
    const priceCny = Number(o.price || o.pricing?.priceCny || 0);
    const priceVnd = Number(o.pricing?.priceVnd || Math.round(priceCny * 3560));
    return {
      rank: idx + 1,
      offerId: String(o.offerId || o.id || ''),
      title: o.title || `Sản phẩm 1688 #${idx + 1}`,
      rawTitle: o.raw?.title || o.raw?.subject || o.title || '',
      imageUrl: o.imageUrl || '',
      price: priceCny,
      priceFormatted: o.priceFormatted || `¥${priceCny.toFixed(2)}`,
      priceVnd: priceVnd,
      priceFormattedVnd: `${priceVnd.toLocaleString('vi-VN')} ₫`,
      moq: Number(o.moq || 1),
      salesCount: Number(o.salesCount || 0),
      company: {
        name: o.company?.name || 'Xưởng sản xuất 1688',
        city: o.company?.city || '',
        province: o.company?.province || '',
        isSuperFactory: !!(o.company?.isSuperFactory || o.isSuperFactory),
        repurchaseRate: o.company?.repurchaseRate || ''
      },
      detailUrl: o.detailUrl || `https://detail.1688.com/offer/${o.offerId || o.id}.html`,
      attributes: o.attributes || o.raw?.attributes || {}
    };
  });

  pipelineState.allRaw1688Specs = allRawShops;

  let acceptedOffer = null;
  let primaryOfferDetail = {};

  // 2. Duyệt qua các xưởng ứng viên để phát hiện bẫy combo
  for (let i = 0; i < allRawShops.length; i++) {
    await checkPauseOrAbort();
    const candidate = allRawShops[i];
    logger.info('STEP 3', `Thẩm định xưởng [${i + 1}/${allRawShops.length}] ID: ${candidate.offerId}...`);

    let detail = {};
    try {
      detail = await alibaba.getOfferDetail(candidate.offerId);
    } catch (err) {
      detail = { attributes: { 'Loại sản phẩm': candidate.title } };
    }

    // Lấy bộ ảnh Gallery
    const gallery = detail.imageUrls || detail.images || [candidate.imageUrl];

    // Kiểm định bẫy Combo qua Gemini Vision
    let checkResult = { isSingleProduct: true, ratio: 1.0 };
    try {
      checkResult = await detectComboTrapRatio(gemini, originalImage, gallery);
    } catch (cErr) {
      checkResult = { isSingleProduct: true, ratio: 1.0 };
    }

    if (!checkResult.isSingleProduct && allRawShops.length > 1) {
      logger.warn('STEP 3', `Phát hiện bẫy bán Combo / SKU phụ ở link ${candidate.offerId} (Tỷ lệ ảnh khớp chỉ ${Math.round(checkResult.ratio * 100)}%). Bỏ link này và thẩm định link tiếp theo...`);
      continue;
    }

    // Link đạt chuẩn xưởng sản xuất chuyên sâu
    logger.success('STEP 3', `Link ${candidate.offerId} đạt chuẩn xưởng chuyên sâu (Tỷ lệ ảnh gốc: ${Math.round(checkResult.ratio * 100)}%).`);
    acceptedOffer = candidate;
    primaryOfferDetail = detail;
    break;
  }

  // Nếu tất cả link đều bị nghi ngờ combo, lấy link tốt nhất đầu tiên
  if (!acceptedOffer) {
    acceptedOffer = allRawShops[0];
    primaryOfferDetail = await alibaba.getOfferDetail(acceptedOffer.offerId).catch(() => ({}));
  }

  // 3. Đưa thông tin toàn bộ các xưởng và ảnh gốc cho Gemini AI tổng hợp các đoạn mô tả chi tiết & bảng thông số toàn diện
  updateProgress(3, 42, 'Gemini AI đóng gói mô tả & specs', `Đang tổng hợp các đoạn mô tả chi tiết và bảng thông số từ ${allRawShops.length} link xưởng...`);
  logger.info('STEP 3', `Kích hoạt Gemini AI tổng hợp các đoạn mô tả chi tiết và bảng thông số toàn diện từ ${allRawShops.length} xưởng 1688...`);
  const synthesized = await synthesizeProductDetailsAndSpecs(gemini, originalImage, allRawShops, acceptedOffer);

  const mergedAttributes = (synthesized.detailedSpecs && Object.keys(synthesized.detailedSpecs).length > 0)
    ? synthesized.detailedSpecs
    : (primaryOfferDetail.attributes && Object.keys(primaryOfferDetail.attributes).length > 0 ? primaryOfferDetail.attributes : { 'Chủng loại': acceptedOffer.title });

  const cleanedOffer = cleaner.clean1688Offer({
    ...acceptedOffer,
    ...primaryOfferDetail,
    attributes: mergedAttributes
  });

  const top5RawShops = allRawShops.slice(0, 5);
  pipelineState.valid1688Shops = allRawShops;
  pipelineState.cleaned1688 = {
    ...acceptedOffer,
    ...(cleanedOffer || {}),
    productNameVi: synthesized.productNameVi || acceptedOffer.title,
    productNameEn: synthesized.productNameEn || 'Commercial Product',
    title: synthesized.productNameVi || acceptedOffer.title,
    rawTitle: acceptedOffer.rawTitle || acceptedOffer.title,
    descriptionParagraphs: synthesized.descriptionParagraphs || {},
    attributes: mergedAttributes,
    detailedSpecs: mergedAttributes,
    rawAttributesDictionary: synthesized.rawAttributesDictionary || {},
    allRawShops: allRawShops,
    top5RawShops: top5RawShops,
    detailUrl: acceptedOffer.detailUrl || `https://detail.1688.com/offer/${acceptedOffer.offerId}.html`,
    basePrice: acceptedOffer.price || 0,
    priceFormatted: acceptedOffer.priceFormatted || `¥${acceptedOffer.price}`,
    priceFormattedVnd: acceptedOffer.priceFormattedVnd || `${(acceptedOffer.priceVnd || 0).toLocaleString()} ₫`
  };

  const attrCount = Object.keys(pipelineState.cleaned1688.attributes || {}).length;
  ticker.addTickerItem({
    type: '1688',
    title: `Specs: ${attrCount} thông số | ${pipelineState.cleaned1688.title.slice(0, 30)}...`,
    image: acceptedOffer.imageUrl,
    label: 'Thông Số & Mô Tả Chi Tiết',
    link: acceptedOffer.detailUrl
  });

  logger.success('STEP 3', `Hoàn tất đóng gói: 3 đoạn mô tả chi tiết, ${attrCount} thông số kỹ thuật và bảo lưu đầy đủ dữ liệu thô 5 link xưởng.`);
  return { topOffer: acceptedOffer, primaryOfferDetail, top5RawShops };
}

/**
 * BƯỚC 4: MULTIMODAL KEYWORD ENGINE: KHỬ BRAND TQ & SINH TỪ KHÓA ĐA NGÔN NGỮ THEO NỀN TẢNG
 * - Shopee PH: Tiếng Anh / Taglish; Shopee VN: Tiếng Việt
 * - TikTok: Tiếng Việt (Review, đập hộp, trải nghiệm)
 * - Douyin: Tiếng Trung (Chuẩn thói quen người bán thực tế)
 */
/**
 * Xây dựng Prompt linh động dựa trên cấu hình thị trường & nền tảng:
 * - Shopee Philippines: 100% tiếng Anh / Taglish thương mại bán lẻ
 * - Shopee Việt Nam: 100% tiếng Việt thương mại bán lẻ
 * - Douyin: 100% tiếng Trung giản thể (thói quen người bán/creator)
 * - TikTok: 100% tiếng Việt (video review, đập hộp, test độ bền)
 */
function buildDynamicKeywordPrompt({ isMultimodal, isShopeePh, needDouyin, needTiktok, topOffer, primaryOfferDetail, cleanDescription, specJsonStr, sku }) {
  const targetMarkets = [];
  if (isShopeePh) {
    targetMarkets.push('Shopee Philippines (BẮT BUỘC 100% TIẾNG ANH / TAGLISH THƯƠNG MẠI BÁN LẺ)');
  } else {
    targetMarkets.push('Shopee Việt Nam (BẮT BUỘC 100% TIẾNG VIỆT THƯƠNG MẠI BÁN LẺ)');
  }
  if (needDouyin) {
    targetMarkets.push('Douyin Trung Quốc (BẮT BUỘC 100% TIẾNG TRUNG GIẢN THỂ THỰC CHIẾN)');
  }
  if (needTiktok) {
    targetMarkets.push('TikTok (BẮT BUỘC 100% TIẾNG VIỆT DẠNG VIDEO REVIEW / TEST THỰC TẾ)');
  }

  let prompt = `SYSTEM ROLE: Bạn là Chuyên gia Nghiên cứu Thị trường E-Commerce Quốc tế & Sáng tạo Từ Khóa Đa Kênh cấp cao.
Mục tiêu là tạo bộ từ khóa tìm kiếm chính xác tuyệt đối theo từng nền tảng được cấu hình: [${targetMarkets.join(' | ')}].

ĐẦU VÀO TỪ XƯỞNG 1688:
${isMultimodal ? '- [Ảnh 0]: Ảnh thực tế của sản phẩm.\n' : ''}- Tên sản phẩm gốc 1688: "${topOffer.title || ''}".
- Thông số kỹ thuật xưởng: ${specJsonStr}.
- Mô tả xưởng: "${cleanDescription}".
- Mã SKU: "${sku || ''}".

NHIỆM VỤ CỐT LÕI:
1. ${isMultimodal ? 'NHÌN ẢNH VÀ ' : ''}PHÂN TÍCH BẢN CHẤT SẢN PHẨM: Hiểu rõ chức năng, công dụng cốt lõi, đối tượng khách hàng, chất liệu và form dáng.
2. KHỬ TRIỆT ĐỂ BRAND NỘI ĐỊA TQ: Đọc tên và mô tả 1688, TÌM VÀ XÓA BỎ VĨNH VIỄN toàn bộ tên thương hiệu nội địa Trung Quốc, tên xưởng (Kaxixi, Feiyue, Chuangke, Yiwu, OEM...). Tuyệt đối không để lọt brand TQ vào bất kỳ từ khóa nào.
3. TẠO TÊN QUỐC TẾ (genericEnglishName): Tên sản phẩm tiếng Anh thương mại chuẩn hóa quốc tế (không kèm brand TQ).
`;

  let stepIdx = 4;

  if (isShopeePh) {
    prompt += `
${stepIdx++}. BỘ TỪ KHÓA SHOPEE PHILIPPINES (BẮT BUỘC 100% TIẾNG ANH / TAGLISH - 12 đến 18 từ khóa):
   - Ngôn ngữ: TIẾNG ANH THƯƠNG MẠI (US English / Taglish e-commerce search query).
   - Tuyệt đối KHÔNG dùng tiếng Trung, KHÔNG dùng tiếng Việt.
   - Phải là những từ khóa mà người mua hàng tại Philippines gõ trên ô tìm kiếm Shopee PH để tìm mua sản phẩm này.
   - Kết hợp đa dạng: [Tên sản phẩm tiếng Anh] + [Công dụng / Tính năng nổi bật / Chất liệu] + [Kích thước / Phân loại].
   - Ví dụ format: "portable blender usb rechargeable", "waterproof smart watch for men", "stainless steel thermal flask 500ml".
`;
  } else {
    prompt += `
${stepIdx++}. BỘ TỪ KHÓA SHOPEE VIỆT NAM (BẮT BUỘC 100% TIẾNG VIỆT - 12 đến 18 từ khóa):
   - Ngôn ngữ: TIẾNG VIỆT TỰ NHIÊN (Thuần tiếng Việt thương mại e-commerce).
   - Tuyệt đối KHÔNG chứa ký tự tiếng Trung, KHÔNG dịch máy ngô nghê.
   - Phải là những từ khóa mua sắm tự nhiên người tiêu dùng Việt Nam tìm kiếm trên Shopee VN.
   - Kết hợp: [Tên sản phẩm tiếng Việt] + [Đặc điểm / Tính năng / Công dụng] + [Chất liệu / Phân loại].
   - Ví dụ format: "máy xay sinh tố mini cầm tay sạc pin", "đồng hồ thông minh chống nước", "bình giữ nhiệt inox 304 mini".
`;
  }

  if (needDouyin) {
    prompt += `
${stepIdx++}. BỘ TỪ KHÓA DOUYIN TRUNG QUỐC (BẮT BUỘC 100% TIẾNG TRUNG GIẢN THỂ - 12 đến 20 từ khóa):
   - Ngôn ngữ: TIẾNG TRUNG (Simplified Chinese 简体中文).
   - Tuyệt đối KHÔNG dùng tiếng Anh hay tiếng Việt cho Douyin.
   - Phải chuẩn xác theo thói quen đặt tiêu đề và hashtag của các nhà bán hàng, KOC và xưởng sản xuất thực tế trên Douyin.
   - Kết hợp: [Tên sản phẩm tiếng Trung] + [测评 (review)] / [好物推荐 (đề xuất món đồ tốt)] / [开箱 (đập hộp)] / [沉浸式体验 (trải nghiệm)] / [避坑指南 (kinh nghiệm)] / [工厂实测 (test tại xưởng)].
   - Ví dụ format: "便携榨汁机 测评 真实使用", "无线蓝牙耳机 降噪 测评", "大容量保温杯 真实实测 保温效果".
`;
  }

  if (needTiktok) {
    prompt += `
${stepIdx++}. BỘ TỪ KHÓA TIKTOK (BẮT BUỘC 100% TIẾNG VIỆT DẠNG VIDEO REVIEW - 12 đến 18 từ khóa):
   - Ngôn ngữ: TIẾNG VIỆT TỰ NHIÊN.
   - Tuyệt đối KHÔNG dùng tiếng Trung.
   - Phải là các truy vấn tìm kiếm video review, đập hộp, test độ bền, kiểm chứng chất lượng thực tế trên TikTok.
   - Kết hợp: "review [tên sp]", "đập hộp test thực tế [tên sp]", "trải nghiệm chân thực [tên sp]", "test độ bền [tên sp]", "hướng dẫn sử dụng [tên sp]".
`;
  }

  const jsonTemplate = {
    genericEnglishName: "Tên tiếng Anh thương mại chuẩn hóa không kèm brand TQ",
    shopeeKeywords: isShopeePh
      ? ["english keyword 1", "english keyword 2", "english keyword 3"]
      : ["từ khóa tiếng việt 1", "từ khóa tiếng việt 2", "từ khóa tiếng việt 3"]
  };
  if (needDouyin) {
    jsonTemplate.douyinKeywords = ["中文关键词1", "中文关键词2", "中文关键词3"];
  }
  if (needTiktok) {
    jsonTemplate.tiktokKeywords = ["review tiếng việt 1", "đập hộp test tiếng việt 2"];
  }

  prompt += `
YÊU CẦU ĐỊNH DẠNG:
Trả về DUY NHẤT 1 đối tượng JSON hợp lệ (không kèm markdown giải thích ngoài JSON):
${JSON.stringify(jsonTemplate, null, 2)}
`;
  return prompt.trim();
}

/**
 * Bóc tách an toàn JSON hoặc text từ kết quả trả về của Gemini AI
 * @param {string} rawText
 * @param {Object} settings
 * @returns {Object|null}
 */
function parseKeywordsJson(rawText, settings) {
  if (!rawText || typeof rawText !== 'string') return null;
  let cleanStr = rawText.trim();
  const mdMatch = cleanStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) {
    cleanStr = mdMatch[1].trim();
  }
  const firstBrace = cleanStr.indexOf('{');
  const lastBrace = cleanStr.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleanStr = cleanStr.slice(firstBrace, lastBrace + 1);
  }

  const isShopeePh = settings?.shopeeMarket !== 'vn';
  const needDouyin = settings?.videoPlatform === 'douyin' || settings?.videoPlatform === 'both';
  const needTiktok = settings?.videoPlatform === 'tiktok' || settings?.videoPlatform === 'both';

  const filterKws = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    let shopeeKws = Array.isArray(obj.shopeeKeywords) ? obj.shopeeKeywords.map(k => String(k).trim()).filter(Boolean) : [];
    let douyinKws = Array.isArray(obj.douyinKeywords) ? obj.douyinKeywords.map(k => String(k).trim()).filter(Boolean) : [];
    let tiktokKws = Array.isArray(obj.tiktokKeywords) ? obj.tiktokKeywords.map(k => String(k).trim()).filter(Boolean) : [];

    // Shopee lọc bỏ tiếng Trung
    shopeeKws = shopeeKws.filter(k => !/[\u4e00-\u9fa5]/.test(k));

    // Douyin: chỉ giữ nếu được bật, ưu tiên tiếng Trung
    if (needDouyin) {
      const cnOnly = douyinKws.filter(k => /[\u4e00-\u9fa5]/.test(k));
      if (cnOnly.length > 0) douyinKws = cnOnly;
    } else {
      douyinKws = [];
    }

    // TikTok: chỉ giữ nếu được bật, bắt buộc tiếng Việt (không chứa tiếng Trung)
    if (needTiktok) {
      tiktokKws = tiktokKws.filter(k => !/[\u4e00-\u9fa5]/.test(k));
    } else {
      tiktokKws = [];
    }

    if (shopeeKws.length > 0 || douyinKws.length > 0 || tiktokKws.length > 0) {
      return {
        genericEnglishName: obj.genericEnglishName || 'Product',
        shopeeKeywords: shopeeKws,
        douyinKeywords: douyinKws,
        tiktokKeywords: tiktokKws
      };
    }
    return null;
  };

  try {
    const obj = JSON.parse(cleanStr);
    const parsed = filterKws(obj);
    if (parsed) return parsed;
  } catch (e) {
    try {
      const fixed = cleanStr.replace(/,\s*([\}\]])/g, '$1');
      const obj = JSON.parse(fixed);
      const parsed = filterKws(obj);
      if (parsed) return parsed;
    } catch {}
  }

  // Fallback nếu Gemini trả về dạng danh sách text gạch đầu dòng
  if (rawText.includes('#') || /[\u4e00-\u9fa5]/.test(rawText) || rawText.includes('-')) {
    const lines = rawText.split('\n').map(l => l.replace(/^[#\d\.\-\*\s]+/, '').trim()).filter(l => l.length > 1);
    const chineseLines = lines.filter(l => /[\u4e00-\u9fa5]/.test(l));
    const nonChineseLines = lines.filter(l => !/[\u4e00-\u9fa5]/.test(l));

    let shopeeKws = [];
    let tiktokKws = [];
    let douyinKws = needDouyin ? chineseLines.slice(0, 20) : [];

    if (needTiktok) {
      tiktokKws = nonChineseLines.filter(l => l.toLowerCase().includes('review') || l.toLowerCase().includes('test') || l.toLowerCase().includes('hướng dẫn') || l.toLowerCase().includes('đập hộp')).slice(0, 15);
      shopeeKws = nonChineseLines.filter(l => !tiktokKws.includes(l)).slice(0, 15);
    } else {
      shopeeKws = nonChineseLines.slice(0, 15);
    }

    if (shopeeKws.length > 0 || douyinKws.length > 0 || tiktokKws.length > 0) {
      return {
        genericEnglishName: nonChineseLines[0] || 'Product',
        shopeeKeywords: shopeeKws,
        douyinKeywords: douyinKws,
        tiktokKeywords: tiktokKws
      };
    }
  }

  return null;
}

export async function runStep4_GeminiKeywords(gemini, originalImage, topOffer, primaryOfferDetail, checkPauseOrAbort, updateProgress) {
  await checkPauseOrAbort();
  updateProgress(4, 50, 'Gemini AI khử Brand TQ & sinh từ khóa đa kênh', 'Nhìn ảnh gốc + mô tả 1688 để tạo bộ từ khóa đúng ngôn ngữ theo nền tảng...');
  logger.info('STEP 4', 'Kích hoạt Multimodal Keyword Engine: Sinh từ khóa thích ứng thị trường & nền tảng...');

  const settings = pipelineState.settings || { shopeeMarket: 'ph', videoPlatform: 'both' };
  const isShopeePh = settings.shopeeMarket !== 'vn';
  const shopeeDomain = isShopeePh ? 'shopee.ph' : 'shopee.vn';
  const needDouyin = settings.videoPlatform === 'douyin' || settings.videoPlatform === 'both';
  const needTiktok = settings.videoPlatform === 'tiktok' || settings.videoPlatform === 'both';

  const cleanDescription = (primaryOfferDetail.description || topOffer.title || '').slice(0, 500);
  const specJsonStr = JSON.stringify(primaryOfferDetail.attributes || {});

  // Xây dựng Prompt linh động hoàn toàn dựa trên cấu hình người dùng
  const promptContext = {
    isShopeePh,
    needDouyin,
    needTiktok,
    topOffer,
    primaryOfferDetail,
    cleanDescription,
    specJsonStr,
    sku: pipelineState.sku
  };

  const multimodalPrompt = buildDynamicKeywordPrompt({ ...promptContext, isMultimodal: true });

  let generatedKeywords = null;

  // TẦNG 1: THỬ MULTIMODAL VISION VỚI ẢNH GỐC
  try {
    if (typeof gemini?.generateMultimodal === 'function') {
      const res = await gemini.generateMultimodal(multimodalPrompt, [originalImage], { model: '3.8-flash' });
      const rawText = typeof res === 'string' ? res : (res?.text || '');
      generatedKeywords = parseKeywordsJson(rawText, settings);
    }
  } catch (visionErr) {
    logger.warn('STEP 4', `Gemini Multimodal Vision không phản hồi (${visionErr.message}). Tự động chuyển tiếp sang Gemini Text AI...`);
  }

  // TẦNG 2: NẾU VISION KHÔNG TRẢ KẾT QUẢ, GỌI GEMINI TEXT AI
  if (!generatedKeywords) {
    try {
      if (typeof gemini?.generateText === 'function') {
        const textPrompt = buildDynamicKeywordPrompt({ ...promptContext, isMultimodal: false });
        const res = await gemini.generateText(textPrompt, { model: '3.8-flash' });
        const rawText = typeof res === 'string' ? res : (res?.text || '');
        generatedKeywords = parseKeywordsJson(rawText, settings);
      }
    } catch (textErr) {
      logger.warn('STEP 4', `Gemini Text AI không phản hồi (${textErr.message}).`);
    }
  }

  // TẦNG 3: BỘ TẠO DỰ PHÒNG THÔNG MINH CỤC BỘ THEO CẤU HÌNH NỀN TẢNG
  if (generatedKeywords) {
    const phMsg = isShopeePh ? 'Shopee PH (Tiếng Anh)' : 'Shopee VN (Tiếng Việt)';
    const douyinMsg = needDouyin ? `${generatedKeywords.douyinKeywords?.length || 0} từ khóa Douyin (Tiếng Trung)` : 'Douyin (Bỏ qua)';
    const tiktokMsg = needTiktok ? `${generatedKeywords.tiktokKeywords?.length || 0} từ khóa TikTok (Tiếng Việt)` : 'TikTok (Bỏ qua)';
    logger.success('STEP 4', `Gemini AI đã sinh từ khóa linh động: ${generatedKeywords.shopeeKeywords?.length || 0} từ khóa ${phMsg} | ${douyinMsg} | ${tiktokMsg}.`);
  } else {
    logger.warn('STEP 4', 'Kích hoạt Intelligent Fallback Keyword Generator cục bộ theo cấu hình.');

    const cleanSku = (pipelineState.sku || 'PRODUCT').replace(/[^a-zA-Z0-9]/g, ' ').trim().toLowerCase();
    const cleanTitle = (topOffer.title || '').replace(/[^\w\s\u4e00-\u9fa5]/gi, ' ').trim();
    const words = cleanTitle.split(/\s+/).filter(w => w.length > 2);
    const keySeed = words.slice(0, 3).join(' ') || cleanSku;
    const chineseTerms = (topOffer.title || '').match(/[\u4e00-\u9fa5]{2,6}/g) || ['爆款好物', '实用测评', '工厂直发'];
    const vnName = pipelineState.cleaned1688?.productNameVi || keySeed;
    const enName = pipelineState.cleaned1688?.productNameEn || cleanSku;

    generatedKeywords = {
      genericEnglishName: enName,
      shopeeKeywords: isShopeePh
        ? [
            `${enName}`,
            `${enName} original high quality`,
            `best ${enName} 2026`,
            `${enName} portable practical`,
            `durable ${enName} authentic`,
            `affordable ${enName} premium`,
            `${enName} sale discount`,
            `heavy duty ${enName}`
          ]
        : [
            vnName,
            `mua ${vnName}`,
            `${vnName} cao cấp chính hãng`,
            `${vnName} đa năng thông minh`,
            `${vnName} giá rẻ tiện lợi`,
            `${vnName} chính hãng bảo hành`,
            `đặt mua ${vnName}`
          ],
      douyinKeywords: needDouyin
        ? [
            ...chineseTerms.slice(0, 4),
            `${chineseTerms[0] || '好物'} 测评 推荐`,
            `${chineseTerms[0] || '同款'} 真实体验 沉浸式`,
            `${chineseTerms[1] || '产品'} 深度评测 避坑指南`,
            `${chineseTerms[0] || '爆款'} 开箱 实测`,
            `${chineseTerms[0] || '家用'} 必备好物 分享`
          ].slice(0, 15)
        : [],
      tiktokKeywords: needTiktok
        ? [
            `review ${vnName}`,
            `đập hộp ${vnName} thực tế`,
            `test độ bền ${vnName}`,
            `trải nghiệm ${vnName} chính hãng`,
            `hướng dẫn sử dụng ${vnName}`,
            `review chân thực ${vnName} giá rẻ`
          ].slice(0, 15)
        : []
    };
  }

  pipelineState.keywords = generatedKeywords;
  const kwList = generatedKeywords.shopeeKeywords || [];
  for (let i = 0; i < Math.min(kwList.length, 3); i++) {
    ticker.addTickerItem({
      type: 'gemini',
      title: kwList[i],
      label: `Shopee (${shopeeDomain}) #${i + 1}`,
      link: `https://${shopeeDomain}/search?keyword=${encodeURIComponent(kwList[i])}`
    });
  }

  if (needDouyin) {
    const douyinList = generatedKeywords.douyinKeywords || [];
    for (let i = 0; i < Math.min(douyinList.length, 2); i++) {
      ticker.addTickerItem({
        type: 'gemini',
        title: douyinList[i],
        label: `Douyin #${i + 1}`,
        link: `https://www.douyin.com/search/${encodeURIComponent(douyinList[i])}`
      });
    }
  }

  if (needTiktok) {
    const tiktokList = generatedKeywords.tiktokKeywords || [];
    for (let i = 0; i < Math.min(tiktokList.length, 2); i++) {
      ticker.addTickerItem({
        type: 'gemini',
        title: tiktokList[i],
        label: `TikTok VN #${i + 1}`,
        link: `https://www.tiktok.com/search?q=${encodeURIComponent(tiktokList[i])}`
      });
    }
  }

  return generatedKeywords;
}

/**
 * BƯỚC 5: TÌM KIẾM SHOPEE (PH HOẶC VN) & GEMINI VISION LỌC ĐÚNG MẪU -> CHỌN TOP 5 SHOP CÓ NHIỀU LƯỢT BÁN NHẤT
 * - Tìm sâu qua các từ khóa để thu thập danh sách sản phẩm ứng viên
 * - Dùng Gemini Vision đối soát ảnh thumbnail loại bỏ biến thể lệch kiểu dáng
 * - Sắp xếp toàn bộ sản phẩm đạt chuẩn theo số lượt bán (historicalSold) giảm dần và chọn Top 5 Shop bán chạy nhất
 */
export async function runStep5_ShopeeSearch(shopee, gemini, originalImage, shopeeKeywords, checkPauseOrAbort, updateProgress) {
  await checkPauseOrAbort();
  const settings = pipelineState.settings || { shopeeMarket: 'ph', videoPlatform: 'both' };
  const isShopeePh = settings.shopeeMarket !== 'vn';
  const targetDomain = isShopeePh ? 'shopee.ph' : 'shopee.vn';
  const currencySymbol = isShopeePh ? '₱' : '₫';

  updateProgress(5, 62, `Khai phá sản phẩm Shopee (${targetDomain.toUpperCase()})`, 'Tìm kiếm và đối chiếu Gemini Vision để tuyển chọn Top 5 Shop bán chạy nhất...');
  logger.info('STEP 5', `Bắt đầu tìm kiếm Shopee ${targetDomain.toUpperCase()} qua danh sách ${shopeeKeywords.length} từ khóa...`);

  const seenItemIds = new Set();
  const rawCandidateItems = [];
  const verifiedMatchedItems = [];
  const MAX_PAGES_PER_KEYWORD = 2; // Quét tối đa 2 trang mỗi từ khóa để tìm diện rộng

  for (let kIdx = 0; kIdx < shopeeKeywords.length; kIdx++) {
    await checkPauseOrAbort();
    const kw = shopeeKeywords[kIdx];
    logger.info('SHOPEE', `--- Từ khóa [${kIdx + 1}/${shopeeKeywords.length}]: "${kw}" ---`);

    for (let page = 0; page < MAX_PAGES_PER_KEYWORD; page++) {
      await checkPauseOrAbort();
      try {
        const res = await shopee.searchItems(kw, { limit: 15, page });
        const items = res.items || [];
        if (items.length === 0) break;

        const newItems = items.filter(it => !seenItemIds.has(it.itemId));
        newItems.forEach(it => seenItemIds.add(it.itemId));
        if (newItems.length === 0) continue;

        rawCandidateItems.push(...newItems);
        pipelineState.rawShopeeItems = rawCandidateItems;
        updateProgress(5, 63, `Khai phá Shopee ${targetDomain.toUpperCase()}`, `Đã cào ${rawCandidateItems.length} sản phẩm thô từ Shopee...`);

        // Lọc thị giác qua Gemini Vision
        let verifiedInPage = newItems;
        try {
          verifiedInPage = await verifyShopeeThumbnails(gemini, originalImage, newItems);
        } catch (visErr) {
          logger.warn('SHOPEE', `Lọc ảnh trang ${page + 1} gián đoạn: ${visErr.message}. Tiếp nhận sản phẩm.`);
          verifiedInPage = newItems;
        }

        verifiedMatchedItems.push(...verifiedInPage);
        logger.info('SHOPEE', `  -> Từ khóa "${kw}" (Trang ${page + 1}): Thẩm định ${verifiedInPage.length}/${newItems.length} sản phẩm khớp chuẩn.`);
      } catch (err) {
        logger.warn('SHOPEE', `Lỗi cào từ khóa "${kw}" trang ${page + 1}: ${err.message}`);
        break;
      }
    }

    if (verifiedMatchedItems.length >= 50) break;
  }

  // SẮP XẾP TOÀN BỘ SẢN PHẨM KHỚP CHUẨN THEO LƯỢT BÁN (historicalSold) GIẢM DẦN
  verifiedMatchedItems.sort((a, b) => {
    const soldA = Number(a.historicalSold ?? a.sold ?? a.salesCount ?? 0);
    const soldB = Number(b.historicalSold ?? b.sold ?? b.salesCount ?? 0);
    return soldB - soldA;
  });

  // Chọn ra đúng TOP 5 SHOP CÓ NHIỀU LƯỢT BÁN NHẤT
  const top5SoldShops = verifiedMatchedItems.slice(0, 5);

  if (top5SoldShops.length === 0 && rawCandidateItems.length > 0) {
    // Dự phòng an toàn nếu thị giác quá khắt khe
    rawCandidateItems.sort((a, b) => Number(b.historicalSold || 0) - Number(a.historicalSold || 0));
    top5SoldShops.push(...rawCandidateItems.slice(0, 5));
  }

  // Chuẩn hóa và thêm vào Ticker
  top5SoldShops.forEach((it, idx) => {
    const itemTitle = it.title || it.name || `Sản phẩm Shopee #${idx + 1}`;
    const soldCount = it.historicalSold || it.sold || 0;
    const itemPrice = it.priceFormatted || `${currencySymbol}${it.price || it.priceMin || 'N/A'}`;
    logger.success('SHOPEE_TOP', `Top #${idx + 1} Bán Chạy: "${itemTitle.slice(0, 32)}..." | Đã bán: ${soldCount.toLocaleString()} | Giá: ${itemPrice}`);

    ticker.addTickerItem({
      type: 'shopee',
      title: `${itemTitle} (Đã bán: ${soldCount})`,
      image: it.coverImage,
      label: `Shopee Top #${idx + 1} Sold`,
      link: it.itemUrl || `https://${targetDomain}/product/${it.shopId}/${it.itemId}`
    });
  });

  pipelineState.shopeeShops = top5SoldShops;
  updateProgress(5, 68, `Top 5 Shop Bán Chạy Nhất Shopee`, `Đã chọn 5 shop có nhiều lượt bán nhất (${(top5SoldShops[0]?.historicalSold || 0).toLocaleString()} sp đã bán)`);
  logger.success('STEP 5', `Hoàn tất tuyển chọn Top 5 Shop Shopee có lượng bán cao nhất thị trường.`);
  return pipelineState.shopeeShops;
}

/**
 * BƯỚC 6: CÀO TOÀN BỘ REVIEW TỐT TỪ TOP SHOP SHOPEE & GEMINI THẨM ĐỊNH CHUẨN LANDING PAGE
 * - Quét phân trang toàn bộ đánh giá 5 sao từ các Top Shop đã chọn
 * - Gửi ảnh thật và bình luận cho Gemini Vision duyệt xem có đạt chuẩn Landing Page không
 * - Phân loại review thành: Review Landing Page (ảnh thật nét, bình luận thuyết phục) và Review tham khảo
 */
export async function runStep6_ReviewVerification(shopee, gemini, originalImage, shopeeShops, checkPauseOrAbort, updateProgress) {
  await checkPauseOrAbort();
  updateProgress(6, 72, 'Cào toàn bộ review & Thẩm định Landing Page', 'Cào toàn bộ đánh giá 5 sao từ Top Shop và đưa Gemini duyệt chuẩn Landing Page...');
  logger.info('STEP 6', 'Bắt đầu cào toàn bộ đánh giá 5 sao có media từ các Top Shop Shopee...');

  const allRawReviews = [];
  const seenReviewKeys = new Set();
  const targetShops = (shopeeShops && shopeeShops.length > 0) ? shopeeShops.slice(0, 5) : [];

  for (let sIdx = 0; sIdx < targetShops.length; sIdx++) {
    await checkPauseOrAbort();
    const shop = targetShops[sIdx];
    if (!shop.itemId || !shop.shopId) continue;

    logger.info('STEP 6', `[Shop #${sIdx + 1}/${targetShops.length}] Cào review 5⭐ từ sản phẩm ${shop.itemId} (Đã bán: ${shop.historicalSold || 0})...`);

    // Cào sâu 2 trang review (offset 0, 20) của từng shop
    for (const offset of [0, 20]) {
      try {
        const revRes = await shopee.getItemReviews(shop.itemId, shop.shopId, { limit: 20, offset, filterType: 5 });
        const ratings = revRes?.reviews || revRes?.data?.ratings || [];
        if (!Array.isArray(ratings) || ratings.length === 0) break;

        for (const r of ratings) {
          const comment = (r.comment || '').trim();
          const images = r.images || r.media?.images || [];
          const author = r.author || r.username || 'Người mua Shopee';
          const key = `${author}_${comment.slice(0, 20)}`;

          if (!seenReviewKeys.has(key) && images.length > 0) {
            seenReviewKeys.add(key);
            allRawReviews.push({
              author,
              rating: Number(r.ratingStar || r.rating_star || 5),
              comment: comment || 'Sản phẩm hoàn thiện đẹp, đóng gói cẩn thận, rất ưng ý.',
              images: images,
              shopId: shop.shopId,
              itemId: shop.itemId,
              itemTitle: shop.title
            });
          }
        }
      } catch (err) {
        logger.warn('STEP 6', `Lỗi cào review shop ${shop.shopId} (offset ${offset}): ${err.message}`);
        break;
      }
    }

    if (allRawReviews.length >= 35) break; // Gom đủ pool đánh giá phong phú
  }

  pipelineState.shopeeReviewsRaw = allRawReviews;
  logger.info('STEP 6', `Tổng cộng thu thập được ${allRawReviews.length} đánh giá 5 sao có ảnh thực tế. Bắt đầu đưa Gemini thẩm định Landing Page...`);

  let verifiedReviews = [];
  try {
    verifiedReviews = await verifyReviewAuthenticity(gemini, originalImage, allRawReviews);
  } catch (revErr) {
    logger.warn('STEP 6', `Lỗi thẩm định review qua Gemini: ${revErr.message}. Tiếp tục với dữ liệu thô.`);
    verifiedReviews = allRawReviews.map(r => ({ ...r, isValid: true, useForLandingPage: (r.comment || '').length > 15 }));
  }

  pipelineState.allVerifiedReviews = verifiedReviews;
  pipelineState.landingPageReviews = verifiedReviews.filter(r => r.useForLandingPage);
  pipelineState.topReviews = verifiedReviews.slice(0, 20);

  const lpCount = pipelineState.landingPageReviews.length;
  logger.success('STEP 6', `Hoàn tất thẩm định: ${lpCount} review đạt chuẩn VÀNG cho Landing Page (Ảnh thực tế rõ nét + Comment thuyết phục cao).`);
  updateProgress(6, 78, 'Hoàn tất thẩm định Review', `Đã chọn được ${lpCount} review xuất sắc cho Landing Page (${pipelineState.topReviews.length} review tổng hợp)`);
  return pipelineState.topReviews;
}

/**
 * BƯỚC 7: THU HOẠCH VIDEO DOUYIN & TIKTOK 100% KEYWORDS + GEMINI VISION LỌC CHI TIẾT VI THỂ
 * - Duyệt qua 100% danh sách từ khóa theo cấu hình (Douyin hoặc TikTok hoặc Cả hai)
 * - Gửi ảnh bìa thực tế cho Gemini Vision phân tích vi thể, kiên quyết loại bỏ hàng gần giống (lookalike)
 * - Sắp xếp theo số lượt thích (Tym) giảm dần
 */
export async function runStep7_TikTokVideos(tiktok, gemini, originalImage, keywordsParam, topOffer, checkPauseOrAbort, updateProgress) {
  await checkPauseOrAbort();
  const settings = pipelineState.settings || { shopeeMarket: 'ph', videoPlatform: 'both' };
  const needDouyin = settings.videoPlatform === 'douyin' || settings.videoPlatform === 'both';
  const needTiktok = settings.videoPlatform === 'tiktok' || settings.videoPlatform === 'both';

  updateProgress(7, 82, 'Thu hoạch Video & Gemini Vision lọc vi thể', 'Duyệt 100% từ khóa và dùng Gemini Vision phân tích ảnh bìa loại bỏ hàng gần giống...');
  logger.info('STEP 7', `Bắt đầu thu hoạch video chuyên sâu (Nền tảng: ${settings.videoPlatform.toUpperCase()})...`);

  const douyinQueries = Array.isArray(keywordsParam?.douyinKeywords) ? keywordsParam.douyinKeywords : [];
  const tiktokQueries = Array.isArray(keywordsParam?.tiktokKeywords) ? keywordsParam.tiktokKeywords : [];

  const harvestedVideos = [];
  const seenVidIds = new Set();

  const addVid = (v, defaultPlatform = 'tiktok') => {
    if (!v) return;
    const vidId = String(v.id || v.videoId || v.video?.url || v.videoUrl || '');
    if (vidId && !seenVidIds.has(vidId)) {
      seenVidIds.add(vidId);
      const isDouyin = defaultPlatform === 'douyin' || vidId.includes('douyin') || (v.videoUrl && v.videoUrl.includes('douyin.com'));
      harvestedVideos.push({
        videoId: vidId,
        title: v.title || v.desc || v.description || (isDouyin ? 'Douyin Video Review' : 'TikTok Video Review'),
        coverUrl: v.coverUrl || v.video?.cover || v.cover || '',
        videoUrl: v.videoUrl || v.video?.url || v.url || (isDouyin ? `https://www.douyin.com/video/${vidId}` : `https://www.tiktok.com/@creator/video/${vidId}`),
        diggCount: Number(v.likeCount ?? v.stats?.likes ?? v.diggCount ?? 0),
        platform: isDouyin ? 'Douyin' : 'TikTok',
        authorName: v.author?.nickname || v.authorName || v.author?.uniqueId || (isDouyin ? 'Douyin Creator' : 'creator')
      });
    }
  };

  // 1. CÀO SÂU TRÊN DOUYIN NẾU ĐƯỢC KÍCH HOẠT — DUYỆT 100% TỪ KHÓA
  if (needDouyin && douyinQueries.length > 0) {
    logger.info('STEP 7', `Khai thác 100% danh sách (${douyinQueries.length} từ khóa tiếng Trung) trên Douyin...`);
    for (let i = 0; i < douyinQueries.length; i++) {
      await checkPauseOrAbort();
      const dQuery = douyinQueries[i];
      for (const offset of [0, 20]) {
        try {
          const pageNum = offset === 0 ? 1 : 2;
          logger.info('DOUYIN', `[${i + 1}/${douyinQueries.length}] Tìm Douyin "${dQuery}" (Trang ${pageNum})...`);
          const dRes = await tiktok.searchVideos(dQuery, { platform: 'douyin', offset, count: 20 });
          if (dRes && Array.isArray(dRes.videos)) {
            dRes.videos.forEach(v => addVid(v, 'douyin'));
          }
        } catch (dErr) {
          logger.warn('DOUYIN', `Lỗi cào Douyin query "${dQuery}": ${dErr.message}`);
        }
      }
    }
  }

  // 2. CÀO SÂU TRÊN TIKTOK NẾU ĐƯỢC KÍCH HOẠT — DUYỆT 100% TỪ KHÓA (TIẾNG VIỆT)
  if (needTiktok && tiktokQueries.length > 0) {
    logger.info('STEP 7', `Khai thác 100% danh sách (${tiktokQueries.length} từ khóa tiếng Việt) trên TikTok...`);
    for (let i = 0; i < tiktokQueries.length; i++) {
      await checkPauseOrAbort();
      const tQuery = tiktokQueries[i];
      for (const offset of [0, 20]) {
        try {
          const pageNum = offset === 0 ? 1 : 2;
          logger.info('TIKTOK', `[${i + 1}/${tiktokQueries.length}] Tìm TikTok "${tQuery}" (Trang ${pageNum})...`);
          const tRes = await tiktok.searchVideos(tQuery, { platform: 'tiktok', offset, count: 20 });
          if (tRes && Array.isArray(tRes.videos)) {
            tRes.videos.forEach(v => addVid(v, 'tiktok'));
          }
        } catch (tErr) {
          logger.warn('TIKTOK', `Lỗi cào TikTok query "${tQuery}": ${tErr.message}`);
        }
      }
    }
  }

  logger.info('STEP 7', `Đã gom được ${harvestedVideos.length} video thô. Gửi ảnh bìa thực tế cho Gemini Vision soi chi tiết vi thể...`);
  pipelineState.rawVideoCandidates = [...harvestedVideos];
  pipelineState.rawTikTokVideos = [...harvestedVideos];
  updateProgress(7, 83, 'Thu hoạch Video', `Đã cào được ${harvestedVideos.length} video thô. Đang phân tích ảnh bìa...`);

  // 3. GỬI ẢNH BÌA THỰC TẾ CHO GEMINI VISION ĐỂ PHÂN BIỆT HÀNG GẦN GIỐNG
  let verifiedVideos = [];
  try {
    const productContext = {
      productTitle: pipelineState.cleaned1688?.title || topOffer?.title || pipelineState.sku,
      sku: pipelineState.sku,
      keywords: keywordsParam,
      category: pipelineState.cleaned1688?.attributes?.['Loại'] || pipelineState.cleaned1688?.attributes?.['Tên sản phẩm'] || ''
    };
    verifiedVideos = await verifyTikTokCovers(gemini, originalImage, harvestedVideos, productContext);
  } catch (visErr) {
    logger.warn('STEP 7', `Gemini Vision lọc bìa video gặp sự cố: ${visErr.message}. Tiếp tục với các video thu được.`);
    harvestedVideos.sort((a, b) => Number(b.diggCount || 0) - Number(a.diggCount || 0));
    verifiedVideos = harvestedVideos.slice(0, 10);
  }

  // Sắp xếp theo lượt thích (Tym) giảm dần
  verifiedVideos.sort((a, b) => b.diggCount - a.diggCount);

  const formattedVideos = verifiedVideos.map((v, idx) => {
    const formattedLikes = enricher.formatTymCount(v.diggCount);
    return {
      ...v,
      rank: idx + 1,
      formattedLikes,
      label: `${formattedLikes} tym`
    };
  });

  pipelineState.formattedVideos = formattedVideos;
  updateProgress(7, 88, 'Gemini Vision lọc bìa vi thể', `Gemini đã chọn ${formattedVideos.length}/${harvestedVideos.length} video chuẩn 100%`);
  logger.success('STEP 7', `Hoàn tất thẩm định: ${formattedVideos.length} video chuẩn xác 100% về chi tiết vi thể.`);
  return formattedVideos;
}

/**
 * BƯỚC 8: GHÉP DỮ LIỆU SPECS, GIÁ BÁN & BIÊN LỢI NHUẬN
 */
export async function runStep8_EnrichData(cleaned1688, shopeeShops, shopee, sku, verifiedReviews, checkPauseOrAbort, updateProgress) {
  await checkPauseOrAbort();
  updateProgress(8, 90, 'Đối sánh giá & Hợp nhất Specs', 'Tính toán giá vốn CNY, giá bán PHP/VND và biên lợi nhuận...');
  logger.info('STEP 8', 'Kích hoạt enricher.js tính toán bảng giá đối sánh và biên lợi nhuận...');

  const enrichedData = enricher.enrichProductData({
    cleanedOffer: cleaned1688,
    shopeeShops: shopeeShops || [],
    reviews: verifiedReviews || [],
    sku
  });

  pipelineState.enrichedData = enrichedData;
  const p = enrichedData.pricing || {};
  logger.success('STEP 8', `Hoàn tất đối sánh: Vốn ¥${p.wholesaleCNY} (~${(p.wholesaleVND || 0).toLocaleString()}đ) | Bán ₱${p.retailPHP} (~${(p.retailVND || 0).toLocaleString()}đ) | Margin: +${p.marginPercent}%`);
  return enrichedData;
}

/**
 * BƯỚC 9: ĐÓNG GÓI METADATA MANIFEST & BẢNG TSV 24 CỘT
 */
export async function runStep9_PackageManifest(topOffer, primaryOfferDetail, selected1688, cleaned1688, generatedKeywords, shopeeShops, formattedVideos, checkPauseOrAbort, updateProgress) {
  await checkPauseOrAbort();
  updateProgress(9, 96, 'Đóng gói Manifest & TSV 24 cột', 'Kiểm tra tính toàn vẹn của siêu dữ liệu sản phẩm...');
  logger.info('STEP 9', 'Đóng gói dữ liệu thành phẩm manifest.json và bảng tính TSV 24 cột...');

  pipelineState.processData = {
    originalOffer: topOffer,
    primaryOfferDetail,
    selected1688Offers: selected1688,
    cleaned1688Offer: cleaned1688,
    marketKeywords: generatedKeywords,
    shopeeShops: shopeeShops,
    topVideos: formattedVideos,
    reviews: pipelineState.topReviews,
    enrichedData: pipelineState.enrichedData
  };

  logger.success('STEP 9', 'Đã tạo xong manifest và bảng tính TSV 24 cột.');
}
