/**
 * Authentication and Session Management for Google Gemini Web
 * Extracts Cookies from Chrome Store & scrapes SNlM0e CSRF Action Token
 */

import { Endpoints } from './constants.js';

export class GeminiAuthManager {
  constructor() {
    this.secure1PSID = null;
    this.secure1PSIDTS = null;
    this.actionToken = null; // SNlM0e
    this.buildLabel = null;  // cfb2h
    this.sessionId = null;   // FdrFJe
    this.language = 'vi';    // TuX5cc
    this.lastInitTime = 0;
  }

  /**
   * Trích xuất cookie trực tiếp từ Chrome Extension Cookie API
   */
  async extractCookies() {
    if (typeof chrome === 'undefined' || !chrome.cookies) {
      throw new Error(
        'chrome.cookies API không khả dụng! Hãy chắc chắn extension đã được cấp quyền "cookies" trong manifest.json.'
      );
    }

    try {
      // Tìm cookie theo domain .google.com
      const allCookies = await chrome.cookies.getAll({ domain: 'google.com' });
      
      const psidCookie = allCookies.find(c => c.name === '__Secure-1PSID');
      const psidtsCookie = allCookies.find(c => c.name === '__Secure-1PSIDTS');

      this.secure1PSID = psidCookie ? psidCookie.value : null;
      this.secure1PSIDTS = psidtsCookie ? psidtsCookie.value : null;

      if (!this.secure1PSID) {
        // Thử tìm theo url gemini.google.com
        const altPsid = await chrome.cookies.get({
          url: 'https://gemini.google.com',
          name: '__Secure-1PSID',
        });
        if (altPsid) this.secure1PSID = altPsid.value;
      }

      if (!this.secure1PSID) {
        return {
          authenticated: false,
          error: 'Không tìm thấy cookie __Secure-1PSID. Vui lòng mở https://gemini.google.com và đăng nhập tài khoản Google.',
        };
      }

      console.log('GeminiAuth: Đã tìm thấy cookie __Secure-1PSID.');
      return {
        authenticated: true,
        secure1PSID: this.secure1PSID,
        secure1PSIDTS: this.secure1PSIDTS,
      };
    } catch (err) {
      return {
        authenticated: false,
        error: `Lỗi đọc cookie từ Chrome: ${err.message}`,
      };
    }
  }

  /**
   * Bóc tách Action Token (SNlM0e), Build Label (cfb2h), Session ID (FdrFJe) từ gemini.google.com/app
   */
  async fetchSessionTokens() {
    try {
      const response = await fetch(Endpoints.INIT, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'User-Agent': navigator.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Referer': 'https://gemini.google.com/',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} khi truy cập ${Endpoints.INIT}`);
      }

      const html = await response.text();

      // Bóc tách SNlM0e (hỗ trợ cả có khoảng trắng \s*)
      const snlmMatch = html.match(/"SNlM0e":\s*"([^"]+)"/);
      if (snlmMatch && snlmMatch[1]) {
        this.actionToken = snlmMatch[1];
      } else {
        const snlmAlt = html.match(/\["SNlM0e",\[\],null,"([^"]+)"/);
        if (snlmAlt && snlmAlt[1]) {
          this.actionToken = snlmAlt[1];
        }
      }

      // Bóc tách cfb2h (Build Label)
      const blMatch = html.match(/"cfb2h":\s*"([^"]+)"/);
      if (blMatch && blMatch[1]) {
        this.buildLabel = blMatch[1];
      } else {
        this.buildLabel = 'boq_assistant-bard-web-server_20250220.00_p0';
      }

      // Bóc tách FdrFJe (Session ID)
      const sessMatch = html.match(/"FdrFJe":\s*"([^"]+)"/);
      if (sessMatch && sessMatch[1]) {
        this.sessionId = sessMatch[1];
      }

      // Bóc tách ngôn ngữ TuX5cc
      const langMatch = html.match(/"TuX5cc":\s*"([^"]+)"/);
      if (langMatch && langMatch[1]) {
        this.language = langMatch[1];
      }

      if (!this.actionToken) {
        throw new Error(
          'Không tìm thấy token SNlM0e trên trang Gemini. Hãy mở https://gemini.google.com để xác nhận tài khoản hoạt động bình thường.'
        );
      }

      console.log('GeminiAuth: Tokens initialized successfully. SNlM0e length:', this.actionToken.length, 'bl:', this.buildLabel);

      this.lastInitTime = Date.now();
      return {
        success: true,
        actionToken: this.actionToken,
        buildLabel: this.buildLabel,
        sessionId: this.sessionId,
        language: this.language,
      };
    } catch (err) {
      return {
        success: false,
        error: `Lỗi khởi tạo session Gemini: ${err.message}`,
      };
    }
  }

  /**
   * Khởi tạo toàn bộ chu trình xác thực
   */
  async initialize() {
    if (this.isSessionValid()) {
      return {
        authenticated: true,
        actionToken: this.actionToken,
        buildLabel: this.buildLabel,
        sessionId: this.sessionId,
        secure1PSID: this.secure1PSID,
      };
    }

    const cookieStatus = await this.extractCookies();
    if (!cookieStatus.authenticated) {
      return cookieStatus;
    }

    const tokenStatus = await this.fetchSessionTokens();
    if (!tokenStatus.success) {
      return {
        authenticated: false,
        error: tokenStatus.error,
      };
    }

    return {
      authenticated: true,
      actionToken: this.actionToken,
      buildLabel: this.buildLabel,
      sessionId: this.sessionId,
      secure1PSID: this.secure1PSID,
    };
  }

  isSessionValid() {
    const FIVE_MINUTES = 5 * 60 * 1000;
    return Boolean(this.actionToken && (Date.now() - this.lastInitTime < FIVE_MINUTES));
  }
}
