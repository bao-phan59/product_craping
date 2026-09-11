# ⚠️ WIREFRAME CHI TIẾT – MÀN HÌNH 4: CÁC TRẠNG THÁI NGOẠI LỆ & CẢNH BÁO (ERROR & EXCEPTIONS)

> **Mục tiêu**: Bản vẽ mô tả chi tiết cách hệ thống phản hồi trực quan khi gặp các tình huống ngoại lệ: Captcha/Slider chống bot của sàn, Mất kết nối mạng, Hàng siêu ngách (0 sản phẩm), và Lỗi cookie phiên làm việc.

---

## 📌 STATE 4.1: CẢNH BÁO PHÁT HIỆN CAPTCHA / SLIDER XÁC THỰC (CAPTCHA DETECTED)
* **Tình huống**: 1688 hoặc Shopee bật cơ chế chống bot yêu cầu gạt thanh trượt (slider) hoặc chọn hình ảnh captcha.
* **Cơ chế xử lý**: Extension tự động tạm dừng (pause) pipeline, hiển thị cảnh báo đỏ và nút `[ 🌐 Mở tab giải Captcha ]`. Sau khi người dùng gạt xong trên tab đó, click `[ 🔄 Đã xong, Tiếp tục ]` để hệ thống tự động chạy tiếp mà không cần chạy lại từ đầu.

```text
+-------------------------------------------------------------------+
|  [⚡] PIPELINE ĐANG TẠM DỪNG                       ⚠️ CẢNH BÁO     |
+-------------------------------------------------------------------+
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  🛡️ PHÁT HIỆN YÊU CẦU XÁC THỰC BẢO MẬT (CAPTCHA / SLIDER)   │  |
|  ├─────────────────────────────────────────────────────────────┤  |
|  │  Nền tảng: 1688.com (Hoặc Shopee) đang yêu cầu xác minh bạn │  |
|  │  là người dùng thật (Thanh trượt chống Bot).                │  |
|  │                                                             │  |
|  │  HƯỚNG DẪN XỬ LÝ NHANH:                                     │  |
|  │  1. Bấm nút "Mở tab giải Captcha" bên dưới.                │  |
|  │  2. Kéo thanh trượt hoặc chọn hình xác thực trên tab đó.   │  |
|  │  3. Quay lại đây và bấm "Đã giải xong, Tiếp tục".          │  |
|  │                                                             │  |
|  │  ┌───────────────────────────────────────────────────────┐  │  |
|  │  │        🌐 [ MỞ TAB 1688 ĐỂ GIẢI CAPTCHA NGAY ]        │  │  |
|  │  └───────────────────────────────────────────────────────┘  │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  ┌──────────────────────────────┬──────────────────────────────┐  |
|  │  [ 🔄 ĐÃ GIẢI XONG, TIẾP TỤC ]│     [ ⏹️ HỦY BỎ TÁC VỤ ]     │  |
|  └──────────────────────────────┴──────────────────────────────┘  |
+-------------------------------------------------------------------+
```

---

## 📌 STATE 4.2: CẢNH BÁO MẤT KẾT NỐI INTERNET (NETWORK DISCONNECTED)
* **Tình huống**: Mất mạng giữa chừng khi đang cào dữ liệu hoặc tải ảnh.
* **Cơ chế xử lý**: Pipeline tự động đóng băng (freeze), không làm mất dữ liệu của các bước trước, hiển thị trạng thái chờ mạng kết nối lại.

