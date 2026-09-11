/**
 * TikTok & Douyin Extension SDK — Constants & Endpoints
 * Reverse-engineered internal Web APIs for TikTok Global and Douyin China
 */

export const TikTokEndpoints = {
  BASE_TIKTOK: 'https://www.tiktok.com',
  SEARCH_GENERAL: 'https://www.tiktok.com/api/search/general/full/',
  SEARCH_ITEM: 'https://www.tiktok.com/api/search/item/full/',
  ITEM_DETAIL: 'https://www.tiktok.com/api/item/detail/',
  USER_POSTS: 'https://www.tiktok.com/api/post/item_list/',
  COMMENT_LIST: 'https://www.tiktok.com/api/comment/list/',
  OEMBED: 'https://www.tiktok.com/oembed',
};

export const DouyinEndpoints = {
  BASE_DOUYIN: 'https://www.douyin.com',
  SEARCH_ITEM: 'https://www.douyin.com/aweme/v1/web/search/item/',
  ITEM_DETAIL: 'https://www.douyin.com/aweme/v1/web/aweme/detail/',
  USER_POSTS: 'https://www.douyin.com/aweme/v1/web/aweme/post/',
};

/**
 * Các tham số Web PC chuẩn của TikTok bắt buộc phải có để tránh bị trả về 0 byte rỗng
 */
export const DEFAULT_TIKTOK_WEB_PARAMS = {
  aid: '1988',
  app_name: 'tiktok_web',
  app_language: 'en',
  browser_language: 'en-US',
  browser_name: 'Mozilla',
  browser_online: 'true',
  browser_platform: 'Win32',
  browser_version: '5.0 (Windows)',
  channel: 'tiktok_web',
  cookie_enabled: 'true',
  device_platform: 'web_pc',
  focus_state: 'true',
  is_fullscreen: 'false',
  is_page_visible: 'true',
};

export const DEFAULT_TIKTOK_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
  'Sec-Ch-Ua': '"Chromium";v="128", "Not;A=Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'Referer': 'https://www.tiktok.com/',
};

export const DEFAULT_DOUYIN_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Referer': 'https://www.douyin.com/',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
};
