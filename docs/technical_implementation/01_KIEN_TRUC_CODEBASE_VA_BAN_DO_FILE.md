# 🏛️ 01. KIẾN TRÚC CODEBASE SẠCH VÀ BẢN ĐỒ CHI TIẾT TỪNG FILE (CLEAN ARCHITECTURE 2.0)

> **Dành cho Developer**: Tài liệu này phân tích triết lý thiết kế kiến trúc sạch (Clean Architecture), bản đồ phân tầng (Layering), cấu trúc thư mục, chức năng của từng file trong codebase và những gì chứa bên trong từng file sau đợt tái cấu trúc phân rã module.

---

## 1. 🏗️ Triết Lý Kiến Trúc Phân Lớp (Clean Layered Architecture)

Hệ thống Chrome Extension này được tổ chức theo **4 tầng phân tách trách nhiệm (Separation of Concerns)** chuẩn mực. Mỗi file chỉ đảm nhiệm một trách nhiệm duy nhất (Single Responsibility), áp dụng triệt để mẫu thiết kế **Facade Pattern** và giao tiếp từ ngoài vào trong:

```text
+-------------------------------------------------------------------------------+
| 1. PRESENTATION LAYER (Tầng Giao Diện & Tương Tác Người Dùng)                |
|    - index.html, style.css                                                    |
|    - app.js (Entry point khởi động toàn bộ suite)                             |
|    - workflowView.js (Master Controller Facade điều phối các màn hình)        |
|    - workflowHistory.js (Quản lý lưu trữ & phục hồi lịch sử đa phiên)         |
|    - workflow/workflowInput.js (Kéo thả ảnh, nạp URL, SKU, validation)        |
|    - workflow/workflowFeeds.js (Dòng chảy dữ liệu 5 tầng & Toggle Thô/Lọc)    |
|    - workflow/workflowResultView.js (Hiển thị kết quả 5 tab, đối soát & logs) |
|    - workflow/workflowInspector.js (Stepper tiến trình, Hộp debug & Banner)   |
|    - workflow/workflowToast.js (Thông báo toast nổi toàn cục)                 |
|    - logger.js (Hiển thị Terminal Log màu sắc & xuất file .txt)               |
+---------------------------------------┬---------------------------------------+
                                        │ (Gọi & nhận callbacks)
+---------------------------------------▼---------------------------------------+
| 2. APPLICATION / ORCHESTRATION LAYER (Tầng Điều Phối Quy Trình Nghiệp Vụ)     |
|    - pipeline.js (Master Facade điều phối chuỗi thực thi)                     |
|    - pipeline/pipelineState.js (State machine, Pause/Resume/Abort, lưu data)  |
|    - pipeline/pipelineSteps.js (10 hàm xử lý 10 bước độc lập)                 |
|    - pipeline/geminiVisionHelper.js (Bộ công cụ đối soát thị giác Multimodal) |
|    - autoTabs.js (Tự động mở và nạp session các tab sàn TMĐT)                 |
|    - background.js (Service Worker: Chrome Tab API, Chrome Downloads API)     |
+---------------------------------------┬---------------------------------------+
                                        │ (Gọi xử lý dữ liệu)
+---------------------------------------▼---------------------------------------+
| 3. DOMAIN / DATA PROCESSING LAYER (Tầng Xử Lý Dữ Liệu Chuyên Biệt)             |
|    - cleaner.js (Làm sạch dữ liệu 1688, gọt bỏ rác nhà máy TQ)                 |
|    - enricher.js (Hợp nhất thông số 1688 + Shopee, tính biên lợi nhuận)       |
|    - exporter.js (Nén JSZip thành {SKU}.zip, định dạng chuỗi TSV Clipboard)   |
+---------------------------------------┬---------------------------------------+
                                        │ (Gọi mạng qua SDK & In-Tab Scripting)
+---------------------------------------▼---------------------------------------+
| 4. INFRASTRUCTURE & SDK LAYER (Tầng Kết Nối Nền Tảng Bên Ngoài)               |
|    - sdk/1688/client.js + sdk/1688/image-utils.js (Alibaba MTop API Client)   |
|    - sdk/shopee/client.js (Shopee Search & Review Crawler)                    |
|    - sdk/tiktok/client.js + sdk/tiktok/transport.js (TikTok/Douyin Client)    |
|    - sdk/gemini/client.js (Google Gemini Multimodal Vision Client)            |
|    - sdk/lens/client.js (Google Lens Reverse Image Search Client)             |
|    - rules.json (CORS Bypass Engine qua chrome.declarativeNetRequest)         |
+-------------------------------------------------------------------------------+
```

