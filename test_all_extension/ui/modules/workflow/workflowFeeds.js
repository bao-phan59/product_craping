/**
 * workflowFeeds.js — Realtime Vertical Data Flow UI Controller
 * Quản lý cập nhật trực quan luồng dữ liệu 5 tầng theo thời gian thực:
 * 1. 1688 Gốc -> 2. 1688 Đã Lọc Rác -> 3. Gemini Keywords -> 4. Shopee PH -> 5. TikTok Videos
 */

const DEFAULT_IMAGE_SVG = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%23555' stroke-width='2'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E";

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Reset giao diện Dòng Chảy Dữ Liệu Thời Gian Thực
 */
export function resetVerticalFeedUI() {
  const feed1688Grid = document.getElementById('feed1688ImagesGrid');
  const feed1688Pill = document.getElementById('feed1688RawPill');
  const feed1688Sub = document.getElementById('feed1688RawSubtitle');

  const feedCleanContent = document.getElementById('feed1688CleanContent');
  const feedCleanPill = document.getElementById('feed1688CleanPill');
  const feedCleanSub = document.getElementById('feed1688CleanSubtitle');

  const feedKwContent = document.getElementById('feedGeminiKwContent');
  const feedKwPill = document.getElementById('feedGeminiKwPill');
  const feedKwSub = document.getElementById('feedGeminiKwSubtitle');

  const feedShopeeContent = document.getElementById('feedShopeePhContent');
  const feedShopeePill = document.getElementById('feedShopeePhPill');
  const feedShopeeSub = document.getElementById('feedShopeePhSubtitle');

  const feedTiktokContent = document.getElementById('feedTiktokContent');
  const feedTiktokPill = document.getElementById('feedTiktokPill');
  const feedTiktokSub = document.getElementById('feedTiktokSubtitle');

  if (feed1688Grid) feed1688Grid.innerHTML = '<div class="wf-feed-empty-hint">Đang chờ quét ảnh qua 1688 API...</div>';
  if (feed1688Pill) feed1688Pill.textContent = '0 Shop';
  if (feed1688Sub) feed1688Sub.textContent = 'Đang chuẩn bị tìm kiếm...';

  if (feedCleanContent) feedCleanContent.innerHTML = '<div class="wf-feed-empty-hint">Chưa có dữ liệu sau lọc rác...</div>';
  if (feedCleanPill) feedCleanPill.textContent = 'Chờ lọc';
  if (feedCleanSub) feedCleanSub.textContent = 'Đang chờ lọc rác xưởng...';

  if (feedKwContent) feedKwContent.innerHTML = '<div class="wf-feed-empty-hint">Chưa có từ khóa Gemini...</div>';
  if (feedKwPill) feedKwPill.textContent = '0 Từ Khóa';
  if (feedKwSub) feedKwSub.textContent = 'Đang chờ Gemini sinh từ khóa...';

  if (feedShopeeContent) feedShopeeContent.innerHTML = '<div class="wf-feed-empty-hint">Chưa có sản phẩm Shopee PH...</div>';
  if (feedShopeePill) feedShopeePill.textContent = '0 Shop PH';
  if (feedShopeeSub) feedShopeeSub.textContent = 'Đang chờ quét Shopee PH...';

  if (feedTiktokContent) feedTiktokContent.innerHTML = '<div class="wf-feed-empty-hint">Chưa có video TikTok...</div>';
  if (feedTiktokPill) feedTiktokPill.textContent = '0 Video';
  if (feedTiktokSub) feedTiktokSub.textContent = 'Đang chờ thu hoạch TikTok...';

  document.querySelectorAll('.wf-feed-card').forEach(c => c.classList.remove('active-step'));
}


export const feedUiState = {
  shopeeViewMode: 'verified', // 'verified' | 'raw'
  tiktokViewMode: 'verified', // 'verified' | 'raw'
  cachedState: null
};

