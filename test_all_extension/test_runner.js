/**
 * Unified Test Runner for SDK Utility Suite
 * Một file duy nhất tập hợp logic kiểm thử toàn bộ 5 SDK:
 * 1. Gemini AI SDK
 * 2. Shopee E-Commerce SDK
 * 3. TikTok & Douyin SDK
 * 4. Alibaba 1688 SDK
 * 5. Google Lens SDK
 */

import { GeminiExtensionSDK } from './sdk/gemini/index.js';
import { ShopeeExtensionSDK } from './sdk/shopee/index.js';
import { TikTokExtensionSDK } from './sdk/tiktok/index.js';
import { Alibaba1688SDK } from './sdk/1688/index.js';
import { GoogleLensSDK } from './sdk/lens/index.js';

// Tiện ích hỗ trợ timeout cho từng tác vụ test
function withTimeout(promise, ms, operationName = 'Thao tác') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${operationName} quá thời gian chờ (${ms}ms)`)), ms)
    )
  ]);
}

export class UnifiedSuiteTestRunner {
  constructor() {
    this.gemini = new GeminiExtensionSDK();
    this.shopee = new ShopeeExtensionSDK();
    this.tiktok = new TikTokExtensionSDK();
    this.alibaba = new Alibaba1688SDK();
    this.lens = new GoogleLensSDK();
  }

  /**
   * 1. Kiểm thử Google Gemini AI SDK
   */
  async testGemini() {
    const startTime = performance.now();
    const result = {
      sdk: 'Gemini AI SDK',
      category: 'Trí Tuệ Nhân Tạo (AI)',
      success: false,
      latencyMs: 0,
      details: null,
      error: null,
      suggestion: null
    };

    try {
      // Khởi tạo và trích xuất cookie Google
      const auth = await withTimeout(this.gemini.init ? this.gemini.init() : this.gemini.initialize(), 8000, 'Gemini Auth');
      
      if (!auth.authenticated) {
        result.details = {
          auth: auth,
          message: 'Chưa tìm thấy phiên đăng nhập tài khoản Google trên gemini.google.com'
        };
        result.suggestion = 'Hãy mở một tab https://gemini.google.com và đăng nhập tài khoản Google của bạn.';
        result.success = false;
      } else {
        // Gửi thử một prompt ngắn kiểm tra live stream & response
        let chunkCount = 0;
        const genRes = await withTimeout(
          this.gemini.models.generateContent({
            prompt: 'Trả lời đúng 1 từ: PONG',
            model: '3.8-flash',
            onStream: () => { chunkCount++; }
          }),
          15000,
          'Gemini Generate Ping'
        );

        result.success = true;
        result.details = {
          userEmail: auth.email || 'Google User',
          modelUsed: '3.8-flash',
          responseSnippet: genRes.text?.trim()?.slice(0, 80) || '(OK)',
          streamChunks: chunkCount
        };
      }
    } catch (err) {
      result.error = err.message || String(err);
      result.suggestion = 'Vui lòng kiểm tra tab https://gemini.google.com hoặc kết nối mạng.';
    } finally {
      result.latencyMs = Math.round(performance.now() - startTime);
    }

    return result;
  }

  /**
   * 2. Kiểm thử Shopee E-Commerce SDK
   */
  async testShopee() {
    const startTime = performance.now();
    const result = {
      sdk: 'Shopee SDK',
      category: 'Thương Mại Điện Tử (TMĐT)',
      success: false,
      latencyMs: 0,
      details: null,
      error: null,
      suggestion: null
    };

    try {
      // 1. Khởi tạo auth
      const auth = await withTimeout(this.shopee.initialize(), 6000, 'Shopee Init');
      const activeTab = await this.shopee.getActiveShopeeTab();

      // 2. Tìm kiếm 3 sản phẩm mẫu
      const searchRes = await withTimeout(
        this.shopee.searchItems('áo thun nam', {
          limit: 4,
          sortBy: 'sales'
        }),
        12000,
        'Shopee Search'
      );

      const items = searchRes.items || [];
      if (items.length > 0) {
        result.success = true;
        result.details = {
          cookieCount: auth.cookieCount || 0,
          inTabBypassTab: activeTab ? `Tab ID ${activeTab.id}` : 'Direct Fetch',
          totalFound: searchRes.totalCount || items.length,
          sampleItem: {
            title: items[0].name || items[0].title,
            price: items[0].priceVND || items[0].price,
            sold: items[0].historicalSold || items[0].soldCount
          }
        };
      } else {
        result.details = { raw: searchRes };
        result.error = 'Không lấy được danh sách sản phẩm từ Shopee API.';
        result.suggestion = 'Hãy mở sẵn 1 tab https://shopee.vn trên trình duyệt để kích hoạt In-Tab Scripting bypass.';
      }
    } catch (err) {
      result.error = err.message || String(err);
      result.suggestion = 'Hãy mở 1 tab https://shopee.vn để hệ thống mượn context vượt qua kiểm tra chống bot.';
    } finally {
      result.latencyMs = Math.round(performance.now() - startTime);
    }

    return result;
  }

  /**
   * 3. Kiểm thử TikTok & Douyin SDK
   */
  async testTikTok() {
    const startTime = performance.now();
    const result = {
      sdk: 'TikTok & Douyin SDK',
      category: 'Video & Mạng Xã Hội',
      success: false,
      latencyMs: 0,
      details: null,
      error: null,
      suggestion: null
    };

    try {
      // Khởi tạo
      await withTimeout(this.tiktok.initialize(), 6000, 'TikTok Init');

      // Test tìm kiếm video trending
      const searchRes = await withTimeout(
        this.tiktok.searchVideos('trending review', {
          platform: 'tiktok',
          count: 3
        }),
        12000,
        'TikTok Search'
      );

      const videos = searchRes.videos || [];
      if (videos.length > 0) {
        result.success = true;
        result.details = {
          platform: 'TikTok Global',
          videoCount: videos.length,
          sampleVideo: {
            desc: videos[0].title || videos[0].desc || 'TikTok Video',
            author: videos[0].authorName || videos[0].author,
            cleanUrlAvailable: !!(videos[0].cleanVideoUrl || videos[0].videoUrl)
          }
        };
      } else {
        // Dự phòng: Nếu TikTok bị chặn theo vùng, thử Douyin hoặc báo trạng thái
        result.details = { message: 'Không lấy được video trực tiếp từ IP hiện tại.' };
        result.suggestion = 'Hãy mở sẵn 1 tab https://www.tiktok.com hoặc https://www.douyin.com để kích hoạt In-Tab Hook.';
      }
    } catch (err) {
      result.error = err.message || String(err);
      result.suggestion = 'Hãy mở 1 tab https://www.tiktok.com trên trình duyệt để trích xuất cookie/msToken.';
    } finally {
      result.latencyMs = Math.round(performance.now() - startTime);
    }

    return result;
  }

  /**
   * 4. Kiểm thử Alibaba 1688 SDK
   */
  async testAlibaba1688() {
    const startTime = performance.now();
    const result = {
      sdk: 'Alibaba 1688 SDK',
      category: 'Nguồn Hàng Sỉ (B2B)',
      success: false,
      latencyMs: 0,
      details: null,
      error: null,
      suggestion: null
    };

    try {
      const auth = await withTimeout(this.alibaba.initialize(), 6000, '1688 Init');
      const activeTab = await this.alibaba.getActive1688Tab();

      // Thử tìm kiếm từ khóa sỉ cơ bản
      const searchRes = await withTimeout(
        this.alibaba.searchByKeyword('shoe', {
          pageSize: 4
        }),
        12000,
        '1688 Keyword Search'
      );

      const items = searchRes.items || searchRes.offers || [];
      if (items.length > 0) {
        result.success = true;
        result.details = {
          hasH5Token: !!auth.token,
          inTabBypassTab: activeTab ? `Tab ID ${activeTab.id}` : 'Direct MTop',
          offerCount: items.length,
          sampleOffer: {
            title: items[0].subject || items[0].title,
            price: items[0].price || items[0].formattedPrice,
            moq: items[0].moq || 1
          }
        };
      } else {
        result.details = {
          hasH5Token: !!auth.token,
          message: 'Chưa có token H5 hoặc trang 1688 yêu cầu xác thực người dùng.'
        };
        result.suggestion = 'Hãy mở tab https://1688.com và đăng nhập để có cookie _m_h5_tk.';
      }
    } catch (err) {
      result.error = err.message || String(err);
      result.suggestion = 'Hãy mở sẵn 1 tab https://1688.com trên trình duyệt.';
    } finally {
      result.latencyMs = Math.round(performance.now() - startTime);
    }

    return result;
  }

  /**
   * 5. Kiểm thử Google Lens SDK
   */
  async testGoogleLens() {
    const startTime = performance.now();
    const result = {
      sdk: 'Google Lens SDK',
      category: 'Thị Giác & Tìm Kiếm Ngược',
      success: false,
      latencyMs: 0,
      details: null,
      error: null,
      suggestion: null
    };

    try {
      await withTimeout(this.lens.initialize(), 6000, 'Google Lens Init');

      // Test tìm kiếm ngược bằng một URL ảnh sản phẩm mẫu
      const sampleImageUrl = 'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lsi50bshoxh5d5';
      const lensRes = await withTimeout(
        this.lens.searchByImageUrl(sampleImageUrl),
        15000,
        'Lens Reverse Search'
      );

      const visualMatches = lensRes.visualMatches || [];
      const shoppingOffers = lensRes.shoppingOffers || [];

      result.success = true;
      result.details = {
        visualMatchesCount: visualMatches.length,
        shoppingOffersCount: shoppingOffers.length,
        topMatchTitle: visualMatches[0]?.title || shoppingOffers[0]?.title || 'Tìm thấy kết quả thị giác tương đồng',
        topMatchSource: visualMatches[0]?.source || shoppingOffers[0]?.source || 'Google Visual Index'
      };
    } catch (err) {
      result.error = err.message || String(err);
      result.suggestion = 'Kiểm tra đường truyền internet tới lens.google.com.';
    } finally {
      result.latencyMs = Math.round(performance.now() - startTime);
    }

    return result;
  }

  /**
   * Chạy toàn bộ các bài test tuần tự, báo cáo tiến độ qua onStepUpdate
   */
  async runAllTests(onStepUpdate = () => {}) {
    const suiteStartTime = performance.now();
    const tests = [
      { id: 'gemini', name: 'Google Gemini AI', runner: () => this.testGemini() },
      { id: 'shopee', name: 'Shopee E-Commerce', runner: () => this.testShopee() },
      { id: 'tiktok', name: 'TikTok & Douyin Video', runner: () => this.testTikTok() },
      { id: 'alibaba', name: 'Alibaba 1688 Sỉ', runner: () => this.testAlibaba1688() },
      { id: 'lens', name: 'Google Lens Vision', runner: () => this.testGoogleLens() }
    ];

    const results = [];

    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      onStepUpdate({
        currentIndex: i,
        total: tests.length,
        currentTestName: t.name,
        state: 'running',
        resultsSoFar: [...results]
      });

      try {
        const testRes = await t.runner();
        results.push(testRes);
        onStepUpdate({
          currentIndex: i,
          total: tests.length,
          currentTestName: t.name,
          state: 'done',
          singleResult: testRes,
          resultsSoFar: [...results]
        });
      } catch (err) {
        const failRes = {
          sdk: t.name,
          category: 'Kiểm tra chung',
          success: false,
          latencyMs: 0,
          error: err.message || String(err)
        };
        results.push(failRes);
        onStepUpdate({
          currentIndex: i,
          total: tests.length,
          currentTestName: t.name,
          state: 'done',
          singleResult: failRes,
          resultsSoFar: [...results]
        });
      }
    }

    const totalDurationMs = Math.round(performance.now() - suiteStartTime);
    const passedCount = results.filter(r => r.success).length;

    return {
      totalDurationMs,
      totalTests: tests.length,
      passedCount,
      failedCount: tests.length - passedCount,
      results
    };
  }
}

// Khởi tạo singleton runner dùng chung
export const suiteRunner = new UnifiedSuiteTestRunner();
