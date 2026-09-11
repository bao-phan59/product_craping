/**
 * Shopee Extension SDK — Auth & Session Cookie Manager
 * Extracts cookies and anti-bot tokens directly from the Chrome browser session
 */

export class ShopeeAuthManager {
  constructor(options = {}) {
    this.domain = options.domain || 'shopee.ph';
    this.cookies = {};
    this.csrfToken = '';
    this.spcTokenId = '';
    this.userId = '';
    this.isReady = false;
  }

  /**
   * Tự động trích xuất Cookie của Shopee từ trình duyệt
   */
  async initialize() {
    if (typeof chrome !== 'undefined' && chrome.cookies && chrome.cookies.getAll) {
      try {
        const domainsToQuery = [this.domain, `.${this.domain}`];
        if (!this.domain.includes('shopee.ph')) {
          domainsToQuery.push('shopee.ph', '.shopee.ph');
        } else {
          domainsToQuery.push('shopee.vn', '.shopee.vn');
        }

        const cookiePromises = domainsToQuery.map(dom => 
          new Promise(r => chrome.cookies.getAll({ domain: dom }, c => r(c || [])))
        );
        const cookieResults = await Promise.all(cookiePromises);
        const cookieList = cookieResults.flat();

        this.cookies = {};
        for (const c of cookieList) {
          this.cookies[c.name] = c.value;
        }

        this.csrfToken = this.cookies['csrftoken'] || '';
        this.spcTokenId = this.cookies['SPC_T_ID'] || '';
        this.userId = this.cookies['SPC_U'] || '';
        this.isReady = true;

        return {
          success: true,
          cookieCount: cookieList.length,
          hasSession: !!this.cookies['SPC_SI'],
          userId: this.userId,
        };
      } catch (err) {
        console.warn('ShopeeAuthManager: Không thể trích xuất cookie tự động:', err);
      }
    }

    // Môi trường không có chrome.cookies (hoặc test)
    this.isReady = true;
    return { success: false, reason: 'Chạy ngoài môi trường Chrome Extension API' };
  }

  /**
   * Trả về chuỗi Cookie header nếu cần thiết
   */
  getCookieString() {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  /**
   * Tạo headers cho request Shopee
   */
  buildHeaders(customHeaders = {}) {
    const headers = {
      ...customHeaders,
      'Referer': `https://${this.domain}/`,
    };

    if (this.csrfToken) {
      headers['X-CSRFToken'] = this.csrfToken;
    }

    return headers;
  }
}
