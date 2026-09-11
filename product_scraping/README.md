# ⚡ PRODUCT SCRAPING STUDIO — ALL-IN-ONE WORKBENCH (KHÔNG TỰ TẮT)

> **Bàn làm việc thực tế khai thác và phân tích sản phẩm đa nền tảng**: Google Gemini AI Multimodal Vision, Shopee E-Commerce, TikTok & Douyin Video, Alibaba 1688 Sỉ, Google Lens Vision.
> **Kiến trúc Clean Architecture 2.0**: Phân rã module chuyên biệt (SRP & Facade Pattern), xử lý mạng ổn định, **bảo lưu toàn bộ Terminal Logs** và tích hợp công nghệ **Chrome Side Panel** không bao giờ bị tự tắt khi chuyển tab!

---

## 🚀 CÁCH CÀI ĐẶT & SỬ DỤNG TRONG 10 GIÂY

1. Mở Chrome và vào đường dẫn:
   ```text
   chrome://extensions/
   ```
2. Bật công tắc **Developer mode** (Chế độ nhà phát triển ở góc trên bên phải).
3. Bấm **Load unpacked** (Tải tiện ích đã giải nén) và chọn thư mục:
   ```text
   d:\makerting\Tool\Workflow\product_scraping
   ```
4. Ghim icon Extension lên thanh công cụ của Chrome.
5. **Click vào biểu tượng Extension:**
   - Chrome sẽ tự động mở **Side Panel ghim cố định** bên cạnh màn hình.
   - Khi bạn click sang tab Shopee, 1688, TikTok, Google... **giao diện extension vẫn luôn hiển thị và không bao giờ bị tự tắt!**

---

## 🪟 3 CHẾ ĐỘ HIỂN THỊ KHÔNG LO BỊ TẮT

Ở góc trên bên phải giao diện có sẵn 2 nút chuyển đổi tiện lợi:
1. **📌 Ghim Cố Định (Side Panel mặc định):** Nằm gọn gàng bên hông trình duyệt song song với trang web bạn đang lướt.
2. **🪟 Cửa Sổ Riêng (Standalone Window):** Bấm nút `🪟 Cửa Sổ Riêng` để tách giao diện thành 1 cửa sổ ứng dụng độc lập, có thể di chuyển khắp màn hình hoặc kéo sang màn hình phụ thứ 2.
3. **⛶ Mở Tab Riêng (Full Tab):** Mở thành 1 Tab trình duyệt rộng rãi để làm việc toàn màn hình.

---

## 🏛️ CẤU TRÚC KIẾN TRÚC MỚI (CLEAN ARCHITECTURE 2.0)

Codebase được thiết kế theo các tầng phân tách trách nhiệm rõ ràng, file gọn gàng (100–250 dòng):

```text
product_scraping/
├── manifest.json & rules.json  (Cấu hình MV3 & CORS Bypass Engine cho MTop API)
├── background.js              (Service Worker điều khiển Chrome Tab & Download API)
├── ui/
│   ├── index.html & style.css (Khung giao diện Glassmorphism Dark Mode)
│   ├── app.js                 (Điểm vào khởi tạo 5 SDK)
│   └── modules/
│       ├── workflowView.js    (Facade điều phối các màn hình của Workflow)
│       ├── workflowHistory.js (Quản lý lưu trữ lịch sử đa phiên chrome.storage.local)
│       ├── workflow/          (Sub-modules giao diện Workflow)
│       │   ├── workflowInput.js       (Kéo thả ảnh, nạp URL, SKU, validation)
│       │   ├── workflowFeeds.js       (Dòng chảy dữ liệu trực quan 5 tầng & Toggle Thô vs Đã Lọc)
│       │   ├── workflowResultView.js  (Render kết quả 5 tab, so sánh dữ liệu đối soát & BẢO LƯU LOGS)
│       │   ├── workflowInspector.js   (Stepper, Hộp Debug Lỗi & Banner Hoàn Tất)
│       │   └── workflowToast.js       (Thông báo Toast nổi)
│       ├── pipeline.js        (Facade điều phối chuỗi chạy)
│       ├── pipeline/          (Sub-modules lõi thực thi)
│       │   ├── pipelineState.js       (State machine, Pause/Resume/Abort, lưu trữ dữ liệu thô & kiểm định)
│       │   ├── pipelineSteps.js       (10 hàm xử lý 10 bước độc lập)
│       │   └── geminiVisionHelper.js  (Bộ công cụ đối soát thị giác Multimodal Vision)
│       ├── cleaner.js, enricher.js, exporter.js (Xử lý dữ liệu, ZIP, TSV)
│       └── autoTabs.js, logger.js               (Tiện ích nền tảng)
└── sdk/ (5 bộ SDK Zero-API)
    ├── 1688/ (kèm image-utils.js: nén ảnh Canvas & Base64)
    ├── tiktok/ (kèm transport.js: In-Tab Scripting world MAIN)
    ├── shopee/, gemini/, lens/
```

---

## 🛠️ CÁC TÍNH NĂNG THỰC TẾ DÙNG ĐƯỢC NGAY TRONG GIAO DIỆN

