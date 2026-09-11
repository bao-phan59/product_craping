# 🖼️ WIREFRAME CHI TIẾT – MÀN HÌNH 1: NHẬP LIỆU ĐẦU VÀO (INPUT SCREEN)

> **Mục tiêu**: Mô tả trực quan 100% các trạng thái tương tác của Màn hình 1 (Nhập liệu): Mặc định ban đầu, Kéo-thả ảnh, Nhập URL ảnh, Trạng thái sẵn sàng chạy, và Drawer Cài đặt / Quản lý phiên nền các sàn.

---

## 📌 STATE 1.1: TRẠNG THÁI MẶC ĐỊNH BAN ĐẦU (INITIAL DEFAULT)
* **Kích thước Side Panel**: Rộng `420px`, cao `100vh`.
* **Trạng thái**: Chưa có ảnh, chưa có mã SKU, nút Start bị vô hiệu hóa (`disabled`), thanh kiểm tra phiên ngầm hiển thị trạng thái hiện tại của trình duyệt.

```text
+-------------------------------------------------------------------+
|  [⚡ Logo]  E-COMMERCE DATA PIPELINE                      [⚙️] [✕] |
|  Multi-Platform Auto-Engine • Manifest V3                         |
+-------------------------------------------------------------------+
|                                                                   |
|  [ 1. HÌNH ẢNH SẢN PHẨM GỐC * ]                                   |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  🔗 Nhập URL ảnh: [ https://...                           ] │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                 -- HOẶC --                        |
|  ┌ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ┐  |
|  │                       📁                                    │  |
|  │             Kéo thả file ảnh sản phẩm vào đây               │  |
|  │                           hoặc                              │  |
|  │                 [ 📂 Chọn ảnh từ máy tính ]                 │  |
|  │             (Hỗ trợ: JPG, PNG, WEBP, tối đa 10MB)           │  |
|  └ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ┘  |
|                                                                   |
|  [ 2. THÔNG TIN ĐỊNH DANH SẢN PHẨM * ]                            |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  🏷️ Mã sản phẩm (SKU) *:                                    │  |
|  │  [ Nhập mã sản phẩm (ví dụ: SHOEAIRMAX2026BLK)...         ] │  |
|  │  ℹ️ Mã SKU sẽ được dùng để đặt tên file ZIP tải về.          │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  [ 3. KẾT NỐI PHIÊN TỰ ĐỘNG (AUTO-SESSION PRE-CHECK) ]            |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  🟢 1688.com:       Đã mở tab (Session cookie sẵn sàng)     │  |
|  │  🟢 Shopee PH:      Đã mở tab (Session cookie sẵn sàng)     │  |
|  │  ⚡ TikTok/Douyin:  Chưa mở -> 🚀 Tự động mở khi bấm Start │  |
|  │  🟢 Gemini AI:      Sẵn sàng đối chiếu thị giác             │  |
|  │  ℹ️ Hệ thống tự động mở tab ngầm nếu thiếu, không cần xác nhận|
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │               🚀 [ BẮT ĐẦU CHẠY PIPELINE ]                  │  |
|  │                (Nút bị mờ vì chưa đủ thông tin)             │  |
|  │                           [ DISABLED ]                      │  |
|  └─────────────────────────────────────────────────────────────┘  |
+-------------------------------------------------------------------+
```

---

## 📌 STATE 1.2: TRẠNG THÁI ĐANG KÉO-THẢ FILE ẢNH (DROPZONE DRAG-OVER)
* **Kích hoạt khi**: Người dùng kéo file ảnh từ File Explorer / Desktop rê vào vùng thả.
* **Hiệu ứng**: Viền khung chuyển màu Neon Cyan sáng rực, phóng to nhẹ, icon chuyển thành hộp nạp dữ liệu.

```text
+-------------------------------------------------------------------+
|  [ 1. HÌNH ẢNH SẢN PHẨM GỐC * ]                                   |
|                                                                   |
|  ╔═════════════════════════════════════════════════════════════╗  |
|  ║  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║  |
|  ║                       📥                                    ║  |
|  ║               THẢ TẬP TIN ẢNH VÀO ĐÂY NGAY!                 ║  |
|  ║             [ Hiệu ứng phát sáng viền Neon Accent ]         ║  |
|  ║  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║  |
|  ╚═════════════════════════════════════════════════════════════╝  |
+-------------------------------------------------------------------+
```

---

## 📌 STATE 1.3: NHẬP ẢNH BẰNG ĐƯỜNG DẪN URL (IMAGE URL INPUT MODE)
* **Kích hoạt khi**: Người dùng dán link ảnh trực tiếp từ website vào ô URL.
* **Hiệu ứng**: Hiển thị mini spinner tải ảnh, fetch blob để kiểm tra dung lượng & định dạng trước khi preview.

```text
+-------------------------------------------------------------------+
|  [ 1. HÌNH ẢNH SẢN PHẨM GỐC * ]                                   |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  🔗 Nhập URL ảnh:                                           │  |
|  │  [ https://cbu01.alicdn.com/img/ibank/O1CN01...jpg        ] │  |
|  │  [⏳ Đang tải ảnh từ URL... 85%]                           │  |
|  └─────────────────────────────────────────────────────────────┘  |
+-------------------------------------------------------------------+
```

---

