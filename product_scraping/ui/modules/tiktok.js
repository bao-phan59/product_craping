import { renderRawError } from './utils.js';

export function setupTiktokModule({ tiktok }) {
  const btnSearch = document.getElementById('btnTiktokSearch');
  const btnDetail = document.getElementById('btnTiktokDetail');
  const btnDebug = document.getElementById('btnDebugTiktok');
  const inputKeyword = document.getElementById('inputTiktokKeyword');
  const selectPlatform = document.getElementById('selectTiktokPlatform');
  const inputUrl = document.getElementById('inputTiktokUrl');
  const statusText = document.getElementById('tiktokStatusText');
  const countText = document.getElementById('tiktokCountText');
  const resultsList = document.getElementById('tiktokResultsList');

  // Nút Debug & Kiểm tra kết nối TikTok / Douyin
  btnDebug?.addEventListener('click', async () => {
    btnDebug.disabled = true;
    const platform = selectPlatform.value;
    statusText.textContent = `Đang kiểm tra kết nối API & session của ${platform.toUpperCase()}...`;
    resultsList.innerHTML = `<div style="padding: 20px; color: #38bdf8;">Đang kiểm tra kết nối ${platform.toUpperCase()}...</div>`;

    try {
      const activeTab = await tiktok.getActiveTab(platform);
      const pingUrl = platform === 'douyin' 
        ? 'https://www.douyin.com/aweme/v1/web/search/item/?keyword=test&count=1'
        : 'https://www.tiktok.com/api/search/general/full/?keyword=test&count=1';

      let pingResult = null;
      let pingError = null;

      try {
        const pingRes = await fetch(pingUrl, { credentials: 'include' });
        const text = await pingRes.text();
        let parsedJson = null;
        try { parsedJson = JSON.parse(text); } catch (e) { parsedJson = text; }
        pingResult = {
          status: pingRes.status,
          statusText: pingRes.statusText,
          url: pingRes.url,
          responseBody: parsedJson,
        };
      } catch (pErr) {
        pingError = { message: pErr.message, stack: pErr.stack };
      }

      const report = {
        timestamp: new Date().toISOString(),
        platform: platform.toUpperCase(),
        activeTab: activeTab ? { id: activeTab.id, url: activeTab.url, title: activeTab.title } : `Chưa mở tab ${platform.toUpperCase()}`,
        pingTest: pingResult || pingError,
      };

      const reportJson = JSON.stringify(report, null, 2);

      resultsList.innerHTML = `
        <div style="background: rgba(14, 165, 233, 0.08); border: 1px solid #0ea5e9; border-radius: 8px; padding: 16px; margin: 12px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
            <span style="color: #38bdf8; font-weight: 700; font-size: 13px;">Báo Cáo Kiểm Tra Hệ Thống ${platform.toUpperCase()} API</span>
            <button class="btn-copy-tiktok-debug" style="background: #0369a1; border: 1px solid #38bdf8; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer;">Sao chép báo cáo debug</button>
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">
            Nền tảng: <strong style="color: #38bdf8;">${platform.toUpperCase()}</strong> | 
            Tab trình duyệt: <span style="color: ${activeTab ? '#4ade80' : '#f87171'}">${activeTab ? `Đang mở (ID: ${activeTab.id})` : 'Chưa mở'}</span>
          </div>
          <pre style="background: #090d16; border: 1px solid #1e293b; color: #38bdf8; padding: 12px; border-radius: 6px; font-size: 11px; font-family: Consolas, Monaco, monospace; max-height: 350px; overflow: auto; white-space: pre-wrap; word-break: break-all;">${reportJson}</pre>
        </div>
      `;

      resultsList.querySelector('.btn-copy-tiktok-debug')?.addEventListener('click', (e) => {
        navigator.clipboard.writeText(reportJson);
        e.target.textContent = 'Đã sao chép!';
        setTimeout(() => { e.target.textContent = 'Sao chép báo cáo debug'; }, 2000);
      });

      statusText.textContent = `Đã hoàn thành kiểm tra ${platform.toUpperCase()} API!`;
    } catch (err) {
      statusText.textContent = `Lỗi kiểm tra: ${err.message}`;
      renderRawError(resultsList, `Lỗi Kiểm Tra ${platform.toUpperCase()}`, err);
    } finally {
      btnDebug.disabled = false;
    }
  });

  btnSearch?.addEventListener('click', async () => {
    const keyword = inputKeyword.value.trim();
    if (!keyword) return;

    const platform = selectPlatform.value;
    btnSearch.disabled = true;

    // Tự động kiểm tra và đảm bảo tab đã tải xong hoàn toàn để kích hoạt In-Tab Bypass
    let tab = await tiktok.getActiveTab(platform);
    if (!tab) {
      statusText.textContent = `Đang tự động mở tab ${platform.toUpperCase()} để nạp bảo mật...`;
      tab = await tiktok.ensureActiveTab(platform, (msg) => {
        statusText.textContent = msg;
      });
    } else if (tab.status === 'loading') {
      statusText.textContent = `⏳ Tab ${platform.toUpperCase()} đang tải, đợi sẵn sàng...`;
      tab = await tiktok._waitForTabComplete(tab.id, 12000);
      await new Promise(r => setTimeout(r, 1000));
    }

    statusText.textContent = `Đang tìm kiếm "${keyword}" trên ${platform.toUpperCase()}...`;
    resultsList.innerHTML = '<div style="padding: 20px; color: #94a3b8;">Đang tải danh sách video...</div>';

    try {
      const res = await tiktok.searchVideos(keyword, { platform, count: 12 });
      const videos = res.videos || [];
      statusText.textContent = `Lấy được ${videos.length} video từ ${platform.toUpperCase()}`;
      countText.textContent = `${videos.length} videos`;
      resultsList.innerHTML = '';

      if (videos.length === 0) {
        const rawDump = res.raw ? JSON.stringify(res.raw, null, 2) : 'Không có phản hồi thô từ server';
        resultsList.innerHTML = `
          <div style="padding: 16px; color: #94a3b8;">
            <p>Không tìm thấy video nào phù hợp trên ${platform.toUpperCase()} (0 video).</p>
            <details style="margin-top: 12px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 10px;">
              <summary style="color: #38bdf8; font-size: 12px; cursor: pointer; font-weight: 600;">Xem phản hồi thô từ ${platform.toUpperCase()} (Raw Server Response)</summary>
              <div style="margin-top: 8px; display: flex; justify-content: flex-end;">
                <button class="btn-copy-zero-tiktok" style="background: #1e293b; border: 1px solid #475569; color: #38bdf8; padding: 3px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Sao chép</button>
              </div>
              <pre style="color: #cbd5e1; font-size: 11px; font-family: Consolas, monospace; max-height: 250px; overflow: auto; margin-top: 6px; white-space: pre-wrap; word-break: break-all;">${rawDump}</pre>
            </details>
          </div>
        `;

        resultsList.querySelector('.btn-copy-zero-tiktok')?.addEventListener('click', (e) => {
          navigator.clipboard.writeText(rawDump);
          e.target.textContent = 'Đã sao chép!';
          setTimeout(() => { e.target.textContent = 'Sao chép'; }, 2000);
        });
        return;
      }

      videos.forEach(v => {
        const card = document.createElement('div');
        card.className = 'video-card';

        const rawAuthor = (v.author && typeof v.author === 'object')
          ? (v.author.nickname || v.author.uniqueId || 'Creator')
          : (v.authorName || (typeof v.author === 'string' ? v.author : 'Creator'));
        const safeAuthor = escapeHtml(rawAuthor);

        const rawClean = (v.video && typeof v.video === 'object')
          ? (v.video.url || v.video.downloadUrl || '')
          : (v.cleanVideoUrl || v.videoUrl || '');
        const safeCleanLink = (rawClean && (rawClean.startsWith('http://') || rawClean.startsWith('https://'))) ? rawClean : '';

        const rawCover = (v.video && typeof v.video === 'object')
          ? (v.video.cover || v.video.dynamicCover || '')
          : (v.coverUrl || '');
        const fallbackPoster = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="%23281F1A" width="100" height="100"/><text fill="%23D1C0B4" font-size="14" font-family="sans-serif" font-weight="bold" x="50" y="55" text-anchor="middle" dominant-baseline="middle">VIDEO</text></svg>';
        const safeCover = (rawCover && (rawCover.startsWith('http://') || rawCover.startsWith('https://'))) ? rawCover : fallbackPoster;

        const rawDesc = v.description || v.title || v.desc || 'Video Review';
        const safeDesc = escapeHtml(rawDesc);

        const views = (v.stats && typeof v.stats === 'object')
          ? (v.stats.views || v.stats.playCount || 0)
          : (v.playCount || 0);

        const likes = (v.stats && typeof v.stats === 'object')
          ? (v.stats.likes || v.stats.diggCount || 0)
          : (v.likeCount || 0);

        const rawOriginal = v.webUrl || (v.platform === 'douyin'
          ? `https://www.douyin.com/video/${v.id}`
          : `https://www.tiktok.com/@${(v.author && v.author.uniqueId) || 'video'}/video/${v.id}`);
        const safeOriginalUrl = (rawOriginal && (rawOriginal.startsWith('http://') || rawOriginal.startsWith('https://'))) ? rawOriginal : '#';

        card.innerHTML = `
          <div class="video-player-wrap">
            ${safeCleanLink
              ? `<video controls preload="metadata" poster="${safeCover}" src="${safeCleanLink}"></video>`
              : `<img class="video-thumb-img" src="${safeCover}" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: cover;">`
            }
          </div>
          <div class="video-meta">
            <div class="video-author">@${safeAuthor}</div>
            <div class="video-desc" title="${safeDesc}">${safeDesc}</div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b;">
              <span>Lượt xem: ${Number(views).toLocaleString()}</span>
              <span>Thích: ${Number(likes).toLocaleString()}</span>
            </div>
            <div class="card-actions" style="margin-top: 6px;">
              ${safeCleanLink ? `<a href="${safeCleanLink}" target="_blank" rel="noopener noreferrer" download="video.mp4" class="btn-card-action" style="color: #38bdf8;">Tải Video Sạch</a>` : ''}
              <a href="${safeOriginalUrl}" target="_blank" rel="noopener noreferrer" class="btn-card-action">Mở Gốc</a>
            </div>
          </div>
        `;

        const thumbImg = card.querySelector('.video-thumb-img');
        if (thumbImg) {
          thumbImg.addEventListener('error', () => {
            thumbImg.src = fallbackPoster;
          });
        }

        resultsList.appendChild(card);
      });
    } catch (err) {
      statusText.textContent = `Lỗi: ${err.message}`;
      renderRawError(resultsList, `Lỗi Tìm Video ${platform.toUpperCase()}`, err);
    } finally {
      btnSearch.disabled = false;
    }
  });

  btnDetail?.addEventListener('click', async () => {
    const url = inputUrl.value.trim();
    if (!url) return;

    btnDetail.disabled = true;
    statusText.textContent = 'Đang trích xuất video sạch không watermark...';

    try {
      const v = await tiktok.getVideoDetail(url);
      const rawClean = (v.video && typeof v.video === 'object') ? (v.video.url || v.video.downloadUrl) : (v.cleanVideoUrl || v.videoUrl);
      const safeCleanLink = (rawClean && (rawClean.startsWith('http://') || rawClean.startsWith('https://'))) ? rawClean : '';
      const rawAuthor = (v.author && typeof v.author === 'object') ? (v.author.nickname || v.author.uniqueId) : (v.authorName || 'Video');
      const safeAuthor = escapeHtml(rawAuthor);
      const rawDesc = v.description || v.title || v.desc || 'Video';
      const safeDesc = escapeHtml(rawDesc);

      resultsList.innerHTML = `
        <div class="video-card" style="grid-column: 1 / -1; max-width: 400px; margin: 0 auto;">
          <div class="video-player-wrap">
            ${safeCleanLink ? `<video controls autoplay src="${safeCleanLink}"></video>` : '<div style="padding:20px; color:#94a3b8;">Không có luồng video trực tiếp</div>'}
          </div>
          <div class="video-meta">
            <div class="video-author">@${safeAuthor}</div>
            <div class="video-desc">${safeDesc}</div>
            ${safeCleanLink ? `<a href="${safeCleanLink}" target="_blank" rel="noopener noreferrer" download="clean_video.mp4" class="btn btn-tiktok" style="text-align: center; text-decoration: none; margin-top: 8px;">Tải Xuống MP4 Không Logo</a>` : ''}
          </div>
        </div>
      `;
      statusText.textContent = 'Trích xuất thành công!';
    } catch (err) {
      statusText.textContent = `Lỗi trích xuất: ${err.message}`;
      renderRawError(resultsList, 'Lỗi Trích Xuất Video TikTok / Douyin', err);
    } finally {
      btnDetail.disabled = false;
    }
  });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
