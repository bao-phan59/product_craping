/**
 * Shopee Extension SDK — Constants & Endpoints
 * Reverse-engineered internal Web APIs for Shopee Vietnam & SEA
 */

export const DEFAULT_SHOPEE_DOMAIN = 'shopee.ph';

/**
 * Trả về danh sách Endpoint động theo domain (shopee.ph, shopee.vn, ...)
 * @param {string} domain 
 */
export function getShopeeEndpoints(domain = DEFAULT_SHOPEE_DOMAIN) {
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '') || DEFAULT_SHOPEE_DOMAIN;
  const base = `https://${cleanDomain}`;
  const cdnSuffix = cleanDomain.includes('.ph') ? 'ph' : 'vn';
  return {
    BASE_URL: base,
    DOMAIN: cleanDomain,
    API_V4_SEARCH: `${base}/api/v4/search/search_items`,
    API_V4_ITEM_GET: `${base}/api/v4/item/get`,
    API_V4_PDP_GET_PC: `${base}/api/v4/pdp/get_pc`,
    API_V4_SHOP_INFO: `${base}/api/v4/product/get_shop_info`,
    API_V2_RATINGS: `${base}/api/v2/item/get_ratings`,
    API_V4_RECOMMEND: `${base}/api/v4/recommend/recommend`,
    
    // CDN Servers for High-Resolution Images & Videos
    IMAGE_CDN_PRIMARY: `https://down-${cdnSuffix}.img.susercontent.com/file`,
    IMAGE_CDN_FALLBACK: `${base}/file`,
  };
}

export const ShopeeEndpoints = getShopeeEndpoints('shopee.ph');

export const SortBy = {
  RELEVANCY: 'relevancy',
  SALES: 'sales',
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  NEWEST: 'ctime',
};

/**
 * Format image hash into high-definition Shopee CDN URL
 * @param {string} imageHash 
 * @param {string} [resolution='origin'] 'origin' | '1024' | '800'
 * @param {string} [domain='shopee.ph']
 */
export function buildShopeeImageUrl(imageHash, resolution = 'origin', domain = 'shopee.ph') {
  if (!imageHash) return '';
  if (imageHash.startsWith('http')) return imageHash;
  
  const endpoints = getShopeeEndpoints(domain);
  if (resolution === '1024') {
    return `${endpoints.IMAGE_CDN_PRIMARY}/${imageHash}_tn`;
  }
  return `${endpoints.IMAGE_CDN_PRIMARY}/${imageHash}`;
}

export function getDefaultShopeeHeaders(domain = DEFAULT_SHOPEE_DOMAIN) {
  const isPh = domain.includes('.ph');
  return {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': isPh ? 'en-PH,en-US;q=0.9,en;q=0.8' : 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Shopee-Language': isPh ? 'en' : 'vi',
    'X-API-SOURCE': 'pc',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Referer': `https://${domain}/`,
  };
}

export const DEFAULT_SHOPEE_HEADERS = getDefaultShopeeHeaders('shopee.ph');
