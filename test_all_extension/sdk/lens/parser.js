/**
 * Google Lens SDK — Parser & Data Mining Engine
 * Extracts Visual Matches, Shopping Offers, E-commerce Sellers and OCR entities
 * Supports: AF_initDataCallback Deep JSON Mining + Resilient HTML Regex Extraction Fallback
 */

import { EcommerceDomains } from './constants.js';

export class GoogleLensParser {
  /**
   * Xác định nền tảng TMĐT từ tên miền hoặc URL
   * @param {string} urlOrDomain 
   * @returns {string} Tên nền tảng (VD: 'Shopee', 'Lazada', '1688', 'Amazon', ...)
   */
  static detectPlatform(urlOrDomain) {
    if (!urlOrDomain) return 'Website';
    const lower = urlOrDomain.toLowerCase();

    for (const domain of EcommerceDomains.SHOPEE) {
      if (lower.includes(domain)) return 'Shopee';
    }
    for (const domain of EcommerceDomains.LAZADA) {
      if (lower.includes(domain)) return 'Lazada';
    }
    for (const domain of EcommerceDomains.TIKI) {
      if (lower.includes(domain)) return 'Tiki';
    }
    for (const domain of EcommerceDomains.TIKTOK) {
      if (lower.includes(domain)) return 'TikTok';
    }
    for (const domain of EcommerceDomains.ALIBABA_1688) {
      if (lower.includes(domain)) return '1688';
    }
    for (const domain of EcommerceDomains.TAOBAO) {
      if (lower.includes(domain)) return 'Taobao';
    }
    for (const domain of EcommerceDomains.ALIEXPRESS) {
      if (lower.includes(domain)) return 'AliExpress';
    }
    for (const domain of EcommerceDomains.AMAZON) {
      if (lower.includes(domain)) return 'Amazon';
    }
    for (const domain of EcommerceDomains.EBAY) {
      if (lower.includes(domain)) return 'eBay';
    }

    // Trích xuất hostname làm tên hiển thị
    try {
      if (urlOrDomain.startsWith('http')) {
        const parsed = new URL(urlOrDomain);
        return parsed.hostname.replace(/^www\./, '');
      }
    } catch (e) {}

    return urlOrDomain;
  }

  /**
   * Giải mã liên kết chuyển hướng của Google (/url?q=... hoặc /url?url=...) thành link gốc
   * @param {string} url 
   */
  static unwrapGoogleRedirect(url) {
    if (!url || typeof url !== 'string') return '';
    if (url.includes('google.com/url?') || url.startsWith('/url?')) {
      try {
        const fullUrl = url.startsWith('http') ? url : 'https://www.google.com' + url;
        const parsed = new URL(fullUrl);
        const target = parsed.searchParams.get('url') || parsed.searchParams.get('q');
        if (target && (target.startsWith('http://') || target.startsWith('https://'))) {
          return target;
        }
      } catch (e) {}
    }
    return url;
  }

