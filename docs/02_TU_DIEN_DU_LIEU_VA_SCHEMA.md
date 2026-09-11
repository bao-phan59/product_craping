# 📑 04. TỪ ĐIỂN DỮ LIỆU VÀ SCHEMA XUẤT FILE (DATA DICTIONARY & SCHEMAS)

> **Mục tiêu**: Chuẩn hóa toàn bộ cấu trúc dữ liệu JSON nội bộ và các tệp tin xuất ra trong gói ZIP `{SKU}.zip` cũng như chuỗi dữ liệu clipboard TSV dành cho Excel/Google Sheets.

---

## 1. 🧠 Đối Tượng Trạng Thái Nội Bộ (Runtime State Object in `app.js`)

```typescript
interface PipelineState {
  sku: string;                     // Mã sản phẩm (ví dụ: SHOEAIRMAX2026BLK)
  originalImage: string;           // Base64 hoặc Image URL
  currentStep: number;             // Bước hiện tại (0 - 10)
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ERROR';
  
  // Dữ liệu 1688 (Thô & Đã qua Gemini Vision)
  rawOffers1688: Array<Record<string, any>>;    // Danh sách xưởng thô ban đầu (chưa lọc)
  gemini1688Audit: Record<string, any>;         // Kết quả đối soát thị giác từng offer
  valid1688Shops: Array<{                       // Top 5 xưởng đạt chuẩn thị giác
    offerId: string;
    companyName: string;
    title: string;
    imageUrl: string;
    price: string;
    detailUrl: string;
  }>;
  cleaned1688?: {                               // Dữ liệu xưởng sạch sau khi chống bẫy combo
    title: string;
    attributes: Record<string, string>;
  };

  // Từ khóa đa kênh do Gemini sinh
  keywords: {
    douyinKeywords: string[];                   // Từ khóa người bán Douyin (Tiếng Trung)
    shopeeKeywords: string[];                   // Từ khóa mua sắm Shopee PH (Tiếng Anh)
    tiktokKeywords: string[];                   // Truy vấn tìm kiếm video TikTok (Tiếng Anh)
  };

  // Dữ liệu Shopee Philippines (Thô & Đã qua Gemini Vision)
  rawShopeeItems: Array<Record<string, any>>;   // Toàn bộ sản phẩm thô cào qua nhiều trang
  shopeeShops: Array<{                          // Sản phẩm chuẩn mẫu đã qua Gemini Vision
    shopId: number;
    itemId: number;
    title: string;
    coverImage: string;
    price: number;
    priceFormatted: string;
    ratingStar: number;
    historicalSold: number;
  }>;
  shopeeReviewsRaw: Array<any>;                 // Toàn bộ review thô cào về
  topReviews: Array<{                           // 10 review 5 sao có ảnh thực tế (bỏ qua video)
    reviewId: string;
    rating: number;
    comment: string;
    imageUrls: string[];
    isAuthentic: boolean;
  }>;

  // Dữ liệu Video Douyin & TikTok (Thô & Đã qua Gemini Vision)
  rawVideoCandidates: Array<Record<string, any>>; // Toàn bộ video thô cào về từ 2 sàn
  formattedVideos: Array<{                        // Video được Gemini duyệt bìa quay đúng SP
    videoId: string;
    title: string;
    coverUrl: string;
    videoUrl: string;
    likeCount: number;
    formattedLikes: string;                       // Ví dụ: 39.3K, 1.2M
    authorName: string;
    platform: 'tiktok' | 'douyin';
    visionReason?: string;
  }>;

  // Thông số làm giàu tổng hợp
  enrichedData: Record<string, any>;

  // Thống kê & cờ hệ thống
  metadata: {
    startTime: string;
    endTime?: string;
    totalDurationSeconds?: number;
    nicheProductMode: boolean;     // true nếu phải quét 100% keywords
    keywordsTraversed: number;
  };
}
```

---

## 2. 📄 Schema Tệp `manifest.json` (Bên trong gói ZIP)

```json
{
  "bundleVersion": "2.2.0",
  "generatedAt": "2026-09-08T21:30:00.000Z",
  "sku": "SHOEAIRMAX2026BLK",
  "summary": {
    "verified1688ShopsCount": 5,
    "verifiedShopeeShopsCount": 5,
    "totalVerifiedImages": 58,
    "tiktokDouyinVideoLinksCount": 16,
    "positiveShopeeReviewsCount": 10
  },
  "nicheProductInfo": {
    "isNicheProduct": false,
    "keywordsTraversedCount": 4,
    "totalKeywordsGenerated": 12
  },
  "fileInventory": [
    "images/original_product.jpg",
    "images/1688_shop1_01.jpg",
    "reviews/shopee_reviews.json",
    "reviews/review_media_links.json",
    "video_links.json",
    "enriched_product_data.json"
  ]
}
```

---

## 3. 📄 Schema Tệp `video_links.json` (Lưu danh sách video theo lượt Tym)

```json
[
  {
    "assignedName": "12400tym_1",
    "likeCount": 12400,
    "platform": "tiktok",
    "videoId": "72918274910283",
    "title": "Reviewing trending air cushion running shoes!",
    "videoUrl": "https://www.tiktok.com/@sneaker_pro/video/72918274910283",
    "thumbnailUrl": "https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/...",
    "author": "sneaker_pro"
  },
  {
    "assignedName": "310tym_1",
    "likeCount": 310,
    "platform": "tiktok",
    "videoId": "72849102948192",
    "title": "Unboxing daily comfort shoes ph",
    "videoUrl": "https://www.tiktok.com/@daily_kicks/video/72849102948192",
    "thumbnailUrl": "https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/...",
    "author": "daily_kicks"
  },
  {
    "assignedName": "310tym_2",
    "likeCount": 310,
    "platform": "douyin",
    "videoId": "72894102948123",
    "title": "透气减震跑步鞋开箱测评",
    "videoUrl": "https://www.douyin.com/video/72894102948123",
    "thumbnailUrl": "https://p3-pc.douyinpic.com/tos-cn-p-0015/...",
    "author": "跑鞋测评君"
  }
]
```

