# 📊 WIREFRAME CHI TIẾT – MÀN HÌNH 2: TIẾN TRÌNH & LIVE LOGS (PROGRESS & EXECUTION)

> **Mục tiêu**: Mô tả trực quan 100% các trạng thái tương tác động trong suốt quá trình chạy 10 bước: Tiến trình tổng quan, Live Thumbnail Ticker, Fallback hàng ngách quét 100% từ khóa, Cơ chế cuộn phân trang TikTok/Douyin, Tạm dừng, Hộp thoại hủy bỏ và Drawer xem toàn bộ Log hệ thống.

---

## 📌 STATE 2.1: TIẾN TRÌNH CHẠY TIÊU CHUẨN (STANDARD RUNNING STATE)
* **Kích hoạt khi**: Người dùng click `[ 🚀 BẮT ĐẦU CHẠY PIPELINE ]`.
* **Thành phần**:
  - Thanh % tổng thể kèm thời gian đếm xuôi (`Elapsed: 00:42`).
  - Stepper 10 bước (Icon chuyển trạng thái: `✅` Xong, `⏳` Đang chạy, `⚪` Chờ).
  - **Khung Live Thumbnail Ticker**: Hiển thị ảnh trích xuất thời gian thực của sản phẩm vừa khớp từ 1688 / Shopee / TikTok.
  - Khung Log terminal cuộn tự động hiển thị dòng sự kiện chi tiết.
  - Bộ nút điều khiển: `[ ⏸️ Tạm dừng ]` và `[ ⏹️ Hủy bỏ ]`.

```text
+-------------------------------------------------------------------+
|  [⚡] PIPELINE ĐANG HOẠT ĐỘNG                     ⏱️ 00:42   [✕] |
|  Mã SKU: SHOEAIRMAX2026BLK                                        |
+-------------------------------------------------------------------+
|  [ TIẾN ĐỘ TỔNG THỂ: 65% ]                                        |
|  [███████████████████████████████████░░░░░░░░░░░░░░░░░░] 65%     |
|  Đang thực hiện: Bước 6/10 - Lọc 10 đánh giá 5 sao có media Shopee|
+-------------------------------------------------------------------+
|  [ TIẾN TRÌNH 10 BƯỚC ]                                           |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  ✅ 01. Kiểm tra session & mở tab ngầm nếu thiếu            │  |
|  │  ✅ 02. Tìm kiếm bằng hình ảnh trên 1688                    │  |
|  │  ✅ 03. Lọc 5 shop 1688 & lấy bảng giá phân tầng            │  |
|  │  ✅ 04. Gemini dịch tiêu đề & sinh 5 cụm từ khóa Shopee     │  |
|  │  ✅ 05. Tìm kiếm Shopee & lọc 5 shop uy tín đối sánh        │  |
|  │  ⏳ 06. Trích xuất 10 đánh giá 5★ Shopee có media (8/10)... │  |
|  │  ⚪ 07. Khởi tạo truy vấn TikTok/Douyin theo từ khóa        │  |
|  │  ⚪ 08. Thu thập link video TikTok phân loại theo lượt Tym   │  |
|  │  ⚪ 09. Gemini làm giàu thuộc tính & tổng hợp bảng dữ liệu  │  |
|  │  ⚪ 10. Đóng gói ZIP {SKU}.zip & tạo dữ liệu sao chép nhanh │  |
|  └─────────────────────────────────────────────────────────────┘  |
|  [ DÒNG CHẢY DỮ LIỆU 5 TẦNG & DUAL-VIEW (THÔ VS GEMINI VISION) ]  |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  1. 📸 1688 Thô (20 items) -> Gemini lọc 5 shop chuẩn mẫu   │  |
|  │     [Thumbnail #1 ✓ Gemini] [Thumbnail #2 ✗ Lệch] ...       │  |
|  │  2. 🧼 Thông số 1688 đã làm sạch & chống bẫy combo (<30%)   │  |
|  │  3. 🤖 Từ khóa đa kênh (Douyin Tiếng Trung, Shopee, TikTok) │  |
|  │  4. 🛒 Shopee PH: [🎯 Gemini Chọn (5)]  [📦 Dữ Liệu Thô (48)]│  |
|  │  5. 🎬 TikTok:    [🎯 Gemini Chọn (18)] [📦 Video Thô (36)] │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  [ NHẬT KÝ HOẠT ĐỘNG TRỰC TIẾP (LIVE LOGS) ]         [🖥️ Mở rộng] |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │ [21:40:12] [INFO] [1688] Nhận 20 offer thô từ Visual API.   │  |
|  │ [21:40:18] [INFO] [GEMINI] Đã đối soát và chọn 5 shop chuẩn.│  |
|  │ [21:40:29] [INFO] [SHOPEE] Cào sâu 3 trang nhận 48 SP thô.  │  |
|  │ [21:40:38] [INFO] [GEMINI] Thẩm định 10 review 5 sao có ảnh │  |
|  │ [21:40:42] [INFO] [TIKTOK] Duyệt bìa 18 video thật theo Tym.│  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  ┌──────────────────────────────┬──────────────────────────────┐  |
|  │    [ ⏸️ TẠM DỪNG TIẾN TRÌNH ] │     [ ⏹️ HỦY BỎ TÁC VỤ ]     │  |
|  └──────────────────────────────┴──────────────────────────────┘  |
+-------------------------------------------------------------------+
```

