# 📖 TÀI LIỆU KỸ THUẬT TRIỂN KHAI CHI TIẾT (FULL IMPLEMENTATION & CODEBASE ARCHITECTURE)

> **Dành cho Developer**: Thư mục này là **bản thiết kế kiến trúc sạch (Clean Architecture 2.0) và đặc tả chi tiết cấp hàm (Function & Call Graph Specification)** hoàn chỉnh nhất của hệ thống. Tài liệu mô tả rõ từng file có chức năng gì, bên trong chứa gì, từng hàm nhận tham số gì, trả về gì, và **luồng gọi hàm (Call Trace)** từ lúc nạp ảnh đến khi xuất file và bảo lưu toàn bộ terminal log.

---

## 📑 Danh Mục Các Tài Liệu Triển Khai Kỹ Thuật (01 - 05):

| STT | Tài Liệu | Nội Dung Trọng Tâm |
|:---:|:---|:---|
| 00 | 📊 **[BAO_CAO_DANH_GIA_KIEN_TRUC_HE_THONG.md](file:///d:/makerting/Tool/Workflow/docs/BAO_CAO_DANH_GIA_KIEN_TRUC_HE_THONG.md)** | **Báo cáo đánh giá kiến trúc hệ thống**: Phân tích toàn diện ưu/nhược điểm, các Design Pattern áp dụng (Facade, State Machine, Strategy), bảng so sánh định lượng dòng mã trước và sau refactor. |
| 01 | 🏛️ **[01_KIEN_TRUC_CODEBASE_VA_BAN_DO_FILE.md](file:///d:/makerting/Tool/Workflow/docs/technical_implementation/01_KIEN_TRUC_CODEBASE_VA_BAN_DO_FILE.md)** | **Kiến trúc sạch 4 tầng & Bản đồ Codebase 2.0**: Phân rã triệt để Presentation (`workflowView` + 5 sub-modules), Application (`pipeline` + `pipelineSteps`), Domain và Infrastructure. Bản đồ thư mục và giải phẫu từng file. |
| 02 | 🔬 **[02_CHI_TIET_HAM_THEO_TUNG_FILE.md](file:///d:/makerting/Tool/Workflow/docs/technical_implementation/02_CHI_TIET_HAM_THEO_TUNG_FILE.md)** | **Đặc tả hàm chi tiết theo từng file (100% các file)**: Liệt kê toàn bộ các hàm trong từng file mới. Nêu rõ: Chức năng, Tham số (Types), Giá trị trả về, **Hàm này được gọi từ đâu (Called by)** và **Gọi tiếp những hàm nào (Calls to)**. |
| 03 | 🧭 **[03_BAN_DO_LUONG_GOI_HAM_CALL_GRAPH.md](file:///d:/makerting/Tool/Workflow/docs/technical_implementation/03_BAN_DO_LUONG_GOI_HAM_CALL_GRAPH.md)** | **Bản đồ luồng gọi hàm & Bảng truy vết thực thi**: Sơ đồ Mermaid Master Call Graph, bảng trace 4 luồng nghiệp vụ chính, và ma trận lời gọi hàm (Caller vs Callee Matrix). |
| 04 | 🖱️ **[04_LUONG_XU_LY_CHI_TIET_TUNG_NUT_BAM.md](file:///d:/makerting/Tool/Workflow/docs/technical_implementation/04_LUONG_XU_LY_CHI_TIET_TUNG_NUT_BAM.md)** | **Đặc tả luồng xử lý của 20 nút bấm & sự kiện**: Luồng chi tiết khi click Start, Pause/Resume, Abort, Retry, Copy Error, Copy TSV, Tải ZIP, Vùng kéo-thả ảnh, Hộp Debug Drawer và cơ chế **Bảo lưu Terminal Logs**. |
| 05 | 🔌 **[05_GIAO_TIEP_SDK_CHI_TIET.md](file:///d:/makerting/Tool/Workflow/docs/technical_implementation/05_GIAO_TIEP_SDK_CHI_TIET.md)** | **Đặc tả cách gọi 5 bộ SDK Zero-API**: Hướng dẫn gọi các hàm của 1688 SDK (kèm `image-utils.js`), Shopee SDK, TikTok/Douyin SDK (kèm `transport.js`), Gemini Vision SDK và Google Lens SDK. |

---

## 🏗️ Sơ Đồ Kiến Trúc 4 Tầng Của Dự Án (Clean Architecture Layers)

```text
[PRESENTATION LAYER]       index.html, style.css, app.js, workflowView.js,
                           workflow/ (workflowInput, workflowFeeds, workflowResultView, workflowInspector, workflowToast)
          │ (Calls & Callbacks)
          ▼
[APPLICATION LAYER]        pipeline.js (Master Facade), pipeline/ (pipelineState, pipelineSteps),
                           autoTabs.js, background.js (Service Worker)
          │ (Calls & Data Processing)
          ▼
[DOMAIN LAYER]             cleaner.js (Lọc rác 1688), enricher.js (Hợp nhất dữ liệu & Reviews), exporter.js (ZIP & TSV)
          │ (Calls & In-Tab Scripting)
          ▼
[INFRASTRUCTURE & SDK]     sdk/1688/ (kèm image-utils.js), sdk/shopee/, sdk/tiktok/ (kèm transport.js),
                           sdk/gemini/, sdk/lens/, rules.json (CORS Bypass Engine)
```

---
*Bắt đầu nghiên cứu kiến trúc tại: [01_KIEN_TRUC_CODEBASE_VA_BAN_DO_FILE.md](file:///d:/makerting/Tool/Workflow/docs/technical_implementation/01_KIEN_TRUC_CODEBASE_VA_BAN_DO_FILE.md).*