// Khởi tạo bắt sự kiện chuyển đổi xem Thô vs Đã Lọc
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.wf-feed-toggle-btn');
    if (!btn) return;
    const type = btn.getAttribute('data-type');
    const mode = btn.getAttribute('data-mode');
    if (type === 'shopee') {
      feedUiState.shopeeViewMode = mode;
      if (feedUiState.cachedState) renderFeedShopeePh(feedUiState.cachedState);
    } else if (type === 'tiktok') {
      feedUiState.tiktokViewMode = mode;
      if (feedUiState.cachedState) renderFeedTikTokVideos(feedUiState.cachedState);
    }
  });
}

/**
 * Cập nhật nội dung hiển thị cho Luồng Dữ Liệu Thời Gian Thực (Vertical Pipeline Flow)
 * @param {Object} state - Trạng thái của pipeline
 */
export function updateDataInspectorUI(state) {
  if (!state) return;
  feedUiState.cachedState = state;

  // Cập nhật thẻ card nào đang active dựa theo currentStep
  const step = state.currentStep || 0;
  const cardMap = {
    1: 'feedCard_1688Raw',
    2: 'feedCard_1688Clean',
    3: 'feedCard_1688Clean',
    4: 'feedCard_geminiKw',
    5: 'feedCard_shopeePh',
    6: 'feedCard_shopeePh',
    7: 'feedCard_tiktok'
  };

  document.querySelectorAll('.wf-feed-card').forEach(c => c.classList.remove('active-step'));
  const currentCardId = cardMap[step];
  if (currentCardId) {
    document.getElementById(currentCardId)?.classList.add('active-step');
  }

  // 1. TẤT CẢ ẢNH & SẢN PHẨM 1688 GỐC (DỮ LIỆU THÔ BAN ĐẦU)
  renderFeed1688Raw(state);

  // 2. DỮ LIỆU & ẢNH ĐÃ QUA LỌC RÁC XƯỞNG
  renderFeed1688Clean(state);

  // 3. TOÀN BỘ TỪ KHÓA GEMINI AI SINH RA
  renderFeedGeminiKeywords(state);

  // 4. SẢN PHẨM TÌM THẤY TRÊN SHOPEE PHILIPPINES (THÔ & ĐÃ QUA GEMINI)
  renderFeedShopeePh(state);

  // 5. VIDEO DOUYIN & TIKTOK (THÔ & ĐÃ QUA GEMINI THẨM ĐỊNH)
  renderFeedTikTokVideos(state);
}

function renderFeed1688Raw(state) {
  const feed1688Grid = document.getElementById('feed1688ImagesGrid');
  const feed1688Pill = document.getElementById('feed1688RawPill');
  const feed1688Sub = document.getElementById('feed1688RawSubtitle');

  const offers = (state.rawOffers1688 && state.rawOffers1688.length > 0)
    ? state.rawOffers1688
    : (state.valid1688Shops || []);

  if (feed1688Grid && offers.length > 0) {
    const verifiedShops = state.valid1688Shops || [];
    const hasAudit = verifiedShops.length > 0;

    if (feed1688Pill) {
      feed1688Pill.textContent = hasAudit
        ? `${verifiedShops.length}/${offers.length} Chuẩn Gemini`
        : `${offers.length} Xưởng Thô`;
    }
    if (feed1688Sub) {
      feed1688Sub.textContent = hasAudit
        ? `Đã cào ${offers.length} xưởng thô ban đầu | Gemini Vision đã chọn ${verifiedShops.length} xưởng đúng mẫu gốc`
        : `Đã cào ${offers.length} xưởng thô ban đầu (chưa lọc) từ 1688 Visual API`;
    }

    feed1688Grid.innerHTML = offers.map((s, idx) => {
      const offerId = String(s.offerId || s.id || '');
      const isVerified = hasAudit && verifiedShops.some(v => String(v.offerId || v.id) === offerId);
      const cardUrl = s.detailUrl || s.offerUrl || (offerId ? `https://detail.1688.com/offer/${offerId}.html` : '#');
      const safeTitle = escapeHtml(s.title || 'Sản phẩm 1688');
      const safeFactory = escapeHtml(s.company?.name || s.companyName || 'Xưởng 1688');
      const safeCity = escapeHtml(s.company?.city || 'TQ');

      let badgeHtml = '<span class="wf-status-badge pending">📦 Thô (Chưa lọc)</span>';
      if (hasAudit) {
        badgeHtml = isVerified
          ? '<span class="wf-status-badge pass">✓ Gemini Đã Chọn</span>'
          : '<span class="wf-status-badge reject">✗ Không Khớp</span>';
      }

      return `
      <div class="wf-1688-img-card ${isVerified ? 'verified-match' : ''}" title="${safeTitle}" onclick="window.open('${cardUrl}', '_blank')">
        <div class="wf-1688-thumb-wrap">
          <img src="${s.imageUrl || DEFAULT_IMAGE_SVG}" onerror="this.src='${DEFAULT_IMAGE_SVG}'" loading="lazy" />
          <span class="wf-1688-idx-badge">#${idx + 1}</span>
          <div style="position: absolute; bottom: 3px; left: 3px; right: 3px;">${badgeHtml}</div>
        </div>
        <div class="wf-1688-card-info">
          <div class="wf-1688-price-row">¥${s.price || s.pricing?.priceCny || '0.00'}</div>
          <div class="wf-1688-card-title">${safeTitle}</div>
          <div class="wf-1688-card-factory">${safeFactory} (${safeCity})</div>
        </div>
      </div>
    `;
    }).join('');
  }
}

