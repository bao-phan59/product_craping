/**
 * Google Lens SDK — Core Client Interface
 * High-level Reverse Image Search & Visual Data Mining client for Chrome Extension MV3
 * Supports: Search by URL, Multipart Blob Upload, Base64 & In-Tab Scripting Bypass
 */

import { GoogleLensEndpoints, GoogleLensConfig, DEFAULT_LENS_HEADERS } from './constants.js';
import { GoogleLensAuthManager } from './auth.js';
import { GoogleLensParser } from './parser.js';

export class GoogleLensSDK {
  constructor(options = {}) {
    this.options = {
      timeout: GoogleLensConfig.TIMEOUT_MS,
      autoInTabBypass: true,
      hl: GoogleLensConfig.DEFAULT_HL,
      entrypoint: GoogleLensConfig.DEFAULT_ENTRYPOINT,
      ...options,
    };

    this.auth = new GoogleLensAuthManager();
  }

  /**
   * Khởi tạo và nạp phiên Google
   */
  async initialize() {
    return await this.auth.initialize();
  }

  /**
   * Tìm kiếm tab Google Lens đang mở trong trình duyệt
   */
  async getActiveLensTab() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      try {
        const tabs = await new Promise((resolve) => {
          chrome.tabs.query({}, (all) => {
            if (chrome.runtime.lastError) return resolve([]);
            resolve(all || []);
          });
        });

        const found = tabs.find(t => t.url && t.url.includes('lens.google.com'));
        return found || null;
      } catch (err) {
        console.warn('GoogleLensSDK: Lỗi query tabs:', err);
      }
    }
    return null;
  }

  /**
   * Mở một tab Google Lens mới
   * @param {string} [url] 
   */
  async openLensTab(url = 'https://lens.google.com/') {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      return await new Promise((resolve) => {
        chrome.tabs.create({ url, active: true }, (tab) => resolve(tab));
      });
    }
    return null;
  }

  /**
   * Tìm kiếm nguồn hàng thị giác từ một liên kết ảnh công khai (Image URL)
   * @param {string} imageUrl - URL ảnh công khai từ Shopee, TikTok, Lazada, v.v.
   * @param {Object} [options]
   */
  async searchByImageUrl(imageUrl, options = {}) {
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('Cần cung cấp liên kết ảnh hợp lệ (Image URL)');
    }

    const hl = options.hl || this.options.hl;
    const targetUrl = `${GoogleLensEndpoints.UPLOAD_BY_URL}?url=${encodeURIComponent(imageUrl)}&hl=${hl}`;
    console.log('GoogleLensSDK: Truy vấn Google Lens bằng URL ảnh:', targetUrl);

    const res = await this._fetchHtml(targetUrl, {
      method: 'GET',
    });

    return GoogleLensParser.parseLensPage(res.html, res.finalUrl || targetUrl);
  }

  /**
   * Upload file ảnh trực tiếp lên Google Lens Web Engine
   * @param {Blob|File} blobOrFile - Đối tượng Blob hoặc File
   * @param {Object} [options]
   */
  async searchByImageBlob(blobOrFile, options = {}) {
    if (!blobOrFile || !(blobOrFile instanceof Blob)) {
      throw new Error('Cần truyền đối tượng Blob hoặc File ảnh');
    }

    const hl = options.hl || this.options.hl;
    const ep = options.entrypoint || this.options.entrypoint;
    const timestamp = Date.now();

    const uploadUrl = `${GoogleLensEndpoints.UPLOAD_MULTIPART}?ep=${ep}&hl=${hl}&re=df&st=${timestamp}`;

    const formData = new FormData();
    formData.append('encoded_image', blobOrFile, 'image.jpg');

    console.log('GoogleLensSDK: Uploading multipart image to Google Lens...');
    const res = await this._fetchHtml(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    return GoogleLensParser.parseLensPage(res.html, res.finalUrl || uploadUrl);
  }

  /**
   * Tìm kiếm từ chuỗi ảnh Base64
   * @param {string} base64Data 
   * @param {string} [mimeType='image/jpeg'] 
   * @param {Object} [options] 
   */
  async searchByBase64(base64Data, mimeType = 'image/jpeg', options = {}) {
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    return await this.searchByImageBlob(blob, options);
  }

  /**
   * Phương thức tìm kiếm thông minh: Tự nhận diện kiểu ảnh (URL, Blob, File, Base64)
   * @param {string|Blob|File} imageSource 
   * @param {Object} [options] 
   */
  async searchLens(imageSource, options = {}) {
    if (!imageSource) {
      throw new Error('Chưa cung cấp hình ảnh để tìm kiếm với Google Lens');
    }

    // 1. Chuỗi Data URL Base64
    if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
      const mimeMatch = imageSource.match(/^data:([^;]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      return await this.searchByBase64(imageSource, mimeType, options);
    }

    // 2. URL trực tuyến thông thường
    if (typeof imageSource === 'string' && (imageSource.startsWith('http://') || imageSource.startsWith('https://'))) {
      return await this.searchByImageUrl(imageSource, options);
    }

    // 3. Chuỗi Base64 thuần
    if (typeof imageSource === 'string' && imageSource.length > 200) {
      return await this.searchByBase64(imageSource, 'image/jpeg', options);
    }

    // 4. Đối tượng File hoặc Blob
    if (imageSource instanceof Blob || (typeof File !== 'undefined' && imageSource instanceof File)) {
      return await this.searchByImageBlob(imageSource, options);
    }

    throw new Error('Định dạng hình ảnh không hợp lệ (hỗ trợ Image URL, File, Blob hoặc Base64)');
  }

  /**
   * Mở trực tiếp trang Google Lens với ảnh được tải lên trong tab mới của Chrome
   * @param {string} imageUrl 
   */
  async openLensInBrowser(imageUrl) {
    const lensUrl = `${GoogleLensEndpoints.UPLOAD_BY_URL}?url=${encodeURIComponent(imageUrl)}&hl=${this.options.hl}`;
    return await this.openLensTab(lensUrl);
  }

  /**
   * Điều phối fetch dữ liệu HTML từ Google Lens
   */
  async _fetchHtml(url, fetchOptions = {}) {
    let tabDetected = false;
    let tabId = null;

    // 1. Kiểm tra In-Tab Execution nếu có Tab lens.google.com mở sẵn
    // Lưu ý: FormData không thể clone qua executeScript args, nên upload FormData dùng Standalone Fetch
    const isFormData = fetchOptions.body && typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;

    if (this.options.autoInTabBypass && !isFormData) {
      const activeTab = await this.getActiveLensTab();
      if (activeTab && activeTab.id) {
        tabDetected = true;
        tabId = activeTab.id;
        console.log(`GoogleLensSDK: 🟢 Tìm thấy Tab Google Lens [ID: ${tabId}]. Thử In-Tab Scripting...`);
        try {
          return await this._fetchViaTabScripting(tabId, url, fetchOptions);
        } catch (tabErr) {
          console.warn('GoogleLensSDK: In-tab execution thất bại, chuyển sang direct fetch:', tabErr);
        }
      }
    }

    // 2. Chạy Standalone Fetch qua Extension Background/Popup
    const headers = this.auth.buildHeaders(fetchOptions.headers || {});
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
      const html = await res.text();

      if (!res.ok && res.status !== 303 && res.status !== 302) {
        throw new Error(`Google Lens HTTP ${res.status}: ${res.statusText}`);
      }

      return {
        html,
        finalUrl: res.url,
        status: res.status,
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`Google Lens bị timeout sau ${this.options.timeout}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Thực thi request trực tiếp bên trong Tab Google Lens thật với world: 'MAIN'
   */
  async _fetchViaTabScripting(tabId, url, fetchOptions = {}) {
    if (typeof chrome === 'undefined' || !chrome.scripting) {
      throw new Error('Chrome Scripting API không khả dụng');
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: async (fetchUrl, isPost) => {
        try {
          const response = await fetch(fetchUrl, {
            method: isPost ? 'POST' : 'GET',
            credentials: 'include',
          });
          const text = await response.text();
          return { ok: response.ok, status: response.status, finalUrl: response.url, text };
        } catch (err) {
          return { ok: false, status: 0, error: err.message };
        }
      },
      args: [url, fetchOptions.method === 'POST'],
    });

    const execution = results?.[0]?.result;
    if (!execution || !execution.ok) {
      throw new Error(`In-Tab Google Lens thất bại: ${execution?.error || execution?.status}`);
    }

    return {
      html: execution.text,
      finalUrl: execution.finalUrl,
      status: execution.status,
    };
  }
}
