# 🖱️ 04. ĐẶC TẢ LUỒNG XỬ LÝ CHI TIẾT TỪNG NÚT BẤM (BUTTON CLICK & UI INTERACTION FLOWS)

> **Mục tiêu**: Định nghĩa tường minh 100% các sự kiện click, kéo-thả, phím tắt và chuỗi hành động diễn ra bên dưới mã nguồn cho từng nút bấm trên giao diện người dùng theo Clean Architecture 2.0.

---

## 📑 Danh Sách Các Nút & Sự Kiện Giao Diện Theo Màn Hình

```text
[MÀN HÌNH 1: NHẬP LIỆU - screenWorkflowInput] (Quản lý bởi workflowInput.js)
├── 1. Vùng Kéo-thả ảnh (#wfDropzone - 'drop', 'dragover', 'dragleave')
├── 2. Nút Chọn file từ máy tính (#wfFileInput - 'change')
├── 3. Ô nhập Link ảnh Web (#wfUrlInput) & Nút Tải ảnh URL (#wfBtnLoadUrl - 'click')
├── 4. Nút Gỡ bỏ ảnh xem trước (#wfBtnRemoveImage - 'click')
├── 5. Ô nhập mã SKU (#wfSkuInput - 'input')
└── 6. Nút [ 🚀 BẮT ĐẦU PIPELINE ] (#wfBtnStartPipeline - 'click')

[MÀN HÌNH 2: TIẾN TRÌNH, LOGS & DEBUG DRAWER - screenWorkflowProgress] (Quản lý bởi workflowInspector.js)
├── 7. Nút [ ⏸️ TẠM DỪNG / ▶️ TIẾP TỤC ] (#wfBtnPauseResume - 'click')
├── 8. Nút [ ⏹️ HỦY BỎ ] (#wfBtnAbort - 'click')
├── 9. Nút [ 📜 CUỘN: BẬT/TẮT ] (#wfBtnToggleScroll - 'click')
├── 10. Nút [ 📋 SAO CHÉP LOG ] (#wfBtnCopyLog - 'click')
├── 11. Nút [ 🗑️ XÓA LOG THỦ CÔNG ] (#wfBtnClearLog - 'click')
└── [HỘP DEBUG LỖI CHUYÊN SÂU - wfErrorDebugBox]
    ├── 12. Nút [ 📋 SAO CHÉP LỖI ĐỂ DEBUG ] (#wfBtnCopyErrorDetails - 'click')
    ├── 13. Nút [ 🔄 THỬ LẠI ] (#wfBtnRetryPipeline - 'click')
    └── 14. Nút [ ⬅️ QUAY LẠI NHẬP LIỆU ] (#wfBtnBackToInput - 'click')

[MÀN HÌNH 3: KẾT QUẢ & XUẤT FILE - screenWorkflowResult] (Quản lý bởi workflowResultView.js)
├── 15. Dải nút chuyển 5 Tab kết quả (.wf-res-tab-btn - 'click')
├── 16. Nút [ 📦 TẢI FILE ZIP: {SKU}.zip ] (#wfBtnDownloadZip - 'click')
├── 17. Nút [ 📋 SAO CHÉP TSV (SHEETS/EXCEL) ] (#wfBtnCopyTsv - 'click')
└── 18. Nút [ 🔄 LÀM VIỆC VỚI SẢN PHẨM MỚI ] (#wfBtnNewProduct - 'click')

[MÀN HÌNH 4: CẢNH BÁO ROBOT / CAPTCHA - screenWorkflowWarning] (Quản lý bởi workflowInspector.js)
├── 19. Nút [ 🌐 MỞ TAB 1688 ĐỂ GIẢI CAPTCHA ] (#wfBtnOpenCaptchaTab - 'click')
└── 20. Nút [ ▶️ ĐÃ GIẢI XONG - TIẾP TỤC CHẠY ] (#wfBtnResumeAfterCaptcha - 'click')
```

---

## 🚀 CHI TIẾT LUỒNG XỬ LÝ CỦA TỪNG NÚT BẤM