function renderFeed1688Clean(state) {
  const feedCleanContent = document.getElementById('feed1688CleanContent');
  const feedCleanPill = document.getElementById('feed1688CleanPill');
  const feedCleanSub = document.getElementById('feed1688CleanSubtitle');

  if (feedCleanContent && state.cleaned1688) {
    const c = state.cleaned1688;
    const top = state.primaryOfferDetail || state.valid1688Shops?.[0] || {};
    if (feedCleanPill) feedCleanPill.textContent = 'Đã Lọc Sạch';
    if (feedCleanSub) feedCleanSub.textContent = `Đã loại bỏ số ĐT TQ, WeChat xưởng và chuẩn hóa thông số`;

    const cleanAttrsList = Object.entries(c.attributes || {}).map(([k, v]) => `
      <span style="background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; display: inline-block; margin-right: 4px; margin-bottom: 3px; font-size: 10px;">
        <strong style="color: #a78bfa;">${escapeHtml(k)}:</strong> <span style="color: #e2e8f0;">${escapeHtml(v)}</span>
      </span>
    `).join('') || '<span style="color: #94a3b8;">Đã chuẩn hóa thông số</span>';

    feedCleanContent.innerHTML = `
      <div class="wf-clean-offer-banner">
        <img src="${top.imageUrl || DEFAULT_IMAGE_SVG}" class="wf-clean-offer-img" onerror="this.src='${DEFAULT_IMAGE_SVG}'" />
        <div class="wf-clean-offer-details">
          <div style="font-size: 11px; font-weight: bold; color: #34d399; margin-bottom: 2px;">
            ✅ Offer Đại Diện Đã Thẩm Định & Làm Sạch (ID: ${top.offerId || '1688'})
          </div>
          <div class="wf-insp-row">
            <span class="wf-insp-key" style="min-width: 80px; color: #f87171;">Tiêu đề gốc:</span>
            <span class="wf-insp-val" style="color: #94a3b8; text-decoration: line-through;">${escapeHtml(top.title || 'N/A')}</span>
          </div>
          <div class="wf-insp-row">
            <span class="wf-insp-key" style="min-width: 80px; color: #34d399;">Sau lọc sạch:</span>
            <span class="wf-insp-val" style="color: #67e8f9; font-weight: bold;">${escapeHtml(c.title || top.title)}</span>
          </div>
          <div class="wf-insp-row">
            <span class="wf-insp-key" style="min-width: 80px;">Giá sỉ chuẩn:</span>
            <span class="wf-insp-val" style="color: #34d399; font-weight: bold;">¥${c.basePrice || top.price || 'N/A'} (Tối thiểu: ${top.moq || 1} cái)</span>
          </div>
          <div class="wf-tag-cloud" style="margin-top: 4px;">
            <span class="wf-noise-tag">❌ Đã lọc SĐT Trung Quốc</span>
            <span class="wf-noise-tag">❌ Đã lọc WeChat xưởng</span>
            <span class="wf-noise-tag">❌ Đã lọc Địa chỉ xưởng TQ</span>
            <span class="wf-noise-tag">❌ Đã gọt lời chào mời sỉ</span>
          </div>
          <div style="margin-top: 6px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 4px;">
            <div style="color: #a78bfa; font-weight: bold; margin-bottom: 2px;">Thuộc tính chuẩn giữ lại (${Object.keys(c.attributes || {}).length}):</div>
            <div style="line-height: 1.4;">${cleanAttrsList}</div>
          </div>
        </div>
      </div>
    `;
  }
}

