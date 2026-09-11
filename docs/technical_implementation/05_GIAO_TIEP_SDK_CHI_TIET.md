# 🔌 03. ĐẶC TẢ GIAO TIẾP VÀ TÍCH HỢP SDK CHI TIẾT (SDK INTEGRATION SPEC)

> **Mục tiêu**: Hướng dẫn chi tiết cách khởi tạo, tham số truyền vào và bóc tách kết quả trả về của **4 bộ SDK có sẵn** trong `sdk_utility/` (`1688_sdk`, `shopee_sdk`, `tiktok_douyin_sdk`, `gemini_sdk`). Developer không cần đọc lại source code SDK mà chỉ cần bám theo tài liệu này.

---

## 1. 🏭 ALIBABA 1688 SDK (`sdk_utility/1688_sdk`)

* **Đường dẫn Import**: `import { Alibaba1688SDK } from '../sdk/1688/index.js';`
* **Khởi tạo**:
  ```javascript
  const alibaba = new Alibaba1688SDK({ exchangeRate: 3550 });
  await alibaba.initialize(); // Tự động nạp cookie _m_h5_tk từ tab 1688
  ```

### 1.1. Hàm `alibaba.searchByImage(imageSource, options)`
* **Tham số**:
  - `imageSource`: `Blob | File | string (Base64 hoặc URL)`.
  - `options`: `{ page: number, pageSize: number }` (mặc định `{ page: 1, pageSize: 20 }`).
* **Dữ liệu trả về**:
  ```json
  {
    "success": true,
    "totalCount": 140,
    "offers": [
      {
        "offerId": "654819283719",
        "title": "男士跑步鞋透气防滑减震气垫运动鞋",
        "imageUrl": "https://cbu01.alicdn.com/img/ibank/O1CN01...",
        "price": 38.5,
        "priceRange": "¥38.50 - ¥45.00",
        "companyName": "泉州市某某鞋业有限公司",
        "moq": 2,
        "offerUrl": "https://detail.1688.com/offer/654819283719.html"
      }
    ]
  }
  ```

### 1.2. Hàm `alibaba.getOfferDetail(offerId)`
* **Tham số**: `offerId` (`string | number`).
* **Dữ liệu trả về**:
  ```json
  {
    "offerId": "654819283719",
    "title": "...",
    "images": [
      "https://cbu01.alicdn.com/img/ibank/master_1.jpg",
      "https://cbu01.alicdn.com/img/ibank/master_2.jpg"
    ],
    "descriptionHtml": "<div><p>Thân giày làm bằng vải flyknit thoáng khí...</p></div>",
    "priceRanges": [
      { "minQuantity": 2, "price": 45.0 },
      { "minQuantity": 50, "price": 41.5 },
      { "minQuantity": 200, "price": 38.0 }
    ],
    "attributes": {
      "Chất liệu trên": "Flyknit",
      "Chất liệu đế": "Cao su + Khí đệm TPU",
      "Kích thước": "39-44"
    }
  }
  ```

---

## 2. 🛍️ SHOPEE PHILIPPINES SDK (`sdk_utility/shopee_sdk`)

* **Đường dẫn Import**: `import { ShopeeExtensionSDK, SortBy } from '../sdk/shopee/index.js';`
* **Khởi tạo**:
  ```javascript
  const shopee = new ShopeeExtensionSDK({ market: 'ph' }); // Chỉ định thị trường Philippines
  await shopee.initialize();
  ```

### 2.1. Hàm `shopee.searchItems(keyword, options)`
* **Tham số**:
  - `keyword`: `string` (Ví dụ: `"running shoes men"`).
  - `options`: `{ limit: 20, page: 1, sortBy: SortBy.SALES }`.
* **Dữ liệu trả về**:
  ```json
  {
    "totalCount": 850,
    "items": [
      {
        "itemId": 2189410294,
        "shopId": 48192019,
        "title": "Air Cushion Running Shoes for Men Breathable Lightweight Sneakers",
        "coverImage": "https://down-ph.img.susercontent.com/file/ph-11134207-7r98o-xyz.jpg",
        "price": 44900000, // Đơn vị nội bộ Shopee (chia cho 100,000 = 449.00 PHP)
        "pricePHP": 449.0,
        "historicalSold": 2400,
        "itemRating": 4.87
      }
    ]
  }
  ```

