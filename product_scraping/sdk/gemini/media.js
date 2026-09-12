/**
 * Media & Image Uploader for Multimodal Vision and Image Editing
 * Uploads images to Google Push Service Blobstore
 */

import { Endpoints } from './constants.js';

export class GeminiMediaUploader {
  constructor(authManager) {
    this.auth = authManager;
    this._cache = new Map();
  }

  /**
   * Chuyển đổi Base64 hoặc URL thành Blob nếu cần
   */
  async toBlob(input) {
    if (input instanceof Blob) {
      return input;
    }
    if (input instanceof File) {
      return input;
    }
    if (typeof input === 'string') {
      let url = input.trim();
      if (url.startsWith('//')) {
        url = 'https:' + url;
      } else if (url.startsWith('http://')) {
        url = 'https://' + url.slice(7);
      }

      if (url.startsWith('data:')) {
        const res = await fetch(url);
        return await res.blob();
      }
      // URL ảnh
      const res = await fetch(url);
      return await res.blob();
    }
    throw new Error('Định dạng hình ảnh không hợp lệ (hỗ trợ Blob, File, Base64 data URL).');
  }

  /**
   * Upload ảnh lên Google Push Service để lấy Media ID / URI (/contrib_service/ttl_1d/...)
   */
  async uploadImage(imageInput, filename = 'product_reference.jpg') {
    if (imageInput && typeof imageInput === 'object' && (imageInput.mediaToken || imageInput.inline)) {
      return imageInput;
    }

    if (typeof imageInput === 'string' && this._cache.has(imageInput)) {
      return this._cache.get(imageInput);
    }

    const blob = await this.toBlob(imageInput);
    const mimeType = blob.type || 'image/jpeg';

    let result = null;
    try {
      // 1. Google Gemini Push Service Multipart Upload
      const formData = new FormData();
      formData.append('file', blob, filename);

      const uploadUrl = Endpoints.UPLOAD.endsWith('/') ? Endpoints.UPLOAD.slice(0, -1) : Endpoints.UPLOAD;
      const pushId = this.auth?.pushId || 'feeds/mcudyrk2a4khkz';

      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Tenant-Id': 'bard-storage',
          'Push-ID': pushId,
          'Origin': 'https://gemini.google.com',
          'Referer': 'https://gemini.google.com/',
        },
        body: formData,
      });

      if (uploadRes.ok) {
        const mediaToken = await uploadRes.text();
        if (mediaToken && mediaToken.startsWith('/contrib_service/')) {
          result = {
            inline: false,
            mediaToken: mediaToken.trim(),
            filename: filename,
            mimeType: mimeType,
          };
        }
      }

      if (!result) {
        // Fallback: Sử dụng inline base64 nếu push service từ chối
        const base64Data = await this.blobToBase64(blob);
        result = {
          inline: true,
          base64: base64Data,
          mimeType: mimeType,
          filename: filename,
        };
      }
    } catch (err) {
      console.warn('GeminiMediaUploader: Push upload gặp lỗi, chuyển sang base64 fallback:', err.message);
      const base64Data = await this.blobToBase64(blob);
      result = {
        inline: true,
        base64: base64Data,
        mimeType: mimeType,
        filename: filename,
      };
    }

    if (typeof imageInput === 'string' && result) {
      this._cache.set(imageInput, result);
    }
    return result;
  }

  /**
   * Helper: Chuyển Blob thành Base64 string
   */
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
