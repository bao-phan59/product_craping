# 📦 WIREFRAME CHI TIẾT – MÀN HÌNH 3: KẾT QUẢ & XUẤT FILE (RESULTS & EXPORT)

> **Mục tiêu**: Mô tả trực quan 100% các trạng thái tương tác của Màn hình 3: Dashboard chỉ số tổng hợp, 3 Tab xem trước dữ liệu chi tiết (Video links theo Tym, 10 Review 5 sao Shopee, Thông số làm giàu Gemini & Giá), Modal xem bảng dữ liệu copy vào Excel/Sheets, Tiến trình nén ZIP và Thông báo Toast.

---

## 📌 STATE 3.1: DASHBOARD CHỈ SỐ TỔNG HỢP (SUMMARY DASHBOARD)
* **Kích hoạt khi**: Toàn bộ 10 bước pipeline hoàn thành thành công 100%.
* **Đặc điểm**:
  - Banner chúc mừng với hiệu ứng Gradient Neon xanh lục.
  - 4 Thẻ chỉ số (Metrics Cards): Shop 1688, Shop Shopee, Video TikTok, Review 5 sao.
  - 2 Nút hành động chính: **`[ 📦 TẢI FILE ZIP {SKU}.zip ]`** và **`[ 📋 SAO CHÉP NHANH BẢNG DỮ LIỆU ]`**.

```text
+-------------------------------------------------------------------+
|  [⚡ Logo]  KẾT QUẢ PIPELINE HOÀN TẤT             ✅ THÀNH CÔNG   |
|  Mã SKU: SHOEAIRMAX2026BLK • Thời gian chạy: 01 phút 14 giây      |
+-------------------------------------------------------------------+
|  🎉 PIPELINE ĐÃ HOÀN TẤT THU THẬP & LÀM GIÀU DỮ LIỆU!             |
+-------------------------------------------------------------------+
|  ┌───────────────────────┬─────────────────────────────────────┐  |
|  │  🏬 1688.com          │  🛒 Shopee PH                       │  |
|  │  5 / 5 Shop uy tín    │  5 / 5 Shop đối sánh (hoặc ngách)   │  |
|  │  Giá: ¥39.00 - ¥45.00 │  Giá: ₱389 - ₱429                   │  |
|  ├───────────────────────┼─────────────────────────────────────┤  |
|  │  🎬 TikTok / Douyin   │  ⭐ Shopee Reviews                  │  |
|  │  18 Video chất lượng  │  10 Đánh giá 5★ có ảnh/video        │  |
|  │  Lượt tym: 310 - 18k  │  Độ tin cậy: Tuyệt đối 100%         │  |
|  └───────────────────────┴─────────────────────────────────────┘  |
|                                                                   |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │         📦 [ TẢI GÓI DỮ LIỆU: SHOEAIRMAX2026BLK.zip ]        │  |
|  │         (Chứa JSON enriched, Video URLs, 10 Reviews)        │  |
|  └─────────────────────────────────────────────────────────────┘  |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │         📋 [ SAO CHÉP NHANH BẢNG DỮ LIỆU (EXCEL/SHEETS) ]   │  |
|  │         (Copy 1-click định dạng TSV chuẩn 24 cột)           │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                   |
|  [ XEM TRƯỚC DỮ LIỆU CHI TIẾT ]                                   |
|  [🔘 TAB 1: VIDEO (18)]  [TAB 2: REVIEW (10)]  [TAB 3: SPECS/GIÁ] |
+-------------------------------------------------------------------+
```

---

## 📌 STATE 3.2: TAB 1 – VIDEO LINKS PHÂN LOẠI THEO LƯỢT TYM (VIDEO LIST BY TYM)
* **Quy ước đặt tên**: `{likeCount}tym_{index}` (Ví dụ: `310tym_1`, `310tym_2`, `1500tym_1`, `18200tym_1`).
* **Đặc điểm**: Chỉ lưu URL xem video, không tải file mp4 nặng; có nút mở xem trực tiếp trên tab mới hoặc sao chép riêng từng link.

