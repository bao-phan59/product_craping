/**
 * pipelineState.js — Runtime State & Pause/Resume/Abort State Machine
 * Quản lý trạng thái dữ liệu trong RAM và điều khiển luồng thực thi của Workflow Pipeline.
 */

import * as logger from '../logger.js';

let isPaused = false;
let isAborted = false;
let resumePromiseResolver = null;

/**
 * Trạng thái dữ liệu runtime trong suốt phiên chạy
 */
export const pipelineState = {
  sku: '',
  originalImage: '',
  status: 'IDLE', // 'IDLE' | 'RUNNING' | 'PAUSED' | 'ABORTED' | 'COMPLETED' | 'CAPTCHA_WAIT'
  currentStep: 0,
  progressPercent: 0,
  // 1688 Raw & Gemini Verified
  rawOffers1688: [],
  gemini1688Audit: [],
  valid1688Shops: [],
  cleaned1688: null,
  // Keywords
  keywords: {
    genericEnglishName: '',
    douyinKeywords: [],
    tiktokKeywords: [],
    shopeeKeywords: []
  },
  // Shopee Raw & Gemini Verified
  rawShopeeItems: [],
  shopeeShops: [],
  // Reviews Raw & Gemini Verified
  shopeeReviewsRaw: [],
  topReviews: [],
  // Videos Raw & Gemini Verified
  rawVideoCandidates: [],
  formattedVideos: [],
  enrichedData: null,
  processData: null,
  settings: {
    shopeeMarket: 'ph',
    videoPlatform: 'both'
  },
  allRaw1688Specs: [],
  landingPageReviews: [],
  allVerifiedReviews: [],
  errors: []
};

/**
 * Reset dữ liệu trạng thái cho một phiên SKU mới
 * @param {string} sku 
 * @param {string} originalImage 
 * @param {Object} [settings={}]
 */
export function resetPipelineState(sku, originalImage, settings = {}) {
  isPaused = false;
  isAborted = false;
  resumePromiseResolver = null;

  pipelineState.sku = (sku || 'SKU_AUTO').toUpperCase().trim();
  pipelineState.originalImage = originalImage;
  pipelineState.status = 'RUNNING';
  pipelineState.currentStep = 0;
  pipelineState.progressPercent = 0;
  pipelineState.settings = {
    shopeeMarket: settings.shopeeMarket || 'ph',
    videoPlatform: settings.videoPlatform || 'both'
  };
  pipelineState.rawOffers1688 = [];
  pipelineState.gemini1688Audit = [];
  pipelineState.valid1688Shops = [];
  pipelineState.cleaned1688 = null;
  pipelineState.keywords = { genericEnglishName: '', douyinKeywords: [], tiktokKeywords: [], shopeeKeywords: [] };
  pipelineState.rawShopeeItems = [];
  pipelineState.shopeeShops = [];
  pipelineState.shopeeReviewsRaw = [];
  pipelineState.topReviews = [];
  pipelineState.landingPageReviews = [];
  pipelineState.allVerifiedReviews = [];
  pipelineState.rawVideoCandidates = [];
  pipelineState.rawTikTokVideos = [];
  pipelineState.formattedVideos = [];
  pipelineState.allRaw1688Specs = [];
  pipelineState.enrichedData = null;
  pipelineState.processData = null;
  pipelineState.errors = [];
}

/**
 * Đặt cờ tạm dừng pipeline
 */
export function pausePipeline() {
  if (pipelineState.status === 'RUNNING') {
    isPaused = true;
    pipelineState.status = 'PAUSED';
    logger.warn('PIPELINE', 'Quy trình đã tạm dừng. Bộ nhớ RAM được giữ nguyên.');
    return true;
  }
  return false;
}

/**
 * Tiếp tục chạy pipeline sau khi tạm dừng hoặc sau khi giải captcha
 */
export function resumePipeline() {
  if (pipelineState.status === 'PAUSED' || pipelineState.status === 'CAPTCHA_WAIT') {
    isPaused = false;
    pipelineState.status = 'RUNNING';
    logger.info('PIPELINE', 'Tiếp tục thực thi quy trình...');
    if (resumePromiseResolver) {
      resumePromiseResolver();
      resumePromiseResolver = null;
    }
    return true;
  }
  return false;
}

/**
 * Hủy bỏ pipeline
 */
export function abortPipeline() {
  isAborted = true;
  isPaused = false;
  pipelineState.status = 'ABORTED';
  logger.error('PIPELINE', 'Người dùng đã bấm hủy bỏ quy trình.');
  if (resumePromiseResolver) {
    resumePromiseResolver();
    resumePromiseResolver = null;
  }
}

/**
 * Đặt pipeline vào trạng thái chờ giải Captcha thủ công
 */
export function setCaptchaWait() {
  isPaused = true;
  pipelineState.status = 'CAPTCHA_WAIT';
  logger.warn('PIPELINE', 'Pipeline chuyển sang trạng thái chờ người dùng giải Captcha.');
}

/**
 * Điểm chốt kiểm tra xem pipeline có đang bị tạm dừng hay hủy bỏ không
 */
export async function checkPauseOrAbort() {
  if (isAborted) {
    throw new Error('PIPELINE_ABORTED');
  }
  if (isPaused || pipelineState.status === 'CAPTCHA_WAIT') {
    await new Promise((resolve) => {
      resumePromiseResolver = resolve;
    });
  }
  if (isAborted) {
    throw new Error('PIPELINE_ABORTED');
  }
}
