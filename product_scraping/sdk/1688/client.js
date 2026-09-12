/**
 * Alibaba 1688 SDK — Core Client Interface
 * High-level scraping & Visual Search client running directly in Chrome Extension MV3
 * Supports: Standalone Fetch, H5 MTop MD5 Signer & In-Tab Scripting Executor (world: 'MAIN')
 */

import { Alibaba1688Endpoints, Alibaba1688Config, DEFAULT_1688_HEADERS, SortBy1688 } from './constants.js';
import { Alibaba1688AuthManager } from './auth.js';
import { Alibaba1688Parser } from './parser.js';
import { generateH5Sign } from './signer.js';
import { normalizeImageToBase64 } from './image-utils.js';

export class Alibaba1688SDK {
  constructor(options = {}) {
    this.options = {
      timeout: 25000,
      autoInTabBypass: true,
      exchangeRate: Alibaba1688Config.EXCHANGE_RATE_CNY_VND,
      appKey: Alibaba1688Config.DEFAULT_APP_KEY,
      ...options,
    };

    this.auth = new Alibaba1688AuthManager();
  }

  /**
   * Khởi tạo và nạp phiên Cookie
   */
  async initialize() {
    return await this.auth.initialize();
  }

  /**
   * Tìm tab 1688 đang mở trên toàn bộ cửa sổ trình duyệt
   */
  async getActive1688Tab() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      try {
        const tabs = await new Promise((resolve) => {
          chrome.tabs.query({}, (all) => {
            if (chrome.runtime.lastError) return resolve([]);
            resolve(all || []);
          });
        });

        const found = tabs.find(t => t.url && (t.url.includes('1688.com') || t.url.includes('s.1688.com')));
        return found || null;
      } catch (err) {
        console.warn('Alibaba1688SDK: Lỗi query tabs:', err);
      }
    }
    return null;
  }

  /**
   * Mở một tab 1688 mới để nạp session nếu chưa có
   */
  async open1688Tab() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      return await new Promise((resolve) => {
        chrome.tabs.create({ url: 'https://s.1688.com/', active: true }, (tab) => resolve(tab));
      });
    }
    return null;
  }

  /**
   * Chuyển đổi các định dạng ảnh khác nhau (URL, Blob, File, Base64) thành chuỗi Base64 sạch
   * @param {string|Blob|File} imageSource 
   */
  async _normalizeImageToBase64(imageSource) {
    return await normalizeImageToBase64(imageSource);
  }

  /**
   * Upload ảnh lên hệ thống H5 MTop của Alibaba để lấy Image ID
   * @param {string|Blob|File} imageSource - URL ảnh, File, Blob hoặc Base64
   * @returns {Promise<{ imageId: string, requestId: string, sessionId: string }>}
   */
  async uploadImage(imageSource) {
    const base64Data = await this._normalizeImageToBase64(imageSource);
    const appKey = this.options.appKey || Alibaba1688Config.DEFAULT_APP_KEY;
    const uploadUrl = Alibaba1688Endpoints.API_H5_PUT_IMAGE;

    // Đảm bảo auth đã khởi tạo
    if (!this.auth.isReady || !this.auth.getToken()) {
      await this.auth.initialize();
    }

    const bodyDict = {
      imageBase64: base64Data,
      appName: Alibaba1688Config.UPLOAD_APP_NAME,
      appKey: Alibaba1688Config.UPLOAD_APP_KEY,
    };
    const bodyStr = JSON.stringify(bodyDict);

    // Ký chữ ký H5
    let timestamp = Date.now();
    let token = this.auth.getToken() || '';
    let sign = generateH5Sign(token, timestamp, appKey, bodyStr);

    const buildUploadParams = (t, s) => ({
      jsv: Alibaba1688Config.DEFAULT_JSV,
      appKey: appKey,
      t: String(t),
      sign: s,
      api: 'mtop.1688.imageService.putImage',
      ecode: '0',
      v: '1.0',
      type: 'originaljson',
      dataType: 'jsonp',
    });

    const formData = `data=${encodeURIComponent(bodyStr)}`;
    const fullUploadUrl = `${uploadUrl}?${new URLSearchParams(buildUploadParams(timestamp, sign)).toString()}`;

    console.log('Alibaba1688SDK: Uploading image to Alibaba H5 MTop...');
    let resJson = await this._fetchJson(fullUploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData,
    });

    // Kiểm tra và tự làm mới nếu Token H5 hết hạn hoặc chưa có cookie
    const retCode = Array.isArray(resJson?.ret) ? resJson.ret[0] : '';
    if (retCode.includes('FAIL_SYS_TOKEN_EXPIRED') || retCode.includes('FAIL_SYS_ILLEGAL_ACCESS') || retCode.includes('FAIL_SYS_TOKEN_EMPTY')) {
      console.warn('Alibaba1688SDK: Token H5 hết hạn hoặc chưa có cookie, đang làm mới và ký lại...');

      // 1. Nếu gateway trả về token mới trong trường "c", bóc tách và nạp ngay
      if (resJson?.c && typeof resJson.c === 'string' && resJson.c.includes(';')) {
        const parts = resJson.c.split(';');
        const newH5tk = parts[0];
        const newH5tkEnc = parts[1] || '';
        if (newH5tk.includes('_')) {
          token = newH5tk.split('_')[0];
          this.auth.setToken(token);
          if (typeof chrome !== 'undefined' && chrome.cookies && chrome.cookies.set) {
            chrome.cookies.set({ url: 'https://s.1688.com/', domain: '.1688.com', name: '_m_h5_tk', value: newH5tk, path: '/' }, () => {});
            if (newH5tkEnc) chrome.cookies.set({ url: 'https://s.1688.com/', domain: '.1688.com', name: '_m_h5_tk_enc', value: newH5tkEnc, path: '/' }, () => {});
          }
        }
      } else {
        await this.auth.initialize();
        token = this.auth.getToken() || '';
      }

      timestamp = Date.now();
      sign = generateH5Sign(token, timestamp, appKey, bodyStr);

      const retryUrl = `${uploadUrl}?${new URLSearchParams(buildUploadParams(timestamp, sign)).toString()}`;
      resJson = await this._fetchJson(retryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: formData,
      });
    }

    const data = resJson?.data || {};
    if (data.imageId) {
      console.log('Alibaba1688SDK: 🟢 Upload ảnh thành công! ImageId:', data.imageId);
      return {
        imageId: data.imageId,
        requestId: data.requestId || '',
        sessionId: data.sessionId || '',
      };
    }

    const errorMsg = resJson?.ret?.[0] || 'Upload ảnh lên 1688 thất bại';
    console.error('Alibaba1688SDK: Lỗi phản hồi:', resJson);
    throw new Error(`Upload ảnh lên 1688 thất bại: ${errorMsg}`);
  }

  /**
   * Tìm kiếm nguồn hàng sỉ bằng hình ảnh (Visual Image Search)
   * @param {string|Blob|File|Object} imageSourceOrUploadResult - Ảnh hoặc kết quả upload { imageId, requestId, sessionId }
   * @param {Object} [options]
   * @param {number} [options.page=1]
   * @param {number} [options.pageSize=40]
   */
  async searchByImage(imageSourceOrUploadResult, options = {}) {
    const {
      page = 1,
      pageSize = 40,
    } = options;

    let uploadResult = null;
    if (imageSourceOrUploadResult && imageSourceOrUploadResult.imageId) {
      uploadResult = imageSourceOrUploadResult;
    } else {
      uploadResult = await this.uploadImage(imageSourceOrUploadResult);
    }

    const searchParams = new URLSearchParams({
      tab: 'imageSearch',
      imageId: uploadResult.imageId,
      imageIdList: uploadResult.imageId,
      filt: 'y',
      beginPage: String(page),
      pageSize: String(pageSize),
      pailitaoCategoryId: '',
      pageName: 'image',
      requestId: uploadResult.requestId || '',
      sessionId: uploadResult.sessionId || '',
    });

    const searchUrl = `${Alibaba1688Endpoints.API_IMAGE_SEARCH_OFFERS}?${searchParams.toString()}`;
    console.log('Alibaba1688SDK: Querying image search offers:', searchUrl);

    const rawJson = await this._fetchJson(searchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://s.1688.com/',
      },
    });

    const offers = Alibaba1688Parser.parseImageSearchResults(rawJson, this.options.exchangeRate);

    return {
      imageId: uploadResult.imageId,
      requestId: uploadResult.requestId,
      sessionId: uploadResult.sessionId,
      page,
      pageSize,
      totalCount: rawJson?.data?.data?.totalCount || rawJson?.data?.totalCount || offers.length,
      offers,
      raw: rawJson,
    };
  }

  /**
   * Tìm kiếm bằng URL ảnh công khai (Shopee, TikTok, Lazada...)
   * @param {string} imageUrl 
   * @param {Object} [options] 
   */
  async searchByImageUrl(imageUrl, options = {}) {
    return await this.searchByImage(imageUrl, options);
  }

  /**
   * Tìm kiếm sản phẩm theo từ khóa trên 1688
   * @param {string} keyword - Từ khóa (tiếng Trung hoặc Pinyin)
   * @param {Object} [options]
   * @param {number} [options.page=1]
   * @param {number} [options.pageSize=40]
   * @param {string} [options.sortBy]
   */
  async searchByKeyword(keyword, options = {}) {
    const {
      page = 1,
      pageSize = 40,
      sortBy = SortBy1688.DEFAULT,
    } = options;

    const params = new URLSearchParams({
      keywords: keyword,
      beginPage: String(page),
      pageSize: String(pageSize),
      pageType: 'normal',
      sortType: sortBy,
    });

    const searchUrl = `${Alibaba1688Endpoints.API_MARKET_SEARCH_OFFERS}?${params.toString()}`;
    console.log('Alibaba1688SDK: Querying keyword offers:', searchUrl);

    const rawJson = await this._fetchJson(searchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://s.1688.com/',
      },
    });

    const offers = Alibaba1688Parser.parseKeywordSearchResults(rawJson, this.options.exchangeRate);

    return {
      keyword,
      page,
      pageSize,
      totalCount: rawJson?.data?.data?.totalCount || rawJson?.data?.totalCount || offers.length,
      offers,
      raw: rawJson,
    };
  }

  /**
   * Trích xuất thông tin sản phẩm từ liên kết 1688
   * @param {string} url 
   */
  async getOfferByUrl(url) {
    const offerId = Alibaba1688Parser.parseOfferUrl(url);
    if (!offerId) {
      throw new Error(`URL không chứa Offer ID hợp lệ của 1688: ${url}`);
    }
    return await this.getOfferDetail(offerId);
  }

  /**
   * Lấy chi tiết sản phẩm 1688 theo Offer ID và trích xuất bộ ảnh Gallery HD
   * @param {string|number} offerId 
   */
  async getOfferDetail(offerId) {
    const detailUrl = Alibaba1688Endpoints.OFFER_DETAIL_URL(offerId);
    try {
      const res = await this._fetchJson(detailUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Referer': 'https://s.1688.com/'
        }
      });

      const html = typeof res === 'string' ? res : (res?.rawText || JSON.stringify(res || {}));
      const galleryImages = [];
      const seenImgs = new Set();

      // 1. Trích xuất ảnh alicdn tiêu chuẩn từ trang chi tiết sản phẩm
      const imgRegex = /https:\/\/cbu01\.alicdn\.com\/img\/ibank\/[a-zA-Z0-9_\-\.\/]+(?:\.800x800|\.search|\.300x300)?\.jpg/gi;
      let m;
      while ((m = imgRegex.exec(html)) !== null) {
        const cleanUrl = Alibaba1688Parser.formatImageUrl(m[0]);
        if (!seenImgs.has(cleanUrl)) {
          seenImgs.add(cleanUrl);
          galleryImages.push(cleanUrl);
        }
      }

      // 2. Trích xuất cấu trúc dữ liệu nhúng window.__INIT_DATA nếu có
      const initMatch = html.match(/window\.__INIT_DATA\s*=\s*(\{[\s\S]*?\});/);
      let pageData = null;
      if (initMatch) {
        try { pageData = JSON.parse(initMatch[1]); } catch (_) {}
      }

      if (Array.isArray(pageData?.data?.offerData?.images)) {
        pageData.data.offerData.images.forEach(img => {
          const u = Alibaba1688Parser.formatImageUrl(img);
          if (u && !seenImgs.has(u)) {
            seenImgs.add(u);
            galleryImages.push(u);
          }
        });
      }

      return {
        offerId: String(offerId),
        detailUrl,
        images: galleryImages,
        imageUrls: galleryImages,
        rawHtmlAvailable: Boolean(html && html.length > 500)
      };
    } catch (err) {
      console.warn(`Alibaba1688SDK: Không thể tải chi tiết #${offerId}: ${err.message}`);
      return {
        offerId: String(offerId),
        detailUrl,
        images: [],
        imageUrls: []
      };
    }
  }

  /**
   * Điều phối fetch: Ưu tiên in-tab execution nếu có tab 1688 đang mở, hoặc fallback sang standalone fetch
   */
  async _fetchJson(url, fetchOptions = {}) {
    let tabDetected = false;
    let tabId = null;

    // 1. Tự động kiểm tra In-Tab Execution (Bypass WAF / Captcha của Alibaba)
    if (this.options.autoInTabBypass) {
      const activeTab = await this.getActive1688Tab();
      if (activeTab && activeTab.id) {
        tabDetected = true;
        tabId = activeTab.id;
        console.log(`Alibaba1688SDK: 🟢 Tìm thấy Tab 1688 [ID: ${tabId}]. Đang thực thi In-Tab Request (world: MAIN)...`);
        try {
          return await this._fetchViaTabScripting(tabId, url, fetchOptions);
        } catch (tabErr) {
          console.warn('Alibaba1688SDK: In-tab execution gặp sự cố, thử lại bằng direct fetch:', tabErr);
        }
      } else {
        console.log('Alibaba1688SDK: 🟡 Không tìm thấy tab 1688 nào đang mở trong trình duyệt.');
      }
    }

    // 2. Chạy Standalone Fetch qua Extension Context
    const headers = this.auth.buildHeaders(fetchOptions.headers || {});
    delete headers['Origin'];
    delete headers['origin'];
    delete headers['Referer'];
    delete headers['referer'];
    delete headers['User-Agent'];
    delete headers['user-agent'];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeout);

    try {
      const isGet = !fetchOptions.method || fetchOptions.method.toUpperCase() === 'GET';
      const fetchInit = {
        method: fetchOptions.method || 'GET',
        headers: headers,
        credentials: 'include',
        signal: controller.signal,
      };

      if (!isGet && fetchOptions.body) {
        fetchInit.body = fetchOptions.body;
      }

      const res = await fetch(url, fetchInit);
      const responseText = await res.text();

      // Kiểm tra trang chuyển hướng đăng nhập hoặc chặn Punish của Alibaba
      if (res.url.includes('login.1688.com') || res.url.includes('punish') || res.url.includes('sec.1688.com')) {
        const error = new Error('Alibaba 1688 yêu cầu xác thực phiên hoặc Captcha. Hãy bấm nút "🌐 Mở Tab 1688" để nạp phiên!');
        error.status = 403;
        error.isAntiBot = true;
        error.tabDetected = tabDetected;
        error.tabId = tabId;
        throw error;
      }

      if (!res.ok) {
        const error = new Error(`1688 API HTTP ${res.status}: ${res.statusText || 'Error'}`);
        error.status = res.status;
        error.responseBody = responseText;
        throw error;
      }

      try {
        return JSON.parse(responseText);
      } catch (parseErr) {
        return { rawText: responseText };
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`Yêu cầu 1688 API bị quá thời gian (timeout ${this.options.timeout}ms)`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Thực thi request trực tiếp bên trong Tab 1688 thật với world: 'MAIN'
   */
  async _fetchViaTabScripting(tabId, url, fetchOptions = {}) {
    if (typeof chrome === 'undefined' || !chrome.scripting) {
      throw new Error('Chrome Scripting API không khả dụng');
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: async (fetchUrl, opts) => {
        try {
          const isGet = !opts.method || opts.method.toUpperCase() === 'GET';
          const fetchInit = {
            method: opts.method || 'GET',
            headers: opts.headers || {
              'Accept': 'application/json, text/plain, */*',
            },
            credentials: 'include',
          };
          if (!isGet && opts.body) {
            fetchInit.body = opts.body;
          }
          const response = await fetch(fetchUrl, fetchInit);
          const text = await response.text();
          return {
            ok: response.ok,
            status: response.status,
            finalUrl: response.url,
            text,
          };
        } catch (err) {
          return { ok: false, status: 0, error: err.message };
        }
      },
      args: [url, fetchOptions],
    });

    const execution = results?.[0]?.result;
    if (!execution) throw new Error('Không nhận được dữ liệu phản hồi từ Tab 1688');

    if (execution.finalUrl && (execution.finalUrl.includes('login') || execution.finalUrl.includes('punish'))) {
      const err = new Error('Tab 1688 bị vướng Captcha hoặc yêu cầu đăng nhập.');
      err.isAntiBot = true;
      throw err;
    }

    if (!execution.ok) {
      const err = new Error(`1688 In-Tab HTTP ${execution.status || 0}: ${execution.error || execution.text}`);
      err.status = execution.status;
      throw err;
    }

    try {
      return JSON.parse(execution.text);
    } catch (e) {
      return { rawText: execution.text };
    }
  }
}
