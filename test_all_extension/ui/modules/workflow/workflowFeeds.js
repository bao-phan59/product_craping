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

  if (feedCleanContent) feedCleanContent.innerHTML = '<div class="wf-feed-empty-hint">Chưa có dữ liệu mô tả & 5 link 1688...</div>';
  if (feedCleanPill) feedCleanPill.textContent = 'Chờ xử lý';
  if (feedCleanSub) feedCleanSub.textContent = 'Đang chờ đóng gói mô tả, thông số và lưu dữ liệu 5 link thô 1688...';

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
  clean1688ViewMode: 'specs', // 'specs' | 'raw5'
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
    if (type === 'clean1688') {
      feedUiState.clean1688ViewMode = mode;
      if (feedUiState.cachedState) renderFeed1688Clean(feedUiState.cachedState);
    } else if (type === 'shopee') {
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
    const raw5 = c.top5RawShops || state.valid1688Shops || [];
    const isRawMode = feedUiState.clean1688ViewMode === 'raw5';
    const specCount = Object.keys(c.attributes || c.detailedSpecs || {}).length;

    if (feedCleanPill) {
      feedCleanPill.textContent = isRawMode ? `5 Link Xưởng Thô` : `Mô Tả & ${specCount} Specs`;
    }
    if (feedCleanSub) {
      feedCleanSub.textContent = isRawMode
        ? `Toàn bộ dữ liệu thô đối chiếu từ 5 link xưởng 1688 tốt nhất được chọn`
        : `Đã đóng gói mô tả chi tiết sản phẩm và bảng thông số toàn diện (${specCount} thông số)`;
    }

    const toggleHtml = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.06);">
        <div style="font-size: 11px; font-weight: bold; color: #e2e8f0;">
          ${isRawMode ? `🏭 Dữ Liệu Thô 5 Link Xưởng 1688 Đầu Nguồn (${raw5.length} xưởng)` : `📋 Mô Tả Chi Tiết & Bảng Thông Số Kỹ Thuật`}
        </div>
        <div class="wf-feed-toggle-group">
          <button class="wf-feed-toggle-btn ${!isRawMode ? 'active' : ''}" data-type="clean1688" data-mode="specs">📝 Mô Tả & Specs</button>
          <button class="wf-feed-toggle-btn ${isRawMode ? 'active' : ''}" data-type="clean1688" data-mode="raw5">🏭 5 Link Thô 1688 (${raw5.length})</button>
        </div>
      </div>
    `;

    let bodyHtml = '';

    if (isRawMode) {
      // TAB 2: DỮ LIỆU THÔ 5 LINK XƯỞNG 1688
      bodyHtml = `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${raw5.map((s, idx) => {
            const rawTitle = escapeHtml(s.rawTitle || s.title || 'Sản phẩm 1688');
            const priceTxt = s.priceFormatted || (`¥` + (s.price || 0));
            const priceVndTxt = s.priceFormattedVnd || (s.priceVnd ? `${Number(s.priceVnd).toLocaleString()} ₫` : '');
            const factory = escapeHtml(s.company?.name || 'Nhà xưởng 1688');
            const city = escapeHtml(s.company?.city || s.company?.province || 'Trung Quốc');
            const directUrl = s.detailUrl || (s.offerId ? `https://detail.1688.com/offer/${s.offerId}.html` : '#');
            const isSuper = !!s.company?.isSuperFactory;

            return `
            <div style="display: flex; gap: 10px; background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 8px; position: relative;">
              <div style="position: relative; width: 75px; height: 75px; flex-shrink: 0; background: #0b0f19; border-radius: 4px; overflow: hidden;">
                <img src="${s.imageUrl || DEFAULT_IMAGE_SVG}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='${DEFAULT_IMAGE_SVG}'" loading="lazy" />
                <span style="position:absolute; top:2px; left:2px; background:rgba(234,88,12,0.9); color:#fff; font-size:9px; font-weight:bold; padding:1px 4px; border-radius:3px;">#${idx + 1}</span>
              </div>
              <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="font-size: 11px; font-weight: bold; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${rawTitle}">
                    #${idx + 1}. ${rawTitle}
                  </div>
                  <div style="font-size: 9.5px; color: #94a3b8; margin-top: 2px;">
                    🏭 <strong>${factory}</strong> (${city}) ${isSuper ? '<span style="color:#fbbf24; font-weight:bold;">★ Siêu Xưởng</span>' : ''}
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 4px;">
                  <div>
                    <span style="font-size: 12px; font-weight: bold; color: #34d399;">${priceTxt}</span>
                    <span style="font-size: 9.5px; color: #94a3b8; margin-left: 3px;">(${priceVndTxt})</span>
                    <span style="font-size: 9px; color: #cbd5e1; margin-left: 6px;">| MOQ: <strong>${s.moq || 1} cái</strong> | Bán: <strong>${s.salesCount || 0}</strong></span>
                  </div>
                  <a href="${directUrl}" target="_blank" style="background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.3); color: #38bdf8; font-size: 9.5px; font-weight: bold; padding: 2px 8px; border-radius: 4px; text-decoration: none;">
                    Mở 1688 ↗
                  </a>
                </div>
              </div>
            </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      // TAB 1: MÔ TẢ CHI TIẾT SẢN PHẨM & BẢNG THÔNG SỐ TOÀN DIỆN
      const specs = c.detailedSpecs || c.attributes || {};
      const paragraphs = c.descriptionParagraphs || {};

      bodyHtml = `
        <!-- 1. Thẻ Banner Sản Phẩm Đại Diện -->
        <div class="wf-clean-offer-banner">
          <img src="${c.imageUrl || DEFAULT_IMAGE_SVG}" class="wf-clean-offer-img" onerror="this.src='${DEFAULT_IMAGE_SVG}'" />
          <div class="wf-clean-offer-details">
            <div style="font-size: 12px; font-weight: bold; color: #38bdf8; margin-bottom: 2px;">
              🏷️ ${escapeHtml(c.productNameVi || c.title)}
            </div>
            <div style="font-size: 10px; color: #94a3b8; margin-bottom: 4px;">
              🌐 Tên quốc tế: <em style="color: #cbd5e1;">${escapeHtml(c.productNameEn || 'N/A')}</em>
            </div>
            <div style="display: flex; gap: 12px; font-size: 11px; margin-bottom: 4px; flex-wrap: wrap;">
              <span>Giá sỉ: <strong style="color: #34d399;">${c.priceFormatted || ('¥' + c.basePrice)}</strong> (~${c.priceFormattedVnd || 'N/A'})</span>
              <span>Tối thiểu (MOQ): <strong style="color: #fb923c;">${c.moq || 1} cái</strong></span>
              <span>Đã bán xưởng: <strong style="color: #a78bfa;">${c.salesCount || 0} cái/tháng</strong></span>
            </div>
            <div class="wf-tag-cloud" style="margin-top: 2px;">
              <span class="wf-noise-tag">❌ Đã lọc SĐT Trung Quốc</span>
              <span class="wf-noise-tag">❌ Đã lọc WeChat xưởng</span>
              <span class="wf-noise-tag">❌ Đã lọc Địa chỉ công xưởng</span>
              <span class="wf-noise-tag">❌ Đã gọt lời chào mời sỉ</span>
            </div>
          </div>
        </div>

        <!-- 2. Các Đoạn Mô Tả Chi Tiết Sản Phẩm -->
        <div style="margin-top: 8px; background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 10px;">
          <div style="color: #38bdf8; font-weight: bold; font-size: 11px; margin-bottom: 6px;">
            📝 Các Đoạn Mô Tả Chi Tiết Về Sản Phẩm:
          </div>
          
          <div style="margin-bottom: 8px;">
            <div style="font-size: 10.5px; font-weight: bold; color: #fbbf24;">🌟 1. Tổng Quan & Cấu Tạo Sản Phẩm:</div>
            <div style="font-size: 11px; color: #e2e8f0; line-height: 1.5; margin-top: 2px; text-align: justify;">
              ${escapeHtml(paragraphs.overview || `Sản phẩm ${c.title} sở hữu thiết kế chuẩn hóa, gia công trực tiếp tại xưởng chuyên sâu 1688 với độ hoàn thiện cao.`)}
            </div>
          </div>

          <div style="margin-bottom: 8px;">
            <div style="font-size: 10.5px; font-weight: bold; color: #34d399;">⚡ 2. Đặc Tính Kỹ Thuật & Công Năng Nổi Bật:</div>
            <div style="font-size: 11px; color: #e2e8f0; line-height: 1.5; margin-top: 2px; text-align: justify;">
              ${escapeHtml(paragraphs.highlights || `Thiết kế tối ưu hiệu suất, linh kiện bền bỉ, tiết kiệm năng lượng và đạt tiêu chuẩn an toàn kỹ thuật.`)}
            </div>
          </div>

          <div>
            <div style="font-size: 10.5px; font-weight: bold; color: #a78bfa;">🎯 3. Ứng Dụng Thực Tế & Không Gian Sử Dụng:</div>
            <div style="font-size: 11px; color: #e2e8f0; line-height: 1.5; margin-top: 2px; text-align: justify;">
              ${escapeHtml(paragraphs.applications || `Phù hợp sử dụng trong đời sống gia đình, chiếu sáng dân dụng, văn phòng và các kênh bán lẻ thương mại điện tử.`)}
            </div>
          </div>
        </div>

        <!-- 3. Bảng Toàn Bộ Thông Số Kỹ Thuật -->
        <div style="margin-top: 8px; background: rgba(15,23,42,0.4); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 10px;">
          <div style="color: #a78bfa; font-weight: bold; font-size: 11px; margin-bottom: 6px;">
            📊 Bảng Toàn Bộ Thông Số Kỹ Thuật Chi Tiết (${Object.keys(specs).length} thông số):
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 6px;">
            ${Object.entries(specs).map(([k, v]) => `
              <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); padding: 4px 8px; border-radius: 4px; font-size: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #94a3b8; font-weight: 600;">${escapeHtml(k)}:</span>
                <span style="color: #67e8f9; font-weight: bold; text-align: right; margin-left: 6px;">${escapeHtml(v)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    feedCleanContent.innerHTML = toggleHtml + bodyHtml;
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
    const displayList = isRawMode ? rawVideos : verifiedVideos;

    if (feedTiktokPill) {
      feedTiktokPill.textContent = `${verifiedVideos.length}/${rawVideos.length} Video`;
    }
    if (feedTiktokSub) {
      feedTiktokSub.textContent = `Đã cào ${rawVideos.length} video thô ban đầu | Gemini Vision đã thẩm định ${verifiedVideos.length} video quay đúng sản phẩm`;
    }

    const toggleHtml = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.06);">
        <div style="font-size: 11px; font-weight: bold; color: #e2e8f0;">
          ${isRawMode ? `📦 Toàn Bộ Video Thô Chưa Lọc (${rawVideos.length})` : `🎯 Video Đã Được Gemini Vision Thẩm Định Bìa (${verifiedVideos.length})`}
        </div>
        <div class="wf-feed-toggle-group">
          <button class="wf-feed-toggle-btn ${!isRawMode ? 'active' : ''}" data-type="tiktok" data-mode="verified">🎯 Gemini Chọn (${verifiedVideos.length})</button>
          <button class="wf-feed-toggle-btn ${isRawMode ? 'active' : ''}" data-type="tiktok" data-mode="raw">📦 Video Thô (${rawVideos.length})</button>
        </div>
      </div>
    `;

    let contentGridHtml = '';
    if (!isRawMode && verifiedVideos.length === 0) {
      contentGridHtml = `
        <div style="color: #94a3b8; font-size: 11px; padding: 16px; text-align: center; background: rgba(2,6,23,0.5); border-radius: 6px; border: 1px dashed rgba(255,255,255,0.1);">
          Chưa có video nào khớp với sản phẩm mục tiêu (Gemini đã loại bỏ các video nhảy múa/piano/không liên quan).<br/>
          Bấm tab <strong>[📦 Video Thô (${rawVideos.length})]</strong> ở trên để xem chi tiết lý do loại bỏ từng video.
        </div>
      `;
    } else {
      contentGridHtml = `
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

            const statusBadge = isVerified
              ? '<span style="position:absolute; top:4px; right:4px; background:rgba(16,185,129,0.85); color:#fff; font-size:8px; padding:1px 4px; border-radius:3px; font-weight:bold;">✓ Gemini</span>'
              : (isRawMode ? '<span style="position:absolute; top:4px; right:4px; background:rgba(239,68,68,0.85); color:#fff; font-size:8px; padding:1px 4px; border-radius:3px; font-weight:bold;">✗ Lệch SP</span>' : '');

            return `
            <div class="wf-tiktok-vid-card" title="${titleSafe}" onclick="window.open('${cardUrl}', '_blank')">
              <div class="wf-tiktok-vid-thumb-wrap">
                <img src="${v.coverUrl || DEFAULT_IMAGE_SVG}" class="wf-tiktok-vid-thumb" onerror="this.src='${DEFAULT_IMAGE_SVG}'" loading="lazy" />
                <span class="wf-tiktok-platform-badge" style="background:${isDouyin ? '#fe2c55' : '#25f4ee'}; color:#000;">${platformLabel}</span>
                <span class="wf-tiktok-tym-badge">❤️ ${likeBadge}</span>
                ${statusBadge}
              </div>
              <div class="wf-tiktok-vid-info">
                <div class="wf-tiktok-vid-title">#${idx + 1}. ${titleSafe}</div>
                <div class="wf-tiktok-vid-author" style="display:flex; justify-content:space-between; align-items:center;">
                  <span>@${authorSafe}</span>
                  <span style="font-size:8px; color:${isVerified ? '#34d399' : '#f87171'}; max-width:95px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${reasonText}">${reasonText}</span>
                </div>
              </div>
            </div>
          `;
          }).join('')}
        </div>
      `;
    }

    feedTiktokContent.innerHTML = toggleHtml + contentGridHtml;
  }
}
