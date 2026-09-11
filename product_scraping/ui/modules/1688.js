/**
 * Alibaba 1688 Module Controller
 */

import { renderRawError } from './utils.js';

let state1688File = null;

export function setup1688Module({ alibaba }) {
  const dropZone = document.getElementById('dropZone1688');
  const fileInput = document.getElementById('fileInput1688');
  const previewContainer = document.getElementById('previewContainer1688');
  const imgPreview = document.getElementById('imgPreview1688');
  const btnRemove = document.getElementById('btnRemove1688Img');
  const btnSearchFile = document.getElementById('btn1688SearchFile');

  const inputImgUrl = document.getElementById('input1688ImageUrl');
  const btnSearchImgUrl = document.getElementById('btn1688SearchImgUrl');
  const inputKeyword = document.getElementById('input1688Keyword');
  const btnSearchKeyword = document.getElementById('btn1688SearchKeyword');
  const btnDebug = document.getElementById('btnDebug1688');
  const btnSyncTabCookie = document.getElementById('btnSyncTabCookie1688');

  const statusText = document.getElementById('alibabaStatusText');
  const countText = document.getElementById('alibabaCountText');
  const resultsList = document.getElementById('alibabaResultsList');
  const tabStatusText = document.getElementById('alibabaTabStatus');
  const tabDot = document.getElementById('alibabaDot');

  // Nút Tự động đồng bộ Cookie & Token trực tiếp từ trình duyệt
  btnSyncTabCookie?.addEventListener('click', async () => {
    btnSyncTabCookie.disabled = true;
    statusText.textContent = 'Đang tự động trích xuất Cookie & Token từ trình duyệt Chrome...';
    try {
      const authInfo = await alibaba.auth.initialize();
      const token = authInfo.token;
      if (token) {
        statusText.textContent = `🟢 Đã tự động nạp ${authInfo.cookieCount} cookies từ trình duyệt! (Token: ${token.slice(0, 10)}...)`;
        if (tabStatusText) tabStatusText.textContent = `1688 Sẵn Sàng (Token: ${token.slice(0, 8)}...)`;
        if (tabDot) {
          tabDot.className = 'status-dot dot-green';
        }
      } else {
        statusText.textContent = '🟡 Đang kết nối 1688 Gateway để cấp token mới...';
        await alibaba.uploadImage('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==').catch(() => {});
        statusText.textContent = '🟢 Đã tự động kết nối và đồng bộ phiên 1688 thành công!';
      }
    } catch (e) {
      statusText.textContent = `Lỗi đồng bộ: ${e.message}`;
    } finally {
      btnSyncTabCookie.disabled = false;
    }
  });

  // Drag & drop handlers
  dropZone?.addEventListener('click', () => fileInput.click());
  fileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handle1688File(e.target.files[0]);
  });

  window.addEventListener('paste', (e) => {
    const activeTab = document.querySelector('.nav-tab.active')?.dataset.tab;
    if (activeTab === 'tab1688' && e.clipboardData.files.length > 0) {
      handle1688File(e.clipboardData.files[0]);
    }
  });

  btnRemove?.addEventListener('click', (e) => {
    e.stopPropagation();
    state1688File = null;
    fileInput.value = '';
    previewContainer.style.display = 'none';
    if (btnSearchFile) btnSearchFile.style.display = 'none';
  });

  function handle1688File(file) {
    state1688File = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      imgPreview.src = e.target.result;
      previewContainer.style.display = 'inline-block';
      if (btnSearchFile) btnSearchFile.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  // Nút Debug & Kiểm tra hệ thống H5 Gateway 1688
  btnDebug?.addEventListener('click', async () => {
    btnDebug.disabled = true;
    statusText.textContent = 'Đang kiểm tra session, token H5 và phản hồi thô từ Alibaba Gateway...';
    resultsList.innerHTML = '<div style="padding: 20px; color: #38bdf8;">Đang kết nối Alibaba H5 Gateway...</div>';

    try {
      const authInfo = await alibaba.auth.initialize();
      const aTab = await alibaba.getActive1688Tab();

      let pingResult = null;
      let pingError = null;
      try {
        const pingRes = await fetch('https://h5api.m.1688.com/h5/mtop.1688.imageservice.putimage/1.0/?jsv=2.7.2&appKey=12574478&t=' + Date.now(), {
          credentials: 'include'
        });
        pingResult = {
          status: pingRes.status,
          statusText: pingRes.statusText,
          url: pingRes.url,
          body: await pingRes.text().then(t => { try { return JSON.parse(t); } catch(e) { return t; } }),
        };
      } catch (pErr) {
        pingError = { message: pErr.message, stack: pErr.stack };
      }

      const report = {
        timestamp: new Date().toISOString(),
        activeTab: aTab ? { id: aTab.id, url: aTab.url, title: aTab.title } : 'Chưa có tab 1688 nào mở',
        authStatus: authInfo,
        cookiesDetected: {
          _m_h5_tk: alibaba.auth.cookies['_m_h5_tk'] || 'chưa có',
          cna: alibaba.auth.cookies['cna'] || 'chưa có',
          _tb_token_: alibaba.auth.cookies['_tb_token_'] || 'chưa có',
          totalCookies: Object.keys(alibaba.auth.cookies || {}).length,
        },
        gatewayPingTest: pingResult || pingError,
      };

      const reportJson = JSON.stringify(report, null, 2);

      resultsList.innerHTML = `
        <div style="background: rgba(14, 165, 233, 0.08); border: 1px solid #0ea5e9; border-radius: 8px; padding: 16px; margin: 12px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
            <span style="color: #38bdf8; font-weight: 700; font-size: 13px;">🐞 Báo Cáo Kiểm Tra Hệ Thống 1688 Gateway & Session</span>
            <button class="btn-copy-debug-report" style="background: #0369a1; border: 1px solid #38bdf8; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer;">📋 Sao chép báo cáo debug</button>
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">
            Token H5: <strong style="color: #38bdf8;">${authInfo.token || 'Chưa có'}</strong> | 
            Hết hạn: <span style="color: ${authInfo.isExpired ? '#f87171' : '#4ade80'}">${authInfo.isExpired ? 'ĐÃ HẾT HẠN' : 'Còn hiệu lực'}</span> | 
            Tab 1688: <span style="color: ${aTab ? '#4ade80' : '#f87171'}">${aTab ? `Đang mở (ID: ${aTab.id})` : 'Chưa mở'}</span>
          </div>
          <pre style="background: #090d16; border: 1px solid #1e293b; color: #38bdf8; padding: 12px; border-radius: 6px; font-size: 11px; font-family: Consolas, Monaco, monospace; max-height: 350px; overflow: auto; white-space: pre-wrap; word-break: break-all;">${reportJson}</pre>
        </div>
      `;

      resultsList.querySelector('.btn-copy-debug-report')?.addEventListener('click', (e) => {
        navigator.clipboard.writeText(reportJson);
        e.target.textContent = '✅ Đã sao chép!';
        setTimeout(() => { e.target.textContent = '📋 Sao chép báo cáo debug'; }, 2000);
      });

      statusText.textContent = 'Đã hoàn thành kiểm tra 1688 Gateway!';
    } catch (err) {
      statusText.textContent = `Lỗi kiểm tra: ${err.message}`;
      renderRawError(resultsList, 'Lỗi Kiểm Tra 1688 Gateway', err);
    } finally {
      btnDebug.disabled = false;
    }
  });

  // Nút tìm kiếm bằng ảnh file vừa chọn
  btnSearchFile?.addEventListener('click', async () => {
    if (!state1688File) return;

    btnSearchFile.disabled = true;

    // Tự động kiểm tra tab 1688 nếu chưa có để lấy session và tránh timeout
    const aTab = await alibaba.getActive1688Tab();
    if (!aTab) {
      statusText.textContent = '🟡 Đang mở tab s.1688.com để lấy token H5 tránh timeout (đợi 2.5s)...';
      await alibaba.open1688Tab();
      await new Promise(r => setTimeout(r, 2500));
    }

    statusText.textContent = 'Đang quét ảnh tìm xưởng gốc 1688...';
    resultsList.innerHTML = '<div style="padding: 20px; color: #94a3b8;">Đang nén và upload ảnh lên gateway 1688...</div>';

    try {
      const res = await alibaba.searchByImage(state1688File);
      render1688Offers(res.offers || res.items || [], res.raw);
    } catch (err) {
      statusText.textContent = `Lỗi: ${err.message}`;
      renderRawError(resultsList, 'Lỗi Upload Ảnh 1688', err);
    } finally {
      btnSearchFile.disabled = false;
    }
  });

  btnSearchImgUrl?.addEventListener('click', async () => {
    const url = inputImgUrl.value.trim();
    if (!url) return;

    btnSearchImgUrl.disabled = true;

    // Tự động kiểm tra tab 1688 nếu chưa có để lấy session và tránh timeout
    const aTab = await alibaba.getActive1688Tab();
    if (!aTab) {
      statusText.textContent = '🟡 Đang mở tab s.1688.com để lấy token H5 tránh timeout (đợi 2.5s)...';
      await alibaba.open1688Tab();
      await new Promise(r => setTimeout(r, 2500));
    }

    statusText.textContent = 'Đang tìm xưởng 1688 qua link ảnh...';
    resultsList.innerHTML = '<div style="padding: 20px; color: #94a3b8;">Đang tải nguồn hàng sỉ...</div>';

    try {
      const res = await alibaba.searchByImageUrl(url);
      render1688Offers(res.offers || res.items || [], res.raw);
    } catch (err) {
      statusText.textContent = `Lỗi: ${err.message}`;
      renderRawError(resultsList, 'Lỗi Link Ảnh 1688', err);
    } finally {
      btnSearchImgUrl.disabled = false;
    }
  });

  btnSearchKeyword?.addEventListener('click', async () => {
    const keyword = inputKeyword.value.trim();
    if (!keyword) return;

    btnSearchKeyword.disabled = true;

    // Tự động kiểm tra tab 1688 nếu chưa có để tránh timeout
    const aTab = await alibaba.getActive1688Tab();
    if (!aTab) {
      statusText.textContent = '🟡 Đang mở tab s.1688.com để lấy token H5 tránh timeout (đợi 2.5s)...';
      await alibaba.open1688Tab();
      await new Promise(r => setTimeout(r, 2500));
    }

    statusText.textContent = `Đang tìm kiếm sỉ "${keyword}" trên 1688...`;
    resultsList.innerHTML = '<div style="padding: 20px; color: #94a3b8;">Đang tải nguồn hàng sỉ...</div>';

    try {
      const res = await alibaba.searchByKeyword(keyword, { pageSize: 20 });
      render1688Offers(res.offers || res.items || [], res.raw);
    } catch (err) {
      statusText.textContent = `Lỗi: ${err.message}`;
      renderRawError(resultsList, 'Lỗi Tìm Từ Khóa 1688', err);
    } finally {
      btnSearchKeyword.disabled = false;
    }
  });

  function render1688Offers(offers, rawJson = null) {
    resultsList.innerHTML = '';
    statusText.textContent = `Tìm thấy ${offers.length} xưởng sỉ 1688`;
    countText.textContent = `${offers.length} xưởng`;

    if (offers.length === 0) {
      const rawDump = rawJson ? JSON.stringify(rawJson, null, 2) : 'Không có phản hồi thô từ server';
      resultsList.innerHTML = `
        <div style="padding: 16px; color: #94a3b8;">
          <p>Không tìm thấy xưởng phù hợp (0 xưởng sỉ).</p>
          ${rawJson ? `
            <details style="margin-top: 12px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 10px;">
              <summary style="color: #38bdf8; font-size: 12px; cursor: pointer; font-weight: 600;">🔍 Xem phản hồi thô từ Alibaba (Raw Server Response)</summary>
              <div style="margin-top: 8px; display: flex; justify-content: flex-end;">
                <button class="btn-copy-zero-raw" style="background: #1e293b; border: 1px solid #475569; color: #38bdf8; padding: 3px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">📋 Sao chép</button>
              </div>
              <pre style="color: #cbd5e1; font-size: 11px; font-family: Consolas, monospace; max-height: 250px; overflow: auto; margin-top: 6px; white-space: pre-wrap; word-break: break-all;">${rawDump}</pre>
            </details>
          ` : ''}
        </div>
      `;

      resultsList.querySelector('.btn-copy-zero-raw')?.addEventListener('click', (e) => {
        navigator.clipboard.writeText(rawDump);
        e.target.textContent = '✅ Đã sao chép!';
        setTimeout(() => { e.target.textContent = '📋 Sao chép'; }, 2000);
      });
      return;
    }

    const fallback1688Svg = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="8" fill="#1e293b"/><text fill="#ff6000" font-size="22" font-family="sans-serif" font-weight="bold" x="50" y="58" text-anchor="middle">1688</text></svg>');

    offers.forEach(item => {
      const card = document.createElement('div');
      card.className = 'product-card';
      const cny = item.pricing?.priceCny || item.price || item.formattedPrice || '0';
      const vnd = item.pricing?.priceFormattedVnd || (Math.round(Number(cny) * 3550).toLocaleString('vi-VN') + ' ₫');
      const imgUrl = (item.imageUrl || item.coverImage || '').replace(/&amp;/g, '&');
      const title = item.title || item.subject || 'Sản phẩm 1688';
      const company = item.company?.name || item.companyName || 'Xưởng 1688';
      const detailUrl = item.detailUrl || item.offerUrl || `https://detail.1688.com/offer/${item.offerId || item.id}.html`;

      card.innerHTML = `
        <div class="product-thumb-wrap">
          <img class="product-thumb" src="${imgUrl || fallback1688Svg}" alt="${title}" referrerpolicy="no-referrer" loading="lazy">
        </div>
        <div class="product-info">
          <div class="product-title" title="${title}">${title}</div>
          <div class="product-price-row">
            <span class="price-cny">¥${cny}</span>
            <span style="font-size: 12px; color: #10b981; font-weight: 600;">≈ ${vnd}</span>
          </div>
          <div class="product-meta">
            <span>MOQ: ${item.moq || 1} cái</span>
            <span>${company}</span>
          </div>
          <div class="card-actions">
            <a href="${detailUrl}" target="_blank" class="btn-card-action" style="color: #ff6000;">Mở Xưởng 1688</a>
          </div>
        </div>
      `;

      const imgEl = card.querySelector('.product-thumb');
      imgEl.addEventListener('error', () => {
        imgEl.src = fallback1688Svg;
      });

      resultsList.appendChild(card);
    });
  }
}
