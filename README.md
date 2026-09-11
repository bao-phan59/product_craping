# 🚀 PRODUCT INFORMATION MINING & RETRIEVAL WORKFLOW SYSTEM
### Hệ Thống Khai Thác & Truy Vấn Sâu Dữ Liệu Sản Phẩm Đa Tầng AI Vision

[![GitHub repo](https://img.shields.io/badge/Repository-product__craping-blue.svg)](https://github.com/bao-phan59/product_craping)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest_V3-success.svg)](#)
[![Zero-API Cost](https://img.shields.io/badge/API_Cost-0%C4%91_Zero_Cost-brightgreen.svg)](#)
[![Gemini Multimodal Vision](https://img.shields.io/badge/AI-Gemini_Multimodal_Vision-orange.svg)](#)
[![ES Modules](https://img.shields.io/badge/Code-Pure_ESM_Zero_Dependencies-purple.svg)](#)

---

## 🌟 GIỚI THIỆU TỔNG QUAN

**Product Information Mining & Retrieval System** là giải pháp tự động hóa toàn diện dành cho Chrome Extension (Manifest V3), chuyên sâu vào việc **tìm kiếm, thẩm định và khai thác thông tin sản phẩm đa nền tảng** (Alibaba 1688, Shopee Philippines, TikTok & Douyin) dưới sự kiểm duyệt thị giác trực quan của **Google Gemini Multimodal Vision**.

Hệ thống hoạt động theo triết lý **Zero-API (0 đồng chi phí)**: Tận dụng trực tiếp session người dùng và cơ chế **In-Tab Scripting Bypass** để thu thập dữ liệu sản phẩm, đối soát xưởng gốc, bóc tách thông số kỹ thuật, đánh giá người mua và video marketing thực tế.

---

## 🏛️ CẤU TRÚC THƯ MỤC DỰ ÁN

```text
product_craping/
├── docs/                                     # Toàn bộ tài liệu kiến trúc kỹ thuật & schemas
│   ├── README.md                             # Danh mục tài liệu kỹ thuật
│   ├── BAO_CAO_DANH_GIA_KIEN_TRUC_HE_THONG.md # Đánh giá kiến trúc hệ thống Clean Architecture 2.0
│   ├── 01_DESIGN_SYSTEM_VA_GIAO_DIEN.md      # Thiết kế giao diện Glassmorphism Dark Mode & bảng ID
│   ├── 02_TU_DIEN_DU_LIEU_VA_SCHEMA.md       # Từ điển dữ liệu, Runtime State & Schema JSON/TSV
│   ├── 03_KE_HOACH_KIEM_THU_CHECKLIST.md     # Checklist kiểm thử 15 tiêu chí
│   └── technical_implementation/             # Bộ đặc tả chi tiết từng file, hàm và Call Graph
│       ├── 01_KIEN_TRUC_CODEBASE_VA_BAN_DO_FILE.md
│       ├── 02_CHI_TIET_HAM_THEO_TUNG_FILE.md
│       ├── 03_BAN_DO_LUONG_GOI_HAM_CALL_GRAPH.md
│       ├── 04_LUONG_XU_LY_CHI_TIET_TUNG_NUT_BAM.md
│       └── 05_GIAO_TIEP_SDK_CHI_TIET.md
│
├── wireframes/                               # Hồ sơ thiết kế wireframe & prototype tương tác
│   ├── index.html                            # 🌟 Trình mô phỏng trực quan tương tác 100% màn hình
│   ├── 01_MAN_HINH_NHAP_LIEU_INPUT.md        # Wireframe Màn 1 (Input, SKU, Preview)
│   ├── 02_MAN_HINH_TIEN_TRINH_VA_LOGS.md     # Wireframe Màn 2 (Dòng chảy 5 tầng, Dual-View)
│   ├── 03_MAN_HINH_KET_QUA_VA_XUAT_FILE.md   # Wireframe Màn 3 (5 Tabs kết quả, ZIP, TSV)
│   ├── 04_MAN_HINH_NGOAI_LE_VA_CANH_BAO.md   # Wireframe Màn 4 (Captcha, Debug Lỗi)
│   └── 05_SO_DO_LUONG_TUONG_TAC_USER_FLOW.md # Sơ đồ luồng tương tác người dùng
│
└── product_scraping/                         # Mã nguồn Chrome Extension MV3 hoàn chỉnh
    ├── manifest.json & rules.json            # Cấu hình MV3 & CORS Bypass Engine
    ├── background.js                         # Service Worker điều khiển Tab & Downloads
    ├── libs/jszip.min.js                     # Thư viện đóng gói file ZIP in-memory
    ├── sdk/                                  # 5 bộ SDK Zero-API (1688, Shopee, TikTok, Gemini, Lens)
    └── ui/                                   # Giao diện Glassmorphism Dark Mode
        ├── index.html & style.css
        ├── app.js                            # Entry point khởi tạo extension
        └── modules/
            ├── workflowView.js               # Facade điều phối các màn hình
            ├── workflowHistory.js            # Quản lý lưu trữ lịch sử đa phiên
            ├── pipeline.js                   # Master Pipeline Runner điều phối 10 bước
            ├── pipeline/pipelineSteps.js     # 10 hàm xử lý độc lập
            ├── pipeline/geminiVisionHelper.js# Bộ công cụ Multimodal Vision đối soát ảnh
            ├── workflow/workflowFeeds.js     # Dòng chảy dữ liệu 5 tầng & Toggle Thô vs Đã Lọc
            ├── workflow/workflowResultView.js# Render kết quả 5 tab & so sánh đối soát
            └── cleaner.js, enricher.js, exporter.js, logger.js, autoTabs.js
```

---

## ⚡ QUY TRÌNH 10 BƯỚC KHAI THÁC DỮ LIỆU ĐA TẦNG AI VISION

1. **Bước 1 — 1688 Visual Search (Truyền tải dữ liệu thô tức thì):**
   - Đưa ảnh gốc vào 1688 Visual Search API.
   - Lưu toàn bộ danh sách xưởng thô ban đầu và phát ngay lên giao diện Màn hình 2 để người dùng xem trực tiếp dữ liệu thô trước khi lọc.

2. **Bước 2 — Gemini Vision lọc Thumbnail & Vòng lặp phân trang (Max 5 trang):**
   - Gửi thumbnail các xưởng 1688 đối soát trực quan với ảnh gốc qua Gemini Vision.
   - Nếu chưa đủ 5 xưởng chuẩn xác, tự động phân trang (paging tối đa 5 trang).
   - Tự kích hoạt cờ **[Hàng Siêu Ngách]** nếu đã qua 5 trang mà số xưởng < 5 để luồng chạy không bị gián đoạn.

3. **Bước 3 — Cào chi tiết xưởng & Phát hiện bẫy bán combo (<30% ảnh gốc):**
   - Cào mô tả, bảng thông số kỹ thuật (specs) và bộ ảnh gallery của xưởng.
   - Gemini Vision đếm tỷ lệ ảnh chứa sản phẩm gốc: nếu **< 30%**, loại bỏ vì xưởng bán combo tạp phẩm; nếu **≥ 30%**, xác nhận xưởng chuyên sâu và trích xuất specs sạch.

4. **Bước 4 — Multimodal Generic Keyword Engine (Khử sạch Brand Trung Quốc):**
   - Đưa cả ảnh gốc + mô tả kỹ thuật 1688 vào Gemini AI.
   - Khử sạch tên thương hiệu nội địa Trung Quốc.
   - Sinh 10-20 từ khóa người bán Douyin (Tiếng Trung), 5-8 từ khóa generic Shopee PH (Tiếng Anh), và 10 truy vấn video TikTok.

5. **Bước 5 — Cào sâu Shopee PH (Trang 1, 2, 3) & Gemini Vision chọn đúng mã sản phẩm:**
   - Tìm kiếm chuyên sâu qua 3 trang Shopee PH theo các từ khóa generic.
   - Thu thập toàn bộ sản phẩm thô (hiển thị ngay trên UI) và dùng Gemini Vision lọc đúng model/kiểu dáng của sản phẩm gốc.

6. **Bước 6 — Thẩm định đánh giá người mua (Chỉ dùng Text + Ảnh, BỎ QUA VIDEO):**
   - Cào các đánh giá 5 sao có đính kèm media của sản phẩm Shopee.
   - **Tối ưu tài nguyên:** Bỏ qua hoàn toàn video đánh giá để tiết kiệm token và băng thông, chỉ trích xuất **lời bình luận (text)** và **ảnh chụp thực tế của người mua**.
   - Gemini Vision lọc bỏ ảnh rác/ảnh lấy xu, đảm bảo đủ 10 review chân thực có ảnh hàng thật.

7. **Bước 7 — Cào sâu Video Douyin & TikTok + Gemini Vision duyệt bìa theo Tym:**
   - Khai thác video từ Douyin và TikTok qua từ khóa tiếng Trung và tiếng Anh.
   - Gửi ảnh bìa (cover) cho Gemini Vision xác nhận có quay đúng sản phẩm mục tiêu.
   - Sắp xếp video theo số lượng Tym thật giảm dần (100% video thực tế, không sinh video ảo).

8. **Bước 8 — Ghép dữ liệu, quy đổi tỷ giá & tính biên lợi nhuận:**
   - Hợp nhất thuộc tính kỹ thuật, quy đổi giá vốn CNY và giá bán lẻ PHP sang VND theo tỷ giá thực tế, tính toán Gross Margin %.

9. **Bước 9 — Đóng gói Manifest & Bảng TSV 24 cột:**
   - Sinh file `manifest.json` đầy đủ metadata và bảng tính TSV 24 cột chuẩn e-commerce sẵn sàng dán vào Google Sheets / Microsoft Excel.

10. **Bước 10 — Tự động lưu lịch sử đa phiên & Bảo lưu Màn hình 2:**
    - Không cưỡng bức chuyển màn hình, giữ nguyên Màn 2 để người dùng tự do đọc log và kiểm tra dữ liệu.
    - Lưu snapshot phiên chạy vào `chrome.storage.local`, hỗ trợ xem lại và phục hồi 100% dữ liệu các phiên cũ.

---

## 🎯 TÍNH NĂNG NỔI BẬT: DUAL-VIEW (THÔ VS ĐÃ QUA GEMINI VISION)

- **Xem trực tiếp dữ liệu thô ngay khi cào về:** Ngay khi có phản hồi API từ 1688, Shopee hoặc TikTok/Douyin, danh sách thô lập tức xuất hiện trên giao diện.
- **Nút Toggle chuyển đổi chế độ xem:** Trên từng thẻ Card (Shopee PH, TikTok Video) có sẵn nút `🎯 Gemini Chọn` và `📦 Dữ Liệu Thô` giúp người dùng dễ dàng chuyển đổi qua lại.
- **Nhãn trạng thái thị giác:** Mỗi sản phẩm/ảnh hiển thị badge rõ ràng: `✓ Gemini Đã Chọn`, `✗ Không Khớp`, hoặc `📦 Thô (Chưa lọc)`.
- **Tab 4 Màn hình Kết quả (Quá trình & Lọc Dữ Liệu):** Cung cấp 4 bảng đối sánh song song toàn diện giữa dữ liệu thô và dữ liệu sau khi được Gemini Vision phê duyệt.

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT EXTENSION

1. Mở Google Chrome và truy cập:
   ```text
   chrome://extensions/
   ```
2. Bật công tắc **Developer mode** (Chế độ dành cho nhà phát triển ở góc trên bên phải).
3. Bấm nút **Load unpacked** (Tải tiện ích đã giải nén).
4. Chọn thư mục:
   ```text
   test_all_extension
   ```
5. Ghim tiện ích lên thanh công cụ Chrome và nhấp chuột để bắt đầu sử dụng Side Panel cố định.
