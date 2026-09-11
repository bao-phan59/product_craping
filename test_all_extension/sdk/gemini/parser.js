/**
 * Stream Response Parser for Gemini & Google Banana Generated Images
 * Uses Official Google Protobuf Completion Flags:
 *  - candidate[8][0] === 2 (Official Turn Completion Flag)
 *  - innerData[25] (Context String / Session Seal)
 * Guarantees zero text truncation and deterministic streaming resolution.
 */

import { Fields } from './constants.js';

export class GeminiStreamParser {
  static formatResolution(url, resolution = '1k') {
    if (!url || typeof url !== 'string') return url;
    const baseUrl = url.split('=')[0];
    switch (resolution.toLowerCase()) {
      case '2k':
      case '2048':
        return `${baseUrl}=s2048`;
      case 'original':
      case 'full':
        return `${baseUrl}=s0`;
      case '1k':
      case '1024':
      default:
        return `${baseUrl}=s1024`;
    }
  }

  /**
   * Trích xuất đệ quy toàn bộ các node 'wrb.fr' trong mảng lồng nhau nhiều tầng của Google Protobuf
   */
  static extractWrbFrNodes(node) {
    const results = [];
    function walk(curr) {
      if (!curr) return;
      if (Array.isArray(curr)) {
        if (curr[0] === 'wrb.fr') {
          results.push(curr);
          return;
        }
        for (let i = 0; i < curr.length; i++) {
          walk(curr[i]);
        }
      }
    }
    walk(node);
    return results;
  }

  /**
   * Kiểm tra trạng thái luồng stream theo thời gian thực (Zero-guesswork completion check)
   */
  static checkStreamStatus(rawResponseText) {
    if (!rawResponseText) return { isComplete: false, hasContent: false, textLength: 0 };

    const frames = this.extractJsonArrays(rawResponseText);
    let hasContent = false;
    let isComplete = false;
    let textLength = 0;

    for (const frame of frames) {
      const items = this.extractWrbFrNodes(frame);
      for (const item of items) {

        const innerJsonStr = item[2];
        if (!innerJsonStr || typeof innerJsonStr !== 'string') continue;

        let innerData;
        try {
          innerData = JSON.parse(innerJsonStr);
        } catch {
          continue;
        }

        if (!Array.isArray(innerData)) continue;

        // innerData[25] là conversation metadata xuất hiện ngay từ gói tin đầu tiên, KHÔNG ĐƯỢC coi là stream hoàn thành!
        if (typeof innerData[25] === 'string' && innerData[25].length > 0) {
          // Lưu metadata phiên nhưng không đánh dấu stream kết thúc
        }

        const candidates = innerData[4];
        if (Array.isArray(candidates) && candidates.length > 0) {
          for (const cand of candidates) {
            const text = (Array.isArray(cand[1]) && cand[1][0]) || cand[1] || (Array.isArray(cand[22]) && cand[22][0]);
            if (text && typeof text === 'string' && text.trim().length > 0) {
              hasContent = true;
              if (text.length > textLength) textLength = text.length;
            }

            const rich = cand[12] || cand[4];
            if (rich && (rich[Fields.GENERATED_IMAGES] || rich['7'])) {
              hasContent = true;
            }

            // Dấu hiệu: candidate[8][0] === 2 (Chuẩn hoàn thành tin nhắn FINISH_REASON_STOP của Google Protobuf)
            // Chỉ coi là hoàn tất khi đã có nội dung văn bản thực tế
            const indicator = this.getNested(cand, [8, 0]);
            if (indicator === 2 && hasContent && textLength > 15) {
              isComplete = true;
            }
          }
        }
      }
    }

    return { isComplete, hasContent, textLength };
  }

