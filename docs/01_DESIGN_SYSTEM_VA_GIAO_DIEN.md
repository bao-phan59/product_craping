# 🎨 03. ĐẶC TẢ GIAO DIỆN VÀ HỆ THỐNG THIẾT KẾ (DESIGN SYSTEM & UI SPEC)

> **Mục tiêu**: Chuẩn hóa toàn bộ giao diện người dùng theo phong cách **Glassmorphism hiện đại (Dark Theme)**, cung cấp bảng mã màu CSS Tokens, cấu trúc HTML từng màn hình và danh mục Element IDs để lập trình viên gắn logic Javascript chính xác 100%.

---

## 1. 🌈 Bảng Màu & CSS Design Tokens

Khai báo chuẩn biến CSS tại `ui/style.css`:

```css
:root {
  /* Nền chính & Nền Glassmorphism */
  --bg-main: hsl(222, 24%, 10%);          /* #0c121e */
  --bg-card: hsla(222, 20%, 14%, 0.75);   /* Kính mờ */
  --bg-input: hsla(222, 20%, 8%, 0.85);
  --border-glass: hsla(217, 33%, 25%, 0.5);
  --border-focus: hsl(210, 100%, 60%);

  /* Dải màu Gradient Accent */
  --accent-gradient: linear-gradient(135deg, hsl(210, 90%, 56%), hsl(275, 85%, 60%));
  --accent-blue: hsl(210, 90%, 56%);
  --accent-purple: hsl(275, 85%, 60%);

  /* Màu chữ */
  --text-main: hsl(210, 20%, 98%);
  --text-muted: hsl(215, 16%, 65%);
  --text-dim: hsl(215, 14%, 45%);

  /* Màu trạng thái hệ thống */
  --status-success: hsl(142, 72%, 45%);    /* Xanh lá */
  --status-warning: hsl(45, 93%, 47%);     /* Vàng cam */
  --status-error: hsl(0, 84%, 60%);        /* Đỏ */
  --status-info: hsl(199, 89%, 48%);       /* Xanh dương nhạt */

  /* Hiệu ứng kính */
  --backdrop-blur: blur(16px);
  --box-shadow-card: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
}
```

---

## 2. 🏛️ Cấu Trúc Khung HTML Tổng Thể (`ui/index.html`)

Giao diện được phân bổ thành 3 Container màn hình (`screen-input`, `screen-progress`, `screen-result`). Tại một thời điểm, chỉ có một màn hình mang class `.active`:

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>E-Commerce Pipeline</title>
  <link rel="stylesheet" href="style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
