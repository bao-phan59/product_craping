/**
 * SDK Utility Studio — Master Interactive Workbench Controller
 * Kiến trúc module hóa sạch: Tách riêng từng module nghiệp vụ (Shopee, TikTok, 1688, Lens, Gemini)
 * Giúp mã nguồn gọn gàng, giảm thiểu lỗi, dễ debug và bảo trì độc lập.
 */

import { GeminiExtensionSDK } from '../sdk/gemini/index.js';
import { ShopeeExtensionSDK } from '../sdk/shopee/index.js';
import { TikTokExtensionSDK } from '../sdk/tiktok/index.js';
import { Alibaba1688SDK } from '../sdk/1688/index.js';
import { GoogleLensSDK } from '../sdk/lens/index.js';
import { suiteRunner } from '../test_runner.js';

// Import các module nghiệp vụ đã được tách nhỏ
import { setupWindowControls, setupNavigationTabs } from './modules/navigation.js';
import { checkGlobalSessions } from './modules/session.js';
import { setupShopeeModule } from './modules/shopee.js';
import { setupTiktokModule } from './modules/tiktok.js';
import { setup1688Module } from './modules/1688.js';
import { setupLensModule } from './modules/lens.js';
import { setupGeminiModule, askGemini, generateBanana } from './modules/gemini.js';
import { setupHealthcheckModule } from './modules/healthcheck.js';
import { initWorkflowView } from './modules/workflowView.js';

// Re-export các hàm sạch để tương thích nếu các script khác gọi
export { askGemini, generateBanana };

// Khởi tạo các SDK Client
export const gemini = new GeminiExtensionSDK();
export const shopee = new ShopeeExtensionSDK({ domain: 'shopee.ph' });
export const tiktok = new TikTokExtensionSDK({ timeout: 25000 });
export const alibaba = new Alibaba1688SDK({ exchangeRate: 3550, timeout: 30000 });
export const lens = new GoogleLensSDK();

function initializeApp() {
  try { setupWindowControls(); } catch (err) { console.error('setupWindowControls error:', err); }
  try { setupNavigationTabs(); } catch (err) { console.error('setupNavigationTabs error:', err); }
  
  // Khởi tạo module Tự động hóa Workflow Pipeline chính
  try {
    initWorkflowView({ alibaba, shopee, tiktok, gemini, lens });
  } catch (err) {
    console.error('initWorkflowView error:', err);
  }

  // Khởi tạo các module tiện ích SDK riêng biệt
  try { setupShopeeModule({ shopee }); } catch (err) { console.error('setupShopeeModule error:', err); }
  try { setupTiktokModule({ tiktok }); } catch (err) { console.error('setupTiktokModule error:', err); }
  try { setup1688Module({ alibaba }); } catch (err) { console.error('setup1688Module error:', err); }
  try { setupLensModule({ lens }); } catch (err) { console.error('setupLensModule error:', err); }
  try { setupGeminiModule({ gemini }); } catch (err) { console.error('setupGeminiModule error:', err); }
  try { setupHealthcheckModule({ suiteRunner }); } catch (err) { console.error('setupHealthcheckModule error:', err); }

  // Kiểm tra trạng thái phiên các nền tảng
  const sdks = { shopee, tiktok, alibaba, gemini };
  checkGlobalSessions(sdks).catch(err => console.warn('checkGlobalSessions error:', err));
  setInterval(() => checkGlobalSessions(sdks), 4000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM đã sẵn sàng (phổ biến với ES module trong Chrome Extension)
  initializeApp();
}