* 🚀 **Tab Workflow Pipeline (TRUY VẤN & KHAI THÁC THÔNG TIN SẢN PHẨM ĐA TẦNG AI VISION):**
  * Kéo thả ảnh hoặc dán URL ảnh sản phẩm + Nhập mã SKU (tự động viết hoa).
  * Chạy tự động chuỗi 10 bước độc lập:
    1. **Quét thị giác 1688**: Đưa ảnh vào 1688 Visual Search, trả về dữ liệu thô tức thì lên giao diện.
    2. **Gemini Vision lọc Thumbnail & Paging**: Đối soát trực quan ảnh gốc với thumbnail 1688, phân trang tự động (tối đa 5 trang) để chọn 5 xưởng chuẩn xác, tự kích hoạt chế độ [Hàng Siêu Ngách] nếu số xưởng < 5.
    3. **Chống bẫy bán combo/phụ kiện**: Cào mô tả chi tiết và bộ ảnh gallery xưởng. Dùng Gemini Vision đo tỷ lệ ảnh chứa sản phẩm gốc (loại bỏ nếu < 30%), trích xuất thông số kỹ thuật (specs) sạch.
    4. **Multimodal Keyword Engine**: Đưa ảnh gốc + mô tả kỹ thuật vào Gemini để khử sạch brand Trung Quốc, tạo 10-20 từ khóa người bán Douyin, 5-8 từ khóa generic Shopee PH, và 10 truy vấn video TikTok.
    5. **Cào sâu Shopee PH (Trang 1, 2, 3)**: Tìm kiếm chuyên sâu qua nhiều trang và gửi thumbnail cho Gemini Vision chọn đúng mã sản phẩm, loại bỏ các model sai lệch.
    6. **Thẩm định Review chân thực (Text + Ảnh)**: Cào review Shopee 5 sao, **bỏ qua video review** để tiết kiệm tài nguyên và token, dùng Gemini Vision kiểm định ảnh thực tế của khách hàng (loại bỏ ảnh rác lấy xu), đảm bảo đủ 10 review chất lượng cao.
    7. **Cào sâu Video Douyin & TikTok**: Khai thác video theo từ khóa tiếng Trung và tiếng Anh, gửi ảnh bìa (cover) cho Gemini Vision xác nhận có quay đúng sản phẩm mục tiêu, sắp xếp video theo số lượng Tym thật giảm dần (100% video thực tế, không sinh video ảo).
    8. **Ghép dữ liệu, quy đổi tỷ giá & biên lợi nhuận**: Hợp nhất thuộc tính, quy đổi CNY/PHP sang VND và tính toán gross margin.
    9. **Đóng gói dữ liệu**: Xuất file manifest.json và sinh bảng tính TSV 24 cột chuẩn e-commerce.
    10. **Bảo lưu dữ liệu & Quản lý lịch sử đa phiên**: Giữ nguyên Màn hình 2 để đọc log và kiểm tra kết quả, tự động lưu snapshot vào storage, cho phép chuyển đổi mượt mà giữa Màn 2 và Màn 3 hoặc khôi phục phiên cũ.
  * **Dual-View (Xem Thô vs Đã Qua Gemini Vision)**:
    * Có nút Toggle trực tiếp trên các thẻ Card: Xem toàn bộ danh sách thô ngay khi cào về và xem danh sách sau khi Gemini Vision chọn lọc kèm nhãn trạng thái thị giác (`✓ Gemini Đã Chọn`, `✗ Không Khớp`, `📦 Thô`).
    * Tab 4 "🔍 Quá Trình & Lọc Dữ Liệu" trên Màn 3 hiển thị đầy đủ 4 bảng đối sánh song song giữa dữ liệu thô và dữ liệu đã được AI Vision phê duyệt.
  * **Hộp Debug Lỗi Chuyên Sâu**: Hiển thị JSON lỗi thô, mã lỗi MTop, stack trace và nút copy toàn bộ lỗi kèm terminal logs chỉ với 1 click.
  * **Xuất Dữ Liệu Đa Dạng**: 1-click **Tải file nén `{SKU}.zip`** (đầy đủ manifest/json/images), **Sao chép bảng tính TSV 24 cột** dán trực tiếp vào Google Sheets / Microsoft Excel, và **Tải Logs (.txt)**.

* 🛍️ **Tab Shopee API:** Tìm kiếm từ khóa, cào chi tiết sản phẩm, nút 1-click "Tìm Xưởng 1688" chuyển thẳng ảnh sản phẩm sang tab 1688.
* 🎵 **Tab TikTok / Douyin:** Tìm kiếm video sản phẩm / review, tải MP4 sạch không logo watermark.
* 🏭 **Tab Alibaba 1688 Sỉ:** Kéo thả ảnh, chọn file, dán ảnh từ clipboard (`Ctrl + V`) tìm xưởng sản xuất gốc, xem bảng giá sỉ và quy đổi VNĐ theo tỷ giá.
* 🔍 **Tab Google Lens:** Tìm kiếm thị giác ngược và so sánh giá đa sàn (Shopee, Lazada, Amazon, Taobao...).
* 🤖 **Tab Gemini AI & Banana Studio:** Chat AI trực tiếp hiệu ứng Typewriter, tạo ảnh sản phẩm với Banana Imagen 3 (1:1 Shopee, 9:16 TikTok).
* ⚡ **Tab Chẩn Đoán:** Kiểm tra tự động kết nối cookie và đo độ trễ phản hồi của cả 5 SDK.