---

## 2. 🗺️ Bản Đồ Cấu Trúc Codebase & Vai Trò Từng File (File Directory Map)

```text
test_all_extension/
│
├── manifest.json
│   └── Vai trò: Khai báo cấu hình Manifest V3 (Side Panel, Permissions, DeclarativeNetRequest).
│
├── rules.json
│   └── Vai trò: Khai báo quy tắc CORS Header Bypass cho API 1688 H5 MTop và các sàn TMĐT.
│
├── background.js
│   └── Vai trò: Service Worker chạy ngầm, điều khiển Chrome Tab API và Chrome Downloads API.
│
├── ui/
│   ├── index.html
│   │   └── Vai trò: Cấu trúc bộ khung giao diện của 4 màn hình (Input, Progress, Result, Warning).
│   │
│   ├── style.css
│   │   └── Vai trò: Toàn bộ CSS phong cách Glassmorphism Dark Mode, hoạt họa và Layout Side Panel.
│   │
│   ├── app.js
│   │   └── Vai trò: Điểm vào (Entry Point) của UI, khởi tạo 5 SDK và gắn kết các module nghiệp vụ.
│   │
│   └── modules/
│       ├── workflowView.js
│       │   └── Vai trò: [FACADE CONTROLLER] Điều phối các màn hình của Workflow Pipeline.
│       │
│       ├── workflowHistory.js
│       │   └── Vai trò: Quản lý lưu trữ & phục hồi lịch sử đa phiên vào chrome.storage.local.
│       │
│       ├── workflow/
│       │   ├── workflowInput.js
│       │   │   └── Vai trò: Quản lý kéo thả ảnh, nạp URL ảnh, định dạng SKU, preview HD và validation.
│       │   ├── workflowFeeds.js
│       │   │   └── Vai trò: Quản lý Dòng Chảy Dữ Liệu 5 tầng trực quan & Nút chuyển đổi Dual-View (Thô vs Đã Lọc).
│       │   ├── workflowResultView.js
│       │   │   └── Vai trò: Quản lý Màn hình Kết quả, render 5 tab, so sánh dữ liệu đối soát & BẢO LƯU LOGS.
│       │   ├── workflowInspector.js
│       │   │   └── Vai trò: Quản lý Stepper tiến trình, Hộp chẩn đoán lỗi chuyên sâu & Banner Hoàn Tất Màn 2.
│       │   └── workflowToast.js
│       │       └── Vai trò: Tiện ích thông báo toast nổi toàn cục.
│       │
│       ├── pipeline.js
│       │   └── Vai trò: [FACADE CONTROLLER] Trái tim điều phối quy trình 10 bước (Master Pipeline Runner).
│       │
│       ├── pipeline/
│       │   ├── pipelineState.js
│       │   │   └── Vai trò: State machine trung tâm, lưu trữ dữ liệu thô & kết quả đối soát thị giác.
│       │   ├── pipelineSteps.js
│       │   │   └── Vai trò: Chứa 10 hàm xử lý độc lập tương ứng với 10 bước thực thi của Pipeline.
│       │   └── geminiVisionHelper.js
│       │       └── Vai trò: Bộ công cụ kiểm định thị giác Multimodal Vision đối soát ảnh & chống bẫy combo.
│       │
│       ├── autoTabs.js
│       │   └── Vai trò: Kiểm tra và tự động mở các tab 1688, Shopee, TikTok, Gemini ngầm.
│       │
│       ├── logger.js
│       │   └── Vai trò: Quản lý hiển thị Terminal Log thời gian thực, tự động cuộn và tải log .txt.
│       │
│       ├── cleaner.js
│       │   └── Vai trò: Bộ lọc dữ liệu thô 1688, gọt bỏ SĐT Trung Quốc, WeChat, lời mời sỉ.
│       │
│       ├── enricher.js
│       │   └── Vai trò: Hợp nhất dữ liệu 1688 với Shopee PH, tính toán giá buôn-lẻ và trích xuất review.
│       │
│       └── exporter.js
│           └── Vai trò: Đóng gói thư mục ZIP {SKU}.zip và sinh chuỗi TSV nạp Clipboard cho Sheets.
│
└── sdk/ (Các bộ SDK Zero-API)
    ├── 1688/
    │   ├── client.js      (Client gọi MTop H5 API)
    │   ├── image-utils.js (Tách riêng logic nén Canvas & Base64)
    │   ├── auth.js, signer.js, parser.js, constants.js
    ├── shopee/            (Client tìm kiếm & trích xuất đánh giá Shopee)
    ├── tiktok/
    │   ├── client.js      (Client thu hoạch video TikTok/Douyin)
    │   ├── transport.js   (Tách riêng logic In-Tab Scripting world MAIN & Tab lifecycle)
    │   ├── auth.js, signer.js, parser.js, constants.js
    ├── gemini/            (Client Google Gemini Vision Multimodal)
    └── lens/              (Client Google Lens Reverse Search)
```

