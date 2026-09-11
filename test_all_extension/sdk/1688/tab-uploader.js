/**
 * Alibaba 1688 SDK — In-Tab Scripting Executor
 * Tách riêng logic thực thi In-Tab (world: MAIN) để giảm kích thước file client.js,
 * giúp code sạch sẽ, dễ bảo trì và debug độc lập.
 */

import { Alibaba1688Config } from './constants.js';

/**
 * Thực thi upload ảnh trực tiếp trong Tab 1688 đang mở
 * @param {number} tabId
 * @param {string} base64Data
 * @param {string} [passedToken]
 * @returns {Promise<{ imageId: string, requestId: string, sessionId: string }>}
 */
export async function uploadViaTabScripting(tabId, base64Data, passedToken = '') {
  if (typeof chrome === 'undefined' || !chrome.scripting) {
    throw new Error('Chrome Scripting API không khả dụng');
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'ISOLATED',
    args: [
      base64Data,
      Alibaba1688Config.DEFAULT_APP_KEY,
      Alibaba1688Config.UPLOAD_APP_NAME,
      Alibaba1688Config.UPLOAD_APP_KEY,
      passedToken
    ],
    func: async (b64, appKey, appName, uploadAppKey, extToken) => {
      // RFC 1321 MD5 thuần trong ngữ cảnh tab
      function md5(string) {
        function md5cycle(x, k) {
          let a = x[0], b = x[1], c = x[2], d = x[3];
          a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586); c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330);
          a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426); c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983);
          a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417); c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162);
          a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101); c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329);
          a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632); c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302);
          a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083); c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848);
          a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690); c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501);
          a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784); c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734);
          a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463); c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556);
          a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353); c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640);
          a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222); c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189);
          a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835); c = hh(c, d, a, b, k[15], 16, 530742520); b = hh(b, c, d, a, k[2], 23, -995338651);
          a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415); c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
          a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606); c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799);
          a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744); c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649);
          a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379); c = ii(c, d, a, b, k[2], 15, 718787259); b = ii(b, c, d, a, k[9], 21, -343485551);
          x[0] = (a + x[0]) & 0xFFFFFFFF; x[1] = (b + x[1]) & 0xFFFFFFFF; x[2] = (c + x[2]) & 0xFFFFFFFF; x[3] = (d + x[3]) & 0xFFFFFFFF;
        }
        function cmn(q, a, b, x, s, t) { a = ((a + q) & 0xFFFFFFFF) + ((x + t) & 0xFFFFFFFF); return (((a << s) | (a >>> (32 - s))) + b) & 0xFFFFFFFF; }
        function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
        function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
        function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
        function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
        function md5blk(s) {
          const md5blks = [];
          for (let i = 0; i < 64; i += 4) md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
          return md5blks;
        }
        function md51(s) {
          const n = s.length, state = [1732584193, -271733879, -1732584194, 271733878];
          let i;
          for (i = 64; i <= s.length; i += 64) md5cycle(state, md5blk(s.substring(i - 64, i)));
          s = s.substring(i - 64);
          const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
          tail[i >> 2] |= 0x80 << ((i % 4) << 3);
          if (i > 55) { md5cycle(state, tail); for (i = 0; i < 16; i++) tail[i] = 0; }
          tail[14] = n * 8; md5cycle(state, tail); return state;
        }
        const hex_chr = '0123456789abcdef'.split('');
        function rhex(n) { let s = ''; for (let j = 0; j < 4; j++) s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F]; return s; }
        const utf8 = unescape(encodeURIComponent(string));
        const state = md51(utf8);
        let res = ''; for (let i = 0; i < state.length; i++) res += rhex(state[i]);
        return res;
      }

      function getCookie(name) {
        const matches = document.cookie.split(';');
        let found = '';
        for (const m of matches) {
          const trimmed = m.trim();
          if (trimmed.startsWith(name + '=')) {
            found = decodeURIComponent(trimmed.slice(name.length + 1));
          }
        }
        return found;
      }

      const bodyDict = { imageBase64: b64, appName, appKey: uploadAppKey };
      const bodyStr = JSON.stringify(bodyDict);

      async function doUpload() {
        let h5tk = getCookie('_m_h5_tk');
        let cookieToken = h5tk ? h5tk.split('_')[0] : '';
        let token = cookieToken || extToken || '';

        // 1. Nếu hoàn toàn chưa có token, bootstrap 1 GET request để server cấp _m_h5_tk
        if (!token) {
          try {
            const initUrl = `https://h5api.m.1688.com/h5/mtop.1688.imageservice.putimage/1.0/?jsv=2.7.2&appKey=${appKey}&t=${Date.now()}&api=mtop.1688.imageService.putImage&v=1.0&type=originaljson&dataType=jsonp`;
            await fetch(initUrl, { credentials: 'include' });
            h5tk = getCookie('_m_h5_tk');
            token = h5tk ? h5tk.split('_')[0] : '';
          } catch (e) {}
        }

        const t = String(Date.now());
        let sign = md5(`${token}&${t}&${appKey}&${bodyStr}`);
        const params = new URLSearchParams({
          jsv: '2.7.2',
          appKey,
          t,
          sign,
          api: 'mtop.1688.imageService.putImage',
          ecode: '0',
          v: '1.0',
          type: 'originaljson',
          dataType: 'jsonp',
        });

        const baseUrl = 'https://h5api.m.1688.com/h5/mtop.1688.imageservice.putimage/1.0/';
        const postData = `data=${encodeURIComponent(bodyStr)}`;

        let response = await fetch(`${baseUrl}?${params.toString()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
          credentials: 'include',
          body: postData,
        });
        let json = await response.json();

        // 2. Xử lý khi token hết hạn hoặc chưa khớp (Tự động trích xuất token từ trường "c" của Alibaba Gateway)
        let ret = json?.ret?.[0] || '';
        if (ret.includes('FAIL_SYS_TOKEN_EXPIRED') || ret.includes('FAIL_SYS_ILLEGAL_ACCESS') || ret.includes('FAIL_SYS_TOKEN_EMPTY')) {
          let newToken = '';
          // 2.1. Ưu tiên lấy token mới từ trường "c" mà Alibaba trả về
          if (json?.c && typeof json.c === 'string' && json.c.includes(';')) {
            const parts = json.c.split(';');
            const h5tk = parts[0];
            if (h5tk.includes('_')) {
              newToken = h5tk.split('_')[0];
            }
          }

          // 2.2. Nếu không có trường "c", kiểm tra document.cookie
          if (!newToken) {
            await new Promise(r => setTimeout(r, 200));
            const newH5tk = getCookie('_m_h5_tk');
            newToken = newH5tk ? newH5tk.split('_')[0] : '';
          }

          if (newToken) {
            token = newToken;
            sign = md5(`${token}&${t}&${appKey}&${bodyStr}`);
            params.set('sign', sign);
            response = await fetch(`${baseUrl}?${params.toString()}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
              credentials: 'include',
              body: postData,
            });
            json = await response.json();
          }
        }

        return {
          ok: !!json?.data?.imageId,
          data: json?.data,
          raw: json,
          token,
          sign,
          cookiePreview: (getCookie('_m_h5_tk') || 'none').slice(0, 30),
          postUrl: `${baseUrl}?${params.toString()}`,
        };
      }

      try {
        return await doUpload();
      } catch (err) {
        return { ok: false, error: err.message, stack: err.stack };
      }
    }
  });

  const exec = results?.[0]?.result;
  if (!exec) {
    throw new Error('In-Tab 1688 Scripting không trả về kết quả');
  }
  if (!exec.ok) {
    const err = new Error(exec.raw?.ret?.[0] || exec.error || 'Upload ảnh thất bại trong tab 1688');
    err.rawResponse = exec.raw;
    err.debugInfo = {
      token: exec.token,
      sign: exec.sign,
      cookiePreview: exec.cookiePreview,
      postUrl: exec.postUrl,
      mode: 'In-Tab Scripting (world: MAIN)',
      tabId,
    };
    throw err;
  }

  return {
    imageId: exec.data.imageId,
    requestId: exec.data.requestId || '',
    sessionId: exec.data.sessionId || '',
  };
}

/**
 * Thực thi fetch request trực tiếp bên trong Tab 1688 (world: MAIN)
 * @param {number} tabId
 * @param {string} url
 * @param {Object} [fetchOptions]
 */
export async function fetchViaTabScripting(tabId, url, fetchOptions = {}) {
  if (typeof chrome === 'undefined' || !chrome.scripting) {
    throw new Error('Chrome Scripting API không khả dụng');
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'ISOLATED',
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