### 1. Nút `[ 🚀 BẮT ĐẦU PIPELINE ]` (`#wfBtnStartPipeline`)
* **Vị trí**: Màn hình 1 (`ui/modules/workflow/workflowInput.js` ➔ `workflowView.js`).
* **Điều kiện kích hoạt**: `validateInputForm()` kiểm tra đã có ảnh nguồn (`currentImageSource != null`) VÀ độ dài SKU tối thiểu 2 ký tự.
* **Luồng xử lý**:
  ```mermaid
  sequenceDiagram
      autonumber
      actor User
      participant Input as workflowInput.js
      participant View as workflowView.js
      participant Insp as workflowInspector.js
      participant Feeds as workflowFeeds.js
      participant Core as pipeline.js

      User->>Input: Bấm [Bắt đầu Pipeline]
      Input->>View: Gọi onStart() -> startPipelineExecution()
      View->>View: switchWorkflowScreen('screenWorkflowProgress')
      View->>Insp: updateProgressUI(0, 0, 'Khởi động', 'Đang thiết lập môi trường...')
      View->>Feeds: resetVerticalFeedUI()
      View->>Core: runPipeline({ sku, originalImage, clients }, callbacks)
      Note over Core: Thực thi 10 bước độc lập trong pipelineSteps.js
  ```

---

### 2. Nút `[ ⏸️ TẠM DỪNG / ▶️ TIẾP TỤC ]` (`#wfBtnPauseResume`)
* **Vị trí**: Thanh điều khiển Màn hình 2 (`ui/modules/workflow/workflowInspector.js`).
* **Luồng xử lý**:
  1. Kiểm tra trạng thái hiện tại từ `pipeline.pipelineState.status`.
  2. Nếu đang `RUNNING`:
     - Gọi `pipeline.pausePipeline()`.
     - Đổi nút thành: `<span>▶️</span> Tiếp Tục`.
     - Thêm class CSS phát sáng: `btn-resume-glow`.
     - Vòng lặp `pipeline.js` đứng đợi tại hàm `checkPauseOrAbort()`.
  3. Nếu đang `PAUSED`:
     - Gọi `pipeline.resumePipeline()`.
     - Đổi nút lại thành: `<span>⏸️</span> Tạm Dừng`.
     - Gỡ bỏ class `btn-resume-glow`.
     - Vòng lặp `pipeline.js` tiếp tục chạy bình thường.

---

### 3. Nút `[ ⏹️ HỦY BỎ ]` (`#wfBtnAbort`)
* **Vị trí**: Màn hình 2 (`ui/modules/workflow/workflowInspector.js`).
* **Luồng xử lý**:
  1. Hiển thị hộp thoại xác nhận: `confirm('Bạn có chắc chắn muốn hủy bỏ quy trình đang chạy không?')`.
  2. Nếu đồng ý:
     - Gọi `pipeline.abortPipeline()`.
     - Ném ngoại lệ `PIPELINE_ABORTED` để dừng khẩn cấp toàn bộ các vòng lặp mạng.
     - Chuyển giao diện quay về Màn hình 1: `switchWorkflowScreen('screenWorkflowInput')`.

---

### 4. Cụm Nút Hộp Debug Lỗi Chuyên Sâu (`#wfErrorDebugBox`)
Khi Pipeline gặp sự cố (mạng timeout, MTop token lỗi, Gemini trả về sai cú pháp):

#### 🔹 Nút `[ 📋 Sao Chép Lỗi Để Debug ]` (`#wfBtnCopyErrorDetails`)
* Trích xuất nội dung lỗi thô JSON từ `#wfErrorMessage`.
* Ghép nối với toàn bộ nhật ký hiện có từ `#terminalLogOutput`.
* Đóng gói thành chuỗi văn bản:
  ```text
  === BÁO CÁO LỖI DEBUG WORKFLOW PIPELINE ===
  [LỖI THÔ CHI TIẾT - RAW DEBUG INFO]: { ... }
  [STACK TRACE]: Error at ...
  [TERMINAL LOGS]: ...
  ```
* Ghi vào Clipboard và kích hoạt Toast: `showToast('📋 Đã sao chép toàn bộ lỗi & logs để debug!')`.

#### 🔹 Nút `[ 🔄 Thử Lại ]` (`#wfBtnRetryPipeline`)
* Gọi lại trực tiếp `startPipelineExecution()` để khởi động lại quy trình với cùng mã SKU và ảnh nguồn mà không bắt người dùng nhập lại từ đầu.

#### 🔹 Nút `[ ⬅️ Quay Lại Nhập Liệu ]` (`#wfBtnBackToInput`)
* Gọi `switchWorkflowScreen('screenWorkflowInput')` để người dùng đổi ảnh hoặc sửa mã SKU.

