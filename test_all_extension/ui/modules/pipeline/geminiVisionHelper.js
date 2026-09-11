/**
 * geminiVisionHelper.js — Multimodal Gemini Vision Helpers for Workflow Pipeline
 * Cung cấp các phương thức kiểm định thị giác tối ưu hóa tài nguyên (Batching):
 * 1. verify1688Thumbnails: Lọc ảnh thumbnail 1688 đúng sản phẩm gốc.
 * 2. detectComboTrapRatio: Kiểm định bộ ảnh Gallery để phát hiện bẫy bán Combo/SKU phụ.
 * 3. verifyShopeeThumbnails: Lọc ảnh sản phẩm Shopee theo đúng kiểu dáng ảnh gốc.
 * 4. verifyReviewAuthenticity: Thẩm định review người mua (Text + Ảnh thực tế, bỏ qua video).
 * 5. verifyTikTokCovers: Thẩm định ảnh bìa video TikTok có quay đúng sản phẩm.
 */

import * as logger from '../logger.js';

/**
 * Gọi Gemini Vision với Batch hình ảnh và nhận JSON phản hồi an toàn
 * @param {Object} gemini - GeminiExtensionSDK instance
 * @param {string} prompt
 * @param {Array<string>} images - [anchorImage, ...candidateImages]
 * @param {string} [model='3.8-flash']
 */
async function callGeminiVisionBatch(gemini, prompt, images = [], model = '3.8-flash') {
  if (!gemini) return null;

  try {
    let rawText = '';
    // Hỗ trợ cả generateMultimodal và models.generateContent
    if (typeof gemini.generateMultimodal === 'function') {
      const res = await gemini.generateMultimodal(prompt, images, { model });
      rawText = typeof res === 'string' ? res : (res?.text || '');
    } else if (gemini.models && typeof gemini.models.generateContent === 'function') {
      const res = await gemini.models.generateContent({ prompt, images, model });
      rawText = typeof res === 'string' ? res : (res?.text || '');
    } else if (typeof gemini.generateText === 'function') {
      // Fallback text nếu SDK chỉ hỗ trợ text
      const res = await gemini.generateText(prompt, { model });
      rawText = typeof res === 'string' ? res : (res?.text || '');
    }

    if (!rawText) return null;

    // Trích xuất JSON an toàn từ khối phản hồi (loại bỏ markdown codeblock ```json ... ```)
    let clean = rawText.trim();
    const mdMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (mdMatch) clean = mdMatch[1].trim();

    const firstBracket = clean.indexOf('[');
    const lastBracket = clean.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(clean.slice(firstBracket, lastBracket + 1));
      } catch {}
    }

    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(clean.slice(firstBrace, lastBrace + 1));
      } catch {}
    }

    return null;
  } catch (err) {
    logger.warn('GEMINI_VISION', `Gọi Vision thất bại (${err.message}). Tự động kích hoạt cơ chế lọc dự phòng.`);
    return null;
  }
}

/**
 * 1. Lọc Thumbnail 1688: Đối chiếu trực quan ảnh gốc với các thumbnail xưởng tìm được
 * @param {Object} gemini
 * @param {string} anchorImage - Ảnh sản phẩm gốc HD
 * @param {Array<Object>} candidateOffers - Mảng offer [{ offerId, title, imageUrl }]
 * @returns {Promise<Array<Object>>} Danh sách offer đã xác nhận đúng sản phẩm
 */
