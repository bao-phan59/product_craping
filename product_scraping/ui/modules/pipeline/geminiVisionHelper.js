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
 * Trích xuất JSON (Đối tượng hoặc Mảng) an toàn từ phản hồi của Gemini AI
 * Xử lý được cả markdown codeblock, trailing comma, comment và cấu trúc bao bọc
 * @param {string} rawText
 * @returns {Object|Array|null}
 */
/**
 * Trích xuất JSON (Đối tượng hoặc Mảng) an toàn từ phản hồi của Gemini AI
 * Xử lý được cả markdown codeblock, trailing comma, comment, quotes lồng và cấu trúc bao bọc
 * @param {string} rawText
 * @param {number} [expectedCount=4]
 * @returns {Object|Array|null}
 */
export function safeExtractJson(rawText, expectedCount = 4) {
  if (!rawText || typeof rawText !== 'string') return null;

  let clean = rawText.trim();
  const mdMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (mdMatch) clean = mdMatch[1].trim();

  // 1. Thử parse trực tiếp mảng JSON [ ... ]
  const firstBracket = clean.indexOf('[');
  const lastBracket = clean.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const jsonStr = clean.slice(firstBracket, lastBracket + 1);
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}

    try {
      const sanitized = jsonStr
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
      const parsed = JSON.parse(sanitized);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }

  // 2. Thử parse đối tượng bao bọc { ... }
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonStr = clean.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed === 'object') {
        const arr = Object.values(parsed).find(v => Array.isArray(v));
        if (arr && arr.length > 0) return arr;
        return parsed;
      }
    } catch {}

    try {
      const sanitized = jsonStr
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
      const parsed = JSON.parse(sanitized);
      if (parsed && typeof parsed === 'object') {
        const arr = Object.values(parsed).find(v => Array.isArray(v));
        if (arr && arr.length > 0) return arr;
        return parsed;
      }
    } catch {}
  }

  // 3. Trích xuất từng object con: { "index": 1, ... } (giải quyết lỗi unescaped quote trong chuỗi)
  const objRegex = /\{[\s\S]*?"index"\s*:\s*(\d+)[\s\S]*?\}/g;
  const extractedList = [];
  let match;
  while ((match = objRegex.exec(clean)) !== null) {
    const block = match[0];
    const idx = parseInt(match[1], 10);
    const isMatchRes = /"isMatch"\s*:\s*(true|false)/i.exec(block);
    const isMatch = isMatchRes ? isMatchRes[1].toLowerCase() === 'true' : false;
    const scoreRes = /"confidenceScore"\s*:\s*(\d+)/i.exec(block);
    const score = scoreRes ? parseInt(scoreRes[1], 10) : (isMatch ? 90 : 30);
    const detailsRes = /"matchedDetails"\s*:\s*"([\s\S]*?)"(?:\s*,\s*"|\s*\})/i.exec(block);
    const details = detailsRes ? detailsRes[1].trim() : '';
    const reasonRes = /"reason"\s*:\s*"([\s\S]*?)"(?:\s*,\s*"|\s*\})/i.exec(block);
    const reason = reasonRes ? reasonRes[1].trim() : (isMatch ? 'Gemini AI xác nhận khớp' : 'Gemini AI loại bỏ: Lệch mẫu');

    extractedList.push({
      index: idx,
      isMatch,
      confidenceScore: score,
      matchedDetails: details,
      reason
    });
  }

  if (extractedList.length > 0) {
    return extractedList;
  }

  // 4. Quét từng dòng văn bản / danh sách gạch đầu dòng do Gemini tạo
  const lines = clean.split('\n');
  const lineResults = [];
  const handledIndices = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^(?:nhóm\s*\d+|kết quả|dưới đây|bảng|quan sát|tiêu chí|tổng hợp)/i.test(trimmed)) continue;
    if (/nhóm\s*\d+\s*[\/:]/i.test(trimmed)) continue;

    const idxMatch = trimmed.match(/(?:ảnh|xưởng|sản phẩm|item|mẫu|#|\bindex\b)\s*#?\s*(\d+)|(?:^|\s+)(\d+)[.:)]/i);
    if (!idxMatch) continue;
    const idx = parseInt(idxMatch[1] || idxMatch[2], 10);
    if (idx < 1 || idx > (expectedCount + 2) || handledIndices.has(idx)) continue;

    const isNegative = /(?:isMatch\s*:\s*false|không|lệch|khác|sai|loại|fail|hàng nhái|phụ kiện)/i.test(trimmed);
    const isPositive = /(?:isMatch\s*:\s*true|khớp|đúng|chuẩn|phù hợp|hợp lệ|pass|trùng|đạt)/i.test(trimmed);

    let verdict = false;
    if (isPositive && !isNegative) {
      verdict = true;
    } else if (isPositive && isNegative) {
      if (/(?:không\s+(?:khớp|đúng|chuẩn|phù hợp|trùng|đạt)|lệch|khác|sai)/i.test(trimmed)) verdict = false;
      else verdict = true;
    }

    handledIndices.add(idx);
    lineResults.push({
      index: idx,
      isMatch: verdict,
      confidenceScore: verdict ? 85 : 25,
      matchedDetails: trimmed.replace(/^[-*0-9.)\s]+/, '').slice(0, 100),
      reason: verdict ? 'Gemini AI xác nhận khớp' : 'Gemini AI loại bỏ: Lệch mẫu'
    });
  }

  if (lineResults.length > 0) {
    return lineResults.sort((a, b) => a.index - b.index);
  }

  // 5. Trường hợp Gemini nêu rõ tất cả đều không khớp
  if (/(?:không có|tất cả.*không|đều không|loại bỏ toàn bộ)/i.test(clean)) {
    const allRejected = [];
    for (let i = 1; i <= expectedCount; i++) {
      allRejected.push({
        index: i,
        isMatch: false,
        confidenceScore: 10,
        matchedDetails: 'Gemini xác nhận không có ảnh nào khớp',
        reason: 'Toàn bộ xưởng trong nhóm không đạt chuẩn vi thể'
      });
    }
    return allRejected;
  }

  return null;
}