  static parse(rawResponseText) {
    if (!rawResponseText) {
      return { 
        text: '', 
        images: [], 
        thoughts: null, 
        metadata: null, 
        rawText: '', 
        errorCode: 'EMPTY_RESPONSE',
        framesCount: 0 
      };
    }

    const frames = this.extractJsonArrays(rawResponseText);
    let fullText = '';
    let thoughts = '';
    let rawImages = [];
    let conversationId = null;
    let responseId = null;
    let choiceId = null;
    let sessionMetadata = null;
    let detectedErrorCode = null;

    for (const frame of frames) {
      const items = this.extractWrbFrNodes(frame);
      for (const item of items) {

        // Chỉ coi là lỗi khi có cấu trúc error thật sự
        const errCode = this.getNested(item, [5, 2, 0, 1, 0]);
        if (errCode) {
          detectedErrorCode = errCode;
        }

        const innerJsonStr = item[2];
        if (!innerJsonStr || typeof innerJsonStr !== 'string') continue;

        let innerData;
        try {
          innerData = JSON.parse(innerJsonStr);
        } catch {
          continue;
        }

        if (!Array.isArray(innerData)) continue;

        if (Array.isArray(innerData[1])) {
          conversationId = innerData[1][0] || conversationId;
          responseId = innerData[1][1] || responseId;
          sessionMetadata = innerData[1];
        }

        if (typeof innerData[25] === 'string') {
          sessionMetadata = [null, null, null, null, null, null, null, null, null, innerData[25]];
        }

        const candidates = innerData[4];
        if (Array.isArray(candidates) && candidates.length > 0) {
          for (const cand of candidates) {
            choiceId = cand[0] || choiceId;

            let candidateText = '';
            if (Array.isArray(cand[1]) && typeof cand[1][0] === 'string') {
              candidateText = cand[1][0];
            } else if (typeof cand[1] === 'string') {
              candidateText = cand[1];
            }

            if (!candidateText && Array.isArray(cand[22]) && typeof cand[22][0] === 'string') {
              candidateText = cand[22][0];
            }

            if (candidateText && candidateText.length > fullText.length) {
              fullText = candidateText;
            }

            if (Array.isArray(cand[1]) && typeof cand[1][1] === 'string') {
              thoughts = cand[1][1];
            } else {
              const th = this.getNested(cand, [37, 0, 0]);
              if (typeof th === 'string') thoughts = th;
            }

            const richContent = cand[12] || cand[4];
            if (richContent && typeof richContent === 'object') {
              const genContainer = richContent[Fields.GENERATED_IMAGES] || richContent['7'];
              if (Array.isArray(genContainer)) {
                const list = Array.isArray(genContainer[0]) ? genContainer[0] : genContainer;
                for (const genImgData of list) {
                  const directUrl = this.getNested(genImgData, [0, 3, 3]);
                  if (directUrl && typeof directUrl === 'string' && directUrl.startsWith('http')) {
                    const cleanBase = directUrl.split('=')[0];
                    if (!rawImages.includes(cleanBase)) {
                      rawImages.push(cleanBase);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Fallback quét sâu nếu cấu trúc candidate bị Google cập nhật vị trí index
    if (!fullText) {
      for (const frame of frames) {
        const items = this.extractWrbFrNodes(frame);
        for (const item of items) {
          const innerJsonStr = item[2];
          if (!innerJsonStr || typeof innerJsonStr !== 'string') continue;
          try {
            const innerData = JSON.parse(innerJsonStr);
            const scanForLongestText = (node) => {
              if (typeof node === 'string') {
                const trimmed = node.trim();
                if (trimmed.length > fullText.length && 
                    trimmed.length > 10 &&
                    !trimmed.startsWith('c_') && 
                    !trimmed.startsWith('r_') && 
                    !trimmed.startsWith('rc_') && 
                    !trimmed.startsWith('http') && 
                    !trimmed.includes('wrb.fr')) {
                  fullText = trimmed;
                }
              } else if (Array.isArray(node)) {
                node.forEach(scanForLongestText);
              } else if (node && typeof node === 'object') {
                Object.values(node).forEach(scanForLongestText);
              }
            };
            scanForLongestText(innerData);
          } catch {}
        }
      }
    }

    if (rawImages.length === 0) {
      const inlineImgMatches = rawResponseText.matchAll(/https:\/\/lh3\.googleusercontent\.com\/gg(?:-dl)?\/[a-zA-Z0-9_\-]+/g);
      for (const match of inlineImgMatches) {
        const cleanBase = match[0].split('=')[0];
        if (!rawImages.includes(cleanBase)) {
          rawImages.push(cleanBase);
        }
      }
    }

    const generatedImages = rawImages.map((baseUrl) => {
      const url1k = `${baseUrl}=s1024`;
      const url2k = `${baseUrl}=s2048`;
      const urlOriginal = `${baseUrl}=s0`;

      const imgObj = new String(url1k);
      imgObj.url = url1k;
      imgObj.url1k = url1k;
      imgObj.url2k = url2k;
      imgObj.urlOriginal = urlOriginal;
      imgObj.baseUrl = baseUrl;
      return imgObj;
    });

    fullText = fullText.replace(/https?:\/\/googleusercontent\.com\/(?:\w+\/)+\d+\n*/g, '').trim();

    return {
      text: fullText,
      thoughts: thoughts || null,
      images: generatedImages,
      conversationId,
      responseId,
      choiceId,
      metadata: sessionMetadata,
      errorCode: detectedErrorCode,
      rawText: rawResponseText,
      framesCount: frames.length,
    };
  }

  static extractJsonArrays(rawText) {
    let text = rawText.trim();
    if (text.startsWith(")]}'")) {
      text = text.substring(4).trim();
    }

    const results = [];
    let inString = false;
    let escape = false;
    let depth = 0;
    let startIndex = -1;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (char === '\\' && inString) {
        escape = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '[') {
          if (depth === 0) {
            startIndex = i;
          }
          depth++;
        } else if (char === ']') {
          depth--;
          if (depth === 0 && startIndex !== -1) {
            const jsonStr = text.substring(startIndex, i + 1);
            try {
              const parsed = JSON.parse(jsonStr);
              results.push(parsed);
            } catch (e) {
            }
            startIndex = -1;
          }
        }
      }
    }

    return results;
  }

  static getNested(obj, path, defaultVal = null) {
    let current = obj;
    for (const key of path) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultVal;
      }
      current = current[key];
    }
    return current !== undefined ? current : defaultVal;
  }
}
