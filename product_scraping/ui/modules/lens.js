/**
 * Google Lens Module Controller
 */

let stateLensFile = null;
let lensResultsCache = { shoppingOffers: [], visualMatches: [] };

export function setupLensModule({ lens }) {
  const dropZone = document.getElementById('dropZoneLens');
  const fileInput = document.getElementById('fileInputLens');
  const previewContainer = document.getElementById('previewContainerLens');
  const imgPreview = document.getElementById('imgPreviewLens');
  const btnRemove = document.getElementById('btnRemoveLensImg');
  const btnSearchFile = document.getElementById('btnLensSearchFile');

  const inputImgUrl = document.getElementById('inputLensImageUrl');
  const btnSearch = document.getElementById('btnLensSearch');
  const btnSubShopping = document.getElementById('subTabLensShopping');
  const btnSubVisual = document.getElementById('subTabLensVisual');
  const resultsList = document.getElementById('lensResultsList');

  const countShopping = document.getElementById('lensCountShopping');
  const countVisual = document.getElementById('lensCountVisual');

  let currentSubTab = 'shopping';

  dropZone?.addEventListener('click', () => fileInput.click());
  fileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handleLensFile(e.target.files[0]);
  });

  window.addEventListener('paste', (e) => {
    const activeTab = document.querySelector('.nav-tab.active')?.dataset.tab;
    if (activeTab === 'tabLens' && e.clipboardData.files.length > 0) {
      handleLensFile(e.clipboardData.files[0]);
    }
  });

  btnRemove?.addEventListener('click', (e) => {
    e.stopPropagation();
    stateLensFile = null;
    fileInput.value = '';
    previewContainer.style.display = 'none';
    if (btnSearchFile) btnSearchFile.style.display = 'none';
  });

  function handleLensFile(file) {
    stateLensFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      imgPreview.src = e.target.result;
      previewContainer.style.display = 'inline-block';
      if (btnSearchFile) btnSearchFile.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  btnSearchFile?.addEventListener('click', async () => {
    if (!stateLensFile) return;

    btnSearchFile.disabled = true;
    resultsList.innerHTML = '<div style="padding: 20px; color: #94a3b8;">Đang phân tích hình ảnh qua Google Lens...</div>';
    try {
      const res = await lens.searchByImageBlob(stateLensFile);
      lensResultsCache.shoppingOffers = res.shoppingOffers || [];
      lensResultsCache.visualMatches = res.visualMatches || [];
      if (countShopping) countShopping.textContent = lensResultsCache.shoppingOffers.length;
      if (countVisual) countVisual.textContent = lensResultsCache.visualMatches.length;
      renderLensItems();
    } catch (err) {
      resultsList.innerHTML = `<div style="color: #f87171; padding: 20px;">Lỗi Lens: ${err.message}</div>`;
    } finally {
      btnSearchFile.disabled = false;
    }
  });

  btnSearch?.addEventListener('click', async () => {
    const url = inputImgUrl.value.trim();
    if (!url) return;

    btnSearch.disabled = true;
    resultsList.innerHTML = '<div style="padding: 20px; color: #94a3b8;">Đang quét ảnh qua Google Lens...</div>';

    try {
      const res = await lens.searchByImageUrl(url);
      lensResultsCache.shoppingOffers = res.shoppingOffers || [];
      lensResultsCache.visualMatches = res.visualMatches || [];
      if (countShopping) countShopping.textContent = lensResultsCache.shoppingOffers.length;
      if (countVisual) countVisual.textContent = lensResultsCache.visualMatches.length;
      renderLensItems();
    } catch (err) {
      resultsList.innerHTML = `<div style="color: #f87171; padding: 20px;">Lỗi Lens: ${err.message}</div>`;
    } finally {
      btnSearch.disabled = false;
    }
  });

  btnSubShopping?.addEventListener('click', () => {
    currentSubTab = 'shopping';
    btnSubShopping.classList.add('active');
    btnSubVisual.classList.remove('active');
    renderLensItems();
  });

  btnSubVisual?.addEventListener('click', () => {
    currentSubTab = 'visual';
    btnSubVisual.classList.add('active');
    btnSubShopping.classList.remove('active');
    renderLensItems();
  });

  function renderLensItems() {
    resultsList.innerHTML = '';
    const items = currentSubTab === 'shopping' ? lensResultsCache.shoppingOffers : lensResultsCache.visualMatches;

    if (items.length === 0) {
      resultsList.innerHTML = `<div style="padding: 20px; color: #94a3b8;">Chưa có kết quả ${currentSubTab === 'shopping' ? 'ưu đãi mua sắm' : 'ảnh tương đồng'}.</div>`;
      return;
    }

    const fallbackLensSvg = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="8" fill="#1e293b"/><circle cx="45" cy="45" r="18" stroke="#38bdf8" stroke-width="3.5" fill="none"/><line x1="58" y1="58" x2="76" y2="76" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/></svg>');

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'product-card';
      
      let cleanImg = (item.thumbnailUrl || item.imageUrl || '').replace(/\\u0026/g, '&').replace(/\\u003d/g, '=').replace(/\\u002f/g, '/').replace(/&amp;/g, '&');
      if (cleanImg.includes('R0lGODlhAQAB') || cleanImg.includes('data:image/gif')) {
        cleanImg = '';
      }
      if (cleanImg.startsWith('//')) cleanImg = 'https:' + cleanImg;

      card.innerHTML = `
        <div class="product-thumb-wrap">
          <img class="product-thumb" 
               src="${cleanImg || fallbackLensSvg}" 
               alt="${item.title}" 
               referrerpolicy="no-referrer" 
               loading="lazy">
        </div>
        <div class="product-info">
          <div class="product-title" title="${item.title}">${item.title}</div>
          <div class="product-price-row">
            <span class="price-vnd" style="color: #38bdf8;">${item.price || 'Xem trên sàn'}</span>
            <span style="font-size: 11px; background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #94a3b8;">${item.merchant || item.source || item.platform || 'Online'}</span>
          </div>
          <div class="card-actions">
            <a href="${item.targetUrl || item.sourceUrl || item.link}" target="_blank" class="btn-card-action">Đến Nơi Bán</a>
          </div>
        </div>
      `;

      const imgEl = card.querySelector('.product-thumb');
      imgEl.addEventListener('error', () => {
        imgEl.src = fallbackLensSvg;
      });

      resultsList.appendChild(card);
    });
  }
}