export async function verify1688Thumbnails(gemini, anchorImage, candidateOffers = []) {
  if (!candidateOffers || candidateOffers.length === 0) return [];
  const validCandidates = candidateOffers.filter(c => c.imageUrl);
  if (validCandidates.length === 0) return candidateOffers;

  const candidateImages = validCandidates.map(c => c.imageUrl);
  const prompt = `
SYSTEM: Bạn là Chuyên gia Giám định Hình ảnh E-Commerce.
[Ảnh 0]: Ảnh sản phẩm gốc tham chiếu (Anchor Reference Image).
[Ảnh 1 đến ${candidateImages.length}]: Các ảnh thumbnail từ 1688.

NHIỆM VỤ:
So sánh [Ảnh 0] với từng ảnh thumbnail.
Xác định xem ảnh thumbnail có thực sự là CÙNG MỘT SẢN PHẨM / KIỂU DÁNG với [Ảnh 0] hay không.
BỎ QUA nếu là phụ kiện (dây, hộp, linh kiện thay thế) hoặc sản phẩm khác loại.

TRẢ VỀ DUY NHẤT 1 MẢNG JSON HỢP LỆ (không kèm giải thích markdown):
[
  { "index": 1, "isMatch": true },
  { "index": 2, "isMatch": false }
]
`.trim();

  const visionResults = await callGeminiVisionBatch(gemini, prompt, [anchorImage, ...candidateImages]);

  if (Array.isArray(visionResults) && visionResults.length > 0) {
    const matchIndices = new Set(
      visionResults
        .filter(r => r.isMatch === true || r.isMatch === 'true')
        .map(r => Number(r.index) - 1)
    );

    const verified = validCandidates.filter((_, idx) => matchIndices.has(idx));
    logger.info('VISION_1688', `Gemini Vision xác thực: ${verified.length}/${validCandidates.length} ảnh khớp sản phẩm gốc.`);
    if (verified.length > 0) return verified;
  }

  // Fallback an toàn: Trả về danh sách ứng viên hợp lệ nếu Gemini gặp trục trặc
  return validCandidates;
}

/**
 * 2. Chống Bẫy Combo / SKU Phụ 1688: Đếm tỷ lệ ảnh sản phẩm trong bộ ảnh Gallery
 * @param {Object} gemini
 * @param {string} anchorImage - Ảnh sản phẩm gốc
 * @param {Array<string>} galleryImages - Mảng link ảnh trong trang chi tiết xưởng
 * @returns {Promise<{ isSingleProduct: boolean, ratio: number }>}
 */
export async function detectComboTrapRatio(gemini, anchorImage, galleryImages = []) {
  if (!galleryImages || galleryImages.length <= 2) {
    return { isSingleProduct: true, ratio: 1.0 };
  }

  // Lấy tối đa 6 ảnh tiêu biểu để không làm nặng payload
  const sampleImages = galleryImages.slice(0, 6);
  const prompt = `
SYSTEM: Bạn là Chuyên gia Thẩm định Gian hàng Xưởng 1688.
[Ảnh 0]: Ảnh sản phẩm gốc cần đặt sỉ.
[Ảnh 1 đến ${sampleImages.length}]: Bộ ảnh chi tiết cào được từ xưởng 1688.

NHIỆM VỤ:
Đếm số lượng ảnh THỰC SỰ CHỨA SẢN PHẨM GỐC [Ảnh 0].
Nếu sản phẩm gốc chỉ xuất hiện trong 1-2 ảnh, còn lại là các sản phẩm khác hoặc đồ gia dụng linh tinh -> Đây là shop bán Combo tạp hóa (Combo Trap).

TRẢ VỀ DUY NHẤT 1 JSON HỢP LỆ:
{
  "matchingCount": 5,
  "totalChecked": ${sampleImages.length},
  "ratio": 0.83,
  "isSingleProduct": true
}
`.trim();

  const res = await callGeminiVisionBatch(gemini, prompt, [anchorImage, ...sampleImages]);
  if (res && typeof res.ratio === 'number') {
    const isSingle = res.ratio >= 0.3;
    logger.info('COMBO_CHECK', `Tỷ lệ ảnh sản phẩm trong Gallery: ${Math.round(res.ratio * 100)}% -> ${isSingle ? 'XƯỞNG CHUYÊN SÂU' : 'BẪY BÁN COMBO / SKU PHỤ'}`);
    return { isSingleProduct: isSingle, ratio: res.ratio };
  }

  return { isSingleProduct: true, ratio: 1.0 };
}

/**
 * 3. Lọc Thumbnail Shopee: Chọn đúng mẫu sản phẩm mục tiêu thay vì lấy các mã khác do từ khóa generic
 * @param {Object} gemini
 * @param {string} anchorImage
 * @param {Array<Object>} shopeeItems - Mảng [{ itemId, name, coverImage, price }]
 * @returns {Promise<Array<Object>>}
 */