</head>
<body>
  <div class="app-container">
    <!-- HEADER CHUNG -->
    <header class="app-header">
      <div class="header-brand">
        <span class="brand-icon">⚡</span>
        <div>
          <h1 class="brand-title">DATA PIPELINE</h1>
          <p class="brand-subtitle">1688 • Shopee • TikTok Auto-Engine</p>
        </div>
      </div>
      <div class="header-actions">
        <button id="btnSettings" class="icon-btn" title="Cài đặt">⚙️</button>
      </div>
    </header>

    <!-- MÀN HÌNH 1: NHẬP LIỆU -->
    <main id="screenInput" class="screen-view active">
      <section class="card session-check-card">
        <div class="card-title-sm">Trạng thái kết nối tự động:</div>
        <div class="session-badges">
          <span id="badge1688" class="badge">1688: Đang kiểm tra...</span>
          <span id="badgeShopee" class="badge">Shopee: Đang kiểm tra...</span>
          <span id="badgeTiktok" class="badge">TikTok: Đang kiểm tra...</span>
          <span id="badgeGemini" class="badge">Gemini: Sẵn sàng</span>
        </div>
      </section>

      <section class="card input-card">
        <label class="field-label">1. Hình ảnh sản phẩm gốc *</label>
        <input type="text" id="inputProductImageUrl" class="text-input" placeholder="Nhập link URL ảnh sản phẩm...">
        
        <div class="divider-text">HOẶC</div>
        
        <div id="dropzoneImageFile" class="dropzone">
          <span class="dropzone-icon">📁</span>
          <p>Kéo thả ảnh vào đây hoặc <span class="dropzone-link">chọn từ máy tính</span></p>
          <input type="file" id="fileImagePicker" accept="image/*" style="display:none">
        </div>

        <div id="boxImagePreview" class="preview-box hidden">
          <img id="imgPreviewThumb" src="" alt="Preview">
          <div class="preview-info">
            <span id="txtPreviewName">master_image.jpg</span>
            <span id="txtPreviewDimensions">800x800 px</span>
            <button id="btnRemoveImage" class="btn-text-danger">Gỡ bỏ ảnh</button>
          </div>
        </div>

        <label class="field-label mt-3">2. Mã sản phẩm (SKU) *</label>
        <input type="text" id="inputProductSku" class="text-input font-mono" placeholder="Ví dụ: SHOEAIRMAX2026BLK" required>

        <button id="btnStartPipeline" class="btn-primary mt-4" disabled>
          🚀 BẮT ĐẦU CHẠY PIPELINE
        </button>
      </section>
    </main>

    <!-- MÀN HÌNH 2: TIẾN TRÌNH & LIVE TICKER & LOGS -->
    <main id="screenProgress" class="screen-view">
      <section class="card progress-overview-card">
        <div class="progress-header">
          <span id="txtCurrentSku" class="font-mono badge-sku">SKU: ...</span>
          <span id="txtProgressPercent" class="font-bold">0%</span>
        </div>
        <div class="progress-track">
          <div id="progressBarFill" class="progress-bar"></div>
        </div>
      </section>

      <!-- DÒNG CHẢY DỮ LIỆU THỜI GIAN THỰC 5 TẦNG & DUAL-VIEW (THÔ VS ĐÃ LỌC) -->
      <section class="card wf-vertical-feed" id="wfVerticalProcessFeed">
        <!-- 1. Danh sách 1688 Thô & Badge Gemini Chọn -->
        <div class="wf-feed-card" id="feedCard_1688Raw">...</div>
        <!-- 2. Thông số 1688 đã làm sạch & chống bẫy combo -->
        <div class="wf-feed-card" id="feedCard_1688Clean">...</div>
        <!-- 3. Bộ từ khóa Gemini đa kênh (Douyin, Shopee, TikTok) -->
        <div class="wf-feed-card" id="feedCard_geminiKw">...</div>
        <!-- 4. Shopee Philippines (Toggle Thô vs Gemini Chọn) -->
        <div class="wf-feed-card" id="feedCard_shopeePh">...</div>
        <!-- 5. Douyin & TikTok Video (Toggle Thô vs Gemini Duyệt Bìa) -->
        <div class="wf-feed-card" id="feedCard_tiktok">...</div>
      </section>

      <!-- STEP TIMELINE -->
      <section class="card step-list-card">
        <ul id="pipelineStepList" class="step-list">
          <li data-step="1" class="step-item">
            <span class="step-icon">⏳</span>
            <span class="step-name">1688: Tìm ảnh & Gemini lọc</span>
            <span class="step-badge">0/5 Shop</span>
          </li>
          <!-- 10 bước tương ứng -->
        </ul>
      </section>

      <!-- LIVE LOG CONSOLE -->
      <section class="card log-console-card">
        <div class="log-toolbar">
          <div class="log-controls-left">
            <span class="toolbar-title">📜 Nhật ký thời gian thực</span>
          </div>
          <div class="log-controls-right">
            <button id="btnToggleAutoScroll" class="tool-btn active">Cuộn: BẬT</button>
            <button id="btnCopyLog" class="tool-btn">📋 Chép</button>
            <button id="btnClearLog" class="tool-btn">🗑️ Xóa</button>
          </div>
        </div>
        <div id="terminalLogOutput" class="terminal-log font-mono"></div>
      </section>

      <div class="action-buttons-row">
        <button id="btnPausePipeline" class="btn-secondary">⏸️ Tạm Dừng</button>
        <button id="btnAbortPipeline" class="btn-danger">⏹️ Hủy Bỏ</button>
      </div>
    </main>

    <!-- MÀN HÌNH 3: KẾT QUẢ & XUẤT FILE -->
    <main id="screenResult" class="screen-view">
      <section class="card result-success-card">
        <div class="success-banner">
          <span class="success-icon">🎉</span>
          <h2>HOÀN THÀNH XUẤT SẮC!</h2>
          <p id="txtTotalRunTime">Tổng thời gian: 02:05</p>
        </div>
        
        <div class="stats-grid">
          <div class="stat-box">
            <span class="stat-number" id="stat1688Count">5</span>
            <span class="stat-label">Shop 1688</span>
          </div>
          <div class="stat-box">
            <span class="stat-number" id="statShopeeCount">5</span>
            <span class="stat-label">Shop Shopee</span>
          </div>
          <div class="stat-box">
            <span class="stat-number" id="statVideoCount">18</span>
            <span class="stat-label">Video Links</span>
          </div>
          <div class="stat-box">
            <span class="stat-number" id="statReviewCount">10</span>
            <span class="stat-label">Đánh giá 5⭐</span>
          </div>
        </div>
      </section>

      <section class="card export-actions-card">
        <button id="btnDownloadZip" class="btn-primary btn-large">
          📥 TẢI VỀ GÓI ZIP: <span id="lblZipSkuName">PRODUCT.zip</span>
        </button>
        
        <button id="btnCopyForSheets" class="btn-secondary btn-large mt-2">
          📋 SAO CHÉP NHANH BẢNG DỮ LIỆU (EXCEL / SHEETS)
        </button>
      </section>

      <button id="btnResetNewProduct" class="btn-text mt-3">
        🔄 Thu thập cho sản phẩm mới
      </button>
    </main>
  </div>
  <script type="module" src="app.js"></script>
