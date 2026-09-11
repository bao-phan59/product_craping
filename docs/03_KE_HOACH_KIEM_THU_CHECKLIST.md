# ✅ 05. KẾ HOẠCH KIỂM THỬ VÀ CHECKLIST NGHIỆM THU CODE (TESTING & VERIFICATION)

> **Mục tiêu**: Cung cấp bộ kịch bản kiểm thử (Test Scenarios) bao phủ từ sản phẩm phổ thông đến sản phẩm ngách, kèm theo **Checklist 15 tiêu chí bắt buộc** để Developer tự rà soát trước khi đóng gói Extension.

---

## 🧪 1. Các Kịch Bản Kiểm Thử Trọng Yếu (Critical Test Scenarios)

### 📌 Kịch Bản 1: Sản Phẩm Phổ Thông (Đầy đủ dữ liệu)
* **Dữ liệu đầu vào**: Ảnh túi xách du lịch đa năng, SKU: `TRAVELBAG01`.
* **Kỳ vọng**:
  - 1688: Tìm đủ 5 shop sau 1 - 2 trang.
  - Shopee PH: Tìm đủ 5 shop sau 1 - 2 từ khóa.
  - TikTok/Douyin: Thu thập 30-50 video, server trả về `has_more = 0` hoặc chạm ngưỡng an toàn.
  - Tên video: Tự động gán `{tym}tym_{stt}` chuẩn xác.
  - Gói ZIP: Chứa đủ ảnh, `video_links.json`, `reviews/`, `enriched_product_data.json`.
  - Nút Copy: Paste vào Excel ra đầy đủ bảng TSV 3 khối.

### 📌 Kịch Bản 2: Sản Phẩm Ngách (Hiếm shop bán trên Shopee)
* **Dữ liệu đầu vào**: Ảnh linh kiện cơ khí / phụ kiện thú cưng đặc thù, SKU: `PETBRUSHPRO`.
* **Kỳ vọng**:
  - Shopee: Keyword 1 chỉ tìm được 1 shop.
  - **Hành vi bắt buộc**: Pipeline **tiếp tục quét lần lượt qua toàn bộ danh sách keyword (100% traversed)**.
  - Kết thúc quét hết tất cả từ khóa: Tổng hợp được 2 shop.
  - **Kỳ vọng thoát**: Pipeline **không bị treo vô hạn**, ghi log `[INFO] Đã quét hết 100% keywords. Tiếp tục với 2 shop thực tế`, chuyển mượt sang Bước 6.

### 📌 Kịch Bản 3: Kiểm Thử Tự Động Mở Tab (Auto-Tab Session Injection)
* **Tiền điều kiện**: Đóng toàn bộ các tab 1688, Shopee, TikTok trên trình duyệt.
* **Thao tác**: Nhập ảnh + SKU ➔ Bấm "Start Pipeline".
* **Kỳ vọng**:
  - Không hiện popup cảnh báo bắt người dùng mở tab thủ công.
  - Background Service Worker tự động mở các tab ngầm (`active: false`).
  - Terminal Log ghi nhận: `[INFO] [TabManager] Tự động mở tab 1688... Sẵn sàng!`.
  - Luồng cào dữ liệu diễn ra bình thường.

### 📌 Kịch Bản 4: Trùng Khớp Lượt Tym Video (Collision Deduplication)
* **Tình huống giả lập**: 3 video TikTok cùng có số lượt tym là `310`, 2 video có `1500` tym.
* **Kỳ vọng**:
  - Mảng `video_links.json` sinh ra các tên định danh:
    `310tym_1`, `310tym_2`, `310tym_3`, `1500tym_1`, `1500tym_2`.
  - Tuyệt đối không bị ghi đè dữ liệu hoặc mất bản ghi.

---

## 📋 2. Bảng Kiểm Tra Nghiệm Thu Cho Developer (15-Point Code Checklist)

Lập trình viên tích chọn vào từng mục sau khi hoàn thành code:

### 🔹 Khởi Tạo & Quản Lý Tab
- [ ] **Tiêu chí 01**: Extension chạy thuần Manifest V3, khai báo đầy đủ permissions (`tabs`, `storage`, `downloads`).
- [ ] **Tiêu chí 02**: Tự động mở tab nền bằng `chrome.tabs.create({ url, active: false })` khi chưa có tab, không bắt người dùng bấm xác nhận.
- [ ] **Tiêu chí 03**: Tái sử dụng 100% SDK có sẵn trong `sdk_utility/`, không viết lại code fetch thô.

### 🔹 Luồng Nghiệp Vụ & Điều Kiện Dừng
- [ ] **Tiêu chí 04**: Vòng lặp 1688 gom đủ 5 shop mới dừng (hoặc dừng khi cạn kết quả).
- [ ] **Tiêu chí 05**: Xác thực ảnh và mô tả 1688 bằng Gemini Vision trước khi chấp nhận shop.
- [ ] **Tiêu chí 06**: Đối với hàng ngách trên Shopee, **bắt buộc duyệt qua 100% danh sách từ khóa** mới được chốt số lượng thực tế.
- [ ] **Tiêu chí 07**: TikTok/Douyin SDK phân trang giả lập lazy-load và dừng khi `has_more === false` / `0` hoặc hết bản ghi mới.
- [ ] **Tiêu chí 08**: Video TikTok/Douyin **chỉ lưu link URL**, tuyệt đối không tải file nhị phân `.mp4` nặng.
- [ ] **Tiêu chí 09**: Tên định danh video được chuẩn hóa theo số tym `{tym}tym_{stt}` chống trùng lặp.
- [ ] **Tiêu chí 10**: Lọc đúng tối đa 10 đánh giá 5 sao Shopee có kèm ảnh hoặc clip.

### 🔹 Giao Diện & Trải Nghiệm (UI/UX)
- [ ] **Tiêu chí 11**: Giao diện đúng thiết kế Glassmorphism Dark Theme, sử dụng biến CSS Tokens.
- [ ] **Tiêu chí 12**: Dải **Live Thumbnail Ticker** cuộn hiển thị ngay lập tức hình ảnh shop / video khi Gemini vừa duyệt xong.
- [ ] **Tiêu chí 13**: Console Terminal Log hiển thị rõ ràng, phân màu `[INFO]`, `[SUCCESS]`, `[WARN]`, `[ERROR]`, có nút Copy & Clear.
- [ ] **Tiêu chí 14**: Nút tải file ZIP đặt tên chính xác theo mã sản phẩm: `{SKU}.zip`.
- [ ] **Tiêu chí 15**: Nút **`[ 📋 Sao chép nhanh bảng dữ liệu ]`** nạp đúng chuỗi định dạng TSV vào Clipboard để paste thẳng vào Excel/Sheets.

---
*Hoàn tất bộ tài liệu chuẩn. Trở về Trang Chủ: [docs/README.md](file:///d:/makerting/Tool/Workflow/docs/README.md).*
