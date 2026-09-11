/**
 * TikTok & Douyin SDK — Auth & Session Cookie Manager
 */

export class TikTokAuthManager {
  constructor() {
    this.tiktokCookies = {};
    this.douyinCookies = {};
    this.ttwid = '';
    this.webId = '';
  }

  /**
   * Tự động trích xuất cookie từ trình duyệt
   */
  async initialize() {
    if (typeof chrome !== 'undefined' && chrome.cookies && chrome.cookies.getAll) {
      try {
        // 1. Trích xuất cookie TikTok
        const ttList = await new Promise((resolve) => {
          chrome.cookies.getAll({ domain: 'tiktok.com' }, (cookies) => resolve(cookies || []));
        });
        for (const c of ttList) {
          this.tiktokCookies[c.name] = c.value;
        }
        this.ttwid = this.tiktokCookies['ttwid'] || '';

        // 2. Trích xuất cookie Douyin
        const dyList = await new Promise((resolve) => {
          chrome.cookies.getAll({ domain: 'douyin.com' }, (cookies) => resolve(cookies || []));
        });
        for (const c of dyList) {
          this.douyinCookies[c.name] = c.value;
        }

        return {
          tiktokReady: ttList.length > 0,
          douyinReady: dyList.length > 0,
          hasTtwid: !!this.ttwid,
        };
      } catch (err) {
        console.warn('Lỗi lấy cookie TikTok/Douyin:', err);
      }
    }

    return { tiktokReady: false, douyinReady: false };
  }

  getTiktokCookieString() {
    return Object.entries(this.tiktokCookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  getDouyinCookieString() {
    return Object.entries(this.douyinCookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }
}
