/**
 * exporter.js — Packaging & Clipboard Service
 * Đóng gói file ZIP {SKU}.zip và sinh chuỗi TSV 24 cột chuẩn hóa cho Google Sheets / Excel.
 */

/**
 * Đảm bảo JSZip đã được tải sẵn vào môi trường
 */
async function ensureJSZipLoaded() {
  if (window.JSZip) return window.JSZip;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('libs/jszip.min.js');
    script.onload = () => resolve(window.JSZip);
    script.onerror = (err) => reject(new Error('Không thể tải thư viện JSZip: ' + err.message));
    document.head.appendChild(script);
  });
}

/**
 * Chuyển đổi URL ảnh/blob thành ArrayBuffer để nạp vào ZIP
 */
async function urlToArrayBuffer(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.arrayBuffer();
  } catch (err) {
    console.warn('Lỗi nạp ảnh cho file ZIP:', url, err);
    return null;
  }
}

/**
 * Tạo gói file ZIP {SKU}.zip hoàn chỉnh từ trạng thái runtime của Pipeline
 * @param {Object} pipelineState - Trạng thái dữ liệu đã cào và chuẩn hóa
 * @returns {Promise<Blob>} Blob của file nén ZIP
 */
export async function createZipBundle(pipelineState) {
  const JSZip = await ensureJSZipLoaded();
  const zip = new JSZip();

  const sku = pipelineState.sku || 'PRODUCT_UNKNOWN';
  const rootFolder = zip.folder(sku);

  // 1. Thư mục images/
  const imgFolder = rootFolder.folder('images');
  
  // Lưu ảnh gốc
  if (pipelineState.originalImage) {
    if (pipelineState.originalImage.startsWith('data:image')) {
      const base64Data = pipelineState.originalImage.split(',')[1];
      imgFolder.file('original_reference.jpg', base64Data, { base64: true });
    } else {
      const buf = await urlToArrayBuffer(pipelineState.originalImage);
      if (buf) imgFolder.file('original_reference.jpg', buf);
    }
  }

  // Lưu ảnh đại diện của 5 shop 1688
  if (Array.isArray(pipelineState.valid1688Shops)) {
    for (let i = 0; i < pipelineState.valid1688Shops.length; i++) {
      const shop = pipelineState.valid1688Shops[i];
      if (shop.imageUrl) {
        const buf = await urlToArrayBuffer(shop.imageUrl);
        if (buf) imgFolder.file(`1688_shop_${i + 1}.jpg`, buf);
      }
    }
  }

  // Lưu ảnh đại diện của các shop Shopee
  if (Array.isArray(pipelineState.shopeeShops)) {
    for (let i = 0; i < pipelineState.shopeeShops.length; i++) {
      const s = pipelineState.shopeeShops[i];
      if (s.coverImage) {
        const buf = await urlToArrayBuffer(s.coverImage);
        if (buf) imgFolder.file(`shopee_shop_${i + 1}.jpg`, buf);
      }
    }
  }

  // 2. File video_links.json
  const videoLinksData = {
    sku,
    totalVideos: (pipelineState.formattedVideos || []).length,
    generatedAt: new Date().toISOString(),
    videos: pipelineState.formattedVideos || []
  };
  rootFolder.file('video_links.json', JSON.stringify(videoLinksData, null, 2));

  // 3. File enriched_product_data.json
  rootFolder.file('enriched_product_data.json', JSON.stringify(pipelineState.enrichedData || {}, null, 2));

  // 4. File reviews_top10.json & landing_page_reviews.json
  rootFolder.file('reviews_all_verified.json', JSON.stringify(pipelineState.topReviews || [], null, 2));
  const lpReviews = (pipelineState.landingPageReviews || []).length > 0
    ? pipelineState.landingPageReviews
    : (pipelineState.topReviews || []).filter(r => r.useForLandingPage);
  rootFolder.file('landing_page_reviews.json', JSON.stringify(lpReviews, null, 2));

  // 5. File all_raw_specs.json (100% data thô từ các sàn)
  const rawSpecs = {
    sku,
    productNameVi: pipelineState.cleaned1688?.productNameVi || '',
    productNameEn: pipelineState.cleaned1688?.productNameEn || '',
    descriptionParagraphs: pipelineState.cleaned1688?.descriptionParagraphs || {},
    detailedSpecs: pipelineState.cleaned1688?.detailedSpecs || {},
    rawAttributesDictionary: pipelineState.cleaned1688?.rawAttributesDictionary || {},
    total1688Factories: (pipelineState.valid1688Shops || []).length,
    factories1688: pipelineState.valid1688Shops || [],
    topSoldShopeeShops: pipelineState.shopeeShops || []
  };
  rootFolder.file('all_raw_specs.json', JSON.stringify(rawSpecs, null, 2));

  // 6. File product_descriptions.txt (Toàn bộ các đoạn văn bản mô tả đầy đủ)
  const dp = pipelineState.cleaned1688?.descriptionParagraphs || {};
  const descText = `MÔ TẢ CHI TIẾT SẢN PHẨM (${sku})
Tên sản phẩm (Việt): ${pipelineState.cleaned1688?.productNameVi || ''}
Tên generic (Anh): ${pipelineState.cleaned1688?.productNameEn || ''}

==================================================
1. TỔNG QUAN CHI TIẾT SẢN PHẨM:
${dp.overview || 'Đang cập nhật'}

==================================================
2. PHÂN TÍCH KẾT CẤU KỸ THUẬT & VẬT LIỆU:
${dp.technicalBuild || dp.highlights || 'Đang cập nhật'}

==================================================
3. HƯỚNG DẪN SỬ DỤNG & BỐI CẢNH ỨNG DỤNG THỰC TẾ:
${dp.applications || 'Đang cập nhật'}

==================================================
4. ĐIỂM VƯỢT TRỘI & LỢI THẾ CẠNH TRANH:
${dp.highlights || 'Đang cập nhật'}
`;
  rootFolder.file('product_descriptions.txt', descText);

  const manifestData = {
    schemaVersion: '2.0.0',
    sku,
    executedAt: new Date().toISOString(),
    summary: {
      total1688Shops: (pipelineState.valid1688Shops || []).length,
      totalShopeeShops: (pipelineState.shopeeShops || []).length,
      totalTikTokVideos: (pipelineState.formattedVideos || []).length,
      total5StarReviews: (pipelineState.topReviews || []).length
    },
    pricing: (pipelineState.enrichedData && pipelineState.enrichedData.pricing) || {},
    pricingSummary: (pipelineState.enrichedData && pipelineState.enrichedData.pricing) || {},
    keywordsUsed: pipelineState.keywords || {},
    shopeeShops: (pipelineState.shopeeShops || []).map(s => ({
      shopId: s.shopId,
      itemId: s.itemId,
      title: s.title,
      price: s.price,
      pricePHP: s.pricePHP || s.price,
      historicalSold: s.historicalSold,
      ratingStar: s.ratingStar,
      url: s.itemUrl || s.url
    }))
  };
  rootFolder.file('manifest.json', JSON.stringify(manifestData, null, 2));

  // 6. File data.tsv (24 cột dán bảng tính)
  rootFolder.file('data.tsv', generateTsvString(pipelineState));

  // Tạo file ZIP nhị phân
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  return zipBlob;
}

