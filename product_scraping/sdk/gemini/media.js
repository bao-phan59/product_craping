/**
 * Media & Image Uploader for Multimodal Vision and Image Editing
 * Uploads images to Google Push Service Blobstore
 */

import { Endpoints } from './constants.js';

export class GeminiMediaUploader {
  constructor(authManager) {
    this.auth = authManager;
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
      if (input.startsWith('data:')) {
        const res = await fetch(input);
        return await res.blob();
      }
      // URL ảnh
      const res = await fetch(input);
      return await res.blob();
    }
    throw new Error('Định dạng hình ảnh không hợp lệ (hỗ trợ Blob, File, Base64 data URL).');
  }

  /**
   * Upload ảnh lên Google Push Service để lấy Media ID / URI
   */
  async uploadImage(imageInput, filename = 'product_reference.jpg') {
    const blob = await this.toBlob(imageInput);
    const size = blob.size;
    const mimeType = blob.type || 'image/jpeg';

    try {
      // 1. Khởi tạo phiên upload
      const pushUrl = `${Endpoints.UPLOAD}/`;
      const initResponse = await fetch(pushUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': size.toString(),
          'X-Goog-Upload-Header-Content-Type': mimeType,
          'X-Goog-Upload-Protocol': 'resumable',
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
        body: JSON.stringify({
          'File-Name': filename,
        }),
      });

      const uploadUrl = initResponse.headers.get('X-Goog-Upload-URL');
      if (!uploadUrl) {
        // Fallback: Sử dụng inline base64 descriptor nếu push service không mở upload URL
        const base64Data = await this.blobToBase64(blob);
        return {
          inline: true,
          base64: base64Data,
          mimeType: mimeType,
          filename: filename,
        };
      }

      // 2. Upload nhị phân ảnh
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Goog-Upload-Command': 'upload, finalize',
          'X-Goog-Upload-Offset': '0',
          'Content-Type': mimeType,
        },
        body: blob,
      });

      const mediaToken = await uploadRes.text();
      return {
        inline: false,
        mediaToken: mediaToken.trim(),
        filename: filename,
        mimeType: mimeType,
      };
    } catch (err) {
      console.log('Google push upload failed, using inline base64 fallback:', err.message);
      const base64Data = await this.blobToBase64(blob);
      return {
        inline: true,
        base64: base64Data,
        mimeType: mimeType,
        filename: filename,
      };
    }
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