---

## 📌 STATE 2.2: TRẠNG THÁI XỬ LÝ HÀNG NGÁCH TRÊN SHOPEE (NICHE PRODUCT 100% KEYWORD TRAVERSAL)
* **Tình huống đặc thù**: Sản phẩm thuộc thị trường ngách, ít đối thủ cạnh tranh trên Shopee. Tìm kiếm keyword đầu tiên chỉ ra 1 shop.
* **Cơ chế bắt buộc**: Hệ thống KHÔNG dừng lại mà **tiếp tục quét 100% toàn bộ bộ từ khóa** (từ keyword #1 đến keyword #5) cho đến khi duyệt hết danh sách, sau đó chấp nhận dừng ở số lượng thực tế tìm được (dù nhỏ hơn 5) mà không báo lỗi.

```text
+-------------------------------------------------------------------+
|  [ TIẾN ĐỘ: BƯỚC 5/10 - TÌM KIẾM SHOPEE (HÀNG NGÁCH) ]            |
|  [██████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 45%     |
+-------------------------------------------------------------------+
|  ⚠️ [CHẾ ĐỘ HÀNG NGÁCH]: Số shop < 5. Đang duyệt 100% từ khóa...  |
|                                                                   |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  Từ khóa 1: "breathable running sneakers"   -> 1 shop       │  |
|  │  Từ khóa 2: "cushioned athletic trainers"   -> 0 shop       │  |
|  │  Từ khóa 3: "lightweight mesh sport shoes"  -> 1 shop       │  |
|  │  ⏳ Từ khóa 4: "korean style casual jogging" -> Đang quét... │  |
|  │  ⚪ Từ khóa 5: "non-slip outdoor activewear" -> Chờ duyệt   │  |
|  │  ---------------------------------------------------------  │  |
|  │  Tổng hợp hiện tại: 2 shop đối sánh / Mục tiêu ban đầu: 5    │  |
|  │  💡 Cam kết: Duyệt hết 5/5 từ khóa mới chốt danh sách!     │  |
|  └─────────────────────────────────────────────────────────────┘  |
+-------------------------------------------------------------------+
```

---

## 📌 STATE 2.3: TRUY VẤN TIKTOK/DOUYIN VỚI CUỘN PHÂN TRANG (INFINITE LAZY-LOAD LOOP)
* **Tình huống**: Bước 8 - Thu thập video TikTok/Douyin. SDK gọi phân trang ngầm thông qua API Search (`has_more`).
* **Cơ chế ngắt**: Vòng lặp dừng khi `has_more == false` (hoặc `0`), danh sách rỗng, hoặc gặp video trùng lặp vòng lặp; đồng thời tự động phân loại video theo số Tym (`310tym_1`, `1500tym_1`...).

```text
+-------------------------------------------------------------------+
|  [ TIẾN ĐỘ: BƯỚC 8/10 - THU THẬP VIDEO TIKTOK / DOUYIN ]          |
|  [████████████████████████████████████████████░░░░░░░░░░] 80%     |
+-------------------------------------------------------------------+
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  • Trang API hiện tại: Cursor #3 | Phân trang: Đang cuộn... │  |
|  │  • Cờ has_more: true (Còn dữ liệu từ server TikTok)         │  |
|  │  • Tổng số video đã quét: 42 video                          │  |
|  │  • Video đạt chuẩn tương tác: 18 video                      │  |
|  │                                                             │  |
|  │  📊 Phân loại định dạng Tym:                                │  |
|  │  - Nhóm > 10.000 Tym: 2 video (`12500tym_1`, `18200tym_1`)   │  |
|  │  - Nhóm 1.000 - 10.000 Tym: 7 video (`1500tym_1`...)        │  |
|  │  - Nhóm < 1.000 Tym: 9 video (`310tym_1`, `310tym_2`...)   │  |
|  │                                                             │  |
|  │  ⚡ Chỉ lưu đường dẫn URL, KHÔNG tải nhị phân video nặng!    │  |
|  └─────────────────────────────────────────────────────────────┘  |
+-------------------------------------------------------------------+
```

---

## 📌 STATE 2.4: TRẠNG THÁI TẠM DỪNG (PIPELINE PAUSED)
* **Kích hoạt khi**: Người dùng click nút `[ ⏸️ Tạm dừng ]`.
* **Hiệu ứng**: Hệ thống đóng băng trạng thái đang chạy, lưu snapshot tiến trình vào bộ nhớ đệm, đổi nút sang `[ ▶️ Tiếp tục chạy ]`.

```text
+-------------------------------------------------------------------+
|  [⏸️] TIẾN TRÌNH ĐÃ TẠM DỪNG                      ⏱️ 00:54 (Đóng băng)
+-------------------------------------------------------------------+
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  ⚠️ TIẾN TRÌNH ĐANG Ở TRẠNG THÁI TẠM DỪNG                   │  |
|  │  Bộ nhớ đệm đã lưu toàn bộ kết quả của 5 bước trước đó.      │  |
|  │  Dữ liệu an toàn, không bị mất mát khi tiếp tục.            │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  ┌──────────────────────────────┬──────────────────────────────┐  |
|  │    [ ▶️ TIẾP TỤC CHẠY NGAY ]  │     [ ⏹️ HỦY BỎ TÁC VỤ ]     │  |
|  └──────────────────────────────┴──────────────────────────────┘  |
+-------------------------------------------------------------------+
```

---

## 📌 STATE 2.5: MODAL XÁC NHẬN HỦY BỎ (ABORT CONFIRMATION MODAL)
* **Kích hoạt khi**: Người dùng click nút `[ ⏹️ Hủy bỏ ]`.
* **Hiệu ứng**: Hiển thị popup mờ kính cảnh báo để tránh bấm nhầm.

```text
+-------------------------------------------------------------------+
|  [░░░░░░░░░░░░░░░░░ NỀN MỜ PHÍA SAU ░░░░░░░░░░░░░░░░░░░░░░░░░░░]  |
|                                                                   |
|         ┌───────────────────────────────────────────────┐         |
|         │  ⚠️ XÁC NHẬN HỦY BỎ QUÁ TRÌNH?                │         |
|         ├───────────────────────────────────────────────┤         |
|         │  Bạn có chắc chắn muốn hủy bỏ tiến trình      │         |
|         │  thu thập dữ liệu hiện tại không?             │         |
|         │                                               │         |
|         │  Dữ liệu đang thu thập dở dang sẽ bị giải     │         |
|         │  phóng khỏi bộ nhớ RAM.                       │         |
|         │                                               │         |
|         │   [ Quay lại tiếp tục ]   [ ⏹️ Xác nhận Hủy ] │         |
|         └───────────────────────────────────────────────┘         |
|                                                                   |
|  [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]  |
+-------------------------------------------------------------------+
```

---

## 📌 STATE 2.6: DRAWER TOÀN MÀN HÌNH XEM CONSOLE LOGS (FULL TERMINAL LOG VIEWER)
* **Kích hoạt khi**: Click icon `[🖥️ Mở rộng]` tại khung Live Logs.
* **Đặc điểm**: Mở rộng toàn màn hình panel, có thanh lọc theo service: `[ALL]`, `[1688]`, `[SHOPEE]`, `[TIKTOK]`, `[GEMINI]`, `[ZIP]`, và nút `[ 📋 Copy toàn bộ Log ]`.

```text
+-------------------------------------------------------------------+
|  [🖥️ NHẬT KÝ HỆ THỐNG CHI TIẾT - TERMINAL VIEW]              [✕] |
+-------------------------------------------------------------------+
|  BỘ LỌC: [🔘 TẤT CẢ] [1688] [SHOPEE] [TIKTOK] [GEMINI] [ZIP]     |
+-------------------------------------------------------------------+
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │ [21:40:01] [SYS] Khởi động Chrome Extension Pipeline V3     │  |
|  │ [21:40:02] [TAB] Auto-check tab 1688: OK (Tab #102)         │  |
|  │ [21:40:02] [TAB] Auto-check tab Shopee: OK (Tab #105)       │  |
|  │ [21:40:03] [TAB] Auto-open background tab TikTok: Tab #110  │  |
|  │ [21:40:05] [1688] Upload ảnh gốc thành công: md5_a8f9c1... │  |
|  │ [21:40:08] [1688] Nhận 40 kết quả tìm kiếm bằng hình ảnh    │  |
|  │ [21:40:12] [1688] Đã chọn 5 shop hợp lệ thỏa mãn tiêu chí   │  |
|  │ [21:40:15] [GEMINI] Gửi prompt phân tích tiêu đề & specs    │  |
|  │ [21:40:18] [GEMINI] Nhận 5 keyword: ['running', 'mesh'...] │  |
|  │ [21:40:22] [SHOPEE] Query keyword #1 -> Trả về 24 sản phẩm  │  |
|  │ [21:40:29] [SHOPEE] Lọc thành công 5 shop đối sánh          │  |
|  │ [21:40:35] [SHOPEE] Bắt đầu duyệt review: Đã cào 10 đánh giá│  |
|  │ [21:40:40] [TIKTOK] Query keyword 'running sneakers'        │  |
|  │ [21:40:44] [TIKTOK] Cursor 1: Nhận 12 video                 │  |
|  │ [21:40:48] [TIKTOK] Phân loại: 310tym_1, 310tym_2, 1500tym_1│  |
|  └─────────────────────────────────────────────────────────────┘  |
|  [ 📋 Sao chép toàn bộ Log ]         [ 🗑️ Xóa màn hình Console ]   |
+-------------------------------------------------------------------+
```