/**
 * Sinh chuỗi bảng tính TSV (24 cột) phân tách bằng Tab để dán thẳng vào Excel / Google Sheets
 * @param {Object} pipelineState - Dữ liệu runtime
 * @returns {string} Chuỗi TSV
 */
export function generateTsvString(pipelineState) {
  const headers = [
    'Mã SKU',
    'Tiêu Đề Đề Xuất (Marketing)',
    'Giá Buôn 1688 (¥)',
    'Giá Buôn (VNĐ)',
    'Giá Bán Lẻ Shopee (PHP)',
    'Giá Bán Lẻ (VNĐ)',
    'Lợi Nhuận Gộp (%)',
    'Link 1688 Xưởng #1',
    'Link 1688 Xưởng #2',
    'Link 1688 Xưởng #3',
    'Link 1688 Xưởng #4',
    'Link 1688 Xưởng #5',
    'Link Shopee #1',
    'Link Shopee #2',
    'Link Shopee #3',
    'Link Shopee #4',
    'Link Shopee #5',
    'Video TikTok Top 1 (Lượt Tym)',
    'Video TikTok Top 2 (Lượt Tym)',
    'Video TikTok Top 3 (Lượt Tym)',
    'Đánh Giá 5⭐ #1 (Kèm Media)',
    'Đánh Giá 5⭐ #2 (Kèm Media)',
    'Đánh Giá 5⭐ #3 (Kèm Media)',
    'Thông Số Kỹ Thuật (Specs)'
  ];

  const sku = pipelineState.sku || '';
  const enriched = pipelineState.enrichedData || {};
  const pricing = enriched.pricing || {};

  const shops1688 = (pipelineState.valid1688Shops || []).map(s => s.detailUrl || s.offerUrl || (s.offerId || s.id ? `https://detail.1688.com/offer/${s.offerId || s.id}.html` : ''));
  while (shops1688.length < 5) shops1688.push('');

  const shopeeDomain = pipelineState.settings?.shopeeMarket === 'vn' ? 'shopee.vn' : 'shopee.ph';
  const shopsShopee = (pipelineState.shopeeShops || []).map(s => s.itemUrl || s.url || (s.itemId ? `https://${shopeeDomain}/product/${s.shopId}/${s.itemId}` : ''));
  while (shopsShopee.length < 5) shopsShopee.push('');

  const topVideos = (pipelineState.formattedVideos || []).slice(0, 3).map(v => `${v.videoUrl || ''} (${v.label || v.likeCount + ' tym'})`);
  while (topVideos.length < 3) topVideos.push('');

  const topReviews = (pipelineState.topReviews || []).slice(0, 3).map(r => `[${r.author}]: "${(r.comment || '').replace(/[\r\n\t]+/g, ' ')}"`);
  while (topReviews.length < 3) topReviews.push('');

  const specsStr = Object.entries(enriched.specifications || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ')
    .replace(/[\r\n\t]+/g, ' ');

function cleanTsvValue(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().replace(/[\r\n\t]+/g, ' ');
}

  const row = [
    sku,
    enriched.suggestedMarketingTitle || '',
    pricing.wholesaleCNY || 0,
    pricing.wholesaleVND || 0,
    pricing.retailPHP || 0,
    pricing.retailVND || 0,
    (pricing.marginPercent || 0) + '%',
    shops1688[0],
    shops1688[1],
    shops1688[2],
    shops1688[3],
    shops1688[4],
    shopsShopee[0],
    shopsShopee[1],
    shopsShopee[2],
    shopsShopee[3],
    shopsShopee[4],
    topVideos[0],
    topVideos[1],
    topVideos[2],
    topReviews[0],
    topReviews[1],
    topReviews[2],
    specsStr
  ].map(cleanTsvValue);

  return headers.join('\t') + '\n' + row.join('\t');
}

/**
 * Ghi chuỗi TSV vào bộ nhớ tạm Clipboard của người dùng
 * @param {string} tsvString
 * @returns {Promise<boolean>}
 */
export async function copyTsvToClipboard(tsvString) {
  try {
    await navigator.clipboard.writeText(tsvString);
    return true;
  } catch (err) {
    // Fallback nếu clipboard API bị chặn
    const textArea = document.createElement('textarea');
    textArea.value = tsvString;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  }
}