</body>
</html>
```

---

## 3. 🌟 Chi Tiết Thiết Kế Live Thumbnail Ticker (`ticker.js` & CSS)

* **Hiệu ứng CSS**: Cuộn ngang mượt mà, hỗ trợ rê chuột để dừng (Pause on Hover).
* **Mỗi Card Mini**: Chứa ảnh vuông 56x56px, badge màu phân loại sàn hoặc số lượng tym (`Shop 1688 #1`, `Shopee PH #2`, `310 tym`).

```css
/* Ticker Container */
.ticker-scroller {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 8px 4px;
  scroll-behavior: smooth;
}

.ticker-item {
  flex: 0 0 64px;
  position: relative;
  background: var(--bg-input);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-sm);
  overflow: hidden;
  animation: slideInRight 0.3s ease-out;
}

.ticker-item img {
  width: 100%;
  height: 64px;
  object-fit: cover;
  display: block;
}

.ticker-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.75);
  font-size: 9px;
  font-weight: 600;
  text-align: center;
  padding: 2px 0;
  color: #fff;
  backdrop-filter: blur(4px);
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
```

---

## 4. 📋 Bảng Tra Cứu Toàn Bộ Element IDs Cho Javascript (`app.js`)

| Element ID | Loại Thẻ | Chức Năng | Event Listener Gắn Vào |
|:---|:---:|:---|:---|
| `inputProductImageUrl` | `<input>` | Nhập link ảnh URL | `input` ➔ kiểm tra mở nút Start |
| `dropzoneImageFile` | `<div>` | Kéo thả file ảnh | `dragover`, `dragleave`, `drop` |
| `fileImagePicker` | `<input file>` | Chọn file từ máy | `change` ➔ đọc file Base64 |
| `boxImagePreview` | `<div>` | Container xem trước | Toggle class `.hidden` |
| `inputProductSku` | `<input>` | Nhập mã SKU | `input` ➔ cập nhật tên ZIP |
| `btnStartPipeline` | `<button>` | Bắt đầu chạy luồng | `click` ➔ chuyển Màn 2 & chạy `runPipeline()` |
| `progressBarFill` | `<div>` | Thanh phần trăm % | Cập nhật `style.width` |
| `wfVerticalProcessFeed` | `<div>` | Dòng chảy dữ liệu 5 tầng thời gian thực | Quản lý bởi `workflowFeeds.js` |
| `feedCard_1688Raw` | `<div>` | Card hiển thị 1688 thô & badge Gemini | Hiển thị thumbnail thô và badge |
| `feedCard_shopeePh` | `<div>` | Card Shopee PH (Dual-View) | Nút toggle Thô vs Gemini Chọn |
| `feedCard_tiktok` | `<div>` | Card Video TikTok (Dual-View) | Nút toggle Thô vs Gemini Duyệt |
| `pipelineStepList` | `<ul>` | Danh sách 10 bước | Cập nhật status icon (✅/🔄/⏳) |
| `terminalLogOutput` | `<div>` | Khung hiển thị log | Gọi hàm `logger.append(type, text)` |
| `btnToggleAutoScroll`| `<button>` | Tắt/bật tự cuộn log | `click` ➔ đổi cờ `autoScroll` |
| `btnCopyLog` | `<button>` | Copy toàn bộ log | `click` ➔ ghi log text vào clipboard |
| `btnClearLog` | `<button>` | Xóa trắng console log | `click` ➔ `innerHTML = ''` |
| `btnDownloadZip` | `<button>` | Tải file `{SKU}.zip` | `click` ➔ gọi Chrome Downloads |
| `btnCopyForSheets` | `<button>` | Copy dữ liệu bảng TSV | `click` ➔ ghi chuỗi TSV vào clipboard |
| `btnResetNewProduct` | `<button>` | Reset làm sản phẩm mới | `click` ➔ chuyển Màn 1, dọn form |

---
*Tiếp theo: Đọc định nghĩa Data Model và File Schema tại [02_TU_DIEN_DU_LIEU_VA_SCHEMA.md](file:///d:/makerting/Tool/Workflow/docs/02_TU_DIEN_DU_LIEU_VA_SCHEMA.md).*