```text
+-------------------------------------------------------------------+
|  [TAB 1: VIDEO (18)]     [TAB 2: REVIEW (10)]    [TAB 3: SPECS]   |
+-------------------------------------------------------------------+
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  🎬 18200tym_1  |  ❤️ 18.2K Tym  |  💬 412 Bl  |  ↗️ 890 Share │  |
|  │  🔗 https://www.tiktok.com/@creator1/video/734291...        │  |
|  │  [ ↗️ Mở xem tab mới ]                 [ 📋 Sao chép URL ]   │  |
|  ├─────────────────────────────────────────────────────────────┤  |
|  │  🎬 12500tym_1  |  ❤️ 12.5K Tym  |  💬 230 Bl  |  ↗️ 340 Share │  |
|  │  🔗 https://www.tiktok.com/@creator2/video/734108...        │  |
|  │  [ ↗️ Mở xem tab mới ]                 [ 📋 Sao chép URL ]   │  |
|  ├─────────────────────────────────────────────────────────────┤  |
|  │  🎬 1500tym_1   |  ❤️ 1.5K Tym   |  💬 89 Bl   |  ↗️ 45 Share  │  |
|  │  🔗 https://www.tiktok.com/@creator3/video/733912...        │  |
|  │  [ ↗️ Mở xem tab mới ]                 [ 📋 Sao chép URL ]   │  |
|  ├─────────────────────────────────────────────────────────────┤  |
|  │  🎬 310tym_1    |  ❤️ 310 Tym    |  💬 12 Bl   |  ↗️ 5 Share   │  |
|  │  🔗 https://www.tiktok.com/@creator4/video/733801...        │  |
|  │  [ ↗️ Mở xem tab mới ]                 [ 📋 Sao chép URL ]   │  |
|  ├─────────────────────────────────────────────────────────────┤  |
|  │  🎬 310tym_2    |  ❤️ 310 Tym    |  💬 8 Bl    |  ↗️ 3 Share   │  |
|  │  🔗 https://www.tiktok.com/@creator5/video/733799...        │  |
|  │  [ ↗️ Mở xem tab mới ]                 [ 📋 Sao chép URL ]   │  |
|  └─────────────────────────────────────────────────────────────┘  |
+-------------------------------------------------------------------+
```

---

## 📌 STATE 3.3: TAB 2 – 10 ĐÁNH GIÁ 5 SAO SHOPEE KÈM MEDIA (SHOPEE REVIEWS PREVIEW)
* **Đặc điểm**: Danh sách 10 đánh giá 5 sao chọn lọc, có đầy đủ ngày đánh giá, tên người mua, nội dung comment và thumbnail ảnh chụp thực tế / video review.

```text
+-------------------------------------------------------------------+
|  [TAB 1: VIDEO (18)]     [🔘 TAB 2: REVIEW (10)] [TAB 3: SPECS]   |
+-------------------------------------------------------------------+
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  ⭐ 5.0 | Người mua: m***8 | 📅 2026-03-02 14:15            │  |
|  │  "Giày đi siêu êm chân, form chuẩn, đế bám tốt đúng mô tả.  │  |
|  │   Đóng gói cẩn thận 2 lớp hộp, giao nhanh."                 │  |
|  │  Media: [🖼️ Ảnh thực tế 1] [🖼️ Ảnh đế giày] [🎥 Clip 12s]   │  |
|  ├─────────────────────────────────────────────────────────────┤  |
|  │  ⭐ 5.0 | Người mua: k***a | 📅 2026-03-01 09:30            │  |
|  │  "Very comfortable shoes for running and daily gym workout! │  |
|  │   Color is vibrant, breathable mesh material. 10/10!"       │  |
|  │  Media: [🖼️ Ảnh unbox] [🖼️ Ảnh mang vào chân]               │  |
|  ├─────────────────────────────────────────────────────────────┤  |
|  │  (Hiển thị tiếp 8 đánh giá 5 sao có media khác...)          │  |
|  └─────────────────────────────────────────────────────────────┘  |
+-------------------------------------------------------------------+
```

---

## 📌 STATE 3.4: TAB 3 – THÔNG SỐ LÀM GIÀU GEMINI & BẢNG GIÁ ĐỐI SÁNH (SPECS & PRICING)
* **Đặc điểm**: Bảng so sánh trực quan giữa giá gốc 1688 (RMB -> VNĐ) và giá bán đối thủ trên Shopee (PHP -> VNĐ), kèm các thuộc tính chuẩn hóa (Chất liệu, Màu sắc, Kiểu dáng, Ứng dụng).

```text
+-------------------------------------------------------------------+
|  [TAB 1: VIDEO]          [TAB 2: REVIEW]         [🔘 TAB 3: SPECS]|
+-------------------------------------------------------------------+
|  [ 1. ĐỐI SÁNH GIÁ NHẬP & GIÁ THỊ TRƯỜNG ]                        |
|  ┌──────────────────────────────┬──────────────────────────────┐  |
|  │  Giá nhập 1688 (RMB):        │  Giá bán Shopee PH (PHP):    │  |
|  │  • Thấp nhất: ¥39.00 (~140k) │  • Thấp nhất: ₱389 (~175k)   │  |
|  │  • Cao nhất:  ¥45.00 (~162k) │  • Cao nhất:  ₱429 (~193k)   │  |
|  │  • Trung bình: ¥42.00        │  • Trung bình: ₱405          │  |
|  └──────────────────────────────┴──────────────────────────────┘  |
|  [ 2. THUỘC TÍNH SẢN PHẨM LÀM GIÀU TỪ GEMINI AI ]                 |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  • Tên chuẩn hóa: Sneaker Nam Nữ Thể Thao Thoáng Khí Mesh   │  |
|  │  • Chất liệu: Thân vải dệt Flyknit lưới, Đế EVA trợ lực     │  |
|  │  • Màu sắc: Đen (Black), Trắng (White), Xám Bạc (Silver)    │  |
|  │  • Size: 39 - 44 chuẩn form quốc tế                         │  |
|  │  • Phù hợp: Chạy bộ, tập gym, đi bộ hàng ngày, du lịch      │  |
|  └─────────────────────────────────────────────────────────────┘  |
+-------------------------------------------------------------------+
```

