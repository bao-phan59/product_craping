/**
 * cleaner.js — 1688 Data Cleaner Module
 * Làm sạch dữ liệu thô từ 1688, gọt bỏ rác nhà xưởng, số điện thoại TQ, WeChat, địa chỉ công xưởng.
 */

/**
 * Loại bỏ toàn bộ thông tin liên hệ nhà xưởng TQ, WeChat, số điện thoại, địa chỉ khỏi văn bản
 * @param {string} text - Đoạn văn bản HTML hoặc text thô cần làm sạch
 * @returns {string} Văn bản đã lọc sạch
 */
export function filterFactoryNoise(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;

  // 1. Loại bỏ các thẻ HTML rác và giữ lại cấu trúc cơ bản
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // 2. Lọc số điện thoại Trung Quốc (11 chữ số bắt đầu 13, 14, 15, 16, 17, 18, 19 hoặc điện thoại bàn 0xx-xxxxxxx)
  cleaned = cleaned.replace(/(?:\+?86[- ]?)?1[3-9]\d{9}/g, '[REMOVED_PHONE]');
  cleaned = cleaned.replace(/0\d{2,3}[- ]?\d{7,8}/g, '[REMOVED_PHONE]');

  // 3. Lọc ID WeChat / 微信号
  cleaned = cleaned.replace(/(?:微信号?|WeChat|VX|v信|微信)[:：\s]*[a-zA-Z0-9_-]{5,25}/gi, '[REMOVED_WECHAT]');

  // 4. Lọc số QQ
  cleaned = cleaned.replace(/(?:QQ|qq|扣扣)[:：\s]*[1-9]\d{4,11}/gi, '[REMOVED_QQ]');

  // 5. Lọc địa chỉ nhà máy / công ty Trung Quốc thường gặp
  cleaned = cleaned.replace(/[\u4e00-\u9fa5]{2,10}(?:省|市|区|县|街道|镇|工业区|开发区|创业园)[\u4e00-\u9fa50-9A-Za-z#\s-]{4,30}(?:号|楼|室|厂房)?/g, '[REMOVED_FACTORY_ADDR]');

  // 6. Lọc mã số doanh nghiệp / Mã số thuế TQ (18 ký tự chữ & số)
  cleaned = cleaned.replace(/\b[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}\b/g, '[REMOVED_TAX_CODE]');

  // 7. Lọc các câu mời chào liên hệ xưởng trực tiếp
  cleaned = cleaned.replace(/(?:支持定制|量大从优|厂家直销|源头工厂|加微私聊|欢迎来厂考察|诚招代理|一件代发).{0,20}/gi, '');

  return cleaned.trim();
}

/**
 * Chuẩn hóa và làm sạch chi tiết sản phẩm 1688
 * @param {Object} rawOffer - Dữ liệu offer thô từ Alibaba1688SDK
 * @returns {Object} Đối tượng đã được chuẩn hóa gọn gàng
 */
export function clean1688Offer(rawOffer) {
  if (!rawOffer) return null;

  const offerId = String(rawOffer.offerId || rawOffer.id || '');
  const title = (rawOffer.title || rawOffer.subject || '').trim();
  const mainImage = rawOffer.imageUrl || rawOffer.coverImage || (rawOffer.images && rawOffer.images[0]) || '';
  const images = Array.isArray(rawOffer.images) ? rawOffer.images : (mainImage ? [mainImage] : []);

  // Bảng giá bán sỉ theo số lượng
  const priceRanges = Array.isArray(rawOffer.priceRanges)
    ? rawOffer.priceRanges.map(p => ({
        minQuantity: Number(p.minQuantity || p.beginAmount || 1),
        price: Number(p.price || 0)
      }))
    : [];

  const basePrice = Number(rawOffer.price || (priceRanges[0] ? priceRanges[0].price : 0));
  const moq = Number(rawOffer.moq || (priceRanges[0] ? priceRanges[0].minQuantity : 1));

  // Thuộc tính kỹ thuật (Attributes / Specs)
  const attributes = {};
  if (rawOffer.attributes && typeof rawOffer.attributes === 'object') {
    for (const [k, v] of Object.entries(rawOffer.attributes)) {
      if (typeof v === 'string') {
        const cleanedVal = filterFactoryNoise(v);
        if (cleanedVal && !cleanedVal.includes('[REMOVED_')) {
          attributes[k] = cleanedVal;
        }
      } else if (v != null) {
        attributes[k] = v;
      }
    }
  }

  // Làm sạch mô tả HTML / Text
  const descriptionRaw = rawOffer.descriptionHtml || rawOffer.description || '';
  const descriptionCleaned = filterFactoryNoise(descriptionRaw);

  return {
    offerId,
    title,
    mainImage,
    images,
    basePrice,
    priceRanges,
    moq,
    companyName: (rawOffer.companyName || '').trim(),
    offerUrl: rawOffer.offerUrl || `https://detail.1688.com/offer/${offerId}.html`,
    attributes,
    description: descriptionCleaned
  };
}

/**
 * Làm sạch và lọc danh sách các xưởng/offers tìm được từ 1688
 * @param {Array<Object>} rawOffers - Danh sách offers thô từ 1688 search
 * @returns {Array<Object>} Danh sách đã làm sạch rác, lọc trung gian
 */
export function cleanAndFilter1688Offers(rawOffers) {
  if (!Array.isArray(rawOffers)) return [];

  const cleaned = rawOffers
    .filter(offer => offer && (offer.id || offer.offerId))
    .map(offer => {
      const offerId = String(offer.offerId || offer.id || '');
      const rawTitle = offer.title || offer.subject || '';
      const cleanedTitle = filterFactoryNoise(rawTitle) || `Sản phẩm 1688 #${offerId}`;
      const companyName = filterFactoryNoise(
        typeof offer.company === 'object' ? (offer.company?.name || '') : (offer.companyName || '')
      );
      
      const price = Number(offer.price || offer.pricing?.priceCny || (offer.priceRanges && offer.priceRanges[0]?.price) || 0);
      const priceFormatted = offer.priceFormatted || (price > 0 ? `¥${price.toFixed(2)}` : '¥0.00');
      const salesCount = Number(offer.salesCount || offer.monthSold || offer.sales || 0);
      const imageUrl = offer.imageUrl || offer.image || offer.coverImage || (offer.images && offer.images[0]) || '';
      const detailUrl = offer.detailUrl || offer.offerUrl || `https://detail.1688.com/offer/${offerId}.html`;

      return {
        ...offer,
        offerId,
        id: offerId,
        title: cleanedTitle,
        price,
        priceFormatted,
        salesCount,
        imageUrl,
        detailUrl,
        offerUrl: detailUrl,
        company: {
          ...(typeof offer.company === 'object' ? offer.company : {}),
          name: companyName || (typeof offer.company === 'object' ? offer.company?.name : '') || 'Xưởng 1688'
        },
        companyName: companyName || (typeof offer.company === 'object' ? offer.company?.name : '') || 'Xưởng 1688',
        attributes: offer.attributes || {}
      };
    });

  // Ưu tiên các xưởng có giá hợp lệ hoặc có lượt bán
  const filtered = cleaned.filter(offer => offer.price > 0 || offer.salesCount > 0);
  return filtered.length > 0 ? filtered : cleaned;
}
