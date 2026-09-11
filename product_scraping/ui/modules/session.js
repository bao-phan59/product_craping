/**
 * Global Session Poller Module
 */

export async function checkGlobalSessions({ shopee, tiktok, alibaba, gemini }) {
  try {
    // 1. Shopee
    const shopeeTab = await shopee.getActiveShopeeTab();
    const shopeeDot = document.getElementById('shopeeDot');
    const shopeeText = document.getElementById('shopeeTabStatus');
    if (shopeeTab && shopeeDot && shopeeText) {
      shopeeDot.className = 'status-dot dot-green';
      shopeeText.innerHTML = `🟢 Shopee Tab Đang Kết Nối (ID: ${shopeeTab.id})`;
    } else if (shopeeDot && shopeeText) {
      shopeeDot.className = 'status-dot dot-yellow';
      shopeeText.innerHTML = `🟡 Chưa có tab Shopee (Bấm nút bên cạnh để mở)`;
    }

    // 2. TikTok / Douyin
    const ttTab = await tiktok.getActiveTab('tiktok');
    const dyTab = await tiktok.getActiveTab('douyin');
    const tiktokDot = document.getElementById('tiktokDot');
    const tiktokText = document.getElementById('tiktokTabStatus');
    if (tiktokDot && tiktokText) {
      if (ttTab || dyTab) {
        tiktokDot.className = 'status-dot dot-green';
        tiktokText.innerHTML = `🟢 Tab Đang Kết Nối: ${ttTab ? 'TikTok' : ''} ${dyTab ? 'Douyin' : ''}`;
      } else {
        tiktokDot.className = 'status-dot dot-yellow';
        tiktokText.innerHTML = `🟡 Chưa mở tab TikTok / Douyin (Hệ thống sẽ tự mở khi tìm kiếm)`;
      }
    }

    // 3. 1688
    const aTab = await alibaba.getActive1688Tab();
    const aDot = document.getElementById('alibabaDot');
    const aText = document.getElementById('alibabaTabStatus');
    if (aDot && aText) {
      if (aTab) {
        aDot.className = 'status-dot dot-green';
        aText.innerHTML = `🟢 1688 Tab Đang Kết Nối (ID: ${aTab.id})`;
      } else {
        aDot.className = 'status-dot dot-yellow';
        aText.innerHTML = `🟡 Chưa có tab 1688 (Hệ thống sẽ tự mở khi tìm kiếm)`;
      }
    }

    // 4. Gemini
    const gAuth = await gemini.auth.initialize();
    const gDot = document.getElementById('geminiDot');
    const gText = document.getElementById('geminiTabStatus');
    if (gDot && gText) {
      if (gAuth.authenticated) {
        gDot.className = 'status-dot dot-green';
        gText.innerHTML = `🟢 Tài Khoản Google Gemini: ${gAuth.email || 'Đã đăng nhập'}`;
      } else {
        gDot.className = 'status-dot dot-yellow';
        gText.innerHTML = `🟡 Chưa tìm thấy phiên Google trên gemini.google.com`;
      }
    }
  } catch (err) {
    // Silent poller
  }
}
