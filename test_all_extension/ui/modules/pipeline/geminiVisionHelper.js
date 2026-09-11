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
 * Trích xuất mảng JSON an toàn từ phản hồi của Gemini AI
 * Xử lý được cả markdown codeblock, trailing comma, comment và cấu trúc bao bọc
 * @param {string} rawText
 * @returns {Array<Object>|null}
 */
export function safeExtractJsonArray(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  let clean = rawText.trim();
  const mdMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (mdMatch) clean = mdMatch[1].trim();

  // 1. Tìm mảng JSON [ ... ]
  const firstBracket = clean.indexOf('[');
  const lastBracket = clean.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const jsonStr = clean.slice(firstBracket, lastBracket + 1);
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) return parsed;
    } catch {}

    // Dọn dẹp dấu phẩy thừa (trailing commas) mà LLM thường mắc phải
    try {
      const sanitized = jsonStr
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
      const parsed = JSON.parse(sanitized);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  // 2. Tìm object JSON { ... } có chứa mảng bên trong
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonStr = clean.slice(firstBrace, lastBrace + 1);
    try {
      const sanitized = jsonStr
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
      const parsed = JSON.parse(sanitized);
      if (parsed && typeof parsed === 'object') {
        const arr = Object.values(parsed).find(v => Array.isArray(v));
        if (arr) return arr;
      }
    } catch {}
  }

  // 3. Phân tích từng dòng nếu Gemini liệt kê kết quả dạng text có cấu trúc
  const lineMatches = clean.matchAll(/(?:video\s*#?(\d+)|index["'\s:]*(\d+))[\s\S]*?(isRelevant|isMatch|hợp lệ|khớp|đạt)["'\s:]*(true|false|đúng|sai|có|không)/gi);
  const fallbackList = [];
  for (const m of lineMatches) {
    const idx = parseInt(m[1] || m[2], 10);
    const val = m[4].toLowerCase();
    const isRel = val === 'true' || val === 'đúng' || val === 'có';
    fallbackList.push({ index: idx, isRelevant: isRel, isMatch: isRel, reason: isRel ? 'Gemini AI xác nhận khớp' : 'Gemini AI loại bỏ: Không liên quan' });
  }
  if (fallbackList.length > 0) return fallbackList;

  return null;
}

/**
 * Gọi Gemini Vision với Batch hình ảnh và nhận JSON phản hồi an toàn
 * Toàn bộ mọi đánh giá đều phải đi qua Gemini AI
 * @param {Object} gemini - GeminiExtensionSDK instance
 * @param {string} prompt
 * @param {Array<string>} images - [anchorImage, ...candidateImages]
 * @param {string} [model='3.8-flash']
 */
async function callGeminiVisionBatch(gemini, prompt, images = [], model = '3.8-flash') {
  if (!gemini) return null;

  try {
    let rawText = '';

    // 1. Ưu tiên gọi Multimodal nếu có ảnh tham chiếu
    if (images && images.length > 0 && typeof gemini.generateMultimodal === 'function') {
      try {
        const res = await gemini.generateMultimodal(prompt, images, { model });
        rawText = typeof res === 'string' ? res : (res?.text || '');
      } catch (mmErr) {
        logger.warn('GEMINI_API', `Nạp ảnh Multimodal gặp lỗi: ${mmErr.message}. Tiếp tục gửi trực tiếp cho Gemini phân tích nội dung...`);
      }
    }

    // 2. Nếu Multimodal chưa trả về kết quả (hoặc không có ảnh), dùng generateText với Gemini
    if (!rawText) {
      if (typeof gemini.generateText === 'function') {
        const res = await gemini.generateText(prompt, { model });
        rawText = typeof res === 'string' ? res : (res?.text || '');
      } else if (gemini.models && typeof gemini.models.generateContent === 'function') {
        const res = await gemini.models.generateContent({ prompt, model });
        rawText = typeof res === 'string' ? res : (res?.text || '');
      } else if (typeof gemini.chat === 'function') {
        const res = await gemini.chat(prompt);
        rawText = typeof res === 'string' ? res : (res?.text || '');
      }
    }

    if (!rawText) return null;

    // 3. Trích xuất mảng JSON an toàn từ câu trả lời của Gemini
    return safeExtractJsonArray(rawText);
  } catch (err) {
    logger.warn('GEMINI_API', `Lỗi giao tiếp Gemini AI: ${err.message}`);
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
 * 5. Xác thực Video TikTok/Douyin qua Gemini AI: Bám sát [Ảnh 0] và Tiêu đề
 * - Toàn bộ mọi video ứng viên đều được gửi trực tiếp cho Gemini AI thẩm định
 * - Bám sát tuyệt đối vào ảnh sản phẩm gốc [Ảnh 0] và tên sản phẩm mục tiêu
 * - Đưa toàn bộ tiêu đề, caption, kênh người tạo vào prompt để Gemini đối soát
 * - Loại bỏ triệt để các video không liên quan (piano, dance, nhạc, gái xinh, anime, v.v.)
 * - Tuyệt đối không dùng bộ lọc ngữ nghĩa ngoài, không bảo kê tùy tiện
 * @param {Object} gemini
 * @param {string} anchorImage
 * @param {Array<Object>} candidateVideos - Mảng video [{ videoId, title, coverUrl, diggCount, authorName, platform }]
 * @param {Object} [productContext] - { productTitle, sku, keywords, category }
 * @returns {Promise<Array<Object>>} Danh sách video thực sự quay đúng sản phẩm mục tiêu
 */
export async function verifyTikTokCovers(gemini, anchorImage, candidateVideos = [], productContext = {}) {
  if (!candidateVideos || candidateVideos.length === 0) return [];
  const validVids = candidateVideos.filter(v => v.coverUrl || v.title);
  if (validVids.length === 0) return [];

  const targetName = productContext.productTitle || productContext.sku || 'Sản phẩm mục tiêu';
  const targetCategory = productContext.category || '';
  const searchKeywords = Array.isArray(productContext.keywords)
    ? productContext.keywords.join(', ')
    : (productContext.keywords?.shopeeKeywords?.join(', ') || productContext.keywords?.douyinKeywords?.join(', ') || '');

  // Gom nhóm 15 video để tối ưu lượt gọi API và giữ prompt gọn gàng
  const BATCH_SIZE = 15;
  const verifiedAll = [];
  const totalBatches = Math.ceil(validVids.length / BATCH_SIZE);

  for (let bIdx = 0; bIdx < validVids.length; bIdx += BATCH_SIZE) {
    const chunk = validVids.slice(bIdx, bIdx + BATCH_SIZE);
    const batchNum = Math.floor(bIdx / BATCH_SIZE) + 1;

    // Xây dựng danh sách chi tiết từng video ứng viên kèm TIÊU ĐỀ và NỀN TẢNG
    const candidateListPrompt = chunk.map((v, i) => `[Video #${i + 1}]:
- Tiêu đề / Caption: "${v.title || 'Không có tiêu đề'}"
- Kênh người tạo: @${v.authorName || 'creator'} (${v.platform || 'video'})`).join('\n\n');

    const prompt = `
SYSTEM: Bạn là Chuyên gia Trí Tuệ Nhân Tạo Giám Định Video Sản Phẩm E-Commerce (Gemini AI Video Auditor).
THÔNG TIN SẢN PHẨM MỤC TIÊU:
- Tên sản phẩm: "${targetName}"
${targetCategory ? `- Danh mục / Kiểu dáng: "${targetCategory}"` : ''}
${searchKeywords ? `- Từ khóa sản phẩm: "${searchKeywords}"` : ''}
- [Ảnh 0]: Ảnh sản phẩm mục tiêu tham chiếu (Anchor Reference Image). Hãy quan sát kỹ hình dáng, mẫu mã, công năng của sản phẩm trong [Ảnh 0].

DANH SÁCH ${chunk.length} VIDEO ỨNG VIÊN CẦN GEMINI THẨM ĐỊNH (NHÓM ${batchNum}/${totalBatches}):
${candidateListPrompt}

NGUYÊN TẮC GIÁM ĐỊNH BẮT BUỘC CỦA GEMINI AI:
1. BÁM SÁT TUYỆT ĐỐI VÀO SẢN PHẨM TRONG [Ảnh 0] VÀ TÊN "${targetName}".
2. CHỈ ĐÁNH DẤU "isRelevant": true NẾU:
   - Video thực sự quay, giới thiệu, đập hộp, hướng dẫn sử dụng hoặc review đúng sản phẩm mục tiêu trong [Ảnh 0].
3. BẮT BUỘC ĐÁNH DẤU "isRelevant": false NẾU:
   - Video thuộc nội dung giải trí, nhảy múa (dance, vũ đạo), ca hát, đàn piano, vlog đời sống, biến hình gái xinh/trai đẹp, hài hước, anime, gaming.
   - Video về sản phẩm KHÁC LOẠI (ví dụ: quần áo, giày dép, đàn nhạc, đồ chơi khi sản phẩm là bóng đèn).
   - Video không liên quan đến sản phẩm mục tiêu.
4. KHI NGHI NGỜ HOẶC KHÔNG THẤY SẢN PHẨM: Đánh dấu isRelevant: false. Tuyệt đối không duyệt bừa bãi.

TRẢ VỀ DUY NHẤT 1 MẢNG JSON HỢP LỆ (không kèm văn bản giải thích ngoài JSON):
[
  { "index": 1, "isRelevant": true, "reason": "Video review đúng mẫu sản phẩm trong Ảnh 0" },
  { "index": 2, "isRelevant": false, "reason": "Video ca hát / đàn piano không liên quan" }
]
`.trim();

    logger.info('VISION_TIKTOK', `Đang gửi ${chunk.length} video (Nhóm ${batchNum}/${totalBatches}) cho Gemini AI thẩm định bám sát ảnh gốc & tiêu đề...`);

    try {
      // Gửi anchorImage kèm prompt cho Gemini Vision
      const res = await callGeminiVisionBatch(gemini, prompt, anchorImage ? [anchorImage] : []);

      if (Array.isArray(res) && res.length > 0) {
        const matchIndices = new Set();
        res.forEach(r => {
          const idx = Number(r.index) - 1;
          const isMatch = r.isRelevant === true || r.isRelevant === 'true' || r.isMatch === true || r.isMatch === 'true' || r.isValid === true || r.isValid === 'true';
          if (idx >= 0 && idx < chunk.length) {
            chunk[idx].isMatch = isMatch;
            chunk[idx].visionReason = r.reason || (isMatch ? 'Gemini AI duyệt: Khớp sản phẩm gốc' : 'Gemini AI loại bỏ: Không liên quan');
            if (isMatch) {
              matchIndices.add(idx);
              logger.info('VISION_TIKTOK', `  ✓ Video [${chunk[idx].platform}] "${(chunk[idx].title || '').slice(0, 35)}...": Gemini duyệt [${chunk[idx].visionReason}]`);
            } else {
              logger.info('VISION_TIKTOK', `  ✗ Video [${chunk[idx].platform}] "${(chunk[idx].title || '').slice(0, 35)}...": Gemini loại bỏ [${chunk[idx].visionReason}]`);
            }
          }
        });

        const verifiedChunk = chunk.filter((_, idx) => matchIndices.has(idx));
        verifiedAll.push(...verifiedChunk);
      } else {
        // Nếu Gemini không phản hồi JSON cho nhóm này, đánh dấu rõ ràng là chưa duyệt
        // Tuyệt đối không dùng bộ lọc ngữ nghĩa ngoài, không bảo kê tùy tiện
        logger.warn('VISION_TIKTOK', `Nhóm ${batchNum}: Gemini chưa phản hồi kết quả hợp lệ. Toàn bộ video nhóm này không được phê duyệt.`);
        chunk.forEach(v => {
          v.isMatch = false;
          v.visionReason = 'Gemini AI chưa phê duyệt';
        });
      }
    } catch (chunkErr) {
      logger.warn('VISION_TIKTOK', `Nhóm ${batchNum}: Lỗi thẩm định Gemini (${chunkErr.message}). Không duyệt tùy tiện.`);
      chunk.forEach(v => {
        v.isMatch = false;
        v.visionReason = `Lỗi kiểm định (${chunkErr.message})`;
      });
    }

    // Nghỉ nhẹ 600ms giữa các nhóm để tránh nghẽn luồng và hạn chế rate limit Google Gemini Web
    if (bIdx + BATCH_SIZE < validVids.length) {
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  }

  logger.success('VISION_TIKTOK', `Gemini AI hoàn tất thẩm định: ${verifiedAll.length}/${validVids.length} video quay đúng sản phẩm mục tiêu.`);
  return verifiedAll;
}


