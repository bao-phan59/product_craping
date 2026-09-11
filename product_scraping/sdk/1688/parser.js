/**
 * Alibaba 1688 SDK — Parser & Normalizer
 * Standardizes raw responses, formats wholesale tiered prices, MOQ, and factory info
 */

import { Alibaba1688Config, Alibaba1688Endpoints } from './constants.js';

export class Alibaba1688Parser {
  /**
   * Loại bỏ các thẻ HTML rác trong tiêu đề (VD: <font color="red">...</font>)
   * @param {string} htmlText 
   */
  static cleanHtmlTags(htmlText) {
    if (!htmlText || typeof htmlText !== 'string') return '';
    return htmlText.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Chuẩn hóa URL ảnh 1688 sang chất lượng cao (800x800)
   * @param {string} url 
   */
  static formatImageUrl(url) {
    if (!url || typeof url !== 'string') return '';
    let formatted = url;
    if (formatted.startsWith('//')) {
      formatted = 'https:' + formatted;
    } else if (!formatted.startsWith('http')) {
      formatted = 'https://' + formatted;
    }
    // Chuyển ảnh thumbnail sang kích thước 800x800 HD nếu có pattern .search.jpg hoặc .300x300.jpg
    formatted = formatted.replace(/\.(\d+)x(\d+)\.jpg/gi, '.800x800.jpg');
    return formatted;
  }

  /**
   * Trích xuất Offer ID từ liên kết 1688
   * @param {string} url - VD: https://detail.1688.com/offer/7123456789.html
   */
  static parseOfferUrl(url) {
    if (!url || typeof url !== 'string') return null;
    const match = url.match(/offer\/(\d+)\.html/i) || url.match(/[?&]offerId=(\d+)/i) || url.match(/[?&]id=(\d+)/i);
    return match ? match[1] : null;
  }

  /**
   * Chuẩn hóa thông tin giá sỉ theo bậc (Tiered Pricing) và ước tính tiền Việt
   * @param {Object} raw 
   * @param {number} [exchangeRate] 
   */
  static parsePricing(raw, exchangeRate = Alibaba1688Config.EXCHANGE_RATE_CNY_VND) {
    let priceCny = 0;
    let priceText = '';
    const tieredPrices = [];

    // Tìm giá chính
    if (raw.priceInfo) {
      priceCny = parseFloat(raw.priceInfo.price || raw.priceInfo.formatPrice || 0);
      priceText = raw.priceInfo.formatPrice || raw.priceInfo.price || '';
    } else if (raw.formatPrice) {
      priceCny = parseFloat(raw.formatPrice);
      priceText = String(raw.formatPrice);
    } else if (raw.price) {
      priceCny = parseFloat(raw.price);
      priceText = String(raw.price);
    }

    // Xử lý chuỗi giá dạng khoảng: "15.00 - 25.00"
    if (priceText.includes('-')) {
      const parts = priceText.split('-').map(p => parseFloat(p.trim())).filter(p => !isNaN(p));
      if (parts.length >= 2) {
        priceCny = parts[0];
      }
    }

    // Bóc tách thang giá sỉ theo số lượng nếu có
    if (Array.isArray(raw.priceInfo?.tieredPrices)) {
      for (const tier of raw.priceInfo.tieredPrices) {
        const tierPrice = parseFloat(tier.price || 0);
        const minQty = parseInt(tier.beginQuantity || tier.minQuantity || 1, 10);
        tieredPrices.push({
          minQuantity: minQty,
          priceCny: tierPrice,
          priceVnd: Math.round(tierPrice * exchangeRate),
        });
      }
    }

    // Giá quy đổi VNĐ
    const priceVnd = Math.round(priceCny * exchangeRate);

    return {
      priceCny: isNaN(priceCny) ? 0 : priceCny,
      priceVnd: isNaN(priceVnd) ? 0 : priceVnd,
      priceFormattedCny: `¥${priceCny.toFixed(2)}`,
      priceFormattedVnd: `${priceVnd.toLocaleString('vi-VN')} ₫`,
      tieredPrices,
      exchangeRate,
    };
  }

  /**
   * Chuẩn hóa 1 sản phẩm từ danh sách tìm kiếm bằng ảnh
   * @param {Object} item - Dữ liệu thô của 1 item
   * @param {number} [exchangeRate] 
   */
  static standardizeOffer(item, exchangeRate = Alibaba1688Config.EXCHANGE_RATE_CNY_VND) {
    if (!item) return null;

    const offerId = item.id || item.offerId || item.itemId || item.rawId || '';
    const rawTitle = item.subject || item.title || item.rawTitle || item.information?.subject || item.pureTitle || item.titleWithTag || item.productTitle || '';
    const title = this.cleanHtmlTags(rawTitle) || `Sản phẩm 1688 #${offerId}`;
    
    // Hỗ trợ cả trường hợp item.image là chuỗi URL hoặc là object { imgUrl: ... }
    const rawImg = typeof item.image === 'string'
      ? item.image
      : (item.image?.imgUrl || item.imageUrl || item.imgUrl || item.picUrl || '');
    const imageUrl = this.formatImageUrl(rawImg);
    const pricing = this.parsePricing(item, exchangeRate);

    // MOQ (Minimum Order Quantity - Số lượng mua tối thiểu)
    const moq = parseInt(item.quantityBegin || item.moq || item.beginQuantity || 1, 10);

    // Doanh số bán hàng
    const salesCount = parseInt(item.monthSoldQuantity || item.bookedCount || item.saleCount || item.quantitySumMonth || 0, 10);

    // Tên công ty / Xưởng sản xuất
    const company = {
      name: item.company?.name || item.companyName || item.shopName || item.loginId || 'Nhà xưởng 1688',
      city: item.city || item.company?.city || '',
      province: item.province || item.company?.province || '',
      isSuperFactory: !!(item.isSuperFactory || item.superFactory || item.company?.isSuperFactory),
      repurchaseRate: item.repurchaseRate || item.company?.repurchaseRate || '',
      ratingScore: parseFloat(item.score || item.company?.score || 0),
    };

    return {
      offerId: String(offerId),
      title,
      imageUrl,
      price: pricing.priceCny,
      priceFormatted: pricing.priceFormattedCny,
      moq,
      pricing,
      salesCount,
      company,
      attributes: item.attributes || item.props || item.properties || item.featureProps || {},
      detailUrl: Alibaba1688Endpoints.OFFER_DETAIL_URL(offerId),
      raw: item,
    };
  }

  /**
   * Chuẩn hóa danh sách sản phẩm từ kết quả Image Search
   * @param {Object} rawJson 
   * @param {number} [exchangeRate]
   */
  static parseImageSearchResults(rawJson, exchangeRate = Alibaba1688Config.EXCHANGE_RATE_CNY_VND) {
    if (!rawJson) return [];

    let offerList = [];
    if (rawJson.data?.data?.offerList) {
      offerList = rawJson.data.data.offerList;
    } else if (rawJson.data?.offerList) {
      offerList = rawJson.data.offerList;
    } else if (Array.isArray(rawJson.offerList)) {
      offerList = rawJson.offerList;
    }

    return offerList
      .map(item => this.standardizeOffer(item, exchangeRate))
      .filter(item => item && item.offerId);
  }

  /**
   * Chuẩn hóa danh sách sản phẩm từ kết quả Market Keyword Search
   * @param {Object} rawJson 
   * @param {number} [exchangeRate]
   */
  static parseKeywordSearchResults(rawJson, exchangeRate = Alibaba1688Config.EXCHANGE_RATE_CNY_VND) {
    return this.parseImageSearchResults(rawJson, exchangeRate);
  }
}
