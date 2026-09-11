/**
 * Google Lens SDK — Constants & API Endpoints
 * Contains standard Google Lens web upload endpoints, headers, and e-commerce platform filters
 */

export const GoogleLensEndpoints = {
  // Tìm kiếm bằng URL ảnh công khai
  UPLOAD_BY_URL: 'https://lens.google.com/uploadbyurl',

  // Upload trực tiếp file ảnh multipart/form-data
  UPLOAD_MULTIPART: 'https://lens.google.com/v3/upload',

  // Trang kết quả phân tích thị giác
  SEARCH_BASE: 'https://lens.google.com/search',

  // Google Search by image fallback
  SEARCH_BY_IMAGE_LEGACY: 'https://www.google.com/searchbyimage',
};

export const GoogleLensConfig = {
  DEFAULT_ENTRYPOINT: 'subb',
  DEFAULT_HL: 'vi', // Ngôn ngữ giao diện & kết quả ưu tiên
  TIMEOUT_MS: 25000,
};

export const DEFAULT_LENS_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

export const EcommerceDomains = {
  SHOPEE: ['shopee.vn', 'shopee.sg', 'shopee.co.th', 'shopee.com.my', 'shopee.ph', 'shopee.co.id', 'shopee.tw', 'shopee.com'],
  LAZADA: ['lazada.vn', 'lazada.sg', 'lazada.co.th', 'lazada.com.my', 'lazada.com.ph'],
  TIKI: ['tiki.vn'],
  TIKTOK: ['tiktok.com'],
  ALIBABA_1688: ['1688.com'],
  TAOBAO: ['taobao.com', 'tmall.com'],
  ALIEXPRESS: ['aliexpress.com'],
  AMAZON: ['amazon.com', 'amazon.co.jp', 'amazon.de', 'amazon.co.uk'],
  EBAY: ['ebay.com'],
};
