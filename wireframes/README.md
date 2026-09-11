# 🎨 BỘ HỒ SƠ WIREFRAME GIAO DIỆN DỰ ÁN (FULL UI WIREFRAME SUITE)

> **Vị trí**: Thư mục gốc dự án (`d:\makerting\Tool\Workflow\wireframes\`).
> **Mục tiêu**: Cung cấp toàn diện bản vẽ khung giao diện trực quan (ASCII Wireframes) bao phủ 100% các màn hình, các trạng thái tương tác động (Hover, Drag-over, Tạm dừng, Hủy bỏ, Hàng ngách quét 100% từ khóa, Cơ chế TikTok Lazy-load theo Tym, Xem trước dữ liệu, Cảnh báo Captcha / Ngoại lệ, Feedback thành công) và sơ đồ luồng người dùng.

---

## 📑 Danh Mục Bản Vẽ Wireframe Chi Tiết (01 - 05):

| STT | Bản Vẽ Wireframe | Nội Dung Trọng Tâm & Các Trạng Thái (States) |
|:---:|:---|:---|
| 01 | 🖼️ **[01_MAN_HINH_NHAP_LIEU_INPUT.md](file:///d:/makerting/Tool/Workflow/wireframes/01_MAN_HINH_NHAP_LIEU_INPUT.md)** | **Chi tiết Màn hình 1 (Nhập liệu đầu vào)**: <br>• **State 1.1**: Trạng thái mặc định ban đầu (Nút Start disabled).<br>• **State 1.2**: Trạng thái đang kéo thả ảnh (Dropzone Drag-Over viền Neon Cyan).<br>• **State 1.3**: Nhập ảnh bằng URL website trực tiếp kèm loading preview.<br>• **State 1.4**: Đã nạp ảnh HD preview & đủ mã SKU (Sẵn sàng click Start).<br>• **State 1.5**: Drawer Cài đặt & Quản lý phiên nền các sàn (Settings & Sessions Drawer). |
| 02 | 📊 **[02_MAN_HINH_TIEN_TRINH_VA_LOGS.md](file:///d:/makerting/Tool/Workflow/wireframes/02_MAN_HINH_TIEN_TRINH_VA_LOGS.md)** | **Chi tiết Màn hình 2 (Tiến trình & Live Logs)**: <br>• **State 2.1**: Tiến trình tổng thể (Bước 1-10, % tiến độ, Ticker & Console).<br>• **State 2.2**: Trạng thái xử lý **Hàng ngách (Niche product)** quét 100% keywords.<br>• **State 2.3**: Cơ chế **TikTok/Douyin Lazy-load** phân loại theo lượt Tym.<br>• **State 2.4**: Trạng thái **Tạm dừng (Paused)** & Nút tiếp tục chạy.<br>• **State 2.5**: Modal xác nhận **Hủy bỏ (Abort confirmation dialog)**.<br>• **State 2.6**: Drawer **Fullscreen System Terminal** xem & lọc log theo service. |
| 03 | 📦 **[03_MAN_HINH_KET_QUA_VA_XUAT_FILE.md](file:///d:/makerting/Tool/Workflow/wireframes/03_MAN_HINH_KET_QUA_VA_XUAT_FILE.md)** | **Chi tiết Màn hình 3 (Kết quả & Xuất dữ liệu)**: <br>• **State 3.1**: Bảng số liệu thống kê tổng hợp (5 shop 1688, 5 shop Shopee, 18 video, 10 reviews).<br>• **State 3.2**: Tab 1 - Xem trước **Video links theo lượt Tym** (`310tym_1`, `1500tym_1`...).<br>• **State 3.3**: Tab 2 - Xem trước **10 Đánh giá 5 sao Shopee** kèm media thực tế.<br>• **State 3.4**: Tab 3 - Xem trước **Thông số làm giàu Gemini & Bảng giá đối sánh**.<br>• **State 3.5**: Modal xem trước lưới dữ liệu **Excel / Google Sheets 24 cột** chuẩn hóa.<br>• **State 3.6**: Nút tải file ZIP `{SKU}.zip` kèm tiến trình nén & cấu trúc cây file.<br>• **State 3.7**: Toast feedback khi click nút **Sao chép nhanh bảng tính (Excel/Sheets)**. |
| 04 | ⚠️ **[04_MAN_HINH_NGOAI_LE_VA_CANH_BAO.md](file:///d:/makerting/Tool/Workflow/wireframes/04_MAN_HINH_NGOAI_LE_VA_CANH_BAO.md)** | **Chi tiết Màn hình 4 (Trạng thái Ngoại lệ & Cảnh báo)**: <br>• **State 4.1**: Cảnh báo phát hiện **Captcha / Slider xác thực chống bot** trên 1688 / Shopee.<br>• **State 4.2**: Cảnh báo **Mất kết nối Internet** (Network Offline) & cơ chế tự kết nối lại.<br>• **State 4.3**: Xử lý tình huống **Hàng siêu ngách (0 sản phẩm đối thủ)** thị trường đại dương xanh.<br>• **State 4.4**: Cảnh báo **Hết hạn phiên đăng nhập (Session expired)** hoặc thiếu tab sàn. |
| 05 | 🗺️ **[05_SO_DO_LUONG_TUONG_TAC_USER_FLOW.md](file:///d:/makerting/Tool/Workflow/wireframes/05_SO_DO_LUONG_TUONG_TAC_USER_FLOW.md)** | **Sơ đồ luồng tương tác & Ma trận chuyển đổi trạng thái**: Sơ đồ Mermaid State Transition Diagram mô tả chuyển động giữa 100% các màn hình và bảng ma trận tương tác chi tiết từng nút bấm. |

---

## 🚀 TRẢI NGHIỆM TRỰC QUAN TƯƠNG TÁC (INTERACTIVE PROTOTYPE):

> Ngoài các bản vẽ ASCII chi tiết trong các file markdown trên, thư mục này còn tích hợp sẵn một ứng dụng xem trực quan **[index.html](file:///d:/makerting/Tool/Workflow/wireframes/index.html)**.
> Người dùng và lập trình viên chỉ cần **click đúp mở `index.html` trong trình duyệt Chrome / Cốc Cốc / Edge** để xem giao diện thực tế chuẩn Glassmorphism Dark Mode, click thử chuyển đổi qua lại giữa tất cả các màn hình, modal và drawer!

---

## 📐 Chuẩn Kích Thước & Tỷ Lệ Giao Diện (Dimensions & Specs)

* **Thiết bị hiển thị**: Chrome Extension Side Panel (Mở ở thanh bên phải của trình duyệt Chrome).
* **Độ rộng khuyến nghị**: `420px` (co giãn responsive từ `380px` đến `480px`).
* **Độ cao**: `100vh` (tự động khớp với chiều cao cửa sổ Chrome).
* **Phong cách chủ đạo**: Glassmorphism Dark Mode (Kính mờ, nền tối sang trọng, dải màu tím-xanh công nghệ).