### 2.2. Hàm `shopee.getItemDetail(itemId, shopId)`
* **Dữ liệu trả về**: Bao gồm toàn bộ danh sách `attributes` (chất liệu, bảo hành, xuất xứ), danh sách ảnh độ phân giải 1024px và phân loại sản phẩm.

### 2.3. Cào 10 Đánh Giá 5 Sao Có Kèm Media
* **API Endpoint nội bộ**: `https://shopee.ph/api/v2/item/get_ratings`
* **Tham số**: `itemid`, `shopid`, `filter: 5` (5 sao), `type: 1` (kèm media/ảnh/clip).
* **Kết quả**: Bóc tách tối đa 10 đối tượng review gồm `comment`, `images`, `videos`.

---

## 3. 🎵 TIKTOK & DOUYIN SDK (`sdk_utility/test_all_extension/sdk/tiktok`)

* **Đường dẫn Import**: `import { TikTokExtensionSDK } from '../sdk/tiktok/index.js';`
* **Khởi tạo**:
  ```javascript
  const tiktok = new TikTokExtensionSDK();
  await tiktok.initialize();
  ```

### 3.1. Hàm `tiktok.searchVideos(keyword, options)`
* **Tham số**:
  - `keyword`: `string`
  - `options`: `{ platform: 'tiktok' | 'douyin', offset: number, count: 20 }`
* **Dữ liệu trả về**:
  ```json
  {
    "keyword": "running shoes review",
    "hasMore": true,
    "cursor": 20,
    "videos": [
      {
        "id": "72918274910283",
        "title": "Best budget running shoes in 2026! #sneakers",
        "authorName": "sneaker_pro",
        "likeCount": 12400,
        "playCount": 380000,
        "videoUrl": "https://www.tiktok.com/@sneaker_pro/video/72918274910283",
        "coverUrl": "https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/..."
      },
      {
        "id": "72849102948192",
        "title": "Unboxing daily comfort shoes ph",
        "authorName": "daily_kicks",
        "likeCount": 310,
        "playCount": 4200,
        "videoUrl": "https://www.tiktok.com/@daily_kicks/video/72849102948192",
        "coverUrl": "https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/..."
      }
    ],
    "raw": { "has_more": 1, "cursor": 20 }
  }
  ```

* **Xử lý dừng vòng lặp**:
  ```javascript
  if (res.videos.length === 0 || !res.hasMore) {
    logger.info('TikTok', 'Server đã báo hết dữ liệu (has_more = false). Dừng phân trang.');
    break;
  }
  ```

---

## 4. 🤖 GOOGLE GEMINI AI SDK (`sdk_utility/gemini_sdk`)

* **Đường dẫn Import**: `import { GeminiExtensionSDK } from '../sdk/gemini/index.js';`
* **Khởi tạo**:
  ```javascript
  const ai = new GeminiExtensionSDK();
  await ai.initialize(); // Nạp Google session __Secure-1PSID
  ```

### 4.1. Hàm Xác Thực Danh Sách Hình Ảnh (`gemini.verifyImageList`)
* **Prompt**:
  ```text
  You are an expert visual product verification AI.
  Compare the following candidate image URLs against the reference product image URL:
  Reference: "${originalImageUrl}"
  Candidates: ${JSON.stringify(candidateUrls)}

  Determine which candidate images depict the EXACT SAME product (allowing variations in color, angle, or background, but same physical form and design).
  Return a STRICT JSON Array of matching candidate URLs:
  ["https://...", "https://..."]
  ```

### 4.2. Hàm Xác Thực Mô Tả Sản Phẩm 1688
* **Prompt**:
  ```text
  Does the following product description text correspond accurately to the product shown in "${originalImageUrl}"?
  Description: "${descriptionText.slice(0, 1000)}"

  Return STRICT JSON:
  {
    "match": true,
    "confidence": 0.95,
    "reason": "Matches material and air cushion structure"
  }
  ```

### 4.3. Hàm Sinh Từ Khóa Shopee PH & TikTok
* **Prompt**:
  ```text
  Based on this product: "${productTitle}", specs: "${specsSummary}".
  Generate:
  1. 10 to 15 English/Taglish e-commerce search keywords for Shopee Philippines.
  2. 5 to 8 short TikTok/Douyin video search queries/hashtags.
  
  Return STRICT JSON:
  {
    "shopeeKeywords": ["...", "..."],
    "tiktokKeywords": ["...", "..."]
  }
  ```

---
*Tài liệu hoàn tất. Developer có thể bắt đầu code trực tiếp dựa trên 3 tài liệu này.*