---

### 5. Nút `[ 📦 TẢI FILE ZIP ]` (`#wfBtnDownloadZip`)
* **Vị trí**: Tab Kết quả (`ui/modules/workflow/workflowResultView.js`).
* **Luồng xử lý**:
  ```javascript
  btnDownloadZip.addEventListener('click', async () => {
    btnDownloadZip.disabled = true;
    btnDownloadZip.textContent = '⏳ Đang nén file ZIP...';
    try {
      const blob = await exporter.createZipBundle(pipeline.pipelineState);
      const blobUrl = URL.createObjectURL(blob);
      const filename = `${pipeline.pipelineState.sku || 'PRODUCT'}.zip`;

      // Gửi lệnh tải qua Background Service Worker
      await chrome.runtime.sendMessage({
        action: 'TRIGGER_DOWNLOAD',
        payload: { blobUrl, filename }
      });
      showToast(`Đã lưu file: ${filename}`);
    } catch (err) {
      alert('Lỗi tải file ZIP: ' + err.message);
    } finally {
      btnDownloadZip.disabled = false;
      btnDownloadZip.innerHTML = '<span>📦</span> Tải File ZIP';
    }
  });
  ```

---

### 6. Nút `[ 📋 SAO CHÉP TSV ]` (`#wfBtnCopyTsv`)
* **Vị trí**: Tab Kết quả (`ui/modules/workflow/workflowResultView.js`).
* **Luồng xử lý**:
  1. Gọi `exporter.generateTsvString(pipeline.pipelineState)` sinh 24 cột dữ liệu TSV.
  2. Ghi chuỗi vào Clipboard hệ thống qua `exporter.copyTsvToClipboard(tsv)`.
  3. Kích hoạt Toast thông báo: `📋 Đã sao chép 24 cột dữ liệu vào Clipboard! Hãy dán (Ctrl+V) vào Google Sheets hoặc Excel.`.

---

### 7. Nút `[ 🔄 LÀM VIỆC VỚI SẢN PHẨM MỚI ]` (`#wfBtnNewProduct`)
* **Vị trí**: Màn hình 3 (`ui/modules/workflow/workflowResultView.js` ➔ `workflowView.js`).
* **Luồng xử lý**:
  1. Reset form nhập liệu qua `workflowInput.resetInputForm()`: Xóa sạch ảnh preview, mở lại dropzone, xóa rỗng ô nhập SKU.
  2. **QUY TẮC QUAN TRỌNG VỀ LOG**: **Tuyệt đối KHÔNG xóa lịch sử Terminal Logs cũ**. Log của phiên trước vẫn được giữ nguyên trong console để lập trình viên và người dùng tra cứu nếu cần.
  3. Chuyển giao diện trở về Màn hình 1: `switchWorkflowScreen('screenWorkflowInput')`.

---

### 8. Chuyển Đổi Tab Kết Quả & Bảo Lưu Terminal Logs
* Khi người dùng click vào các nút `.wf-res-tab-btn`:
  - Ẩn toàn bộ các panel khác, chỉ hiển thị panel tương ứng với `data-target`.
  - **Đặc biệt khi chọn Tab 5 (`data-target="wfPanelLogs"`)**:
    Hệ thống gọi ngay lập tức `syncTerminalLogsToResult()` để sao chép nguyên vẹn toàn bộ HTML từ `#terminalLogOutput` sang `#wfResultLogOutput` và tự động cuộn xuống dòng mới nhất.

---

### 9. Cụm Nút Màn Hình Cảnh Báo Robot / Captcha (`screenWorkflowWarning`)
* Khi 1688 hoặc sàn TMĐT kích hoạt khiên chống bot:
  - Nút `#wfBtnOpenCaptchaTab`: Mở một tab mới tới trang chủ sàn (`chrome.tabs.create({ url: 'https://www.1688.com', active: true })`) để người dùng tự tay kéo thanh trượt robot.
  - Nút `#wfBtnResumeAfterCaptcha`: Sau khi giải xong, người dùng click nút này để tự động chuyển về Màn hình 2 (`screenWorkflowProgress`) và gọi `pipeline.resumePipeline()` để tiếp tục cào dữ liệu từ điểm dừng.

---
*Tài liệu kết thúc. Toàn bộ 20 nút bấm và sự kiện giao diện đã được chuẩn hóa 100%.*
