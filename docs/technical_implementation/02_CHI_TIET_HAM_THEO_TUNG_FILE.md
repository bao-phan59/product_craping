# 🔬 02. ĐẶC TẢ CHI TIẾT HÀM THEO TỪNG FILE (DETAILED FUNCTION SPECIFICATION BY FILE)

> **Mục tiêu**: Bóc tách chi tiết từng file trong codebase theo Kiến trúc Sạch 2.0, liệt kê 100% các hàm: Chức năng là gì, Nhận tham số gì, Trả về cái gì, **Được gọi từ đâu (Called by)**, và **Gọi tiếp những hàm nào (Calls to)**.

---

## 📑 Danh Mục Các File Được Đặc Tả:

1. [Phần 1: Service Worker & Application Entry Point (`background.js`, `ui/app.js`)](#phan-1-service-worker--app-entry)
2. [Phần 2: Phân Hệ UI Workflow (`workflowView.js` & `ui/modules/workflow/`)](#phan-2-phan-he-ui-workflow)
   - `workflowView.js` (Master Facade)
   - `workflow/workflowInput.js`
   - `workflow/workflowFeeds.js`
   - `workflow/workflowResultView.js`
   - `workflow/workflowInspector.js`
   - `workflow/workflowToast.js`
3. [Phần 3: Phân Hệ Pipeline Xử Lý (`pipeline.js` & `ui/modules/pipeline/`)](#phan-3-phan-he-pipeline-xu-ly)
   - `pipeline.js` (Master Facade)
   - `pipeline/pipelineState.js`
   - `pipeline/pipelineSteps.js` (10 Discrete Steps)
4. [Phần 4: Phân Hệ Domain Data Processing (`cleaner.js`, `enricher.js`, `exporter.js`)](#phan-4-phan-he-domain-processing)
5. [Phần 5: Phân Hệ Hỗ Trợ & SDK Helpers (`autoTabs.js`, `ticker.js`, `logger.js`, `sdk/1688/image-utils.js`, `sdk/tiktok/transport.js`)](#phan-5-phan-he-ho-tro--sdk-helpers)

---

<a name="phan-1-service-worker--app-entry"></a>
## PHẦN 1: SERVICE WORKER & APPLICATION ENTRY POINT

### FILE: `background.js`
* **Vị trí**: Thư mục gốc extension (`test_all_extension/background.js`).
* **Vai trò**: Service Worker Manifest V3, quản lý quyền mở tab Chrome và tải file.

#### 🔹 Hàm: `handleRuntimeMessages(message, sender, sendResponse)`
* **Chức năng**: Lắng nghe và điều phối các yêu cầu từ UI Side-Panel gửi xuống qua `chrome.runtime.onMessage`.
* **Tham số**: `message` (`{ action: string, payload: any }`), `sender`, `sendResponse`.
* **Được gọi từ đâu**: Trình duyệt Chrome tự động gọi khi UI thực hiện `chrome.runtime.sendMessage()`.
* **Gọi tiếp**: `ensureTabOpen()` hoặc `triggerDownload()`.

#### 🔹 Hàm: `ensureTabOpen(platformUrl, matchPattern)`
* **Chức năng**: Kiểm tra xem tab tương ứng đã mở chưa, nếu chưa thì tự động mở tab ngầm mới qua `chrome.tabs.create`.
* **Tham số**: `platformUrl` (`string`), `matchPattern` (`string`).
* **Trả về**: `Promise<chrome.tabs.Tab>`.
* **Được gọi từ đâu**: `handleRuntimeMessages()`.

#### 🔹 Hàm: `triggerDownload(blobUrl, filename)`
* **Chức năng**: Gọi Chrome Downloads API để lưu file nén `{SKU}.zip` xuống máy tính.
* **Tham số**: `blobUrl` (`string`), `filename` (`string`).
* **Trả về**: `Promise<number>` (Download ID).
* **Được gọi từ đâu**: `handleRuntimeMessages()`.

---

### FILE: `ui/app.js`
* **Vị trí**: `test_all_extension/ui/app.js`.
* **Vai trò**: Điểm vào (Entry Point) của giao diện, khởi tạo 5 SDK Client và kích hoạt `workflowView`.

#### 🔹 Hàm: `initializeApp()`
* **Chức năng**: Khởi chạy ứng dụng khi DOM sẵn sàng, khởi tạo các SDK (`gemini`, `shopee`, `tiktok`, `alibaba`, `lens`), gọi `initWorkflowView()`, và kích hoạt kiểm tra phiên định kỳ.
* **Được gọi từ đâu**: Tự động chạy khi `DOMContentLoaded` kích hoạt.
* **Gọi tiếp**:
  - `initWorkflowView({ alibaba, shopee, tiktok, gemini, lens })`
  - `setupWindowControls()`, `setupNavigationTabs()`
  - `checkGlobalSessions(sdks)`

---

<a name="phan-2-phan-he-ui-workflow"></a>
## PHẦN 2: PHÂN HỆ UI WORKFLOW (`workflowView.js` & `ui/modules/workflow/`)

### FILE: `ui/modules/workflowView.js`
* **Vị trí**: `test_all_extension/ui/modules/workflowView.js`.
* **Vai trò**: [MASTER CONTROLLER FACADE] Điều phối luồng 4 màn hình con của Workflow Pipeline, kết nối 5 sub-module chuyên biệt trong thư mục `workflow/`.
* **Độ dài**: 178 dòng.

#### 🔹 Hàm: `initWorkflowView(clients)`
* **Chức năng**: Khởi tạo toàn bộ phân hệ Workflow, lưu trữ tham chiếu 5 SDK clients, khởi tạo ticker & logger, và gọi các hàm bind sự kiện từ sub-modules.
* **Tham số**: `clients` (`{ alibaba, shopee, tiktok, gemini, lens }`).
* **Được gọi từ đâu**: `ui/app.js` (`initializeApp`).
* **Gọi tiếp**:
  - `ticker.initTicker('liveThumbnailTicker')`
  - `logger.initLogger('terminalLogOutput')`
  - `bindInputEvents({ onStart: startPipelineExecution })`
  - `bindProgressEvents({ pipeline, startPipelineExecution, switchWorkflowScreen })`
  - `bindResultEvents({ onNewProduct, getPipelineState })`
  - `bindWarningEvents({ pipeline, switchWorkflowScreen })`
  - `refreshPlatformBadges()`

#### 🔹 Hàm: `switchWorkflowScreen(screenId)`
* **Chức năng**: Chuyển đổi trạng thái hiển thị giữa 4 màn hình con (`screenWorkflowInput`, `screenWorkflowProgress`, `screenWorkflowResult`, `screenWorkflowWarning`).
* **Tham số**: `screenId` (`string`).
* **Được gọi từ đâu**: `startPipelineExecution`, `bindProgressEvents`, `bindWarningEvents`, `handleResetForNewProduct`.

#### 🔹 Hàm: `refreshPlatformBadges()`
* **Chức năng**: Quét tình trạng phiên các sàn định kỳ mỗi 5 giây qua `autoTabs.checkAllSessions()` và đổi màu các badge (Xanh: online, Xám: offline).
* **Được gọi từ đâu**: `initWorkflowView()`, `setInterval`.

#### 🔹 Hàm: `startPipelineExecution()`
* **Chức năng**: Lấy SKU và ảnh gốc, ẩn hộp lỗi cũ, chuyển sang `screenWorkflowProgress`, reset UI và gọi `pipeline.runPipeline()` với đầy đủ callbacks (`onProgress`, `onComplete`, `onError`, `onCaptcha`).
* **Được gọi từ đâu**: `workflowInput.js` (khi click nút Start), `workflowInspector.js` (khi click nút Thử Lại).
* **Gọi tiếp**:
  - `pipeline.runPipeline()`
  - `updateProgressUI()`, `updateDataInspectorUI()`
  - `renderResultScreen()`, `showErrorDebugUI()`, `showCaptchaWarning()`

---

### FILE: `ui/modules/workflow/workflowInput.js`
* **Vị trí**: `test_all_extension/ui/modules/workflow/workflowInput.js`.
* **Vai trò**: Quản lý toàn bộ Màn hình 1 (Nhập liệu).
* **Độ dài**: 176 dòng.

#### 🔹 Hàm: `bindInputEvents({ onStart })`
* **Chức năng**: Gắn sự kiện drag & drop cho `#wfDropzone`, chọn file từ máy tính `#wfFileInput`, nạp link web `#wfUrlInput`, tự động viết hoa SKU `#wfSkuInput`, gỡ bỏ ảnh `#wfBtnRemoveImage`, và nút `#wfBtnStartPipeline`.
* **Tham số**: `{ onStart: Function }`.
* **Được gọi từ đâu**: `workflowView.initWorkflowView()`.

#### 🔹 Hàm: `handleFileSelect(file)`
* **Chức năng**: Đọc file ảnh từ máy bằng `FileReader`, chuyển đổi thành Data URL Base64 và hiển thị vào khung preview HD.
* **Tham số**: `file` (`File`).
* **Được gọi từ đâu**: Sự kiện Drop hoặc Change trên input file.

#### 🔹 Hàm: `setImageSource(src, infoText)`
* **Chức năng**: Cập nhật biến `currentImageSource`, gán ảnh vào `#wfPreviewImg`, hiển thị tên/dung lượng ảnh, và gọi `validateInputForm()`.

#### 🔹 Hàm: `validateInputForm()`
* **Chức năng**: Kiểm tra điều kiện: `currentImageSource != null` VÀ `sku.length >= 2`. Nếu thỏa mãn, kích hoạt nút Start (`disabled = false`) và thêm hiệu ứng phát sáng `wf-btn-glow`.

#### 🔹 Hàm: `resetInputForm()`
* **Chức năng**: Xóa sạch ảnh đã chọn, ẩn preview box, mở lại dropzone và làm rỗng ô nhập SKU.

#### 🔹 Hàm: `getCurrentImageSource()` & `getCurrentSku()`
* **Chức năng**: Getter lấy ảnh nguồn và mã SKU hiện tại phục vụ cho việc khởi chạy pipeline.

---

### FILE: `ui/modules/workflow/workflowFeeds.js`
* **Vị trí**: `test_all_extension/ui/modules/workflow/workflowFeeds.js`.
* **Vai trò**: Quản lý hiển thị Dòng Chảy Dữ Liệu Thời Gian Thực (Vertical Pipeline Flow).
* **Độ dài**: 267 dòng.

#### 🔹 Hàm: `resetVerticalFeedUI()`
* **Chức năng**: Làm rỗng và thiết lập placeholder cho cả 5 khối dữ liệu thời gian thực trước khi pipeline bắt đầu.
* **Được gọi từ đâu**: `workflowView.startPipelineExecution()`.

#### 🔹 Hàm: `updateDataInspectorUI(state)`
* **Chức năng**: Kích hoạt viền sáng (`active-step`) cho khối thẻ tương ứng với bước đang chạy và cập nhật dữ liệu của 5 khối:
  1. `renderFeed1688Raw(state)`: Render danh sách xưởng và ảnh sản phẩm 1688 gốc.
  2. `renderFeed1688Clean(state)`: Render thông tin sản phẩm đại diện đã loại bỏ rác xưởng, kèm bảng thuộc tính kỹ thuật.
  3. `renderFeedGeminiKeywords(state)`: Render danh sách tag từ khóa Shopee PH và TikTok queries do Gemini sinh ra.
  4. `renderFeedShopeePh(state)`: Render lưới sản phẩm đối thủ cạnh tranh trên Shopee PH (giá, rating, vị trí).
  5. `renderFeedTikTokVideos(state)`: Render danh sách video TikTok phân loại theo số lượt Tym.
* **Được gọi từ đâu**: Callback `onProgress` của pipeline.

---

### FILE: `ui/modules/workflow/workflowResultView.js`
* **Vị trí**: `test_all_extension/ui/modules/workflow/workflowResultView.js`.
* **Vai trò**: Quản lý Màn hình 3 (Kết quả & Xuất file) và **Bảo lưu Terminal Logs**.
* **Độ dài**: 255 dòng.

#### 🔹 Hàm: `bindResultEvents({ onNewProduct, getPipelineState })`
* **Chức năng**: Gắn sự kiện chuyển đổi 5 tab kết quả (`.wf-res-tab-btn`), nút tải file ZIP (`#wfBtnDownloadZip`), nút copy TSV (`#wfBtnCopyTsv`), và nút làm việc với sản phẩm mới (`#wfBtnNewProduct`).
* **Được gọi từ đâu**: `workflowView.initWorkflowView()`.

#### 🔹 Hàm: `renderResultScreen(state)`
* **Chức năng**: Đổ toàn bộ dữ liệu cuối cùng vào 5 tab màn hình kết quả:
  - `renderQuickStats(state)`: Cập nhật 4 số đếm (1688 Shops, Shopee Shops, TikTok Videos, Shopee Reviews).
  - `renderVideosTab(state)`: Hiển thị danh sách video phân nhóm theo Tym.
  - `renderReviewsTab(state)`: Hiển thị 10 review 5 sao có kèm hình ảnh/video khách hàng.
  - `renderPricingAndSpecsTab(state)`: Bảng đối sánh giá buôn 1688, giá bán Shopee PH và biên lợi nhuận.
  - `renderProcessDataResult(state)`: Hiển thị chi tiết toàn bộ dữ liệu lọc ở Tab 4.
  - `syncTerminalLogsToResult()`: **Sao chép tức thì toàn bộ log từ Terminal sang Tab 5 mà không làm mất log cũ**.
* **Được gọi từ đâu**: Callback `onComplete` của pipeline.

#### 🔹 Hàm: `syncTerminalLogsToResult()`
* **Chức năng**: Lấy `terminalLogOutput.innerHTML` sao chép sang `wfResultLogOutput.innerHTML`, đồng thời tự động cuộn xuống dưới cùng để người dùng kiểm tra lại toàn bộ nhật ký thực thi.

---

### FILE: `ui/modules/workflow/workflowInspector.js`
* **Vị trí**: `test_all_extension/ui/modules/workflow/workflowInspector.js`.
* **Vai trò**: Quản lý thanh tiến trình, Stepper 10 bước, Hộp Debug Lỗi Chuyên Sâu (Debug Drawer) và Màn hình Cảnh báo Captcha.
* **Độ dài**: 219 dòng.

#### 🔹 Hàm: `updateProgressUI(stepIndex, percent, title, detail)`
* **Chức năng**: Cập nhật chiều rộng thanh tiến trình `#wfProgressBar`, số % `#wfProgressPercent`, tiêu đề bước `#wfProgressStepName`, chi tiết `#wfProgressDetail`, và cập nhật trạng thái `active` / `completed` cho 10 bước trong Stepper.
* **Được gọi từ đâu**: Callback `onProgress` của pipeline.

#### 🔹 Hàm: `showErrorDebugUI(err, stepIndex, rawDetails)`
* **Chức năng**: Khi pipeline gặp sự cố, dừng thanh tiến trình, chuyển màu thanh bar sang đỏ (`#ef4444`), đánh dấu bước bị lỗi trong stepper, và mở **Hộp Debug Lỗi Chuyên Sâu**:
  - Format toàn bộ lỗi thô thành chuỗi JSON trực quan (`rawDetails`, `stack trace`, mã lỗi MTop / API).
  - Gợi ý hướng dẫn xử lý nhanh 3 bước cho người dùng.
* **Được gọi từ đâu**: Callback `onError` của pipeline.

#### 🔹 Hàm: `showCaptchaWarning(captchaInfo, switchWorkflowScreen)`
* **Chức năng**: Chuyển giao diện sang Màn hình Cảnh báo Captcha (`screenWorkflowWarning`) và hiển thị thông điệp yêu cầu người dùng kéo thanh trượt robot trên tab sàn tương ứng.
* **Được gọi từ đâu**: Callback `onCaptcha` của pipeline.

#### 🔹 Hàm: `bindProgressEvents({ pipeline, startPipelineExecution, switchWorkflowScreen })`
* **Chức năng**: Gắn sự kiện cho nút Tạm dừng / Tiếp tục (`#wfBtnPauseResume`), nút Hủy bỏ (`#wfBtnAbort`), nút Copy Log (`#wfBtnCopyLog`), nút Xóa Log (`#wfBtnClearLog`), nút Bật/tắt cuộn log (`#wfBtnToggleScroll`), nút Copy Toàn Bộ Lỗi Kèm Log (`#wfBtnCopyErrorDetails`), nút Thử Lại (`#wfBtnRetryPipeline`), và nút Quay Lại Nhập Liệu (`#wfBtnBackToInput`).

#### 🔹 Hàm: `bindWarningEvents({ pipeline, switchWorkflowScreen })`
* **Chức năng**: Gắn sự kiện cho nút Mở Tab Sàn (`#wfBtnOpenCaptchaTab`) và nút Tiếp Tục Chạy Sau Khi Giải Captcha (`#wfBtnResumeAfterCaptcha`).

---

### FILE: `ui/modules/workflow/workflowToast.js`
* **Vị trí**: `test_all_extension/ui/modules/workflow/workflowToast.js`.
* **Vai trò**: Quản lý thông báo Toast nổi toàn cục.
* **Độ dài**: 20 dòng.

#### 🔹 Hàm: `showToast(message)`
* **Chức năng**: Tạo thẻ `#wfGlobalToast`, hiển thị thông điệp nổi góc màn hình và tự động biến mất sau 3.5 giây.

---

<a name="phan-3-phan-he-pipeline-xu-ly"></a>
## PHẦN 3: PHÂN HỆ PIPELINE XỬ LÝ (`pipeline.js` & `ui/modules/pipeline/`)

### FILE: `ui/modules/pipeline.js`
* **Vị trí**: `test_all_extension/ui/modules/pipeline.js`.
* **Vai trò**: [MASTER PIPELINE FACADE] Điểm vào duy nhất để điều phối 10 bước thực thi tuần tự của quy trình tự động hóa.
* **Độ dài**: 115 dòng.

#### 🔹 Hàm: `runPipeline(input, callbacks)`
* **Chức năng**: Khởi tạo phiên chạy, reset state, duyệt qua 10 bước định nghĩa trong `PIPELINE_STEPS_CONFIG`, kiểm tra Pause/Abort trước mỗi bước, cập nhật log và ticker, bẫy lỗi và gọi các callback (`onProgress`, `onComplete`, `onError`, `onCaptcha`).
* **Tham số**:
  - `input`: `{ sku: string, originalImage: string, clients: Object }`.
  - `callbacks`: `{ onProgress, onComplete, onError, onCaptcha }`.
* **Được gọi từ đâu**: `workflowView.startPipelineExecution()`.
* **Gọi tiếp**: Các hàm `runStep0` -> `runStep9` trong `pipelineSteps.js`.

#### 🔹 Re-exports:
* Xuất khẩu: `pausePipeline()`, `resumePipeline()`, `abortPipeline()`, `pipelineState`.

---

### FILE: `ui/modules/pipeline/pipelineState.js`
* **Vị trí**: `test_all_extension/ui/modules/pipeline/pipelineState.js`.
* **Vai trò**: Quản lý State Machine tập trung và luồng điều khiển tạm dừng / hủy bỏ.
* **Độ dài**: 125 dòng.

#### 🔹 Enum: `PipelineStatus`
* Các trạng thái: `IDLE`, `RUNNING`, `PAUSED`, `ABORTED`, `COMPLETED`, `ERROR`.

#### 🔹 Biến: `pipelineState`
* Đối tượng chứa toàn bộ dữ liệu trong phiên: `sku`, `originalImage`, `status`, `currentStep`, `valid1688Shops`, `primaryOfferDetail`, `cleaned1688`, `keywords`, `shopeeShops`, `rawTikTokVideos`, `formattedVideos`, `topReviews`, `enrichedData`, `manifest`.

#### 🔹 Hàm: `initPipelineState(input)` & `resetPipelineState()`
* **Chức năng**: Khởi tạo hoặc xóa sạch dữ liệu state về trạng thái ban đầu.

#### 🔹 Hàm: `pausePipeline()`, `resumePipeline()`, `abortPipeline()`
* **Chức năng**: Điều khiển chuyển đổi trạng thái luồng chạy giữa `RUNNING`, `PAUSED` và `ABORTED`.

#### 🔹 Hàm: `checkPauseOrAbort()`
* **Chức năng**: Chặn luồng xử lý async nếu cờ `isPaused` đang bật (chờ đến khi resume) hoặc ném ngoại lệ `PIPELINE_ABORTED` nếu người dùng hủy bỏ quy trình.
* **Được gọi từ đâu**: Đầu mỗi bước trong `pipeline.runPipeline()`.

---

### FILE: `ui/modules/pipeline/pipelineSteps.js`
* **Vị trí**: `test_all_extension/ui/modules/pipeline/pipelineSteps.js`.
* **Vai trò**: Chứa mã nguồn thực thi độc lập của 10 bước nghiệp vụ trong Pipeline.
* **Độ dài**: 467 dòng.

#### 🔹 Hàm: `runStep0_AutoTabs(clients, state)`
* **Chức năng**: Kiểm tra phiên làm việc của 4 sàn TMĐT qua `autoTabs.ensureRequiredTabsOpen()`, tự động mở tab ngầm nếu còn thiếu.

#### 🔹 Hàm: `runStep1_1688VisualSearch(clients, state)`
* **Chức năng**: Tìm kiếm bằng hình ảnh qua 1688 SDK (`alibaba.searchByImage()`). Lưu dữ liệu thô vào `state.rawOffers1688` và phát ngay lên giao diện Màn hình 2 để người dùng xem trực tiếp danh sách xưởng thô ban đầu trước khi lọc.

#### 🔹 Hàm: `runStep2_1688Filter(clients, state)`
* **Chức năng**: Gửi danh sách thumbnail xưởng 1688 cho Gemini Vision đối soát với ảnh gốc (`geminiVisionHelper.verify1688Thumbnails`). Nếu chưa đủ 5 xưởng chuẩn xác, tự động phân trang (paging tối đa 5 trang). Nếu sau 5 trang vẫn < 5, đánh dấu cờ `isNicheProduct = true` và tiếp tục.

#### 🔹 Hàm: `runStep3_1688DetailsAndGallery(clients, state)`
* **Chức năng**: Cào mô tả chi tiết, thuộc tính specs và bộ ảnh gallery của xưởng. Sử dụng `geminiVisionHelper.detectComboTrapRatio` để tính tỷ lệ ảnh gốc trong gallery: nếu < 30%, loại bỏ vì shop bán bẫy combo tạp phẩm; nếu ≥ 30%, trích xuất specs sạch qua `cleaner.clean1688Offer`.

#### 🔹 Hàm: `runStep4_GeminiKeywords(clients, state)`
* **Chức năng**: Multimodal Generic Keyword Engine: Gửi ảnh gốc + mô tả kỹ thuật 1688 vào Gemini AI để khử sạch tên thương hiệu nội địa Trung Quốc. Sinh 10-20 từ khóa người bán Douyin, 5-8 từ khóa generic Shopee PH, và 10 truy vấn video TikTok.

#### 🔹 Hàm: `runStep5_ShopeeSearch(clients, state)`
* **Chức năng**: Cào sâu Shopee PH qua 3 trang (Trang 1, 2, 3) cho từng từ khóa generic. Toàn bộ sản phẩm thô được lưu vào `state.rawShopeeItems` để xem ngay trên UI, đồng thời gửi thumbnail cho Gemini Vision (`geminiVisionHelper.verifyShopeeThumbnails`) lọc đúng mã sản phẩm gốc.

#### 🔹 Hàm: `runStep6_ReviewVerification(clients, state)`
* **Chức năng**: Cào đánh giá người mua trên Shopee PH. Bỏ qua hoàn toàn video đánh giá để tối ưu tài nguyên và token, chỉ lấy văn bản (text) và hình ảnh thực tế của người mua. Gửi cho Gemini Vision (`geminiVisionHelper.verifyReviewAuthenticity`) loại bỏ review spam/lấy xu, đảm bảo đủ 10 review 5 sao có ảnh thật.

#### 🔹 Hàm: `runStep7_TikTokVideos(clients, state)`
* **Chức năng**: Thu hoạch video từ Douyin và TikTok qua các từ khóa đã tạo. Lưu video thô vào `state.rawVideoCandidates`, gửi ảnh bìa (cover) cho Gemini Vision (`geminiVisionHelper.verifyTikTokCovers`) xác nhận quay đúng sản phẩm mục tiêu. Sắp xếp video theo số lượng Tym thật giảm dần, không sinh bất kỳ video giả lập nào.

#### 🔹 Hàm: `runStep8_EnrichPricing(clients, state)`
* **Chức năng**: Hợp nhất thuộc tính, quy đổi tỷ giá CNY ➔ PHP ➔ VND qua `enricher.enrichProductData()` và tính toán biên lợi nhuận gộp (Gross Margin %).

#### 🔹 Hàm: `runStep9_PackageManifest(clients, state)`
* **Chức năng**: Đóng gói cấu trúc Manifest hoàn chỉnh theo chuẩn schema nghiệp vụ, sinh bảng tính TSV 24 cột chuẩn hóa qua `exporter.generateTsvString()`.

---

### FILE: `ui/modules/pipeline/geminiVisionHelper.js` (~175 dòng)
* **Vị trí**: `test_all_extension/ui/modules/pipeline/geminiVisionHelper.js`.
* **Vai trò**: Bộ công cụ kiểm định thị giác Multimodal Vision đối soát trực quan ảnh sản phẩm gốc với các nguồn dữ liệu mạng.
* **Các hàm chính**:
  - `verify1688Thumbnails(geminiClient, originalImg, offers)`: Đối chiếu ảnh gốc với danh sách thumbnail 1688, trả về danh sách index và lý do khớp.
  - `detectComboTrapRatio(geminiClient, originalImg, galleryImages)`: Đếm số ảnh chứa sản phẩm gốc trong gallery xưởng 1688, trả về tỷ lệ phần trăm (0 - 100%).
  - `verifyShopeeThumbnails(geminiClient, originalImg, items)`: Đối chiếu ảnh gốc với thumbnail sản phẩm Shopee PH để loại bỏ các model sai lệch.
  - `verifyReviewAuthenticity(geminiClient, originalImg, reviews)`: Thẩm định văn bản và ảnh chụp của người mua (bỏ qua video), lọc các đánh giá chân thực có ảnh hàng thật.
  - `verifyTikTokCovers(geminiClient, originalImg, videos)`: Kiểm định ảnh bìa video Douyin & TikTok, xác nhận video có quay sản phẩm mục tiêu.

---

### FILE: `ui/modules/workflowHistory.js` (~155 dòng)
* **Vị trí**: `test_all_extension/ui/modules/workflowHistory.js`.
* **Vai trò**: Quản lý lưu trữ đa phiên và phục hồi toàn diện dữ liệu workflow vào `chrome.storage.local`.
* **Các hàm chính**:
  - `initHistoryModal()`: Khởi tạo modal danh sách lịch sử các lần chạy trên giao diện.
  - `archiveRun(state, logHistory)`: Lưu snapshot toàn bộ dữ liệu phiên chạy (1688, Shopee, TikTok, reviews, specs, logs) vào storage.
  - `getRunById(id)`: Lấy chi tiết snapshot của một phiên đã chạy.
  - `restoreHistoricalRunToUI(runEntry, callbacks)`: Nạp lại toàn bộ dữ liệu cũ vào RAM `pipelineState`, hiển thị lại stepper 10 bước, dải cards 5 tầng và logs cũ.
  - `deleteRunById(id)` & `clearAllHistory()`: Xóa phiên cụ thể hoặc dọn sạch toàn bộ kho lưu trữ.

---

<a name="phan-4-phan-he-domain-processing"></a>
## PHẦN 4: PHÂN HỆ DOMAIN DATA PROCESSING

### FILE: `ui/modules/cleaner.js` (~99 dòng)
* **`clean1688Offer(rawOffer)`**: Bóc tách danh mục, giá sỉ tối thiểu, đơn vị và chuẩn hóa thuộc tính sản phẩm.
* **`filterFactoryNoise(str)`**: Biểu thức chính quy Regex quét sạch số điện thoại Trung Quốc, WeChat / 微信号, địa chỉ nhà xưởng và quảng cáo chào mời sỉ.

### FILE: `ui/modules/enricher.js` (~142 dòng)
* **`mergeProductData(cleaned1688, shopeeShops)`**: Ghép nối giá buôn 1688 với giá bán Shopee PH, tính toán giá trị VND tương đương và phần trăm biên lợi nhuận.
* **`extractTopReviews(shopeeShops, limit = 10)`**: Lọc mảng đánh giá, xử lý an toàn cả dạng mảng và object `{ reviews: [...] }`, trích xuất link ảnh người mua (`buyerImages`) và điền đủ 10 review 5 sao thực tế.

### FILE: `ui/modules/exporter.js` (~230 dòng)
* **`createZipBundle(pipelineState)`**: Dùng thư viện `JSZip` khởi tạo cây thư mục in-memory (`images/`, `reviews/`, `manifest.json`, `video_links.json`) và nén thành Blob `{SKU}.zip`.
* **`generateTsvString(pipelineState)`**: Tạo chuỗi ký tự phân tách bằng ký tự Tab (`\t`) với 24 cột dữ liệu chuẩn hóa phục vụ dán trực tiếp vào Google Sheets / Excel.
* **`copyTsvToClipboard(tsvString)`**: Ghi chuỗi TSV vào bộ nhớ tạm hệ thống.

---

<a name="phan-5-phan-he-ho-tro--sdk-helpers"></a>
## PHẦN 5: PHÂN HỆ HỖ TRỢ & SDK HELPERS

### FILE: `sdk/1688/image-utils.js` (~122 dòng)
* **`compressImage(base64Data, maxDimension = 800, quality = 0.85)`**: Sử dụng Canvas HTML5 nén ảnh đầu vào xuống kích thước tối ưu trước khi gửi lên API MTop nhằm tránh lỗi payload quá lớn hoặc timeout.
* **`blobToBase64(blob)`**: Chuyển đổi đối tượng Blob sang chuỗi Base64 Data URL.
* **`normalizeImageToBase64(input)`**: Chuẩn hóa mọi định dạng ảnh đầu vào (URL Web, Blob, File, Base64) thành chuẩn chuỗi Base64 đồng nhất.

### FILE: `sdk/tiktok/transport.js` (~82 dòng)
* **`waitForTabComplete(tabId, timeoutMs = 20000)`**: Lắng nghe sự kiện `chrome.tabs.onUpdated` cho đến khi tab chuyển sang trạng thái `complete`.
* **`executeTabScripting(tabId, func, args = [])`**: Thực thi hàm JavaScript trực tiếp trong môi trường trang web (`world: 'MAIN'`) để vượt qua cơ chế bảo vệ token X-Bogus và lấy trực tiếp dữ liệu từ context trang.

---
*Tiếp theo: Xem bản đồ luồng gọi hàm trực quan và bảng truy vết tại [03_BAN_DO_LUONG_GOI_HAM_CALL_GRAPH.md](file:///d:/makerting/Tool/Workflow/docs/technical_implementation/03_BAN_DO_LUONG_GOI_HAM_CALL_GRAPH.md).*
