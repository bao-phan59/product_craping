/**
 * Alibaba 1688 SDK — Auth & Session Cookie Manager
 * Handles browser cookie extraction, _m_h5_tk token parsing and MTop session life-cycle
 */

import { DEFAULT_1688_HEADERS, Alibaba1688Endpoints, Alibaba1688Config } from './constants.js';

export class Alibaba1688AuthManager {
  constructor() {
    this.cookies = {};
    this.token = '';
    this.tokenExpire = 0;
    this.cna = '';
    this.tbToken = '';
    this.isReady = false;
  }

  /**
   * Tự động trích xuất Cookie của 1688.com từ trình duyệt
   */
  async initialize() {
    if (typeof chrome !== 'undefined' && chrome.cookies && chrome.cookies.getAll) {
      try {
        const cookieList = await new Promise((resolve, reject) => {
          chrome.cookies.getAll({ domain: '1688.com' }, (cookies) => {
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            resolve(cookies || []);
          });
        });

        this.cookies = {};
        for (const c of cookieList) {
          this.cookies[c.name] = c.value;
        }

        // Trích xuất _m_h5_tk: Chuỗi dạng "<token>_<timestamp>"
        const h5Tk = this.cookies['_m_h5_tk'] || '';
        if (h5Tk && h5Tk.includes('_')) {
          const parts = h5Tk.split('_');
          this.token = parts[0];
          this.tokenExpire = parseInt(parts[1], 10) || 0;
        }

        this.cna = this.cookies['cna'] || '';
        this.tbToken = this.cookies['_tb_token_'] || '';

        // Nếu trình duyệt chưa có token _m_h5_tk hoặc đã hết hạn, tự động bootstrap từ Alibaba Gateway
        if (!this.token || (this.tokenExpire > 0 && Date.now() > this.tokenExpire)) {
          console.log('Alibaba1688AuthManager: Đang bootstrap token H5 từ Alibaba Gateway...');
          await this.bootstrapToken();
        }

        this.isReady = true;

        return {
          success: true,
          cookieCount: cookieList.length,
          hasToken: !!this.token,
          token: this.token,
          cna: this.cna,
          hasSession: !!(this.cookies['cookie2'] || this.cookies['login_aliub_token']),
        };
      } catch (err) {
        console.warn('Alibaba1688AuthManager: Không thể trích xuất cookie tự động:', err);
      }
    }

    this.isReady = true;
    return { success: false, reason: 'Chạy ngoài môi trường Chrome Extension API' };
  }

  /**
   * Tự động gửi 1 request GET nhẹ tới Gateway để Alibaba cấp token _m_h5_tk mới
   */
  async bootstrapToken() {
    try {
      const appKey = Alibaba1688Config.DEFAULT_APP_KEY;
      const initUrl = `${Alibaba1688Endpoints.API_H5_PUT_IMAGE}?jsv=2.7.2&appKey=${appKey}&t=${Date.now()}&api=mtop.1688.imageService.putImage&v=1.0&type=originaljson&dataType=jsonp`;
      const res = await fetch(initUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
        }
      });
      const resJson = await res.json().catch(() => null);

      if (resJson?.c && typeof resJson.c === 'string' && resJson.c.includes(';')) {
        const parts = resJson.c.split(';');
        const newH5tk = parts[0];
        const newH5tkEnc = parts[1] || '';
        if (newH5tk.includes('_')) {
          this.token = newH5tk.split('_')[0];
          this.tokenExpire = parseInt(newH5tk.split('_')[1], 10) || (Date.now() + 3600000);
          this.cookies['_m_h5_tk'] = newH5tk;
          if (newH5tkEnc) this.cookies['_m_h5_tk_enc'] = newH5tkEnc;

          // Đồng bộ vào kho cookie Chrome
          if (typeof chrome !== 'undefined' && chrome.cookies && chrome.cookies.set) {
            chrome.cookies.set({ url: 'https://s.1688.com/', domain: '.1688.com', name: '_m_h5_tk', value: newH5tk, path: '/' }, () => {});
            if (newH5tkEnc) {
              chrome.cookies.set({ url: 'https://s.1688.com/', domain: '.1688.com', name: '_m_h5_tk_enc', value: newH5tkEnc, path: '/' }, () => {});
            }
          }
          console.log('Alibaba1688AuthManager: 🟢 Bootstrap thành công token H5 mới:', this.token);
        }
      }
    } catch (err) {
      console.warn('Alibaba1688AuthManager: Bootstrap token thất bại:', err.message);
    }
  }

  /**
   * Cập nhật cookie từ chuỗi raw (khi người dùng nhập thủ công hoặc từ response header)
   * @param {string} rawCookieStr 
   */
  setFromRawCookieString(rawCookieStr) {
    if (!rawCookieStr) return;
    const items = rawCookieStr.split(';');
    for (const item of items) {
      const trimmed = item.trim();
      if (trimmed.includes('=')) {
        const [k, ...vParts] = trimmed.split('=');
        const kTrim = k.trim();
        const vTrim = vParts.join('=').trim();
        this.cookies[kTrim] = vTrim;
        if (kTrim === '_m_h5_tk' && vTrim.includes('_')) {
          this.token = vTrim.split('_')[0];
        }
      }
    }
  }

  /**
   * Cập nhật token H5 mới
   * @param {string} token 
   */
  setToken(token) {
    this.token = token;
  }

  /**
   * Trả về token hiện tại
   */
  getToken() {
    return this.token;
  }

  /**
   * Kiểm tra token có hợp lệ không
   */
  isTokenValid() {
    if (!this.token) return false;
    if (this.tokenExpire && Date.now() > this.tokenExpire) return false;
    return true;
  }

  /**
   * Trả về chuỗi Cookie header
   */
  getCookieString() {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  /**
   * Tạo headers chuẩn cho request 1688
   */
  buildHeaders(customHeaders = {}) {
    return {
      ...DEFAULT_1688_HEADERS,
      ...customHeaders,
    };
  }
}
