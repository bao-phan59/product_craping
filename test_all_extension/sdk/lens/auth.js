/**
 * Google Lens SDK — Auth & Session Cookie Manager
 * Handles Google session cookies, consent tokens, and browser state for lens.google.com
 */

import { DEFAULT_LENS_HEADERS } from './constants.js';

export class GoogleLensAuthManager {
  constructor() {
    this.cookies = {};
    this.hasAccount = false;
    this.isReady = false;
  }

  /**
   * Tự động kiểm tra và trích xuất Cookie của Google từ trình duyệt
   */
  async initialize() {
    if (typeof chrome !== 'undefined' && chrome.cookies && chrome.cookies.getAll) {
      try {
        const cookieList = await new Promise((resolve, reject) => {
          chrome.cookies.getAll({ domain: 'google.com' }, (cookies) => {
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            resolve(cookies || []);
          });
        });

        this.cookies = {};
        for (const c of cookieList) {
          this.cookies[c.name] = c.value;
        }

        this.hasAccount = !!(this.cookies['SID'] || this.cookies['HSID'] || this.cookies['SAPISID']);
        this.isReady = true;

        return {
          success: true,
          cookieCount: cookieList.length,
          hasGoogleAccount: this.hasAccount,
          hasConsent: !!this.cookies['CONSENT'],
        };
      } catch (err) {
        console.warn('GoogleLensAuthManager: Không thể đọc cookie google.com:', err);
      }
    }

    this.isReady = true;
    return { success: false, reason: 'Chạy ngoài môi trường Chrome Extension API' };
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
   * Xây dựng headers chuẩn cho request Google Lens
   */
  buildHeaders(customHeaders = {}) {
    return {
      ...DEFAULT_LENS_HEADERS,
      ...customHeaders,
    };
  }
}
