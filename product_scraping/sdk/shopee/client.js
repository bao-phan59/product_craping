/**
 * Shopee Extension SDK — Core Client Interface
 * High-level scraping client running directly in Chrome Extension MV3
 * Supports: Standalone Fetch & In-Tab Scripting Executor (world: 'MAIN')
 */

import { ShopeeEndpoints, DEFAULT_SHOPEE_HEADERS, SortBy, getShopeeEndpoints, getDefaultShopeeHeaders, DEFAULT_SHOPEE_DOMAIN } from './constants.js';
import { ShopeeAuthManager } from './auth.js';
import { ShopeeParser } from './parser.js';

export class ShopeeExtensionSDK {
  constructor(options = {}) {
    const domain = options.domain || DEFAULT_SHOPEE_DOMAIN;
    this.domain = domain;
    this.endpoints = getShopeeEndpoints(domain);
    this.defaultHeaders = getDefaultShopeeHeaders(domain);
    this.options = {
      domain,
      timeout: 15000,
      autoInTabBypass: true,
      ...options,
    };

    this.auth = new ShopeeAuthManager({ domain });
  }

  /**
   * Khởi tạo và nạp phiên Cookie
   */
  async initialize() {
    return await this.auth.initialize();
  }

  /**
   * Tìm tab Shopee đang mở trên toàn bộ cửa sổ trình duyệt (quét shopee.ph trước, sau đó shopee.vn)
   */
  async getActiveShopeeTab() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      try {
        const tabs = await new Promise((resolve) => {
          chrome.tabs.query({}, (all) => {
            if (chrome.runtime.lastError) return resolve([]);
            resolve(all || []);
          });
        });

        // Ưu tiên tìm tab shopee.ph nếu đang chạy thị trường PH, hoặc tab shopee bất kỳ
        const found = tabs.find(t => {
          const u = (t.url || t.pendingUrl || '').toLowerCase();
          return u.includes(this.domain) || u.includes('shopee.ph') || u.includes('shopee.vn') || u.includes('shopee.com');
        });
        return found || null;
      } catch (err) {
        console.warn('ShopeeSDK: Lỗi query tabs:', err);
      }
    }
    return null;
  }

  /**
   * Mở một tab Shopee mới để nạp session nếu chưa có
   */
  async openShopeeTab() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      return await new Promise((resolve) => {
        chrome.tabs.create({ url: `https://${this.domain}/`, active: true }, (tab) => resolve(tab));
      });
    }
    return null;
  }

  /**
   * Lấy chi tiết sản phẩm theo URL Shopee
   * @param {string} url 
   */
  async getItemByUrl(url) {
    const parsed = ShopeeParser.parseShopeeUrl(url);
    if (!parsed) {
      throw new Error(`URL Shopee không hợp lệ hoặc không trích xuất được ID: ${url}`);
    }
    return await this.getItemDetail(parsed.itemId, parsed.shopId);
  }

  /**
   * Lấy chi tiết sản phẩm, toàn bộ ảnh 1024px, video và SKU theo itemId & shopId
   * Hỗ trợ tự động fallback giữa /api/v4/pdp/get_pc và /api/v4/item/get
   * @param {string|number} itemId 
   * @param {string|number} shopId 
   */
  async getItemDetail(itemId, shopId) {
    let lastError = null;

    // Cách 1: Thử endpoint PDP PC (/api/v4/pdp/get_pc)
    try {
      const pdpParams = new URLSearchParams({
        item_id: itemId.toString(),
        shop_id: shopId.toString(),
      });
      const pdpUrl = `${this.endpoints.API_V4_PDP_GET_PC}?${pdpParams.toString()}`;
      console.log('ShopeeSDK: Thử endpoint PDP:', pdpUrl);
      const pdpJson = await this._fetchJson(pdpUrl);
      return ShopeeParser.parseItemDetail(pdpJson);
    } catch (err) {
      console.warn('ShopeeSDK: Endpoint PDP thất bại, thử fallback sang /api/v4/item/get...', err.message);
      lastError = err;
    }

    // Cách 2: Fallback sang endpoint truyền thống (/api/v4/item/get)
    try {
      const params = new URLSearchParams({
        itemid: itemId.toString(),
        shopid: shopId.toString(),
      });
      const legacyUrl = `${this.endpoints.API_V4_ITEM_GET}?${params.toString()}`;
      console.log('ShopeeSDK: Thử endpoint Legacy:', legacyUrl);
      const rawJson = await this._fetchJson(legacyUrl);
      return ShopeeParser.parseItemDetail(rawJson);
    } catch (err) {
      console.error('ShopeeSDK: Cả 2 endpoint đều thất bại:', err);
      throw lastError || err;
    }
  }

  /**
   * Tìm kiếm sản phẩm Shopee theo từ khóa
   * @param {string} keyword 
   * @param {Object} options 
   * @param {number} [options.limit=20]
   * @param {number} [options.page=0]
   * @param {string} [options.sortBy='relevancy']
   */
  async searchItems(keyword, options = {}) {
    const {
      limit = 20,
      page = 0,
      sortBy = SortBy.RELEVANCY,
    } = options;

    const newest = page * limit;

    // Bộ tham số sạch chuẩn của Shopee Web (không kích hoạt cờ strict bot của PAGE_GLOBAL_SEARCH)
    const params = new URLSearchParams({
      by: sortBy,
      keyword: keyword,
      limit: limit.toString(),
      newest: newest.toString(),
      order: sortBy === SortBy.PRICE_ASC ? 'asc' : 'desc',
      page_type: 'search',
    });

    const url = `${this.endpoints.API_V4_SEARCH}?${params.toString()}`;
    const rawJson = await this._fetchJson(url);

    return {
      keyword,
      totalCount: rawJson?.total_count || 0,
      items: ShopeeParser.parseSearchResults(rawJson),
      raw: rawJson,
    };
  }

  /**
   * Lấy đánh giá khách hàng kèm hình ảnh và video thực tế
   * @param {string|number} itemId 
   * @param {string|number} shopId 
   * @param {Object} options 
   */
  async getItemReviews(itemId, shopId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      filterType = 0,
    } = options;

    const params = new URLSearchParams({
      itemid: itemId.toString(),
      shopid: shopId.toString(),
      limit: limit.toString(),
      offset: offset.toString(),
      type: filterType.toString(),
      filter: '1',
      flag: '1',
    });

    const url = `${this.endpoints.API_V2_RATINGS}?${params.toString()}`;
    const rawJson = await this._fetchJson(url);

    return {
      itemId,
      shopId,
      reviews: ShopeeParser.parseReviews(rawJson),
      raw: rawJson,
    };
  }

  /**
   * Alias cho getItemReviews để tương thích hoàn toàn với workflow pipeline
   */
  async getItemRatings(itemId, shopId, options = {}) {
    return await this.getItemReviews(itemId, shopId, options);
  }

  /**
   * Lấy thông tin Shop bán lẻ
   * @param {string|number} shopId 
   */
  async getShopInfo(shopId) {
    const params = new URLSearchParams({
      shopid: shopId.toString(),
    });

    const url = `${this.endpoints.API_V4_SHOP_INFO}?${params.toString()}`;
    const rawJson = await this._fetchJson(url);

    const data = rawJson?.data || {};
    return {
      shopId: data.shopid,
      userId: data.userid,
      name: data.name || '',
      ratingStar: data.rating_star,
      itemCount: data.item_count,
      followerCount: data.follower_count,
      responseRate: data.response_rate,
      location: data.place || '',
      coverImage: data.cover || '',
    };
  }

  /**
   * Điều phối fetch: Ưu tiên in-tab execution nếu có tab shopee.vn mở sẵn, hoặc fallback sang standalone fetch
   */
  async _fetchJson(url) {
    let tabDetected = false;
    let tabId = null;

    // 1. Tự động kiểm tra In-Tab Execution (Bypass 100% Shopee SGW 90309999)
    if (this.options.autoInTabBypass) {
      const activeTab = await this.getActiveShopeeTab();
      if (activeTab && activeTab.id) {
        tabDetected = true;
        tabId = activeTab.id;
        console.log(`ShopeeSDK: 🟢 Đã tìm thấy Tab Shopee [ID: ${tabId}, URL: ${activeTab.url}]. Chạy In-Tab Request (world: MAIN)...`);
        try {
          return await this._fetchViaTabScripting(tabId, url);
        } catch (tabErr) {
          console.warn('ShopeeSDK: In-tab execution gặp lỗi, thử lại bằng direct fetch:', tabErr);
        }
      } else {
        console.log('ShopeeSDK: 🟡 Không tìm thấy tab Shopee nào đang mở trong trình duyệt.');
      }
    }

    // 2. Chạy Standalone Fetch qua Extension Context
    const headers = this.auth.buildHeaders(this.defaultHeaders || DEFAULT_SHOPEE_HEADERS);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeout);

    try {
      console.log(`ShopeeSDK: Standalone fetch tới [${url}]`);
      const res = await fetch(url, {
        method: 'GET',
        headers: headers,
        credentials: 'include',
        signal: controller.signal,
      });

      const responseText = await res.text();

      // Kiểm tra mã lỗi SGW 90309999 của Shopee
      if (responseText.includes('90309999') || res.status === 403) {
        console.error('ShopeeSDK: Phát hiện mã chống bot 90309999 từ Shopee ALB:', responseText);
        const error = new Error(`Shopee yêu cầu xác thực phiên thật (Mã 90309999 / 403 Forbidden). Hãy đảm bảo tab https://${this.domain}/ đang mở và đã nạp phiên!`);
        error.status = 403;
        error.errorCode = 90309999;
        error.tabDetected = tabDetected;
        error.tabId = tabId;
        error.url = url;
        error.responseBody = responseText;
        error.responseHeaders = Object.fromEntries(res.headers.entries());
        throw error;
      }

      if (!res.ok) {
        const error = new Error(`Shopee API lỗi HTTP ${res.status}: ${res.statusText || 'Forbidden'}`);
        error.status = res.status;
        error.url = url;
        error.responseBody = responseText;
        throw error;
      }

      const json = JSON.parse(responseText);
      if (json.error && json.error !== 0) {
        throw new Error(json.error_msg || `Shopee API trả về mã lỗi: ${json.error}`);
      }

      return json;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`Yêu cầu Shopee API bị timeout sau ${this.options.timeout}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Thực thi request trực tiếp bên trong Tab Shopee thật với world: 'MAIN'
   */
  async _fetchViaTabScripting(tabId, url) {
    if (typeof chrome === 'undefined' || !chrome.scripting) {
      throw new Error('Chrome Scripting API không khả dụng');
    }

    const language = this.domain.includes('.ph') ? 'en' : 'vi';

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN', // Chạy trực tiếp trong ngữ cảnh trang của Shopee
      func: async (fetchUrl, lang) => {
        try {
          const response = await fetch(fetchUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'X-Requested-With': 'XMLHttpRequest',
              'X-Shopee-Language': lang || 'en',
            },
            credentials: 'include',
          });
          const text = await response.text();
          return { ok: response.ok, status: response.status, text };
        } catch (err) {
          return { ok: false, status: 0, error: err.message };
        }
      },
      args: [url, language],
    });

    const execution = results?.[0]?.result;
    if (!execution) throw new Error('Không nhận được dữ liệu từ Shopee Tab');
    if (!execution.ok) {
      const err = new Error(`Shopee In-Tab HTTP ${execution.status || 0}: ${execution.error || execution.text}`);
      err.status = execution.status;
      err.responseBody = execution.text;
      throw err;
    }

    return JSON.parse(execution.text);
  }
}