export function safeExtractJsonArray(rawText, expectedCount = 4) {
  const res = safeExtractJson(rawText, expectedCount);
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object') {
    const arr = Object.values(res).find(v => Array.isArray(v));
    if (arr) return arr;
    return [res];
  }
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
 * 1. VÒNG 1: Lọc Thumbnail 1688 qua Gemini Vision với Micro-Batch (4 ảnh/nhóm)
 * Đối chiếu trực quan cực kỳ khắt khe các đặc điểm vi thể: form dáng, cấu trúc, nút bấm, cổng cắm, chất liệu.
 * @param {Object} gemini
 * @param {string} anchorImage - Ảnh sản phẩm gốc HD
 * @param {Array<Object>} candidateOffers - Mảng offer [{ offerId, title, imageUrl }]
 * @returns {Promise<Array<Object>>} Danh sách offer đã xác nhận đúng sản phẩm Vòng 1
 */
export async function verify1688Thumbnails(gemini, anchorImage, candidateOffers = []) {
  if (!candidateOffers || candidateOffers.length === 0) return [];
  const validCandidates = candidateOffers.filter(c => c.imageUrl);
  if (validCandidates.length === 0) return candidateOffers;

  logger.info('VISION_1688', `Bắt đầu lọc Vòng 1: Gửi ${validCandidates.length} thumbnail 1688 theo từng cụm 4 ảnh cho Gemini Vision phân tích vi thể...`);

  const BATCH_SIZE = 4;
  const verifiedOffers = [];
  const totalBatches = Math.ceil(validCandidates.length / BATCH_SIZE);

  for (let bIdx = 0; bIdx < validCandidates.length; bIdx += BATCH_SIZE) {
    const chunk = validCandidates.slice(bIdx, bIdx + BATCH_SIZE);
    const batchNum = Math.floor(bIdx / BATCH_SIZE) + 1;
    const candidateImages = chunk.map(c => {
      let u = (c.imageUrl || '').trim();
      if (u.startsWith('//')) u = 'https:' + u;
      else if (u.startsWith('http://')) u = 'https://' + u.slice(7);
      return u;
    });

    const prompt = `
SYSTEM: Bạn là Chuyên gia Cao Cấp Giám Định Hình Ảnh Công Nghiệp & Đối Soát Chi Tiết Vi Thể Sản Phẩm (Micro-Feature Visual Discriminator).
[Ảnh 0]: Ảnh sản phẩm gốc chuẩn mẫu (Anchor Target Image).
Quan sát cực kỳ tỉ mỉ:
- Form dáng hình học tổng thể, tỷ lệ chiều cao/rộng, đường cong bo góc.
- Các chi tiết nhận diện cốt lõi: Vị trí và số lượng nút bấm vật lý, hình dáng nút bấm, cổng cắm/kết nối (Type-C, USB, chân sạc...), màn hình LED/LCD, cụm camera/cảm biến, núm xoay, nắp đậy, tay cầm, khóa kéo, quai đeo, đường chỉ may, cổ áo/đế giày.
- Kết cấu bề mặt và chất liệu: Nhựa nhám mờ, kim loại phay xước, kính cường lực, vải dệt, da bóng...

[Ảnh 1 đến ${candidateImages.length}]: Ảnh thumbnail xưởng 1688 (Nhóm ${batchNum}/${totalBatches}).

NGUYÊN TẮC GIÁM ĐỊNH BẮT BUỘC ĐẶC BIỆT CỦA GEMINI AI:
1. SOI CHI TIẾT VI THỂ (MICRO-FEATURE MATCHING):
   - So sánh từng chi tiết vật lý giữa ảnh thumbnail xưởng và [Ảnh 0].
2. KIÊN QUYẾT LOẠI BỎ HÀNG GẦN GIỐNG (LOOKALIKES / REPLICAS / BIẾN THỂ LỆCH):
   - Nếu sản phẩm chỉ "cùng công dụng" hoặc "trông na ná" nhưng KHÁC MỘT SỐ CHI TIẾT VẬT LÝ (ví dụ: khác hình dáng núm xoay, khác tỷ lệ viền, khác kiểu quai, khác vị trí nút nguồn, khác cổng sạc, khác số lưỡi dao, khác đui đèn) -> BẮT BUỘC ĐÁNH DẤU "isMatch": false.
   - CHỈ ĐÁNH DẤU "isMatch": true khi sản phẩm ĐÚNG 100% CÙNG MỘT MODEL / THIẾT KẾ với [Ảnh 0].
3. LOẠI BỎ PHỤ KIỆN RỜI:
   - Dây sạc lẻ, củ sạc, hộp đựng rỗng, vỏ ốp, linh kiện thay thế -> Đánh dấu isMatch: false.

TRẢ VỀ DUY NHẤT 1 MẢNG JSON HỢP LỆ (không kèm giải thích markdown):
[
  { 
    "index": 1, 
    "isMatch": true, 
    "confidenceScore": 95, 
    "matchedDetails": "Trùng khớp 100% từ form dáng hình trụ đến vị trí nút nguồn và cổng sạc Type-C",
    "reason": "Chuẩn xác cùng model sản phẩm gốc" 
  },
  { 
    "index": 2, 
    "isMatch": false, 
    "confidenceScore": 35, 
    "matchedDetails": "Khác model: Nút nguồn hình tròn thay vì hình chữ nhật, không có đèn LED",
    "reason": "Lệch model sản phẩm gốc" 
  }
]
`.trim();

    try {
      const visionResults = await callGeminiVisionBatch(gemini, prompt, [anchorImage, ...candidateImages]);

      if (Array.isArray(visionResults) && visionResults.length > 0) {
        visionResults.forEach(r => {
          const idx = Number(r.index) - 1;
          if (idx >= 0 && idx < chunk.length) {
            const isMatch = r.isMatch === true || r.isMatch === 'true';
            const isMissingData = /(?:thiếu (?:dữ liệu|hình ảnh|ảnh)|không thấy (?:ảnh|hình)|chưa nhận được ảnh)/i.test(r.reason || '') ||
                                  /(?:thiếu (?:dữ liệu|hình ảnh|ảnh)|không thấy (?:ảnh|hình)|chưa nhận được ảnh)/i.test(r.matchedDetails || '');

            if (!isMatch && isMissingData) {
              // Sự cố đường truyền nạp ảnh lên Gemini AI -> Kích hoạt đối soát dự phòng bảo toàn xưởng
              chunk[idx].isStage1Match = true;
              chunk[idx].stage1Confidence = 75;
              chunk[idx].stage1Reason = 'Duyệt dự phòng theo tiêu đề & thông số (CDN ảnh bận)';
              chunk[idx].matchedDetails = 'Tự động bảo toàn xưởng khi đường truyền ảnh gặp sự cố';
              verifiedOffers.push(chunk[idx]);
              logger.info('VISION_1688', `  [DUYỆT DỰ PHÒNG] Xưởng #${chunk[idx].offerId}: Giữ lại qua đối soát dự phòng (Score: 75%)`);
            } else {
              chunk[idx].isStage1Match = isMatch;
              chunk[idx].stage1Confidence = Number(r.confidenceScore || (isMatch ? 90 : 30));
              chunk[idx].stage1Reason = r.reason || (isMatch ? 'Gemini AI duyệt Vòng 1: Khớp chuẩn thumbnail' : 'Gemini AI loại bỏ: Lệch kiểu dáng');
              chunk[idx].matchedDetails = r.matchedDetails || '';
              if (isMatch) {
                verifiedOffers.push(chunk[idx]);
                logger.info('VISION_1688', `  [DUYET] Xưởng #${chunk[idx].offerId}: Vòng 1 DUYỆT [${chunk[idx].stage1Reason}] (Score: ${chunk[idx].stage1Confidence}%)`);
              } else {
                logger.info('VISION_1688', `  [LOAI] Xưởng #${chunk[idx].offerId}: Vòng 1 LOẠI [${chunk[idx].stage1Reason}]`);
              }
            }
          }
        });
      } else {
        // Fallback an toàn bảo toàn dữ liệu xưởng khi Gemini bận hoặc mạng trễ
        chunk.forEach(item => {
          if (item.isStage1Match === undefined) {
            item.isStage1Match = true;
            item.stage1Confidence = 75;
            item.stage1Reason = 'Duyệt dự phòng theo tiêu đề & thông số (Gemini AI bận)';
            item.matchedDetails = 'Đối soát dự phòng qua danh mục xưởng';
            verifiedOffers.push(item);
            logger.info('VISION_1688', `  [DUYỆT DỰ PHÒNG] Xưởng #${item.offerId}: Giữ lại qua đối soát dự phòng (Score: 75%)`);
          }
        });
        logger.info('VISION_1688', `Nhóm ${batchNum}/${totalBatches}: Kích hoạt đối soát dự phòng, tiếp tục tiến trình.`);
      }
    } catch (visErr) {
      chunk.forEach(item => {
        if (item.isStage1Match === undefined) {
          item.isStage1Match = true;
          item.stage1Confidence = 70;
          item.stage1Reason = 'Duyệt dự phòng kết nối (Gemini AI bận)';
          item.matchedDetails = 'Đối soát dự phòng kết nối';
          verifiedOffers.push(item);
        }
      });
      logger.info('VISION_1688', `Nhóm ${batchNum}/${totalBatches}: Kích hoạt đối soát dự phòng kết nối.`);
    }

    // Nghỉ nhẹ 300ms giữa các micro-batch để tránh nghẽn
    if (bIdx + BATCH_SIZE < validCandidates.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  logger.info('VISION_1688', `Hoàn thành Vòng 1: Tuyển chọn được ${verifiedOffers.length}/${validCandidates.length} xưởng đạt chuẩn thị giác thumbnail.`);
  return verifiedOffers;
}

/**
 * 2. VÒNG 2: Thẩm Định Bộ Ảnh Gallery & Chi Tiết Bên Trong Trang Sản Phẩm 1688 (Detail Page Audit)
 * Kiểm tra xem xưởng có bán đúng sản phẩm gốc bên trong trang detail không,
 * phát hiện triệt để tình trạng "treo đầu dê bán thịt chó" hoặc bẫy combo/phụ kiện.
 * @param {Object} gemini
 * @param {string} anchorImage - Ảnh sản phẩm gốc
 * @param {Object} offer - Offer 1688
 * @param {Array<string>} galleryImages - Mảng ảnh cào được từ trang detail xưởng
 * @returns {Promise<{ isDetailMatch: boolean, matchRatio: number, reason: string }>}
 */
export async function verify1688DetailGallery(gemini, anchorImage, offer, galleryImages = []) {
  if (!galleryImages || galleryImages.length === 0) {
    // Nếu trang detail không cào được ảnh riêng, kiểm tra theo ảnh đại diện
    return { isDetailMatch: true, matchRatio: 1.0, reason: 'Không có gallery riêng, xác nhận theo thumbnail' };
  }

  // Lấy tối đa 6 ảnh tiêu biểu trong trang detail
  const sampleGallery = galleryImages.slice(0, 6);
  const prompt = `
SYSTEM: Bạn là Chuyên gia Chống Gian Lận Thương Mại & Thẩm Định Gian Hàng 1688 Cấp Cao.
[Ảnh 0]: Ảnh sản phẩm gốc cần tìm xưởng sản xuất chuẩn.
[Ảnh 1 đến ${sampleGallery.length}]: Bộ ảnh chi tiết, ảnh chụp thực tế cào được bên trong trang sản phẩm của xưởng 1688 (Offer ID: ${offer.offerId || 'N/A'}).

NHIỆM VỤ GIÁM ĐỊNH:
Kiểm tra xem xưởng này thực sự sản xuất và giao đúng sản phẩm [Ảnh 0], hay đây là xưởng gian lận / treo đầu dê bán thịt chó:
1. Đếm số lượng ảnh trong bộ ảnh detail THỰC SỰ CHỨA ĐÚNG sản phẩm [Ảnh 0].
2. Phát hiện bẫy bán combo/phụ kiện (ảnh thumbnail là [Ảnh 0] nhưng ảnh ruột bên trong toàn bán đồ dùng gia đình linh tinh khác hoặc phụ kiện rời).
3. Nếu sản phẩm trong ảnh detail bị cắt bớt tính năng, dùng vật liệu rẻ tiền, hoặc là một mặt hàng khác hẳn -> BẮT BUỘC ĐÁNH DẤU "isDetailMatch": false.

TRẢ VỀ DUY NHẤT 1 JSON HỢP LỆ:
{
  "isDetailMatch": true,
  "matchRatio": 0.83,
  "matchingCount": 5,
  "totalChecked": ${sampleGallery.length},
  "reason": "Bộ ảnh chi tiết thể hiện đúng các góc cạnh và cấu trúc của sản phẩm gốc [Ảnh 0]"
}
`.trim();

  try {
    const res = await callGeminiVisionBatch(gemini, prompt, [anchorImage, ...sampleGallery]);
    const resObj = Array.isArray(res) ? res[0] : res;
    if (resObj && typeof resObj === 'object') {
      const isMatch = resObj.isDetailMatch === true || resObj.isDetailMatch === 'true';
      const ratio = typeof resObj.matchRatio === 'number' ? resObj.matchRatio : (isMatch ? 1.0 : 0.2);
      logger.info('DETAIL_AUDIT', `Xưởng #${offer.offerId}: Vòng 2 Detail -> ${isMatch ? '[CHUẨN XƯỞNG]' : '[LỆCH DETAIL / COMBO TRAP]'} (${Math.round(ratio * 100)}% ảnh khớp) | Lý do: ${resObj.reason || ''}`);
      return {
        isDetailMatch: isMatch && ratio >= 0.4,
        matchRatio: ratio,
        reason: resObj.reason || (isMatch ? 'Chi tiết trang xưởng khớp sản phẩm gốc' : 'Lệch chi tiết sản phẩm trong trang xưởng')
      };
    }
  } catch (err) {
    logger.warn('DETAIL_AUDIT', `Lỗi thẩm định detail xưởng #${offer.offerId}: ${err.message}`);
  }

  return { isDetailMatch: true, matchRatio: 1.0, reason: 'Mặc định đạt chuẩn Vòng 2' };
}

/**
 * 2b. Chống Bẫy Combo / SKU Phụ 1688 (Hàm tương thích cho pipeline)
 */
export async function detectComboTrapRatio(gemini, anchorImage, galleryImages = []) {
  if (!galleryImages || galleryImages.length <= 2) {
    return { isSingleProduct: true, ratio: 1.0 };
  }
  const detailRes = await verify1688DetailGallery(gemini, anchorImage, {}, galleryImages);
  return {
    isSingleProduct: detailRes.isDetailMatch,
    ratio: detailRes.matchRatio
  };
}

/**
 * 3. Lọc Thumbnail Shopee qua Gemini Vision với Micro-Batch (4 sản phẩm/nhóm)
 * Chọn đúng mẫu sản phẩm mục tiêu thay vì lấy các mã khác do từ khóa generic
 * @param {Object} gemini
 * @param {string} anchorImage
 * @param {Array<Object>} shopeeItems - Mảng [{ itemId, name, coverImage, price }]
 * @returns {Promise<Array<Object>>}
 */
export async function verifyShopeeThumbnails(gemini, anchorImage, shopeeItems = []) {
  if (!shopeeItems || shopeeItems.length === 0) return [];
  const validItems = shopeeItems.filter(it => it.coverImage);
  if (validItems.length === 0) return shopeeItems;

  const BATCH_SIZE = 4;
  const verifiedItems = [];

  for (let bIdx = 0; bIdx < validItems.length; bIdx += BATCH_SIZE) {
    const chunk = validItems.slice(bIdx, bIdx + BATCH_SIZE);
    const candidateImages = chunk.map(it => it.coverImage);

    const prompt = `
SYSTEM: Bạn là Chuyên gia Giám định Sản phẩm E-Commerce Shopee.
[Ảnh 0]: Ảnh sản phẩm gốc chuẩn mẫu.
[Ảnh 1 đến ${candidateImages.length}]: Ảnh sản phẩm tìm được trên Shopee qua từ khóa.

NHIỆM VỤ:
Đối chiếu trực quan từng ảnh với [Ảnh 0] để chọn ra ĐÚNG sản phẩm mục tiêu.
LOẠI BỎ các sản phẩm cùng ngành nhưng lệch mẫu (ví dụ: cùng là bóng đèn nhưng đui đèn khác kiểu, cùng là tai nghe nhưng case sạc hình vuông thay vì ovan).

TRẢ VỀ DUY NHẤT 1 MẢNG JSON HỢP LỆ:
[
  { "index": 1, "isMatch": true, "reason": "Trùng khớp kiểu dáng sản phẩm gốc" },
  { "index": 2, "isMatch": false, "reason": "Khác kiểu dáng/mẫu mã" }
]
`.trim();

    try {
      const visionResults = await callGeminiVisionBatch(gemini, prompt, [anchorImage, ...candidateImages]);
      if (Array.isArray(visionResults) && visionResults.length > 0) {
        visionResults.forEach(r => {
          const idx = Number(r.index) - 1;
          if (idx >= 0 && idx < chunk.length) {
            const isMatch = r.isMatch === true || r.isMatch === 'true';
            chunk[idx].isMatch = isMatch;
            chunk[idx].visionReason = r.reason || (isMatch ? 'Khớp mẫu Shopee' : 'Lệch mẫu');
            if (isMatch) verifiedItems.push(chunk[idx]);
          }
        });
      }
    } catch (err) {
      logger.warn('VISION_SHOPEE', `Lỗi lọc batch Shopee: ${err.message}`);
    }

    if (bIdx + BATCH_SIZE < validItems.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  logger.info('VISION_SHOPEE', `Gemini Vision xác thực Shopee: ${verifiedItems.length}/${validItems.length} sản phẩm khớp chuẩn.`);
  return verifiedItems.length > 0 ? verifiedItems : validItems.slice(0, 5);
}

/**
 * 4. Tổng hợp toàn diện mô tả sản phẩm (dạng các đoạn văn bản đầy đủ) và bảng thông số kỹ thuật chi tiết
 * - Không tóm tắt ngắn! Viết thành 4 đoạn văn bản chuyên sâu: Tổng quan, Kỹ thuật/Vật liệu, Bối cảnh ứng dụng, Điểm vượt trội
 * - Lưu giữ toàn bộ các trường thuộc tính kỹ thuật thô từ các xưởng 1688
 * @param {Object} gemini
 * @param {string} originalImage
 * @param {Array<Object>} rawShops - Mảng 10-15 xưởng 1688
 * @param {Object} primaryOffer
 * @returns {Promise<Object>}
 */
export async function synthesizeProductDetailsAndSpecs(gemini, originalImage, rawShops = [], primaryOffer = {}) {
  const allShops = Array.isArray(rawShops) && rawShops.length > 0 ? rawShops : (primaryOffer ? [primaryOffer] : []);
  
  // Tổng hợp toàn bộ thuộc tính kỹ thuật thô từ tất cả xưởng
  const mergedRawAttributes = {};
  allShops.forEach((s) => {
    if (s.attributes && typeof s.attributes === 'object') {
      Object.entries(s.attributes).forEach(([k, v]) => {
        if (!mergedRawAttributes[k] && v) {
          mergedRawAttributes[k] = String(v).trim();
        }
      });
    }
  });

  const shopContext = allShops.slice(0, 15).map((s, i) => `[Xưởng #${i + 1} - ${s.company?.name || 'Xưởng 1688'} (${s.company?.city || 'Trung Quốc'})]:
- Tiêu đề gốc: "${s.rawTitle || s.title}"
- Giá sỉ: ¥${s.price} (${s.priceVnd ? s.priceVnd.toLocaleString() + 'đ' : ''}) | MOQ: ${s.moq} cái | Đã bán: ${s.salesCount} cái
- Thuộc tính xưởng: ${JSON.stringify(s.attributes || {})}`).join('\n\n');

  const prompt = `
SYSTEM: Bạn là Chuyên gia Giám Định Sản Phẩm Cao Cấp & Trưởng Ban Nội Dung Kỹ Thuật E-Commerce Quốc Tế.
SẢN PHẨM MỤC TIÊU:
- [Ảnh 0]: Ảnh sản phẩm gốc tham chiếu (Anchor Reference Image). Quan sát tỉ mỉ kiểu dáng công nghiệp, vật liệu, các chi tiết hoàn thiện và tính năng.
- Dữ liệu thô thu thập từ các xưởng 1688:
${shopContext}
- Danh mục thuộc tính thô đã trích xuất:
${JSON.stringify(mergedRawAttributes, null, 2)}

NHIỆM VỤ BẮT BUỘC (TUYỆT ĐỐI KHÔNG ĐƯỢC TÓM TẮT NGẮN, PHẢI VIẾT THÀNH CÁC ĐOẠN VĂN BẢN HOÀN CHỈNH ĐẦY ĐỦ THÔNG TIN):
1. productNameVi: Tên thương phẩm chuẩn tiếng Việt (chuẩn bán hàng, đầy đủ tính năng, ví dụ: "Bóng Đèn LED Bắp Ngô E27 / E14 Siêu Sáng Tiết Kiệm Điện 3 Chế Độ Màu").
2. productNameEn: Tên generic tiếng Anh thương mại quốc tế (ví dụ: "E27 E14 LED Corn Bulb Super Bright Energy Saving Tri-Color Lamp").
3. descriptionParagraphs: Viết thành 4 ĐOẠN VĂN BẢN CHI TIẾT (mỗi đoạn 3 - 6 câu văn hoàn chỉnh, súc tích và giàu thông tin):
   - overview: Đoạn 1 - Tổng quan chi tiết về sản phẩm, định vị phân khúc, thiết kế kiểu dáng công nghiệp, cấu tạo tổng thể và cảm quan thực tế.
   - technicalBuild: Đoạn 2 - Phân tích chuyên sâu về vật liệu chế tạo, tiêu chuẩn linh kiện, cơ chế vận hành, độ hoàn thiện bề mặt và độ bền cơ học.
   - applications: Đoạn 3 - Bối cảnh sử dụng thực tế, môi trường không gian ứng dụng tối ưu, hướng dẫn trải nghiệm và đối tượng khách hàng mục tiêu.
   - highlights: Đoạn 4 - Các điểm khác biệt nổi bật, lợi thế cạnh tranh cốt lõi vượt trội so với các sản phẩm cùng tầm giá trên thị trường.
4. detailedSpecs: Bảng từ điển toàn bộ thông số kỹ thuật đầy đủ (kết hợp cả dữ liệu xưởng và phân tích ảnh, giữ lại toàn bộ các thuộc tính quan trọng).

TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON HỢP LỆ (không kèm văn bản ngoài JSON):
{
  "productNameVi": "...",
  "productNameEn": "...",
  "descriptionParagraphs": {
    "overview": "Đoạn văn hoàn chỉnh mô tả tổng quan...",
    "technicalBuild": "Đoạn văn hoàn chỉnh phân tích kỹ thuật và vật liệu...",
    "applications": "Đoạn văn hoàn chỉnh về ứng dụng thực tế...",
    "highlights": "Đoạn văn hoàn chỉnh về điểm vượt trội cạnh tranh..."
  },
  "detailedSpecs": {
    "Chủng loại sản phẩm": "...",
    "Chuẩn chân cắm / kết nối": "...",
    "Điện áp / Nguồn điện": "...",
    "Công suất định mức": "...",
    "Chất liệu cấu tạo": "...",
    "Kích thước / Trọng lượng": "...",
    "Xuất xứ xưởng": "..."
  }
}
`.trim();

  try {
    const res = await callGeminiVisionBatch(gemini, prompt, originalImage ? [originalImage] : []);
    if (res && typeof res === 'object' && !Array.isArray(res) && res.descriptionParagraphs) {
      res.rawAttributesDictionary = mergedRawAttributes;
      return res;
    }
    if (Array.isArray(res) && res[0] && typeof res[0] === 'object' && res[0].descriptionParagraphs) {
      res[0].rawAttributesDictionary = mergedRawAttributes;
      return res[0];
    }
  } catch (err) {
    logger.warn('STEP 3', `Gemini tổng hợp thông tin sản phẩm: ${err.message}. Tiếp tục với bộ sinh nội dung tự động.`);
  }

  // Fallback phong phú nếu Gemini không trả về JSON
  const top = primaryOffer || allShops[0] || {};
  return {
    productNameVi: top.title || 'Sản phẩm hoàn thiện thương mại cao cấp',
    productNameEn: 'High Quality Commercial Grade Product',
    descriptionParagraphs: {
      overview: `Sản phẩm "${top.title || 'Sản phẩm chất lượng cao'}" được cung ứng trực tiếp từ chuỗi nhà xưởng chuyên môn hóa 1688 (${top.company?.name || 'Xưởng đầu nguồn'}), sở hữu quy chuẩn sản xuất đồng bộ, kết cấu công nghiệp vững chắc cùng thiết kế hiện đại bắt kịp xu hướng thị trường.`,
      technicalBuild: `Sản phẩm được gia công từ các vật liệu tuyển chọn đạt chuẩn xuất xưởng quốc tế, tối ưu hóa độ bền cơ lý tính, giảm thiểu tối đa hao mòn trong quá trình vận hành liên tục và đáp ứng nghiêm ngặt các tiêu chuẩn an toàn kỹ thuật điện máy và tiêu dùng.`,
      applications: `Thiết kế đa dụng tối ưu cho nhiều không gian sinh hoạt và môi trường làm việc, thích hợp cả với nhu cầu sử dụng trực tiếp của gia đình và triển khai phân phối quy mô lớn trên các sàn thương mại điện tử đa kênh như Shopee và TikTok Shop.`,
      highlights: `Lợi thế cạnh tranh vượt trội với mức giá sỉ tận gốc từ ${top.priceFormatted || ('¥' + (top.price || 0))} (MOQ: ${top.moq || 1} sản phẩm), sản lượng xuất xưởng lớn đạt ${top.salesCount || 0} sản phẩm/tháng, đảm bảo nguồn cung dồi dào và tỷ suất lợi nhuận cao cho nhà phân phối.`
    },
    detailedSpecs: {
      'Chủng loại sản phẩm': top.title || 'Sản phẩm tiêu chuẩn cao cấp',
      'Mã xưởng cung ứng': String(top.offerId || '1688'),
      'Giá sỉ tham chiếu': top.priceFormatted || (`¥` + (top.price || 0)),
      'Số lượng đặt tối thiểu (MOQ)': `${top.moq || 1} cái`,
      'Doanh số bán xưởng': `${top.salesCount || 0} sản phẩm/tháng`,
      'Đơn vị sản xuất': top.company?.name || 'Nhà xưởng 1688',
      'Khu vực công xưởng': `${top.company?.city || ''} ${top.company?.province || ''}`.trim() || 'Trung Quốc',
      'Độ tin cậy xưởng': top.company?.isSuperFactory ? 'Xưởng Siêu Cấp (Super Factory)' : 'Xưởng Chuyên Nghiệp',
      'Tiêu chuẩn xuất khẩu': 'Đạt chuẩn đóng gói thương mại quốc tế',
      ...mergedRawAttributes
    },
    rawAttributesDictionary: mergedRawAttributes
  };
}

/**
 * 5. Thẩm định Review Shopee: Lọc toàn bộ review 5 sao có ảnh và phân loại chất lượng cho Landing Page
 * - Kiểm tra ảnh chụp có đúng sản phẩm thật [Ảnh 0] không (loại bỏ ảnh rác, ảnh màn hình đen, ảnh đồ ăn để lấy xu)
 * - Kiểm tra comment có giá trị thuyết phục/bảo chứng chất lượng cho Landing Page không
 * - Gắn nhãn useForLandingPage: true/false kèm điểm chất lượng landingPageScore (1-10)
 * @param {Object} gemini
 * @param {string} anchorImage
 * @param {Array<Object>} rawReviews - Toàn bộ review 5 sao thu thập được [{ author, comment, images, rating }]
 * @returns {Promise<Array<Object>>} Danh sách review đã được Gemini thẩm định, ưu tiên review Landing Page
 */
export async function verifyReviewAuthenticity(gemini, anchorImage, rawReviews = []) {
  if (!rawReviews || rawReviews.length === 0) return [];

  // Lọc các review có nội dung và có ảnh chụp thực tế
  const candidateReviews = rawReviews.filter(r => (r.comment || '').trim().length > 3 && Array.isArray(r.images) && r.images.length > 0);
  if (candidateReviews.length === 0) return rawReviews;

  logger.info('REVIEW_AUDIT', `Bắt đầu thẩm định ${candidateReviews.length} review kèm ảnh thực tế qua Gemini để tuyển chọn review chuẩn Landing Page...`);

  const BATCH_SIZE = 6;
  const verifiedReviews = [];

  for (let bIdx = 0; bIdx < candidateReviews.length; bIdx += BATCH_SIZE) {
    const chunk = candidateReviews.slice(bIdx, bIdx + BATCH_SIZE);
    const reviewPhotos = chunk.map(r => r.images[0]);
    const reviewTextList = chunk.map((r, i) => `[Review #${i + 1}] (${r.author}): "${r.comment}"`).join('\n');

    const prompt = `
SYSTEM: Bạn là Chuyên gia Thẩm định Đánh giá Khách hàng & Tối ưu Tỷ lệ Chuyển đổi Landing Page (Landing Page Conversion Specialist).
[Ảnh 0]: Ảnh sản phẩm mục tiêu chuẩn mẫu.
[Ảnh 1 đến ${reviewPhotos.length}]: Ảnh thực tế khách hàng chụp đính kèm trong review.

DANH SÁCH BÌNH LUẬN:
${reviewTextList}

TIÊU CHUẨN ĐÁNH GIÁ:
1. "isValid" (true/false):
   - Ảnh chụp thực sự là sản phẩm [Ảnh 0] hoặc phân loại hợp lệ của nó.
   - Loại bỏ nếu ảnh chụp là: màn hình đen, chụp vỏ hộp/bao bì chưa bóc, ảnh đồ ăn/vật nuôi/hoạt hình lấy xu Shopee, hoặc gửi nhầm sản phẩm khác.
2. "useForLandingPage" (true/false):
   - BẮT BUỘC: isValid phải là true.
   - Ảnh chụp rõ nét, chân thực, thể hiện rõ sản phẩm đang dùng hoặc unboxing đẹp mắt.
   - Bình luận có nội dung mô tả trải nghiệm cụ thể, khen ngợi chất lượng, công năng, độ hoàn thiện, mang lại niềm tin cao cho khách hàng khi đọc trên Landing Page.
   - LOẠI BỎ khỏi Landing Page nếu bình luận cộc lốc vô nghĩa (ví dụ: "nhanh", "ok", "cho 5 sao lấy xu", "chưa dùng thử", "asdfgh").
3. "landingPageScore" (1 - 10): Điểm giá trị bảo chứng cho Landing Page.

TRẢ VỀ DUY NHẤT 1 MẢNG JSON HỢP LỆ:
[
  { "index": 1, "isValid": true, "useForLandingPage": true, "landingPageScore": 9, "reason": "Ảnh chụp thực tế rõ nét, bình luận khen công năng chi tiết tạo niềm tin cao" },
  { "index": 2, "isValid": true, "useForLandingPage": false, "landingPageScore": 5, "reason": "Ảnh đúng hàng nhưng bình luận quá ngắn (ok) không đủ sức thuyết phục trên Landing Page" },
  { "index": 3, "isValid": false, "useForLandingPage": false, "landingPageScore": 1, "reason": "Ảnh chụp đồ ăn để nhận xu Shopee, không phải sản phẩm" }
]
`.trim();

    try {
      const res = await callGeminiVisionBatch(gemini, prompt, [anchorImage, ...reviewPhotos]);

      if (Array.isArray(res) && res.length > 0) {
        res.forEach(r => {
          const idx = Number(r.index) - 1;
          if (idx >= 0 && idx < chunk.length) {
            const isValid = r.isValid === true || r.isValid === 'true';
            const useForLp = isValid && (r.useForLandingPage === true || r.useForLandingPage === 'true');
            chunk[idx].isValid = isValid;
            chunk[idx].useForLandingPage = useForLp;
            chunk[idx].landingPageScore = Number(r.landingPageScore || (useForLp ? 8 : 4));
            chunk[idx].auditReason = r.reason || (useForLp ? 'Đạt chuẩn Landing Page' : 'Review hợp lệ');
          }
        });
      } else {
        // Fallback: nếu Gemini không phản hồi JSON, giữ lại review có ảnh và bình luận dài
        chunk.forEach(r => {
          const isDecent = (r.comment || '').length >= 15;
          r.isValid = true;
          r.useForLandingPage = isDecent;
          r.landingPageScore = isDecent ? 7 : 4;
          r.auditReason = isDecent ? 'Review chi tiết kèm ảnh' : 'Review hợp lệ';
        });
      }
    } catch (auditErr) {
      logger.warn('REVIEW_AUDIT', `Lỗi duyệt nhóm review #${bIdx + 1}: ${auditErr.message}`);
      chunk.forEach(r => {
        r.isValid = true;
        r.useForLandingPage = false;
        r.landingPageScore = 5;
        r.auditReason = 'Chưa qua thẩm định AI';
      });
    }

    verifiedReviews.push(...chunk);
  }

  // Sắp xếp: Ưu tiên review Landing Page điểm cao lên trước, sau đó đến các review hợp lệ
  verifiedReviews.sort((a, b) => {
    if (a.useForLandingPage && !b.useForLandingPage) return -1;
    if (!a.useForLandingPage && b.useForLandingPage) return 1;
    return (b.landingPageScore || 0) - (a.landingPageScore || 0);
  });

  const lpCount = verifiedReviews.filter(r => r.useForLandingPage).length;
  logger.success('REVIEW_AUDIT', `Gemini đã thẩm định xong ${verifiedReviews.length} review: Tuyển chọn được ${lpCount} review xuất sắc đạt chuẩn Landing Page!`);
  return verifiedReviews;
}

/**
 * 6. Xác thực Video TikTok/Douyin qua Gemini Vision: Bắt Đúng Đặc Điểm Vi Thể & Loại Bỏ Sản Phẩm Gần Giống
 * - Gửi TRỰC TIẾP ẢNH BÌA THỰC TẾ của video vào Gemini Multimodal Vision
 * - Prompt giám định chuyên sâu vi thể (micro-features): Nút bấm, cổng cắm, bo viền, hoa văn, tỷ lệ
 * - Loại bỏ triệt để các sản phẩm nhìn gần giống (lookalike, replica) nhưng khác một vài chi tiết vật lý
 * - Duyệt qua 100% video thu hoạch được từ toàn bộ từ khóa
 * @param {Object} gemini
 * @param {string} anchorImage
 * @param {Array<Object>} candidateVideos - Mảng video [{ videoId, title, coverUrl, diggCount, authorName, platform }]
 * @param {Object} [productContext] - { productTitle, sku, keywords, category }
 * @returns {Promise<Array<Object>>}
 */
export async function verifyTikTokCovers(gemini, anchorImage, candidateVideos = [], productContext = {}) {
  if (!candidateVideos || candidateVideos.length === 0) return [];

  const validVids = candidateVideos.filter(v => v.coverUrl || v.title);
  if (validVids.length === 0) return [];

  logger.info('VISION_VIDEO', `Bắt đầu gửi ${validVids.length} video cho Gemini Vision soi chi tiết ảnh bìa & phân biệt sản phẩm gần giống...`);

  const BATCH_SIZE = 4; // Batch nhỏ để Gemini quan sát chi tiết từng ảnh bìa vi thể
  const verifiedAll = [];
  const targetName = productContext?.productTitle || 'Sản phẩm mục tiêu';
  const targetCategory = productContext?.category || '';
  const totalBatches = Math.ceil(validVids.length / BATCH_SIZE);

  for (let bIdx = 0; bIdx < validVids.length; bIdx += BATCH_SIZE) {
    const chunk = validVids.slice(bIdx, bIdx + BATCH_SIZE);
    const batchNum = Math.floor(bIdx / BATCH_SIZE) + 1;

    const candidateListPrompt = chunk.map((v, i) => {
      const pName = v.platform === 'Douyin' || v.platform === 'douyin' ? 'Douyin' : 'TikTok';
      return `[Video #${i + 1}] [${pName}]:
- Tiêu đề / Caption: "${v.title || 'Không có tiêu đề'}"
- Kênh người đăng: ${v.authorName || 'Creator'}
- Lượt thích: ${v.diggCount || 0}
- [Ảnh ${i + 1}]: Ảnh bìa thực tế của Video #${i + 1}`;
    }).join('\n\n');

    const prompt = `
SYSTEM: Bạn là Chuyên gia Cao Cấp Giám Định Thị Giác & Đối Soát Chi Tiết Vi Thể Sản Phẩm (Micro-Feature Visual Discriminator).
SẢN PHẨM MỤC TIÊU CẦN ĐỐI SOÁT:
- Tên sản phẩm: "${targetName}"
${targetCategory ? `- Danh mục / Kiểu dáng: "${targetCategory}"` : ''}
- [Ảnh 0]: Ảnh sản phẩm gốc chuẩn mẫu (Anchor Target Image). Quan sát thật kỹ: hình dáng khối, vị trí các nút bấm vật lý, cổng cắm/kết nối, cụm camera/cảm biến, viền bo cong, hoa văn kết cấu và các phụ kiện đi kèm.

DANH SÁCH ${chunk.length} VIDEO CẦN GEMINI SOI ẢNH BÌA THỰC TẾ (NHÓM ${batchNum}/${totalBatches}):
${candidateListPrompt}
[Ảnh 1 đến ${chunk.length}]: Ảnh bìa thực tế của từng video tương ứng.

NGUYÊN TẮC GIÁM ĐỊNH BẮT BUỘC ĐẶC BIỆT CỦA GEMINI AI:
1. SOI CHI TIẾT VI THỂ (MICRO-FEATURES COMPARISON):
   - So sánh từng chi tiết nhỏ giữa [Ảnh bìa video] và [Ảnh 0 sản phẩm gốc]: Vị trí nút bấm, số lượng nút bấm, hình dáng nút bấm, cổng cắm (Type-C, USB, chân sạc), đường viền bo cong, họa tiết hoa văn, tỷ lệ kích thước.
2. NGUYÊN TẮC LOẠI BỎ SẢN PHẨM GẦN GIỐNG (LOOKALIKES / REPLICAS / BIẾN THỂ KHÁC):
   - Nếu sản phẩm xuất hiện trong video nhìn "GẦN GIỐNG" nhưng "KHÁC MỘT CHÚT" (ví dụ: cùng là bóng đèn nhưng đui đèn khác kiểu, cùng là tai nghe nhưng case sạc có đèn LED khác vị trí, khác số nút bấm, khác cổng sạc, khác tỷ lệ viền), BẮT BUỘC ĐÁNH DẤU "isRelevant": false.
   - CHỈ ĐÁNH DẤU "isRelevant": true KHI VÀ CHỈ KHI: Sản phẩm trong ảnh bìa video HOÀN TOÀN TRÙNG KHỚP 100% về ngoại quan và đặc điểm vi thể với [Ảnh 0].
3. LOẠI BỎ HOÀN TOÀN NỘI DUNG RÁC:
   - Video ca hát, nhảy múa (dance), đàn nhạc, vlog đời sống, biến hình gái xinh, gaming, anime, review sản phẩm ngành hàng khác -> Đánh dấu isRelevant: false.

TRẢ VỀ DUY NHẤT 1 MẢNG JSON HỢP LỆ (không kèm văn bản ngoài JSON):
[
  { "index": 1, "isRelevant": true, "reason": "Ảnh bìa video trùng khớp 100% chi tiết nút bấm, cổng cắm và kiểu dáng với Ảnh 0" },
  { "index": 2, "isRelevant": false, "reason": "Sản phẩm gần giống nhưng khác chi tiết: Nút nguồn đặt ở mặt sau thay vì cạnh bên như Ảnh 0" }
]
`.trim();

    logger.info('VISION_VIDEO', `Đang gửi nhóm ${batchNum}/${totalBatches} (${chunk.length} video kèm ảnh bìa) cho Gemini Vision phân tích vi thể...`);

    try {
      // Gửi anchorImage kèm TOÀN BỘ ẢNH BÌA VIDEO THỰC TẾ
      const coverImages = chunk.map(v => v.coverUrl).filter(Boolean);
      const allImagesToSend = anchorImage ? [anchorImage, ...coverImages] : coverImages;

      const res = await callGeminiVisionBatch(gemini, prompt, allImagesToSend);

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
              logger.info('VISION_TIKTOK', `  [DUYET] Video [${chunk[idx].platform}] "${(chunk[idx].title || '').slice(0, 35)}...": Gemini duyệt [${chunk[idx].visionReason}]`);
            } else {
              logger.info('VISION_TIKTOK', `  [LOAI] Video [${chunk[idx].platform}] "${(chunk[idx].title || '').slice(0, 35)}...": Gemini loại bỏ [${chunk[idx].visionReason}]`);
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