export async function verifyShopeeThumbnails(gemini, anchorImage, shopeeItems = []) {
  if (!shopeeItems || shopeeItems.length === 0) return [];
  const validItems = shopeeItems.filter(it => it.coverImage);
  if (validItems.length === 0) return shopeeItems;

  const sampleItems = validItems.slice(0, 10);
  const candidateImages = sampleItems.map(it => it.coverImage);

  const prompt = `
SYSTEM: Bạn là Chuyên gia Giám định Sản phẩm Shopee.
[Ảnh 0]: Ảnh sản phẩm gốc mục tiêu.
[Ảnh 1 đến ${candidateImages.length}]: Ảnh sản phẩm tìm được trên Shopee qua từ khóa chung.

NHIỆM VỤ:
Vì từ khóa chung có thể ra nhiều mã hàng khác loại (vd: bóng đèn có cả trăm mã), hãy đối chiếu trực quan từng ảnh với [Ảnh 0] để chọn ra ĐÚNG sản phẩm mục tiêu.

TRẢ VỀ DUY NHẤT 1 MẢNG JSON HỢP LỆ:
[
  { "index": 1, "isMatch": true },
  { "index": 2, "isMatch": false }
]
`.trim();

  const visionResults = await callGeminiVisionBatch(gemini, prompt, [anchorImage, ...candidateImages]);

  if (Array.isArray(visionResults) && visionResults.length > 0) {
    const matchIndices = new Set(
      visionResults
        .filter(r => r.isMatch === true || r.isMatch === 'true')
        .map(r => Number(r.index) - 1)
    );

    const verified = sampleItems.filter((_, idx) => matchIndices.has(idx));
    logger.info('VISION_SHOPEE', `Gemini Vision xác thực Shopee: ${verified.length}/${sampleItems.length} sản phẩm khớp chuẩn.`);
    if (verified.length > 0) return verified;
  }

  return validItems;
}

/**
 * 4. Thẩm định Review Shopee: Dùng Text + Ảnh chụp người mua (BỎ QUA VIDEO để tối ưu tài nguyên)
 * @param {Object} gemini
 * @param {string} anchorImage
 * @param {Array<Object>} rawReviews - Mảng review [{ author, comment, images }]
 * @returns {Promise<Array<Object>>} Top review chân thực đạt 5 sao
 */
export async function verifyReviewAuthenticity(gemini, anchorImage, rawReviews = []) {
  if (!rawReviews || rawReviews.length === 0) return [];

  // Lọc thô các review có nội dung và có ảnh chụp thực tế
  const candidateReviews = rawReviews.filter(r => r.comment && r.images && r.images.length > 0);
  if (candidateReviews.length === 0) return rawReviews.slice(0, 10);

  const sampleReviews = candidateReviews.slice(0, 8);
  // Chỉ lấy ảnh đầu tiên của mỗi review, BỎ QUA HOÀN TOÀN VIDEO để tiết kiệm token
  const reviewPhotos = sampleReviews.map(r => r.images[0]);

  const reviewTextList = sampleReviews.map((r, i) => `[Review #${i + 1}] (${r.author}): "${r.comment}"`).join('\n');

  const prompt = `
SYSTEM: Bạn là Chuyên gia Thẩm định Tính Chân thực Đánh giá Khách hàng (E-Commerce Review Auditor).
[Ảnh 0]: Ảnh sản phẩm gốc cần đánh giá.
[Ảnh 1 đến ${reviewPhotos.length}]: Ảnh chụp thực tế của người mua kèm trong review.

DANH SÁCH BÌNH LUẬN:
${reviewTextList}

NHIỆM VỤ:
1. Đối chiếu xem ảnh chụp và lời nhận xét có thực sự nói về và chụp đúng sản phẩm [Ảnh 0] không.
2. Loại bỏ các review spam ảnh đen/ảnh đồ ăn để nhận xu, review phàn nàn giao hàng, hoặc gửi nhầm sản phẩm khác.

TRẢ VỀ DUY NHẤT 1 MẢNG JSON HỢP LỆ chứa các index đạt chuẩn chất lượng cao:
[
  { "index": 1, "isValid": true },
  { "index": 2, "isValid": false }
]
`.trim();

  const res = await callGeminiVisionBatch(gemini, prompt, [anchorImage, ...reviewPhotos]);

  if (Array.isArray(res) && res.length > 0) {
    const validIndices = new Set(
      res
        .filter(r => r.isValid === true || r.isValid === 'true')
        .map(r => Number(r.index) - 1)
    );

    const verified = sampleReviews.filter((_, idx) => validIndices.has(idx));
    logger.info('REVIEW_AUDIT', `Gemini thẩm định review: ${verified.length}/${sampleReviews.length} review đạt chuẩn chân thực.`);
    if (verified.length > 0) return verified;
  }

  return candidateReviews.slice(0, 10);
}