```text
+-------------------------------------------------------------------+
|  [⚡] LỖI KẾT NỐI MẠNG                             ❌ OFFLINE      |
+-------------------------------------------------------------------+
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  📡 MẤT KẾT NỐI INTERNET TRONG KHI ĐANG XỬ LÝ               │  |
|  ├─────────────────────────────────────────────────────────────┤  |
|  │  Trình duyệt đã mất kết nối mạng.                           │  |
|  │  Trạng thái hiện tại: Đang dừng ở Bước 6/10.                │  |
|  │  Dữ liệu đã thu thập của Bước 1 -> 5 vẫn được giữ an toàn.  │  |
|  │                                                             │  |
|  │  Hệ thống đang tự động thử kết nối lại sau mỗi 5 giây...    │  |
|  │  [ Đang thử lại lần 2/5... ]                                │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │                  [ 🔄 THỬ LẠI NGAY LẬP TỨC ]                │  |
|  └─────────────────────────────────────────────────────────────┘  |
+-------------------------------------------------------------------+
```

---

## 📌 STATE 4.3: HÀNG SIÊU NGÁCH – HOÀN TOÀN KHÔNG TÌM THẤY SẢN PHẨM NÀO
* **Tình huống**: Sau khi quét 100% toàn bộ 5/5 cụm từ khóa của Gemini sinh ra trên Shopee, số lượng shop đối sánh tìm được vẫn là `0` shop (sản phẩm chưa từng xuất hiện trên Shopee).
* **Cơ chế xử lý**: Hệ thống KHÔNG crash mà hiển thị màn hình thông báo "Thị trường đại dương xanh (Chưa có đối thủ)", vẫn cho phép hoàn tất pipeline với dữ liệu từ 1688 và TikTok!

```text
+-------------------------------------------------------------------+
|  [⚡] KẾT QUẢ: HÀNG SIÊU NGÁCH (0 ĐỐI THỦ)         💡 GỢI Ý MỚI    |
+-------------------------------------------------------------------+
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  🌊 PHÁT HIỆN SẢN PHẨM THỊ TRƯỜNG ĐẠI DƯƠNG XANH!          │  |
|  ├─────────────────────────────────────────────────────────────┤  |
|  │  • Đã quét 100% (5/5 từ khóa Shopee) nhưng không có shop bán│  |
|  │  • 1688: Đã tìm thấy 5 xưởng gốc (Giá: ¥39.00 - ¥45.00)     │  |
|  │  • TikTok: Đã tìm thấy 12 video nội dung liên quan          │  |
|  │                                                             │  |
|  │  👉 ĐÂY LÀ CƠ HỘI KINH DOANH LỚN VÌ CHƯA CÓ ĐỐI THỦ BÁN SẴN!│  |
|  │  Hệ thống vẫn tổng hợp đầy đủ dữ liệu 1688 & Video TikTok.  │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │      📦 [ VẪN XUẤT FILE DỮ LIỆU {SKU}.zip VỚI 1688 & TIKTOK ]│  |
|  └─────────────────────────────────────────────────────────────┘  |
+-------------------------------------------------------------------+
```

---

## 📌 STATE 4.4: LỖI HẾT HẠN PHIÊN ĐĂNG NHẬP / CHƯA MỞ TAB SÀN (SESSION EXPIRED)
* **Tình huống**: Tab 1688 hoặc Shopee bị đăng xuất (session cookie expired) khiến SDK không trích xuất được giá gốc.

```text
+-------------------------------------------------------------------+
|  [⚡] LỖI PHIÊN LÀM VIỆC SÀN                        ⚠️ SESSION LỖI  |
+-------------------------------------------------------------------+
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  🔒 PHIÊN LÀM VIỆC TRÊN 1688.COM ĐÃ HẾT HẠN                 │  |
|  ├─────────────────────────────────────────────────────────────┤  |
|  │  1688 yêu cầu bạn cần đăng nhập tài khoản (hoặc quét mã QR) │  |
|  │  để xem bảng giá sỉ và danh sách nhà cung cấp.              │  |
|  │                                                             │  |
|  │  [ 🌐 Mở tab 1688 để đăng nhập ]   [ 🔄 Kiểm tra lại phiên ] │  |
|  └─────────────────────────────────────────────────────────────┘  |
+-------------------------------------------------------------------+
```