---

## 3. 🔍 Nội Dung Chi Tiết Bên Trong Từng File (File Anatomy)

### 3.1. `manifest.json` & `rules.json` (Cấu hình & Quy tắc CORS)
* **`manifest.json`**:
  - `manifest_version: 3`.
  - `side_panel: { "default_path": "ui/index.html" }`.
  - `permissions`: `["tabs", "storage", "downloads", "scripting", "cookies", "declarativeNetRequest"]`.
  - `host_permissions`: Cấp quyền kết nối tới `*://*.1688.com/*`, `*://*.shopee.ph/*`, `*://*.tiktok.com/*`, `*://*.douyin.com/*`, `*://gemini.google.com/*`.
  - `declarative_net_request`: Khai báo bộ quy tắc `rules.json`.
* **`rules.json`**:
  - Khai báo quy tắc can thiệp Header mạng qua `chrome.declarativeNetRequest`.
  - Bổ sung `Origin: https://s.1688.com` cho các request API MTop gửi từ Extension.
  - Sử dụng `"excludedInitiatorDomains": ["1688.com", "www.1688.com", "s.1688.com"]` để tránh xung đột CORS khi request xuất phát trực tiếp từ In-Tab Scripting.

---

### 3.2. `background.js` (Service Worker Nền)
* **Trách nhiệm**: Xử lý các tác vụ nền mà giao diện UI không thể trực tiếp làm hoặc cần đặc quyền của Chrome.
* **Bên trong chứa gì?**:
  - `chrome.runtime.onMessage.addListener`: Cổng nhận yêu cầu từ UI.
  - Hàm `ensureTabOpen(url, pattern)`: Tìm tab đang mở, nếu chưa có thì gọi `chrome.tabs.create`.
  - Hàm `triggerDownload(blobUrl, filename)`: Gọi `chrome.downloads.download`.

---

### 3.3. `ui/modules/workflowView.js` (Workflow Presentation Facade)
* **Trách nhiệm**: Đóng vai trò là Facade Controller cho toàn bộ Tab Workflow, kết nối các sub-module trong thư mục `workflow/`.
* **Độ dài**: ~178 dòng (giảm từ 986 dòng cũ).
* **Bên trong chứa gì?**:
  - Hàm `initWorkflowView(clients)`: Khởi tạo module view, gắn kết các sự kiện từ các sub-module.
  - Hàm `switchWorkflowScreen(screenId)`: Chuyển đổi qua lại giữa 4 màn hình (`screenWorkflowInput`, `screenWorkflowProgress`, `screenWorkflowResult`, `screenWorkflowWarning`).
  - Hàm `refreshPlatformBadges()`: Quét tình trạng phiên các sàn định kỳ mỗi 5s và cập nhật dải badge.
  - Hàm `startPipelineExecution()`: Đọc SKU và ảnh từ `workflowInput`, reset UI, và kích hoạt `pipeline.runPipeline()`.

---

### 3.4. Thư Mục `ui/modules/workflow/` (Các Sub-Module Giao Diện)

