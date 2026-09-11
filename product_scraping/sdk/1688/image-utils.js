/**
 * Alibaba 1688 SDK — Image Processing & Normalization Utilities
 * Handles Blob compression, Canvas resizing, Base64 conversion, and online URL downloading.
 */

/**
 * Nén ảnh Blob bằng Canvas (chuẩn 800x800 JPEG chất lượng 0.82)
 * Giúp payload H5 MTop luôn nhỏ gọn (< 80KB) và upload nhanh tức thì
 * @param {Blob} blob 
 * @param {number} [maxWidth=800] 
 * @param {number} [maxHeight=800] 
 * @param {number} [quality=0.82] 
 * @returns {Promise<Blob>}
 */
export async function compressBlob(blob, maxWidth = 800, maxHeight = 800, quality = 0.82) {
  if (typeof createImageBitmap === 'undefined' || typeof document === 'undefined') {
    return blob;
  }
  try {
    const bmp = await createImageBitmap(blob);
    let { width, height } = bmp;
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bmp, 0, 0, width, height);
    return await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b || blob), 'image/jpeg', quality);
    });
  } catch (e) {
    return blob;
  }
}

/**
 * Chuyển đổi Blob thành chuỗi Base64 sạch (không có data: prefix)
 * @param {Blob} blob 
 * @returns {Promise<string>}
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result;
      const cleanBase64 = String(base64Url).split(',').pop();
      resolve(cleanBase64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}

/**
 * Chuẩn hóa mọi định dạng ảnh (URL trực tuyến, Data URL, Base64 thô, File, Blob)
 * thành chuỗi Base64 đã nén tối ưu sẵn sàng upload
 * @param {string|Blob|File} imageSource 
 * @returns {Promise<string>}
 */
export async function normalizeImageToBase64(imageSource) {
  if (!imageSource) {
    throw new Error('Chưa cung cấp hình ảnh để xử lý');
  }

  let blob = null;

  // 1. Chuỗi Data URL hoặc Base64 có header
  if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
    try {
      const res = await fetch(imageSource);
      blob = await res.blob();
    } catch (e) {
      const parts = imageSource.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const b64 = parts[1] || parts[0];
      const byteCharacters = atob(b64);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      blob = new Blob([byteNumbers], { type: mime });
    }
  }
  // 2. URL trực tuyến HTTP/HTTPS
  else if (typeof imageSource === 'string' && imageSource.startsWith('http')) {
    console.log('Alibaba1688ImageUtils: Đang tải hình ảnh từ URL trực tuyến:', imageSource);
    const res = await fetch(imageSource);
    if (!res.ok) {
      throw new Error(`Không thể tải hình ảnh từ URL: ${imageSource} (Mã lỗi ${res.status})`);
    }
    blob = await res.blob();
  }
  // 3. Đối tượng Blob hoặc File
  else if (imageSource instanceof Blob || (typeof File !== 'undefined' && imageSource instanceof File)) {
    blob = imageSource;
  }
  // 4. Raw Base64 string không có data: header
  else if (typeof imageSource === 'string' && imageSource.length > 50) {
    const cleanB64 = imageSource.trim().replace(/\s/g, '');
    const byteCharacters = atob(cleanB64);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    blob = new Blob([byteNumbers], { type: 'image/jpeg' });
  }

  if (blob) {
    const originalKb = Math.round(blob.size / 1024);
    const compressed = await compressBlob(blob, 800, 800, 0.82);
    const compressedKb = Math.round(compressed.size / 1024);
    console.log(`Alibaba1688ImageUtils: Nén ảnh từ ${originalKb} KB -> ${compressedKb} KB`);
    return await blobToBase64(compressed);
  }

  throw new Error('Định dạng hình ảnh không được hỗ trợ (cần truyền URL, File, Blob hoặc Base64)');
}