/**
 * 5. Xác thực Thị giác Video TikTok/Douyin: Kiểm tra ảnh cover thumbnail có quay đúng sản phẩm
 * @param {Object} gemini
 * @param {string} anchorImage
 * @param {Array<Object>} candidateVideos - Mảng video [{ videoId, title, coverUrl, diggCount, authorName, platform }]
 * @returns {Promise<Array<Object>>}
 */
export async function verifyTikTokCovers(gemini, anchorImage, candidateVideos = []) {
  if (!candidateVideos || candidateVideos.length === 0) return [];
  const validVids = candidateVideos.filter(v => v.coverUrl);
  if (validVids.length === 0) return candidateVideos;

  const CHUNK_SIZE = 8;
  const verifiedAll = [];

  for (let cIdx = 0; cIdx < validVids.length; cIdx += CHUNK_SIZE) {
    const chunk = validVids.slice(cIdx, cIdx + CHUNK_SIZE);
    const coverImages = chunk.map(v => v.coverUrl);

    const prompt = `
SYSTEM: Bạn là Chuyên gia Giám định & Phân tích Thị giác Video Sản phẩm (TikTok & Douyin Video Auditor).
[Ảnh 0]: Ảnh sản phẩm mục tiêu tham chiếu (Anchor Reference Image).
[Ảnh 1 đến ${coverImages.length}]: Ảnh bìa (Cover Thumbnail) cào được từ các video TikTok/Douyin.

NHIỆM VỤ CỐT LÕI:
1. Đối chiếu trực quan từng ảnh bìa video với [Ảnh 0].
2. Xác định xem ảnh bìa video có thực sự xuất hiện hoặc quay sản phẩm mục tiêu [Ảnh 0] hay không.
3. LOẠI BỎ các video chỉ câu view bằng mặt người nhảy múa/nói chuyện, hình nền phong cảnh, hoặc quay sản phẩm khác không liên quan.

TRẢ VỀ DUY NHẤT 1 MẢNG JSON HỢP LỆ (không kèm giải thích markdown):
[
  { "index": 1, "isRelevant": true, "reason": "Xuất hiện đúng sản phẩm mục tiêu" },
  { "index": 2, "isRelevant": false, "reason": "Không thấy sản phẩm / Chỉ có mặt người" }
]
`.trim();

    const chunkNum = Math.floor(cIdx / CHUNK_SIZE) + 1;
    const totalChunks = Math.ceil(validVids.length / CHUNK_SIZE);
    logger.info('VISION_TIKTOK', `Đang gửi ${coverImages.length} thumbnail video (nhóm ${chunkNum}/${totalChunks}) cho Gemini Vision phân tích trực quan...`);

    try {
      const res = await callGeminiVisionBatch(gemini, prompt, [anchorImage, ...coverImages]);
      if (Array.isArray(res) && res.length > 0) {
        const matchIndices = new Set();
        res.forEach(r => {
          const idx = Number(r.index) - 1;
          const isMatch = r.isRelevant === true || r.isRelevant === 'true';
          if (idx >= 0 && idx < chunk.length) {
            chunk[idx].visionReason = r.reason || (isMatch ? 'Khớp sản phẩm gốc' : 'Không liên quan');
            if (isMatch) {
              matchIndices.add(idx);
              logger.info('VISION_TIKTOK', `  ✓ Video [${chunk[idx].platform || 'video'}] (@${chunk[idx].authorName || 'creator'}): Gemini Vision xác nhận [${chunk[idx].visionReason}]`);
            } else {
              logger.info('VISION_TIKTOK', `  ✗ Video [${chunk[idx].platform || 'video'}] (@${chunk[idx].authorName || 'creator'}): Loại bỏ [${chunk[idx].visionReason}]`);
            }
          }
        });
        const verifiedChunk = chunk.filter((_, idx) => matchIndices.has(idx));
        verifiedAll.push(...verifiedChunk);
      } else {
        verifiedAll.push(...chunk);
      }
    } catch (chunkErr) {
      logger.warn('VISION_TIKTOK', `Lỗi batch ${chunkNum} Vision video: ${chunkErr.message}. Tiếp nhận các video của nhóm này.`);
      verifiedAll.push(...chunk);
    }
  }

  logger.success('VISION_TIKTOK', `Gemini Vision hoàn tất phân tích: ${verifiedAll.length}/${validVids.length} video quay đúng sản phẩm mục tiêu.`);
  return verifiedAll.length > 0 ? verifiedAll : validVids;
}

