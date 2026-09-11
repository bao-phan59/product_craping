/**
 * Alibaba 1688 SDK — Constants & API Endpoints
 * Contains standard Alibaba H5 MTop endpoints, AppKeys, headers and exchange configs
 */

export const Alibaba1688Endpoints = {
  // Upload ảnh qua H5 MTop
  API_H5_PUT_IMAGE: 'https://h5api.m.1688.com/h5/mtop.1688.imageservice.putimage/1.0/',

  // Truy vấn danh sách kết quả tìm kiếm bằng ảnh
  API_IMAGE_SEARCH_OFFERS: 'https://search.1688.com/service/imageSearchOfferResultViewService',

  // Tìm kiếm theo từ khóa / danh mục
  API_MARKET_SEARCH_OFFERS: 'https://search.1688.com/service/marketOfferResultViewService',

  // Chi tiết sản phẩm HTML / PDP
  OFFER_DETAIL_URL: (offerId) => `https://detail.1688.com/offer/${offerId}.html`,

  // Trang chủ 1688
  BASE_URL: 'https://www.1688.com/',
  SEARCH_BASE_URL: 'https://s.1688.com/',
};

export const Alibaba1688Config = {
  // AppKey chuẩn H5 MTop cho dịch vụ Image Service
  DEFAULT_APP_KEY: '12574478',

  // AppKey phụ trợ cho image upload payload
  UPLOAD_APP_KEY: 'pvvljh1grxcmaay2vgpe9nb68gg9ueg2',

  // Tên ứng dụng upload
  UPLOAD_APP_NAME: 'searchImageUpload',

  // Phiên bản JSV MTop
  DEFAULT_JSV: '2.7.2',

  // Tỷ giá tham khảo ước tính CNY -> VNĐ (1 Tệ ~ 3.550 VNĐ)
  EXCHANGE_RATE_CNY_VND: 3550,
};

export const DEFAULT_1688_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
};

export const SortBy1688 = {
  DEFAULT: '',
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  SALES: 'sales',
  CREDIT: 'credit',
};