---

## 📌 STATE 3.5: MODAL XEM TRƯỚC BẢNG DỮ LIỆU EXCEL/SHEETS (TSV GRID PREVIEW MODAL)
* **Kích hoạt khi**: Click icon hoặc nút xem trước bảng tính.
* **Đặc điểm**: Modal hiển thị lưới dữ liệu gồm đủ 24 cột chuẩn e-commerce (SKU, Tên sản phẩm, Giá 1688, Giá Shopee, 18 Links video, 10 Reviews...), người dùng bấm `[ 📋 Sao chép ngay ]` để paste thẳng vào Excel hoặc Google Sheets mà không bị lệch ô.

```text
+-------------------------------------------------------------------+
|  [░░░░░░░░░░░░░░░░░ NỀN MỜ PHÍA SAU ░░░░░░░░░░░░░░░░░░░░░░░░░░░]  |
|                                                                   |
|   ┌───────────────────────────────────────────────────────────┐   |
|   │ 📋 XEM TRƯỚC BẢNG DỮ LIỆU EXCEL / GOOGLE SHEETS       [✕] │   |
|   ├───────────────────────────────────────────────────────────┤   |
|   │ Định dạng: Tab-Separated Values (TSV) • 24 Cột chuẩn hóa  │   |
|   │ ┌───────────────┬─────────────────┬───────────┬─────────┐ │   |
|   │ │ SKU           │ PRODUCT_NAME    │ 1688_AVG  │ SHOPEE..│ │   |
|   │ ├───────────────┼─────────────────┼───────────┼─────────┤ │   |
|   │ │ SHOEAIRMAX... │ Sneaker Nam Nữ..│ ¥42.00    │ ₱405    │ │   |
|   │ └───────────────┴─────────────────┴───────────┴─────────┘ │   |
|   │ (Kéo ngang để xem tiếp: 18 cột Video Links, 10 Reviews..) │   |
|   │                                                           │   |
|   │   [ 📋 SAO CHÉP TOÀN BỘ VÀO CLIPBOARD (CTRL+V VÀO EXCEL) ] │   |
|   └───────────────────────────────────────────────────────────┘   |
|                                                                   |
|  [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]  |
+-------------------------------------------------------------------+
```

---

## 📌 STATE 3.6: TIẾN TRÌNH TẢI & CẤU TRÚC GÓI FILE ZIP {SKU}.zip
* **Kích hoạt khi**: Người dùng click `[ 📦 TẢI GÓI DỮ LIỆU: SHOEAIRMAX2026BLK.zip ]`.
* **Hiệu ứng**: Hiển thị thanh nén dữ liệu mini (`Đang nén: 100%`) và kích hoạt Chrome Download API.
* **Cấu trúc gói file tải về**:

```text
SHOEAIRMAX2026BLK.zip
 ├── 📄 enriched_product_data.json   (Dữ liệu thông số & giá 1688 vs Shopee)
 ├── 📄 video_links.json             (18 link video phân loại theo lượt tym)
 ├── 📄 shopee_reviews.json          (10 đánh giá 5 sao Shopee kèm link media)
 ├── 📄 excel_ready_data.tsv         (Bảng tính 24 cột copy-paste trực tiếp)
 └── 🖼️ original_product_image.jpg   (Hình ảnh gốc đã nạp vào hệ thống)
```

---

## 📌 STATE 3.7: TOAST NOTIFICATION PHẢN HỒI SAO CHÉP THÀNH CÔNG
* **Kích hoạt khi**: Click nút `[ 📋 SAO CHÉP NHANH BẢNG DỮ LIỆU ]`.
* **Hiệu ứng**: Toast phát sáng màu xanh ngọc neon trượt lên từ cạnh đáy trong 3 giây.

```text
+-------------------------------------------------------------------+
|  [░░░░░░░░░░░░░░░░░ MÀN HÌNH KẾT QUẢ PHÍA TRÊN ░░░░░░░░░░░░░░░]  |
|                                                                   |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │  ✅ ĐÃ SAO CHÉP DỮ LIỆU VÀO BỘ NHỚ TẠM (CLIPBOARD)!         │  |
|  │  👉 Mở Excel hoặc Google Sheets và bấm Ctrl + V để dán ngay!│  |
|  └─────────────────────────────────────────────────────────────┘  |
+-------------------------------------------------------------------+
```