#### 🔹 `workflowInput.js` (~176 dòng)
* **Trách nhiệm**: Quản lý toàn bộ Màn hình 1 (Nhập liệu).
* **Bên trong chứa gì?**:
  - Kéo thả file ảnh (Drag & Drop) vào `#wfDropzone`.
  - Tải ảnh qua đường link Web `#wfUrlInput`.
  - Tự động viết hoa mã SKU `#wfSkuInput`.
  - Hiển thị khung xem trước ảnh HD `#wfPreviewBox`.
  - Hàm `validateInputForm()` kiểm tra đủ ảnh và SKU để bật sáng nút Start.

#### 🔹 `workflowFeeds.js` (~267 dòng)
* **Trách nhiệm**: Quản lý hiển thị Dòng Chảy Dữ Liệu Thời Gian Thực (Vertical Pipeline Flow).
* **Bên trong chứa gì?**:
  - Hàm `resetVerticalFeedUI()`: Khôi phục trạng thái ban đầu cho cả 5 khối hiển thị.
  - Hàm `updateDataInspectorUI(state)`: Cập nhật thẻ active và render nội dung tương ứng theo tiến độ bước:
    1. *Khối 1*: Tất cả ảnh & xưởng 1688 gốc.
    2. *Khối 2*: Sản phẩm đại diện 1688 sau khi đã lọc sạch rác.
    3. *Khối 3*: Toàn bộ từ khóa do Gemini AI sinh ra (Shopee PH & TikTok queries).
    4. *Khối 4*: Lưới sản phẩm đối thủ tìm thấy trên Shopee Philippines.
    5. *Khối 5*: Video TikTok thu hoạch phân nhóm theo số lượt Tym.

#### 🔹 `workflowResultView.js` (~255 dòng)
* **Trách nhiệm**: Quản lý Màn hình 3 (Kết quả & Xuất file).
* **Bên trong chứa gì?**:
  - Hàm `renderResultScreen(state)`: Đổ dữ liệu vào 5 tab kết quả:
    - *Tab 1*: Danh sách video TikTok phân loại theo Tym.
    - *Tab 2*: 10 Review 5 sao Shopee có ảnh/video thực tế.
    - *Tab 3*: Đối sánh giá buôn 1688, giá bán Shopee PH và biên lợi nhuận gộp.
    - *Tab 4*: Bảng phân tích chi tiết toàn bộ quá trình.
    - *Tab 5*: **Bảo lưu toàn bộ Terminal Log**: Tự động sao chép logs từ `terminalLogOutput` sang `wfResultLogOutput` để người dùng kiểm tra lại mà không bao giờ bị mất log.
  - Xử lý nút bấm Tải file ZIP (`#wfBtnDownloadZip`) và Sao chép TSV (`#wfBtnCopyTsv`).

#### 🔹 `workflowInspector.js` (~219 dòng)
* **Trách nhiệm**: Quản lý thanh tiến trình, Stepper 10 bước, Hộp chẩn đoán lỗi chuyên sâu và Cảnh báo Captcha.
* **Bên trong chứa gì?**:
  - Hàm `updateProgressUI(stepIndex, percent, title, detail)`: Cập nhật thanh % và highlight 10 bước trong stepper.
  - Hàm `showErrorDebugUI(err, stepIndex, rawDetails)`: Khi gặp sự cố, giữ nguyên màn hình logs và mở **Hộp Debug Lỗi Chuyên Sâu**:
    - Hiển thị mã lỗi thô JSON format (`rawDetails`, `rawResponse`, `stack trace`).
    - Nút "📋 Sao Chép Lỗi Để Debug" copy toàn bộ lỗi và logs vào clipboard.
    - Nút "🔄 Thử Lại" và "⬅️ Quay Lại Nhập Liệu".
  - Hàm `showCaptchaWarning(captchaInfo)`: Chuyển sang màn hình cảnh báo Captcha khi sàn yêu cầu kéo thanh trượt robot.
  - Gắn sự kiện cho các nút điều khiển luồng: Tạm dừng / Tiếp tục (`#wfBtnPauseResume`), Hủy bỏ (`#wfBtnAbort`), Bật/tắt tự cuộn log, Copy log.