function renderFeedGeminiKeywords(state) {
  const feedKwContent = document.getElementById('feedGeminiKwContent');
  const feedKwPill = document.getElementById('feedGeminiKwPill');
  const feedKwSub = document.getElementById('feedGeminiKwSubtitle');

  if (feedKwContent && state.keywords) {
    const douyinKws = state.keywords.douyinKeywords || [];
    const tiktokKws = state.keywords.tiktokKeywords || [];
    const shopeeKws = state.keywords.shopeeKeywords || [];

    const totalKw = douyinKws.length + tiktokKws.length + shopeeKws.length;
    if (totalKw > 0) {
      if (feedKwPill) feedKwPill.textContent = `${totalKw} Từ Khóa`;
      if (feedKwSub) feedKwSub.textContent = `Tạo thành công ${douyinKws.length} từ khóa Douyin, ${tiktokKws.length} TikTok & ${shopeeKws.length} Shopee`;

      feedKwContent.innerHTML = `
        <div class="wf-insp-content-box">
          <div style="color: #fb923c; font-weight: bold; font-size: 11px; margin-bottom: 4px;">
            🇨🇳 Bộ Từ Khóa Douyin Tiếng Trung (${douyinKws.length} từ):
          </div>
          <div class="wf-tag-cloud">
            ${douyinKws.map(k => `<span class="wf-data-tag" style="background:rgba(251,146,60,0.15); border-color:rgba(251,146,60,0.4); color:#fdba74;">🔍 ${escapeHtml(k)}</span>`).join('')}
          </div>

          <div style="margin-top: 8px; color: #38bdf8; font-weight: bold; font-size: 11px; margin-bottom: 4px;">
            🛒 Từ Khóa Shopee Philippines (${shopeeKws.length} từ):
          </div>
          <div class="wf-tag-cloud">
            ${shopeeKws.map(k => `<span class="wf-data-tag">🔍 ${escapeHtml(k)}</span>`).join('')}
          </div>

          <div style="margin-top: 8px; color: #f43f5e; font-weight: bold; font-size: 11px; margin-bottom: 4px;">
            🎵 Truy Vấn Video TikTok (${tiktokKws.length} query):
          </div>
          <div class="wf-tag-cloud">
            ${tiktokKws.map(q => `<span class="wf-data-tag-tiktok">🎵 ${escapeHtml(q)}</span>`).join('')}
          </div>
        </div>
      `;
    }
  }
}

