# 📚 BỘ TÀI LIỆU CHUẨN DỰ ÁN: E-COMMERCE DATA PIPELINE EXTENSION

> **Dành cho Developer**: Toàn bộ tài liệu kỹ thuật đã được chuẩn hóa và cập nhật 100% đồng bộ với **Kiến trúc Sạch 2.0 (Clean Architecture 2.0)**. Thư mục `docs/` lưu trữ đầy đủ các tài liệu kỹ thuật chuẩn mực, được tổ chức logic theo thứ tự từ **Đánh giá kiến trúc ➔ Bản đồ Codebase ➔ Đặc tả hàm & Luồng gọi ➔ Giao diện & Wireframes ➔ Schemas dữ liệu ➔ Kiểm thử nghiệm thu**.

---

## 📑 Danh Mục Bộ Tài Liệu Chuẩn (Standard Documentation Map)

```text
Workflow/
├── wireframes/                               # [BỘ BẢN VẼ WIREFRAME TOÀN DIỆN & PROTOTYPE]
│   ├── index.html                            # 🌟 Trình mô phỏng trực quan tương tác 100% màn hình & states
│   ├── README.md                             # Mục lục bộ hồ sơ wireframe
│   ├── 01_MAN_HINH_NHAP_LIEU_INPUT.md        # Wireframe chi tiết Màn 1 (Input, Dropzone, URL, Ready, Settings)
│   ├── 02_MAN_HINH_TIEN_TRINH_VA_LOGS.md     # Wireframe chi tiết Màn 2 (Dòng Chảy 5 Tầng, Dual-View Thô/Lọc, Logs, Niche, TikTok, Pause)
│   ├── 03_MAN_HINH_KET_QUA_VA_XUAT_FILE.md   # Wireframe chi tiết Màn 3 (5 Tabs Preview, Tải ZIP, Copy TSV)
│   ├── 04_MAN_HINH_NGOAI_LE_VA_CANH_BAO.md   # Wireframe chi tiết Màn 4 (Captcha/Slider, Hộp Debug Lỗi, Robot Test)
│   └── 05_SO_DO_LUONG_TUONG_TAC_USER_FLOW.md # Sơ đồ Mermaid luồng tương tác người dùng & Ma trận chuyển đổi
│
└── docs/                                     # [BỘ TÀI LIỆU KỸ THUẬT & CODEBASE SPEC]
    ├── README.md                             # [TRANG CHỦ] Mục lục chuẩn hóa & Quy chuẩn lập trình
    ├── BAO_CAO_DANH_GIA_KIEN_TRUC_HE_THONG.md # 📊 [BÁO CÁO KIẾN TRÚC] Đánh giá toàn diện, Design Patterns & Metrics
    ├── 01_DESIGN_SYSTEM_VA_GIAO_DIEN.md      # [THIẾT KẾ UI] CSS Tokens (Glassmorphism), HTML layout, Bảng ID
    ├── 02_TU_DIEN_DU_LIEU_VA_SCHEMA.md       # [SCHEMAS] Runtime State, JSON manifest/enriched/videos, TSV
    ├── 03_KE_HOACH_KIEM_THU_CHECKLIST.md     # [KIỂM THỬ] Kịch bản test hàng phổ thông/ngách & 15 tiêu chí code
    └── technical_implementation/             # [BỘ ĐẶC TẢ KỸ THUẬT & KIẾN TRÚC SẠCH]
        ├── README.md                         # Tổng quan kiến trúc 4 tầng
        ├── 01_KIEN_TRUC_CODEBASE_VA_BAN_DO_FILE.md # Bản đồ file 2.0: Phân rã workflow & pipeline sub-modules
        ├── 02_CHI_TIET_HAM_THEO_TUNG_FILE.md  # Chi tiết 100% các hàm: Input, Output, Called by, Calls to
        ├── 03_BAN_DO_LUONG_GOI_HAM_CALL_GRAPH.md # Sơ đồ Call Graph Mermaid, trace thực thi & ma trận gọi hàm
        ├── 04_LUONG_XU_LY_CHI_TIET_TUNG_NUT_BAM.md # Luồng xử lý chi tiết 20 nút bấm & bảo lưu Terminal Logs
        └── 05_GIAO_TIEP_SDK_CHI_TIET.md      # Hướng dẫn gọi & nhận kết quả từ 5 SDK Zero-API
```

---

## 🧭 Hướng Dẫn Bắt Đầu Dành Cho Lập Trình Viên

Khi bắt đầu nghiên cứu hoặc mở rộng dự án, hãy đọc theo thứ tự khuyến nghị sau:

1. **Bước 0**: Đọc **[BAO_CAO_DANH_GIA_KIEN_TRUC_HE_THONG.md](file:///d:/makerting/Tool/Workflow/docs/BAO_CAO_DANH_GIA_KIEN_TRUC_HE_THONG.md)** để nắm rõ toàn cảnh kiến trúc, các design patterns được áp dụng và lý do phân rã module.
2. **Bước 1**: Đọc **[01_KIEN_TRUC_CODEBASE_VA_BAN_DO_FILE.md](file:///d:/makerting/Tool/Workflow/docs/technical_implementation/01_KIEN_TRUC_CODEBASE_VA_BAN_DO_FILE.md)** để nắm rõ cấu trúc thư mục, chức năng từng file và những gì khai báo bên trong.
3. **Bước 2**: Đọc **[02_CHI_TIET_HAM_THEO_TUNG_FILE.md](file:///d:/makerting/Tool/Workflow/docs/technical_implementation/02_CHI_TIET_HAM_THEO_TUNG_FILE.md)** để nắm rõ từng hàm, tham số nhận vào, kiểu dữ liệu trả về và hàm này được gọi từ đâu.
4. **Bước 3**: Xem sơ đồ luồng tại **[03_BAN_DO_LUONG_GOI_HAM_CALL_GRAPH.md](file:///d:/makerting/Tool/Workflow/docs/technical_implementation/03_BAN_DO_LUONG_GOI_HAM_CALL_GRAPH.md)** để thấy rõ chuỗi thực thi logic chạy xuyên suốt.
5. **Bước 4**: Xem chi tiết 20 nút bấm và cơ chế bảo lưu log tại **[04_LUONG_XU_LY_CHI_TIET_TUNG_NUT_BAM.md](file:///d:/makerting/Tool/Workflow/docs/technical_implementation/04_LUONG_XU_LY_CHI_TIET_TUNG_NUT_BAM.md)**.
6. **Bước 5**: Khi đóng gói file ZIP và nút sao chép Clipboard, đối chiếu với **[02_TU_DIEN_DU_LIEU_VA_SCHEMA.md](file:///d:/makerting/Tool/Workflow/docs/02_TU_DIEN_DU_LIEU_VA_SCHEMA.md)**.
7. **Bước 6**: Tự kiểm tra nghiệm thu bằng checklist 15 tiêu chí tại **[03_KE_HOACH_KIEM_THU_CHECKLIST.md](file:///d:/makerting/Tool/Workflow/docs/03_KE_HOACH_KIEM_THU_CHECKLIST.md)**.

---
*Dự án Chrome Extension Manifest V3 • Zero-API-Cost • Pure ES Modules.*