## 📌 STATE 1.4: TRẠNG THÁI ĐÃ NẠP ẢNH & NHẬP ĐỦ MÃ SKU (READY TO START)
* **Đặc điểm**: 
  - Ảnh preview sắc nét hiển thị đầy đủ thông số (tên, kích thước, dung lượng).
  - SKU đã nhập hợp lệ: `SHOEAIRMAX2026BLK`.
  - Nút **`[ 🚀 BẮT ĐẦU CHẠY PIPELINE ]`** chuyển sang màu Gradient tím-xanh rực rỡ, sẵn sàng kích hoạt.

```text
+-------------------------------------------------------------------+
|  [⚡ Logo]  E-COMMERCE DATA PIPELINE                      [⚙️] [✕] |
+-------------------------------------------------------------------+
|  [ 1. HÌNH ẢNH SẢN PHẨM GỐC * ]                                   |
|  ┌───────────────────────┬─────────────────────────────────────┐  |
|  │                       │  • Tên file: shoe_master_01.jpg     │  |
|  │   ┌───────────────┐   │  • Kích thước: 1024 x 1024 px       │  |
|  │   │ [ẢNH THỰC TẾ  │   │  • Dung lượng: 246 KB               │  |
|  │   │  CỦA SẢN PHẨM │   │  • Định dạng: JPEG                  │  |
|  │   │  PREVIEW HD]  │   │  • Trạng thái: ✅ Đã nạp thành công │  |
|  │   └───────────────┘   │                                     │  |
|  │                       │  [ 🗑️ Gỡ bỏ ]     [ 🔄 Đổi ảnh ]    │  |
|  └───────────────────────┴─────────────────────────────────────┘  |
|                                                                   |
|  [ 2. THÔNG TIN ĐỊNH DANH SẢN PHẨM * ]                            |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  🏷️ Mã sản phẩm (SKU) *:                                    │  |
|  │  [ SHOEAIRMAX2026BLK                                      ] │  |
|  │  ✅ Mã SKU hợp lệ (17 ký tự, không chứa ký tự cấm).          │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  [ 3. KẾT NỐI PHIÊN TỰ ĐỘNG (AUTO-SESSION PRE-CHECK) ]            |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  🟢 1688.com:       Đã mở tab (Tab ID: 102)                 │  |
|  │  🟢 Shopee PH:      Đã mở tab (Tab ID: 105)                 │  |
|  │  ⚡ TikTok/Douyin:  Chưa mở -> 🚀 Sẽ tự mở ngầm background   │  |
|  │  🟢 Gemini AI:      Sẵn sàng phiên làm việc                 │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │             🚀 [ 🌟 BẮT ĐẦU CHẠY PIPELINE 🌟 ]               │  |
|  │             (Click để tự mở tab thiếu & quét dữ liệu)       │  |
|  └─────────────────────────────────────────────────────────────┘  |
+-------------------------------------------------------------------+
```

---

## 📌 STATE 1.5: DRAWER CÀI ĐẶT & QUẢN LÝ PHIÊN (SETTINGS & SESSIONS DRAWER)
* **Kích hoạt khi**: Click icon `[⚙️]` ở góc trên bên phải.
* **Hiệu ứng**: Khung trượt từ bên phải đè lên giao diện, cho phép bật/tắt sàn, cấu hình số lượng shop mục tiêu, và xem chi tiết danh sách Tab ID đang giữ session.

```text
+-------------------------------------------------------------------+
|  [⚙️ CÀI ĐẶT & QUẢN LÝ PHIÊN NỀN]                             [✕] |
+-------------------------------------------------------------------+
|  [ 1. TỰ ĐỘNG MỞ TAB NỀN (AUTO-TAB MANAGEMENT) ]                  |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  [✓] Tự động mở tab nếu chưa phát hiện phiên đăng nhập      │  |
|  │  [✓] Mở ở chế độ chạy ngầm (active: false - không chiếm màn)│  |
|  │  [✓] Giữ nguyên tab sau khi hoàn tất (tránh logout)         │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  [ 2. THIẾT LẬP THU THẬP DỮ LIỆU ]                                |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  • Số shop 1688 mục tiêu:          [ 5  ] shop uy tín       │  |
|  │  • Số shop Shopee mục tiêu:        [ 5  ] shop đối sánh     │  |
|  │  • Số đánh giá Shopee 5★ có media: [ 10 ] đánh giá          │  |
|  │  • Cơ chế hàng ngách Shopee:       [✓] Quét 100% từ khóa    │  |
|  │  • Nền tảng video ưu tiên:         (•) TikTok   ( ) Douyin  │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  [ 3. PHIÊN LÀM VIỆC HIỆN TẠI (ACTIVE SESSIONS) ]                  |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  • 1688 Tab:   ID #102 | https://www.1688.com/              │  |
|  │  • Shopee Tab: ID #105 | https://shopee.ph/                 │  |
|  │  • TikTok Tab: Chưa mở (Tự khởi tạo khi bấm Start)          │  |
|  │  • Gemini Tab: ID #109 | https://gemini.google.com/         │  |
|  │  [ 🔄 Kiểm tra lại ]     [ 🌐 Mở tất cả các sàn ngay ]       │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │                   [ 💾 LƯU THIẾT LẬP ]                      │  |
|  └─────────────────────────────────────────────────────────────┘  |
+-------------------------------------------------------------------+
```