  /**
   * Bóc tách các khối dữ liệu AF_initDataCallback trong HTML bằng thuật toán đếm ngoặc an toàn
   * @param {string} html 
   */
  static extractAfDataCallbacks(html) {
    if (!html || typeof html !== 'string') return [];
    const results = [];
    const regex = /AF_initDataCallback\s*\(\s*\{[\s\S]*?key\s*:\s*['"]([^'"]+)['"]/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
      const key = match[1];
      const afterMatch = html.slice(match.index);
      const dataIdx = afterMatch.indexOf('data:');
      if (dataIdx === -1) continue;

      // Tìm dấu '[' mở đầu mảng JSON data
      const bracketStart = afterMatch.indexOf('[', dataIdx);
      if (bracketStart === -1) continue;

      let depth = 0;
      let bracketEnd = -1;
      let inString = false;
      let stringChar = '';
      let isEscaped = false;

      for (let i = bracketStart; i < afterMatch.length; i++) {
        const char = afterMatch[i];

        if (isEscaped) {
          isEscaped = false;
          continue;
        }
        if (char === '\\') {
          isEscaped = true;
          continue;
        }
        if (inString) {
          if (char === stringChar) {
            inString = false;
          }
          continue;
        }
        if (char === '"' || char === "'") {
          inString = true;
          stringChar = char;
          continue;
        }
        if (char === '[') {
          depth++;
        } else if (char === ']') {
          depth--;
          if (depth === 0) {
            bracketEnd = i;
            break;
          }
        }
      }

      if (bracketEnd !== -1) {
        const jsonStr = afterMatch.slice(bracketStart, bracketEnd + 1);
        try {
          const data = JSON.parse(jsonStr);
          results.push({ key, data });
        } catch (err) {
          // JSON chứa ký tự đặc biệt hoặc cấu trúc khác
        }
      }
    }
    return results;
  }

  /**
   * Kiểm tra chuỗi có phải là liên kết ảnh hoặc Data URI hợp lệ
   * @param {string} str 
   */
  static isPotentialImageUrl(str) {
    if (!str || typeof str !== 'string') return false;
    // Bỏ qua hoàn toàn ảnh transparent 1x1 gif placeholder của Google
    if (str.includes('R0lGODlhAQAB') || str.includes('data:image/gif')) return false;
    if (str.startsWith('data:image/jpeg') || str.startsWith('data:image/png') || str.startsWith('data:image/webp')) {
      return str.length > 100;
    }
    if (!str.startsWith('http://') && !str.startsWith('https://')) return false;
    const lower = str.toLowerCase();
    if (lower.includes('encrypted-tbn') || lower.includes('googleusercontent.com') || lower.includes('gstatic.com')) return true;
    if (lower.includes('susercontent.com') || lower.includes('alicdn.com') || lower.includes('tiktokcdn.com') || lower.includes('media-amazon.com') || lower.includes('tikicdn.com')) return true;
    if (lower.match(/\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i)) return true;
    if (lower.includes('/images?') || lower.includes('/shopping?') || lower.includes('/photo/') || lower.includes('/thumb/') || lower.includes('img.php')) return true;
    return false;
  }

  /**
   * Trích xuất toàn bộ ảnh Base64 từ các hàm _setImagesSrc của Google Lens
   * @param {string} html 
   */
  static extractImageMapFromHtml(html) {
    const map = new Map();
    const allBase64 = [];
    if (!html || typeof html !== 'string') return { map, allBase64 };

    // 1. Dạng: var s='data:image/jpeg;base64,...';var ii=['dimg_12'];_setImagesSrc(ii,s);
    const scriptRegex = /var\s+s\s*=\s*['"](data:image\/(?:jpeg|png|webp);base64,[^'"]+)['"];\s*var\s+ii\s*=\s*\[([^\]]+)\];\s*_setImagesSrc\s*\(\s*ii\s*,\s*s\s*\)/g;
    let m;
    while ((m = scriptRegex.exec(html)) !== null) {
      const b64 = m[1];
      allBase64.push(b64);
      const ids = m[2].replace(/['"\s]/g, '').split(',');
      for (const id of ids) {
        if (id) map.set(id, b64);
      }
    }

    // 2. Dạng: _setImagesSrc(['dimg_12'], 'data:image/...')
    const altRegex = /_setImagesSrc\s*\(\s*\[([^\]]+)\]\s*,\s*['"](data:image\/(?:jpeg|png|webp);base64,[^'"]+)['"]\s*\)/g;
    while ((m = altRegex.exec(html)) !== null) {
      const ids = m[1].replace(/['"\s]/g, '').split(',');
      const b64 = m[2];
      allBase64.push(b64);
      for (const id of ids) {
        if (id) map.set(id, b64);
      }
    }

    // 3. Quét tất cả chuỗi data:image/jpeg;base64,... dài > 150 ký tự nếu scriptRegex chưa bắt đủ
    if (allBase64.length === 0) {
      const rawB64Regex = /['"](data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]{150,})['"]/g;
      while ((m = rawB64Regex.exec(html)) !== null) {
        allBase64.push(m[1]);
      }
    }

    return { map, allBase64 };
  }

  /**
   * Quét đệ quy cấu trúc mảng lồng nhau của Google Lens để tìm các đối tượng kết quả
   * @param {Array|Object} root 
   */
  static mineItemsFromJson(root) {
    const visualMatches = [];
    const shoppingOffers = [];

    function collectSubtreeStrings(obj, depth = 0) {
      if (!obj || depth > 5) return [];
      if (typeof obj === 'string') return [obj];
      const acc = [];
      if (Array.isArray(obj)) {
        for (const el of obj) {
          acc.push(...collectSubtreeStrings(el, depth + 1));
        }
      } else if (typeof obj === 'object') {
        for (const k in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, k)) {
            acc.push(...collectSubtreeStrings(obj[k], depth + 1));
          }
        }
      }
      return acc;
    }

    function traverse(node) {
      if (!node) return;

      // Nhận diện mảng chứa thông tin sản phẩm thị giác
      if (Array.isArray(node)) {
        let title = '';
        let sourceUrl = '';
        let imageUrl = '';
        let domain = '';
        let priceStr = '';

        for (const el of node) {
          if (typeof el === 'string') {
            if (el.startsWith('http://') || el.startsWith('https://') || el.startsWith('/url?')) {
              const unwrapped = GoogleLensParser.unwrapGoogleRedirect(el);
              if (GoogleLensParser.isPotentialImageUrl(unwrapped)) {
                if (!imageUrl) imageUrl = unwrapped;
              } else if (!sourceUrl && !unwrapped.includes('google.com')) {
                sourceUrl = unwrapped;
              }
            } else if (el.length > 3 && el.length < 150 && !title && !el.startsWith('//')) {
              if (!el.match(/^(http|AF_|key|ds:)/)) {
                title = el;
              }
            } else if (el.match(/(?:₫|đ|\$|¥|€|£|VND|USD)\s?[\d.,]+|[\d.,]+\s?(?:₫|đ|VND)/i)) {
              priceStr = el;
            }
          }
        }

        // Nếu có sourceUrl nhưng chưa có ảnh hoặc tiêu đề, quét sâu các node con của node này
        if (sourceUrl) {
          const allStrings = collectSubtreeStrings(node);
          
          if (!imageUrl) {
            for (const s of allStrings) {
              const unwrapped = GoogleLensParser.unwrapGoogleRedirect(s);
              if (GoogleLensParser.isPotentialImageUrl(unwrapped)) {
                imageUrl = unwrapped;
                break;
              }
            }
          }

          if (!title) {
            for (const s of allStrings) {
              if (s.length > 6 && s.length < 150 && !s.startsWith('http') && !s.startsWith('//') && !s.match(/^(AF_|key|ds:|data:)/)) {
                title = s;
                break;
              }
            }
          }

          if (!priceStr) {
            for (const s of allStrings) {
              const pMatch = s.match(/(?:₫|đ|\$|¥|€|£|VND|USD)\s?[\d.,]+|[\d.,]+\s?(?:₫|đ|VND)/i);
              if (pMatch) {
                priceStr = pMatch[0];
                break;
              }
            }
          }

          try {
            domain = new URL(sourceUrl).hostname.replace(/^www\./, '');
          } catch (e) {
            domain = '';
          }

          const platform = GoogleLensParser.detectPlatform(sourceUrl);
          const item = {
            title: title || 'Sản phẩm nhận diện từ Google Lens',
            sourceUrl,
            imageUrl: imageUrl || '',
            domain,
            platform,
            price: priceStr || null,
          };

          if (priceStr || platform !== 'Website') {
            shoppingOffers.push(item);
          } else {
            visualMatches.push(item);
          }
        }

        for (const child of node) {
          if (typeof child === 'object') traverse(child);
        }
      } else if (typeof node === 'object') {
        for (const key in node) {
          if (Object.prototype.hasOwnProperty.call(node, key)) {
            traverse(node[key]);
          }
        }
      }
    }

    traverse(root);
    return { visualMatches, shoppingOffers };
  }

  /**
   * Bóc tách bằng Regex trực tiếp trên HTML khi JSON Callback bị mã hóa hoặc thay đổi format
   * @param {string} html 
   */
  static extractFromHtmlRegex(html) {
    if (!html || typeof html !== 'string') return { visualMatches: [], shoppingOffers: [] };

    const visualMatches = [];
    const shoppingOffers = [];
    const seenUrls = new Set();

    // Bóc tách toàn bộ kho ảnh Base64 từ các script _setImagesSrc của Google Lens
    const { map: imageMap, allBase64 } = this.extractImageMapFromHtml(html);

    // Regex bắt các link ngoại bộ kèm ảnh và tiêu đề
    const linkRegex = /<a[^>]+href=["'](https?:\/\/(?!www\.google\.|lens\.google\.)[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const url = match[1];
      const innerHtml = match[2];

      if (seenUrls.has(url)) continue;
      if (url.includes('policies.google.com') || url.includes('support.google.com') || url.includes('accounts.google.com')) continue;

      let imageUrl = '';

      // 1. Tìm ảnh trực tiếp bên trong innerHtml
      const imgMatch = innerHtml.match(/(?:src|data-src|data-original-src)=["']([^"']+)["']/i);
      if (imgMatch && GoogleLensParser.isPotentialImageUrl(imgMatch[1])) {
        imageUrl = imgMatch[1];
      }

      // 2. Tìm thẻ img lân cận trong bán kính 600 ký tự trước thẻ <a>
      if (!imageUrl) {
        const windowBefore = html.slice(Math.max(0, match.index - 600), match.index);
        const nearImgs = windowBefore.match(/<img[^>]+>/gi);
        if (nearImgs && nearImgs.length > 0) {
          for (let i = nearImgs.length - 1; i >= 0; i--) {
            const imgTag = nearImgs[i];
            // Thử khớp id="dimg_X" với imageMap
            const idM = imgTag.match(/id=["'](dimg_[^"']+)["']/i);
            if (idM && imageMap.has(idM[1])) {
              imageUrl = imageMap.get(idM[1]);
              break;
            }
            // Thử khớp link ảnh thật từ data-src hoặc src (loại trừ gif 1x1)
            const srcM = imgTag.match(/(?:data-src|data-original-src|src)=["']([^"']+)["']/i);
            if (srcM && GoogleLensParser.isPotentialImageUrl(srcM[1])) {
              imageUrl = srcM[1];
              break;
            }
          }
        }
      }

      // 3. Nếu vẫn chưa có ảnh, gán theo thứ tự từ kho ảnh Base64 của Google
      if (!imageUrl && allBase64.length > 0) {
        const itemIdx = seenUrls.size;
        if (itemIdx < allBase64.length) {
          imageUrl = allBase64[itemIdx];
        }
      }

      if (imageUrl) {
        imageUrl = imageUrl.replace(/&amp;/g, '&').replace(/\\/g, '');
      }

      // Tìm tiêu đề
      let title = '';
      const textMatch = innerHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (textMatch && textMatch.length > 5 && textMatch.length < 200) {
        title = textMatch;
      }

      // Tìm giá bán
      const priceMatch = innerHtml.match(/(?:₫|đ|\$|¥|€|£|VND|USD)\s?[\d.,]+|[\d.,]+\s?(?:₫|đ|VND)/i);
      const priceStr = priceMatch ? priceMatch[0] : null;

      if (title || imageUrl) {
        seenUrls.add(url);
        let domain = '';
        try {
          domain = new URL(url).hostname.replace(/^www\./, '');
        } catch (e) {}

        const platform = GoogleLensParser.detectPlatform(url);
        const item = {
          title: title || `Kết quả từ ${domain || 'Web'}`,
          sourceUrl: url,
          imageUrl: imageUrl || '',
          domain,
          platform,
          price: priceStr,
        };

        if (priceStr || platform !== 'Website') {
          shoppingOffers.push(item);
        } else {
          visualMatches.push(item);
        }
      }
    }

    return { visualMatches, shoppingOffers };
  }

  /**
   * Bóc tách toàn diện kết quả phân tích thị giác của Google Lens từ mã nguồn trang
   * @param {string} html - Toàn bộ mã nguồn HTML phản hồi từ lens.google.com
   * @param {string} [lensSearchUrl] - Link tìm kiếm tương ứng
   */
  static parseLensPage(html, lensSearchUrl = '') {
    if (!html) {
      return {
        searchUrl: lensSearchUrl,
        shoppingOffers: [],
        visualMatches: [],
        totalResults: 0,
      };
    }

    // 1. Thử giải mã qua AF_initDataCallback
    const callbacks = this.extractAfDataCallbacks(html);
    let allShopping = [];
    let allVisual = [];

    for (const cb of callbacks) {
      const mined = this.mineItemsFromJson(cb.data);
      allShopping.push(...mined.shoppingOffers);
      allVisual.push(...mined.visualMatches);
    }

    // 2. Fallback quét HTML Regex nếu không tìm thấy dữ liệu trong JSON
    if (allShopping.length === 0 && allVisual.length === 0) {
      const regexMined = this.extractFromHtmlRegex(html);
      allShopping = regexMined.shoppingOffers;
      allVisual = regexMined.visualMatches;
    }

    // 3. Khử trùng lặp theo sourceUrl
    const dedupe = (items) => {
      const seen = new Set();
      return items.filter(item => {
        if (!item.sourceUrl || seen.has(item.sourceUrl)) return false;
        seen.add(item.sourceUrl);
        return true;
      });
    };

    const finalShopping = dedupe(allShopping);
    const finalVisual = dedupe(allVisual);

    return {
      searchUrl: lensSearchUrl,
      shoppingOffers: finalShopping,
      visualMatches: finalVisual,
      totalResults: finalShopping.length + finalVisual.length,
      platformCounts: {
        shopee: finalShopping.filter(i => i.platform === 'Shopee').length,
        lazada: finalShopping.filter(i => i.platform === 'Lazada').length,
        alibaba1688: finalShopping.filter(i => i.platform === '1688').length,
        amazon: finalShopping.filter(i => i.platform === 'Amazon').length,
        other: finalShopping.filter(i => !['Shopee', 'Lazada', '1688', 'Amazon'].includes(i.platform)).length,
      }
    };
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