---

## 4. 📄 Schema Tệp `enriched_product_data.json` (Hợp nhất 1688 + Shopee)

```json
{
  "sku": "SHOEAIRMAX2026BLK",
  "masterTitles": {
    "en": "Men's Lightweight Breathable Air Cushion Running Shoes",
    "vi": "Giày thể thao nam chạy bộ đế đệm khí siêu nhẹ thoáng khí",
    "zh": "男士透气气垫减震跑步运动鞋"
  },
  "pricingBenchmark": {
    "wholesale1688": {
      "currency": "CNY",
      "priceRange": "¥38.00 - ¥45.00",
      "tieredPrices": [
        {"minQty": 2, "priceCNY": 45.0},
        {"minQty": 50, "priceCNY": 41.5},
        {"minQty": 200, "priceCNY": 38.0}
      ]
    },
    "retailShopeePH": {
      "currency": "PHP",
      "priceRange": "₱399.00 - ₱549.00",
      "topSellerPrice": 449.0
    }
  },
  "mergedSpecifications": {
    "upperMaterial": "Breathable Flyknit Mesh",
    "soleMaterial": "Anti-slip Rubber + Air Cushion TPU",
    "insoleMaterial": "Memory Foam Antibacterial",
    "closureType": "Lace-up",
    "weightGrams": 420,
    "availableSizes": ["39", "40", "41", "42", "43", "44"],
    "availableColors": ["Triple Black", "White Silver", "Navy Blue"]
  },
  "seoSearchKeywords": {
    "shopeePH": ["running shoes men", "breathable sneakers", "air cushion rubber shoes", "black sports shoes"],
    "tiktokQueries": ["#runningshoesreview", "#sneakerunboxing", "#affordablesneakers"]
  }
}
```

---

## 5. 📄 Schema Tệp `reviews/shopee_reviews.json` & Media Links

```json
[
  {
    "reviewId": "rev_ph_001",
    "rating": 5,
    "buyerUsername": "m***2",
    "commentText": "Super comfortable! Wore it for my 5km morning run. True to size and excellent cushioning for its price.",
    "variationPurchased": "Black, Size 42",
    "createdAt": "2026-08-15 14:22:10",
    "media": {
      "images": [
        "https://down-ph.img.susercontent.com/file/ph-11134207-7r98o-xyz1.jpg",
        "https://down-ph.img.susercontent.com/file/ph-11134207-7r98o-xyz2.jpg"
      ],
      "videos": [
        "https://cvf.shopee.ph/file/ph-11134207-video-abc.mp4"
      ]
    }
  }
]
```

---

## 6. 📋 Quy Chuẩn Bảng Sao Chép Dữ Liệu Nhanh (TSV Clipboard Format)

Khi người dùng ấn **`[ 📋 SAO CHÉP NHANH BẢNG DỮ LIỆU ]`**, dữ liệu được nối thành chuỗi phân cách bởi dấu Tab (`\t`) và dòng mới (`\n`). Khi dán vào Excel/Sheets, nội dung tự động chia thành 3 khối bảng:

```text
=== THÔNG SỐ SẢN PHẨM (ENRICHED MASTER) ===
Mã SKU	Tên Tiếng Anh	Giá Sỉ 1688 (CNY)	Giá Bán Shopee (PHP)	Chất Liệu Thân	Chất Liệu Đế	Phân Loại Size
SHOEAIRMAX2026BLK	Men's Air Cushion Running Shoes	¥38.00 - ¥45.00	₱449.00	Breathable Mesh	Rubber + TPU	39, 40, 41, 42, 43, 44

=== DANH SÁCH VIDEO TIKTOK / DOUYIN THEO LƯỢT TYM ===
Định Danh Video	Số Lượt Tym	Nền Tảng	Tác Giả	Liên Kết Video
12400tym_1	12400	TikTok	sneaker_pro	https://www.tiktok.com/@sneaker_pro/video/72918274910283
1500tym_1	1500	Douyin	跑鞋测评君	https://www.douyin.com/video/72894102948123
310tym_1	310	TikTok	daily_kicks	https://www.tiktok.com/@daily_kicks/video/72849102948192

=== 10 ĐÁNH GIÁ 5 SAO SHOPEE (CÓ MEDIA) ===
STT	Người Mua	Đánh Giá	Nội Dung Nhận Xét	Phân Loại Mua	Link Ảnh Đánh Giá	Link Video Đánh Giá
1	m***2	⭐⭐⭐⭐⭐	Super comfortable! Wore it for my 5km run	Black, 42	https://down-ph.img.susercontent.com/...	https://cvf.shopee.ph/...
2	k***8	⭐⭐⭐⭐⭐	Maganda ang quality, bilis dumating	White, 41	https://down-ph.img.susercontent.com/...	
```

---
*Tiếp theo: Xem kế hoạch kiểm thử và checklist tại [03_KE_HOACH_KIEM_THU_CHECKLIST.md](file:///d:/makerting/Tool/Workflow/docs/03_KE_HOACH_KIEM_THU_CHECKLIST.md).*
