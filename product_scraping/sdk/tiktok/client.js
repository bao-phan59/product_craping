/**
 * TikTok & Douyin Extension SDK — Core Client Interface
 * Handles signed requests, metadata scraping, In-Tab Bypass, and clean video extraction
 */

import { 
  TikTokEndpoints, 
  DouyinEndpoints, 
  DEFAULT_TIKTOK_HEADERS, 
  DEFAULT_DOUYIN_HEADERS,
  DEFAULT_TIKTOK_WEB_PARAMS 
} from './constants.js';
import { TikTokAuthManager } from './auth.js';
import { TikTokSigner } from './signer.js';
import { TikTokParser } from './parser.js';
import { waitForTabComplete, executeTabScripting } from './transport.js';

export class TikTokExtensionSDK {
  constructor(options = {}) {
    this.options = {
      timeout: 15000,
      autoInTabBypass: true,
      ...options,
    };

    this.auth = new TikTokAuthManager();
  }

  /**
   * Khởi tạo cookie phiên TikTok / Douyin
   */
  async initialize() {
    return await this.auth.initialize();
  }

  /**
   * Quét toàn bộ các tab trình duyệt để tìm tab TikTok hoặc Douyin đang mở
   */
  async getActiveTab(platform = 'tiktok') {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      try {
        const tabs = await new Promise((resolve) => {
          chrome.tabs.query({}, (all) => {
            if (chrome.runtime.lastError) return resolve([]);
            resolve(all || []);
          });
        });

        return tabs.find(t => {
          const u = (t.url || t.pendingUrl || '').toLowerCase();
          if (platform === 'douyin') return u.includes('douyin.com');
          return u.includes('tiktok.com');
        }) || null;
      } catch (err) {
        console.warn('TikTokSDK: Lỗi query tabs:', err);
      }
    }
    return null;
  }

  /**
   * Chờ một tab hoàn tất tải trang (status === 'complete')
   */
  async _waitForTabComplete(tabId, timeoutMs = 15000) {
    return await waitForTabComplete(tabId, timeoutMs);
  }

  /**
   * Đảm bảo có một tab TikTok hoặc Douyin sẵn sàng (đã tải xong hoàn toàn)
   */
  async ensureActiveTab(platform = 'tiktok', onStatusUpdate = null) {
    if (typeof chrome === 'undefined' || !chrome.tabs) return null;

    let tab = await this.getActiveTab(platform);
    if (tab && tab.id) {
      if (tab.status === 'loading') {
        if (onStatusUpdate) onStatusUpdate(`⏳ Đang đợi tab ${platform.toUpperCase()} tải xong...`);
        tab = await this._waitForTabComplete(tab.id, 12000);
      }
      return tab;
    }

    if (onStatusUpdate) onStatusUpdate(`🌐 Đang tự động mở tab ${platform.toUpperCase()}...`);
    const newTab = await this.openTab(platform);
    if (newTab && newTab.id) {
      if (onStatusUpdate) onStatusUpdate(`⏳ Đang tải trang ${platform.toUpperCase()} để nạp bảo mật (vui lòng đợi vài giây)...`);
      tab = await this._waitForTabComplete(newTab.id, 15000);
      // Đợi thêm 1500ms cho webmssdk và ttwid cookie khởi tạo trong DOM
      await new Promise(r => setTimeout(r, 1500));
      return tab || newTab;
    }

    return null;
  }

  /**
   * Mở tab TikTok hoặc Douyin để nạp cookie phiên
   */
  async openTab(platform = 'tiktok') {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      const url = platform === 'douyin' ? 'https://www.douyin.com/' : 'https://www.tiktok.com/';
      return await new Promise((resolve) => {
        chrome.tabs.create({ url, active: true }, (tab) => resolve(tab));
      });
    }
    return null;
  }

  /**
   * Lấy chi tiết video và link tải video KHÔNG LOGO (No Watermark)
   * @param {string} urlOrId 
   */
  async getVideoDetail(urlOrId) {
    const parsed = TikTokParser.parseVideoId(urlOrId);
    if (!parsed) {
      throw new Error(`Không nhận diện được ID video từ: ${urlOrId}`);
    }

    if (parsed.platform === 'douyin') {
      return await this.getDouyinVideoDetail(parsed.id);
    }

    // TikTok Global Endpoint
    const params = new URLSearchParams({
      ...DEFAULT_TIKTOK_WEB_PARAMS,
      itemId: parsed.id,
    });

    const rawUrl = `${TikTokEndpoints.ITEM_DETAIL}?${params.toString()}`;

    try {
      const rawJson = await this._fetchJson(rawUrl, DEFAULT_TIKTOK_HEADERS, 'tiktok');
      return TikTokParser.parseTiktokDetail(rawJson);
    } catch (err) {
      console.warn('TikTokSDK: Detail API thất bại, thử fallback sang oEmbed...', err.message);
      return await this._fallbackOEmbed(urlOrId, parsed.id);
    }
  }

  /**
   * Tìm kiếm video sản phẩm / review trên TikTok theo từ khóa
   * Tự động fallback giữa /api/search/item/full/ và /api/search/general/full/
   * @param {string} keyword 
   * @param {Object} options 
   */
  async searchVideos(keyword, options = {}) {
    if (options.platform === 'douyin') {
      return await this.searchDouyin(keyword, options);
    }
    const { offset = 0, count = 20 } = options;

    const searchId = Date.now().toString() + Math.floor(Math.random() * 900000 + 100000).toString();

    const params = new URLSearchParams({
      ...DEFAULT_TIKTOK_WEB_PARAMS,
      keyword: keyword,
      offset: offset.toString(),
      count: count.toString(),
      search_id: searchId,
      search_source: 'normal_search',
      web_search_code: '{"tiktok":{"client_params_x":{"search_model":{"has_more":true,"offset":' + offset + '},"search_features":{}}}}',
    });

    let rawJson = null;
    let lastError = null;

    // Cách 1: Thử endpoint tổng hợp chuẩn của TikTok Web PC /api/search/general/full/
    try {
      const generalUrl = `${TikTokEndpoints.SEARCH_GENERAL}?${params.toString()}`;
      console.log('TikTokSDK: Thử search endpoint /api/search/general/full/...');
      rawJson = await this._fetchJson(generalUrl, DEFAULT_TIKTOK_HEADERS, 'tiktok');
    } catch (err1) {
      console.warn('TikTokSDK: /api/search/general/full/ thất bại, thử /api/search/item/full/...', err1.message);
      lastError = err1;

      // Cách 2: Thử fallback endpoint /api/search/item/full/
      try {
        const itemUrl = `${TikTokEndpoints.SEARCH_ITEM}?${params.toString()}`;
        rawJson = await this._fetchJson(itemUrl, DEFAULT_TIKTOK_HEADERS, 'tiktok');
      } catch (err2) {
        throw err2 || lastError;
      }
    }

    const videos = TikTokParser.parseTiktokSearchResults(rawJson);

    return {
      keyword,
      hasMore: !!rawJson?.has_more,
      cursor: rawJson?.cursor || 0,
      videos: videos,
      raw: rawJson,
    };
  }

  /**
   * Lấy chi tiết video Douyin không watermark
   * @param {string} awemeId 
   */
  async getDouyinVideoDetail(awemeId) {
    const params = new URLSearchParams({
      aweme_id: awemeId,
      device_platform: 'webapp',
      aid: '6383',
    });

    const rawUrl = `${DouyinEndpoints.ITEM_DETAIL}?${params.toString()}`;
    const rawJson = await this._fetchJson(rawUrl, DEFAULT_DOUYIN_HEADERS, 'douyin');
    return TikTokParser.parseDouyinDetail(rawJson);
  }

  /**
   * Tìm kiếm video trên Douyin Trung Quốc
   * @param {string} keyword 
   * @param {Object} options 
   */
  async searchDouyin(keyword, options = {}) {
    const { offset = 0, count = 20 } = options;

    const params = new URLSearchParams({
      keyword: keyword,
      offset: offset.toString(),
      count: count.toString(),
      search_source: 'normal_search',
      device_platform: 'webapp',
      aid: '6383',
    });

    const rawUrl = `${DouyinEndpoints.SEARCH_ITEM}?${params.toString()}`;
    const rawJson = await this._fetchJson(rawUrl, DEFAULT_DOUYIN_HEADERS, 'douyin');
    const dataList = rawJson?.data || [];
    const videos = [];

    for (const d of dataList) {
      if (d.aweme_info) {
        try {
          videos.push(TikTokParser.parseDouyinDetail(d.aweme_info));
        } catch {}
      }
    }

    return {
      keyword,
      hasMore: !!rawJson?.has_more,
      cursor: rawJson?.cursor || 0,
      videos: videos,
      raw: rawJson,
    };
  }

  /**
   * Fallback oEmbed chính thức của TikTok
   */
  async _fallbackOEmbed(originalUrl, videoId) {
    const oembedUrl = `${TikTokEndpoints.OEMBED}?url=https://www.tiktok.com/@user/video/${videoId}`;
    const res = await fetch(oembedUrl);
    if (!res.ok) throw new Error('Không thể lấy thông tin video qua oEmbed fallback');
    const data = await res.json();

    return {
      id: videoId,
      platform: 'tiktok',
      description: data.title || '',
      video: {
        url: '',
        cover: data.thumbnail_url || '',
        width: data.thumbnail_width || 0,
        height: data.thumbnail_height || 0,
      },
      author: {
        nickname: data.author_name || '',
        uniqueId: data.author_unique_id || '',
      },
      stats: { views: 0, likes: 0 },
      raw: data,
    };
  }

  /**
   * Điều phối fetch: Ưu tiên In-Tab Scripting để mượn native signer & session, hoặc Standalone
   */
  async _fetchJson(url, defaultHeaders = {}, platform = 'tiktok') {
    let tabError = null;

    // 1. Kiểm tra In-Tab Execution nếu có tab TikTok / Douyin đang mở
    if (this.options.autoInTabBypass) {
      const activeTab = await this.getActiveTab(platform);
      if (activeTab && activeTab.id) {
        console.log(`TikTokSDK: 🟢 Tìm thấy tab ${platform} [ID: ${activeTab.id}, URL: ${activeTab.url}]. Chạy In-Tab Request...`);
        try {
          return await this._fetchViaTabScripting(activeTab.id, url);
        } catch (tabErr) {
          console.warn(`TikTokSDK: In-tab fetch ${platform} thất bại, thử lại bằng standalone fetch:`, tabErr);
          tabError = tabErr;
        }
      } else {
        console.log(`TikTokSDK: 🟡 Không tìm thấy tab ${platform} nào đang mở.`);
      }
    }

    // 2. Chạy Standalone Fetch qua Extension Context
    const signedUrl = TikTokSigner.signUrl(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeout);

    try {
      console.log(`TikTokSDK: Standalone fetch tới [${signedUrl.substring(0, 100)}...]`);
      const res = await fetch(signedUrl, {
        method: 'GET',
        headers: defaultHeaders,
        credentials: 'include',
        signal: controller.signal,
      });

      const responseText = await res.text();

      // Bắt trường hợp máy chủ trả về chuỗi rỗng 0 bytes
      if (!responseText || responseText.trim() === '') {
        const error = new Error(
          tabError
            ? `TikTok CDN trả về phản hồi rỗng (0 bytes). In-Tab cũng gặp lỗi: ${tabError.message}. Hãy đảm bảo tab tiktok.com đã tải xong hoàn toàn rồi bấm Tìm Kiếm lại!`
            : `TikTok CDN trả về phản hồi rỗng (0 bytes). Hãy bấm nút "🌐 Mở Tab TikTok" và đợi trang tiktok.com tải xong (đèn chuyển màu xanh) rồi bấm Tìm Kiếm lại để kích hoạt In-Tab Bypass!`
        );
        error.status = res.status;
        error.url = signedUrl;
        error.responseBody = 'Trống (0 bytes)';
        error.rawResponse = {
          status: res.status,
          body: '0 bytes (empty response)',
          tabError: tabError ? { message: tabError.message, debugInfo: tabError.debugInfo } : null,
        };
        error.debugInfo = {
          signedUrl,
          status: res.status,
          mode: tabError ? 'In-Tab Failed -> Standalone Fetch (0 bytes)' : 'Standalone Fetch',
          tabError: tabError ? { message: tabError.message, debugInfo: tabError.debugInfo } : null,
        };
        throw error;
      }

      // Bắt trường hợp Douyin trả về chuỗi "blocked"
      if (responseText.trim() === 'blocked' || responseText.includes('blocked')) {
        const error = new Error('Douyin đã chặn yêu cầu (Phản hồi text: "blocked"). Hãy bấm nút "🌐 Mở Tab Douyin" và đợi trang douyin.com tải xong rồi bấm Tìm Kiếm lại!');
        error.status = 403;
        error.isBlocked = true;
        error.responseBody = responseText;
        error.rawResponse = { status: 403, body: responseText };
        error.url = signedUrl;
        error.debugInfo = { signedUrl, status: 403, mode: 'Standalone Fetch' };
        throw error;
      }

      if (!res.ok) {
        const error = new Error(`TikTok/Douyin API lỗi HTTP ${res.status}: ${res.statusText || 'Error'}`);
        error.status = res.status;
        error.url = signedUrl;
        error.responseBody = responseText;
        try {
          error.rawResponse = JSON.parse(responseText);
        } catch(e) {
          error.rawResponse = { status: res.status, rawText: responseText };
        }
        error.debugInfo = { signedUrl, status: res.status, mode: 'Standalone Fetch' };
        throw error;
      }

      try {
        return JSON.parse(responseText);
      } catch (parseErr) {
        const error = new Error(`Phản hồi TikTok/Douyin không phải JSON hợp lệ: ${responseText.substring(0, 100)}`);
        error.responseBody = responseText;
        error.url = signedUrl;
        error.rawResponse = { status: res.status, rawText: responseText };
        error.debugInfo = { signedUrl, status: res.status };
        throw error;
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        const timeoutErr = new Error(`Yêu cầu TikTok API bị timeout sau ${this.options.timeout}ms`);
        timeoutErr.url = signedUrl;
        timeoutErr.rawResponse = { error: 'Request Aborted / Timeout' };
        timeoutErr.debugInfo = { timeout: this.options.timeout, signedUrl };
        throw timeoutErr;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Thực thi request bên trong Tab TikTok/Douyin thật với world: 'MAIN'
   */
  async _fetchViaTabScripting(tabId, rawUrl) {
    return await executeTabScripting(tabId, rawUrl);
  }
}