function renderFeedShopeePh(state) {
  const feedShopeeContent = document.getElementById('feedShopeePhContent');
  const feedShopeePill = document.getElementById('feedShopeePhPill');
  const feedShopeeSub = document.getElementById('feedShopeePhSubtitle');

  const rawItems = state.rawShopeeItems || [];
  const verifiedItems = state.shopeeShops || [];

  if (feedShopeeContent && (rawItems.length > 0 || verifiedItems.length > 0)) {
    const isRawMode = feedUiState.shopeeViewMode === 'raw';
    const displayList = isRawMode ? (rawItems.length > 0 ? rawItems : verifiedItems) : (verifiedItems.length > 0 ? verifiedItems : rawItems);

    if (feedShopeePill) {
      feedShopeePill.textContent = `${verifiedItems.length}/${rawItems.length || verifiedItems.length} Chuẩn Mẫu`;
    }
    if (feedShopeeSub) {
      feedShopeeSub.textContent = `Đã cào ${rawItems.length} sản phẩm thô qua nhiều trang | Gemini Vision đã chọn ${verifiedItems.length} sản phẩm chuẩn mẫu`;
    }

    const toggleHtml = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.06);">
        <div style="font-size: 11px; font-weight: bold; color: #e2e8f0;">
          ${isRawMode ? `📦 Danh Sách Sản Phẩm Thô Chưa Lọc (${displayList.length})` : `🎯 Sản Phẩm Đã Được Gemini Thẩm Định Khớp Mẫu (${displayList.length})`}
        </div>
        <div class="wf-feed-toggle-group">
          <button class="wf-feed-toggle-btn ${!isRawMode ? 'active' : ''}" data-type="shopee" data-mode="verified">🎯 Gemini Chọn (${verifiedItems.length})</button>
          <button class="wf-feed-toggle-btn ${isRawMode ? 'active' : ''}" data-type="shopee" data-mode="raw">📦 Dữ Liệu Thô (${rawItems.length})</button>
        </div>
      </div>
    `;

    feedShopeeContent.innerHTML = toggleHtml + `
      <div class="wf-shopee-items-grid">
        ${displayList.map((s, idx) => {
          const shopeeUrl = s.itemUrl || s.url || (s.itemId ? `https://shopee.ph/product/${s.shopId}/${s.itemId}` : '#');
          const shopeeImg = s.coverImage || s.imageUrl || s.image || DEFAULT_IMAGE_SVG;
          const isVerified = verifiedItems.some(v => String(v.itemId) === String(s.itemId));
          const safeTitle = escapeHtml(s.title || s.name || 'Shopee Product');
          const badgeHtml = isVerified
            ? '<span class="wf-status-badge pass">✓ Khớp Mẫu Gemini</span>'
            : (isRawMode ? '<span class="wf-status-badge pending">📦 Thô</span>' : '<span class="wf-status-badge reject">✗ Lệch Mẫu</span>');

          return `
          <div class="wf-shopee-item-card" title="${safeTitle}" onclick="window.open('${shopeeUrl}', '_blank')">
            <div style="position: relative; width: 100%; height: 85px; background: #0d1322;">
              <img src="${shopeeImg}" class="wf-shopee-item-thumb" onerror="this.src='${DEFAULT_IMAGE_SVG}'" loading="lazy" />
              <div style="position: absolute; bottom: 3px; left: 3px;">${badgeHtml}</div>
            </div>
            <div class="wf-shopee-item-info">
              <div class="wf-shopee-item-price">${s.priceFormatted || ('₱' + (s.price || 0))}</div>
              <div class="wf-shopee-item-title">#${idx + 1}. ${safeTitle}</div>
              <div class="wf-shopee-item-sub">
                <span>⭐ ${s.ratingStar ? Number(s.ratingStar).toFixed(1) : '5.0'} (${s.historicalSold || 0} bán)</span>
                <span>📍 ${escapeHtml(s.shopLocation || 'Philippines')}</span>
              </div>
            </div>
          </div>
        `;
        }).join('')}
      </div>
    `;
  }
}

function renderFeedTikTokVideos(state) {
  const feedTiktokContent = document.getElementById('feedTiktokContent');
  const feedTiktokPill = document.getElementById('feedTiktokPill');
  const feedTiktokSub = document.getElementById('feedTiktokSubtitle');

  const rawVideos = state.rawVideoCandidates || state.rawTikTokVideos || [];
  const verifiedVideos = state.formattedVideos || [];

  if (feedTiktokContent && (rawVideos.length > 0 || verifiedVideos.length > 0)) {
    const isRawMode = feedUiState.tiktokViewMode === 'raw';
    const displayList = isRawMode ? (rawVideos.length > 0 ? rawVideos : verifiedVideos) : (verifiedVideos.length > 0 ? verifiedVideos : rawVideos);

    if (feedTiktokPill) {
      feedTiktokPill.textContent = `${verifiedVideos.length}/${rawVideos.length || verifiedVideos.length} Video`;
    }
    if (feedTiktokSub) {
      feedTiktokSub.textContent = `Đã cào ${rawVideos.length} video thô ban đầu | Gemini Vision đã thẩm định ${verifiedVideos.length} video quay đúng sản phẩm`;
    }

    const toggleHtml = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.06);">
        <div style="font-size: 11px; font-weight: bold; color: #e2e8f0;">
          ${isRawMode ? `📦 Toàn Bộ Video Thô Chưa Lọc (${displayList.length})` : `🎯 Video Đã Được Gemini Vision Thẩm Định Bìa (${displayList.length})`}
        </div>
        <div class="wf-feed-toggle-group">
          <button class="wf-feed-toggle-btn ${!isRawMode ? 'active' : ''}" data-type="tiktok" data-mode="verified">🎯 Gemini Chọn (${verifiedVideos.length})</button>
          <button class="wf-feed-toggle-btn ${isRawMode ? 'active' : ''}" data-type="tiktok" data-mode="raw">📦 Video Thô (${rawVideos.length})</button>
        </div>
      </div>
    `;

    feedTiktokContent.innerHTML = toggleHtml + `
      <div class="wf-tiktok-videos-grid">
        ${displayList.map((v, idx) => {
          const rawLikes = Number(v.diggCount || v.likeCount || 0);
          const likeBadge = rawLikes >= 1000000 
            ? `${(rawLikes / 1000000).toFixed(1).replace(/\.0$/, '')}M` 
            : (rawLikes >= 1000 ? `${(rawLikes / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(rawLikes));
          const titleSafe = escapeHtml(v.title || v.description || 'Video Review');
          const authorSafe = escapeHtml(v.authorName || (v.author?.nickname || 'creator'));
          const isDouyin = v.platform === 'Douyin' || v.platform === 'douyin' || (v.videoUrl && v.videoUrl.includes('douyin.com'));
          const platformLabel = isDouyin ? 'Douyin' : 'TikTok';
          const cardUrl = v.videoUrl ? encodeURI(v.videoUrl) : '#';
          const isVerified = verifiedVideos.some(ver => String(ver.videoId) === String(v.videoId));
          const reasonText = v.visionReason ? escapeHtml(v.visionReason) : (isVerified ? 'Khớp sản phẩm gốc' : 'Video thô');

          return `
          <div class="wf-tiktok-vid-card" title="${titleSafe}" onclick="window.open('${cardUrl}', '_blank')">
            <div class="wf-tiktok-vid-thumb-wrap">
              <img src="${v.coverUrl || DEFAULT_IMAGE_SVG}" class="wf-tiktok-vid-thumb" onerror="this.src='${DEFAULT_IMAGE_SVG}'" loading="lazy" />
              <span class="wf-tiktok-platform-badge" style="background:${isDouyin ? '#fe2c55' : '#25f4ee'}; color:#000;">${platformLabel}</span>
              <span class="wf-tiktok-tym-badge">❤️ ${likeBadge}</span>
              ${isVerified ? '<span style="position:absolute; top:4px; right:4px; background:rgba(16,185,129,0.85); color:#fff; font-size:8px; padding:1px 4px; border-radius:3px; font-weight:bold;">✓ Gemini</span>' : ''}
            </div>
            <div class="wf-tiktok-vid-info">
              <div class="wf-tiktok-vid-title">#${idx + 1}. ${titleSafe}</div>
              <div class="wf-tiktok-vid-author" style="display:flex; justify-content:space-between; align-items:center;">
                <span>@${authorSafe}</span>
                <span style="font-size:8px; color:${isVerified ? '#34d399' : '#94a3b8'}; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${reasonText}</span>
              </div>
            </div>
          </div>
        `;
        }).join('')}
      </div>
    `;
  }
}
