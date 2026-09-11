/**
 * Shopee Module Controller
 */

export function setupShopeeModule({ shopee }) {
  const btnSearch = document.getElementById('btnShopeeSearch');
  const btnDetail = document.getElementById('btnShopeeDetail');
  const inputKeyword = document.getElementById('inputShopeeKeyword');
  const selectSort = document.getElementById('selectShopeeSort');
  const inputUrl = document.getElementById('inputShopeeUrl');
  const statusText = document.getElementById('shopeeStatusText');
  const countText = document.getElementById('shopeeCountText');
  const resultsList = document.getElementById('shopeeResultsList');
  const detailBox = document.getElementById('shopeeDetailBox');

  btnSearch?.addEventListener('click', async () => {
    const keyword = inputKeyword.value.trim();
    if (!keyword) return;

    btnSearch.disabled = true;
    statusText.textContent = `Đang tìm kiếm "${keyword}" trên Shopee...`;
    resultsList.innerHTML = '<div style="padding: 20px; color: #94a3b8;">Đang tải dữ liệu sản phẩm...</div>';

    try {
      const res = await shopee.searchItems(keyword, {
        sortBy: selectSort.value,
        limit: 24
      });

      const items = res.items || [];
      statusText.textContent = `Tìm thấy ${res.totalCount || items.length} sản phẩm`;
      countText.textContent = `${items.length} items`;
      resultsList.innerHTML = '';

      if (items.length === 0) {
        resultsList.innerHTML = '<div style="padding: 20px; color: #94a3b8;">Không có sản phẩm nào phù hợp.</div>';
        return;
      }

      items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
          <div class="product-thumb-wrap">
            <img class="product-thumb" src="${item.coverImage}" alt="${item.name}" referrerpolicy="no-referrer" loading="lazy">
          </div>
          <div class="product-info">
            <div class="product-title" title="${item.name}">${item.name}</div>
            <div class="product-price-row">
              <span class="price-vnd">${Number(item.price).toLocaleString('vi-VN')} ₫</span>
              <span style="font-size: 11px; color: #64748b;">Đã bán: ${item.historicalSold || 0}</span>
            </div>
            <div class="product-meta">
              <span>⭐ ${item.ratingStar || 5}</span>
              <span>Shop: ${item.shopId}</span>
            </div>
            <div class="card-actions">
              <button class="btn-card-action btn-inspect-shopee">Xem Chi Tiết</button>
              <button class="btn-card-action btn-source-1688" style="color: #ff6000;">Tìm Xưởng 1688</button>
            </div>
          </div>
        `;

        card.querySelector('.btn-inspect-shopee').addEventListener('click', () => {
          inputUrl.value = item.shopeeUrl;
          btnDetail.click();
        });

        card.querySelector('.btn-source-1688').addEventListener('click', () => {
          document.querySelector('.nav-tab[data-tab="tab1688"]')?.click();
          const imgInput = document.getElementById('input1688ImageUrl');
          if (imgInput) imgInput.value = item.coverImage;
          document.getElementById('btn1688SearchImgUrl')?.click();
        });

        resultsList.appendChild(card);
      });
    } catch (err) {
      statusText.textContent = `Lỗi tìm kiếm: ${err.message}`;
      resultsList.innerHTML = `<div style="color: #f87171; padding: 20px;">Lỗi: ${err.message}. Hãy mở một tab shopee.vn để bypass bot check.</div>`;
    } finally {
      btnSearch.disabled = false;
    }
  });

  btnDetail?.addEventListener('click', async () => {
    const url = inputUrl.value.trim();
    if (!url) return;

    btnDetail.disabled = true;
    statusText.textContent = 'Đang cào dữ liệu chi tiết sản phẩm...';

    try {
      const p = await shopee.getItemByUrl(url);
      detailBox.style.display = 'block';
      detailBox.innerHTML = `
        <div style="background: #111a2e; border: 1px solid #3b82f6; border-radius: 8px; padding: 14px; margin-bottom: 14px; display: flex; gap: 14px; flex-wrap: wrap;">
          <img src="${p.coverImage}" referrerpolicy="no-referrer" style="width: 140px; height: 140px; object-fit: cover; border-radius: 6px;">
          <div style="flex: 1; min-width: 240px; display: flex; flex-direction: column; gap: 6px;">
            <h3 style="font-size: 14px; color: #fff;">${p.name}</h3>
            <div style="font-size: 16px; font-weight: bold; color: #ee4d2d;">${Number(p.price).toLocaleString('vi-VN')} ₫</div>
            <div style="font-size: 12px; color: #94a3b8;">Đã bán: ${p.historicalSold} • Đánh giá: ⭐ ${p.ratingStar} (${p.ratingCount} lượt)</div>
            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <a href="${p.shopeeUrl}" target="_blank" class="btn btn-shopee" style="font-size: 11px; padding: 5px 10px; text-decoration: none;">Mở Trên Shopee</a>
              <button class="btn btn-1688 btn-source-p-1688" style="font-size: 11px; padding: 5px 10px;">Tìm Nguồn 1688 Bằng Ảnh Này</button>
            </div>
          </div>
        </div>
      `;

      detailBox.querySelector('.btn-source-p-1688')?.addEventListener('click', () => {
        document.querySelector('.nav-tab[data-tab="tab1688"]')?.click();
        const imgInput = document.getElementById('input1688ImageUrl');
        if (imgInput) imgInput.value = p.coverImage;
        document.getElementById('btn1688SearchImgUrl')?.click();
      });

      statusText.textContent = `Đã cào thành công: ${p.name.slice(0, 40)}...`;
    } catch (err) {
      statusText.textContent = `Lỗi cào chi tiết: ${err.message}`;
    } finally {
      btnDetail.disabled = false;
    }
  });
}