#### 🔹 `workflowToast.js` (~20 dòng)
* **Trách nhiệm**: Hiển thị thông báo Toast góc màn hình (`showToast(message)`).

---

### 3.5. `ui/modules/pipeline.js` & Thư Mục `ui/modules/pipeline/`

#### 🔹 `pipeline.js` (Master Facade - ~115 dòng)
* **Trách nhiệm**: Đóng vai trò là điểm vào duy nhất để chạy Pipeline, điều phối tuần tự 10 bước và quản lý bẫy lỗi.
* **Bên trong chứa gì?**:
  - Hàm `runPipeline(input, callbacks)`: Reset state, duyệt qua 10 bước trong `PIPELINE_STEPS_CONFIG`, gọi hàm tương ứng trong `pipelineSteps.js`, bẫy lỗi và bắn callbacks `onProgress`, `onComplete`, `onError`, `onCaptcha`.
  - Re-export các hàm điều khiển: `pausePipeline()`, `resumePipeline()`, `abortPipeline()`, `pipelineState`.

#### 🔹 `pipelineState.js` (~125 dòng)
* **Trách nhiệm**: Quản lý State Machine tập trung và điều khiển tạm dừng / hủy luồng chạy.
* **Bên trong chứa gì?**:
  - Enum `PipelineStatus`: `IDLE`, `RUNNING`, `PAUSED`, `ABORTED`, `COMPLETED`, `ERROR`.
  - Đối tượng trạng thái `pipelineState`: Chứa toàn bộ dữ liệu cào được (`valid1688Shops`, `cleaned1688`, `keywords`, `shopeeShops`, `rawTikTokVideos`, `formattedVideos`, `topReviews`, `enrichedData`).
  - Hàm `checkPauseOrAbort()`: Chặn luồng thực thi nếu trạng thái là `PAUSED` hoặc `ABORTED`.

#### 🔹 `pipelineSteps.js` (~467 dòng)
* **Trách nhiệm**: Chứa mã thực thi chi tiết của 10 bước độc lập:
  1. `runStep0_AutoTabs`: Kiểm tra và đảm bảo các tab sàn đang mở.
  2. `runStep1_1688ImageSearch`: Tìm kiếm bằng ảnh qua 1688 SDK, fallback In-Tab scripting nếu cần.
  3. `runStep2_1688Details`: Lấy chi tiết offer đại diện và specs.
  4. `runStep3_Clean1688`: Lọc rác WeChat, SĐT và chào sỉ của xưởng.
  5. `runStep4_GeminiKeywords`: Sinh từ khóa song ngữ Anh - Tagalog cho Shopee PH và TikTok.
  6. `runStep5_ShopeeSearch`: Tìm kiếm trên Shopee PH, xử lý an toàn thuộc tính `.title || .name`.
  7. `runStep6_TikTokVideos`: Thu hoạch video TikTok, tự động tổng hợp 18 video nếu số lượng chưa đủ.
  8. `runStep7_EnrichPricing`: Tính toán đối sánh giá buôn CNY -> giá bán PHP -> VND và biên lợi nhuận.
  9. `runStep8_ShopeeReviews`: Trích xuất 10 review 5 sao có ảnh/video thực tế.
  10. `runStep9_PackageManifest`: Đóng gói manifest hoàn chỉnh cho sản phẩm.

---

### 3.6. Các Sub-Module SDK Được Tối Ưu
* **`sdk/1688/image-utils.js`** (~122 dòng): Tách riêng toàn bộ logic nén ảnh Canvas, chuyển đổi Blob, nạp DataURL và chuẩn hóa Base64 ra khỏi `client.js`.
* **`sdk/tiktok/transport.js`** (~82 dòng): Tách riêng logic `executeTabScripting` trong môi trường `world: 'MAIN'` và `waitForTabComplete` ra khỏi `client.js`.

---
*Tiếp theo: Xem danh mục hàm chi tiết, tham số, giá trị trả về và quan hệ gọi hàm tại [02_CHI_TIET_HAM_THEO_TUNG_FILE.md](file:///d:/makerting/Tool/Workflow/docs/technical_implementation/02_CHI_TIET_HAM_THEO_TUNG_FILE.md).*
