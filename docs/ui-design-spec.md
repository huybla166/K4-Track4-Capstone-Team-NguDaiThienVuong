# Đặc tả thiết kế UI DriverGuard (v3 – áp luật skill taste, 2026-10-16)

Mục tiêu: giao diện thực dụng như HMI ô tô và bảng điều khiển vận hành, KHÔNG trang trí. Đơn giản, dễ dùng (Google Material 3: vùng bấm ≥ 48 px, tương phản; Alibaba Ant Design: tự nhiên, nhất quán, có phản hồi).

## 1. Những thứ CẤM (dấu hiệu "AI-generated")
- Không glow / box-shadow phát sáng / drop-shadow màu / gradient / backdrop-blur / hiệu ứng neon.
- Không vòng tròn có biểu tượng phát sáng làm "hero". Không huy hiệu dạng viên thuốc (pill, rounded-full) cho chữ trạng thái.
- Không bo góc lớn: bán kính tối đa 8 px cho nút, 6 px cho khung, 4 px cho thẻ nhỏ.
- Không câu giới thiệu/quảng cáo ("Giao diện tối giản…", "Tư thế và tầm nhìn an toàn"). Mỗi màn hình chỉ có chữ cần thiết.
- Không emoji. Không dùng chữ siêu đậm (font-weight 800–900); tối đa 600.
- Không chấm tròn màu "đang hoạt động" nhấp nháy.

## 2. Phông chữ
- `Inter` qua `next/font/google`, `subsets: ["latin", "vietnamese"]` (BẮT BUỘC có "vietnamese" để dấu không rơi sang phông khác). Số dùng `font-variant-numeric: tabular-nums`.
- Thang cỡ chữ: 12 / 14 / 16 / 20 / 28 / 48 / 96 px. Trọng số: 400, 500, 600.

## 3. Token màu

**Cập nhật 2026-10-16 (theo yêu cầu sếp): bảng màu trắng – xanh kiểu Google, luôn ở chế độ sáng.** `--bg` #f8f9fa, `--surface` #ffffff, `--surface-2` #f1f3f4, `--border` #dadce0, `--text` #202124, `--text-muted` #5f6368, `--accent` #1a73e8 (hover #1557b0, nền nhạt `--accent-soft` #e8f0fe), `--ok` #188038, `--warn-solid` #f9ab00, `--danger-solid` #c5221f. Nút bo tròn hoàn toàn (`--radius-pill`), khối bo 12 px. Bảng dưới đây là giá trị cũ, chỉ để tham khảo.
 (khai báo MỘT chỗ trong app/globals.css bằng biến CSS; theo `prefers-color-scheme`)
Sáng (mặc định) | Tối:
- `--bg`: #f6f6f4 | #121314
- `--surface`: #ffffff | #1b1c1e
- `--border`: #d9d9d4 | #2e3033
- `--text`: #1a1a18 | #ececea
- `--text-muted`: #5c5c57 | #a3a39d
- `--accent`: #1f5eff | #6b93ff (màu duy nhất cho hành động/nút/liên kết)
- `--ok`: #1d7a46 | #4cc38a ; `--ok-bg`: #e6f4ec | #17301f
- `--warn`: #8a5a00 | #f2b01e ; `--warn-bg`: #fff3d6 | #3a2d08 ; `--warn-solid`: #f2b01e
- `--danger`: #b3261e | #ff6b61 ; `--danger-bg`: #fde8e6 | #3d1512 ; `--danger-solid`: #c62828
- `--surface-2`: #ecebe7 | #26282b (bậc nền thứ hai, cho nút phụ và ô con)
- `--accent-strong`: #1747cc | #8eabff (hover) ; `--accent-ink`: #ffffff | #0b1633 (chữ trên nền `--accent`; chế độ tối dùng chữ tối để đạt tương phản ≥ 4.5:1)
- `--warn-solid-2`: #dca015 ; `--danger-solid-2`: #a91f1f (bậc tối hơn cho nút phụ trên màn hình vàng/đỏ)
- `--radius-sm`: 4px ; `--radius`: 6px ; `--radius-lg`: 8px
Cùng một màu = cùng một ý nghĩa ở mọi nơi (xanh = bình thường, vàng = chú ý, đỏ = nguy hiểm). Mọi chỗ khác dùng biến, không rải mã hex.

## 4. Màn hình Tài xế ("/")

Cập nhật v3: chữ "CHÚ Ý" clamp(72px, 14vw, 220px), "NGUY HIỂM" clamp(56px, 11vw, 176px), nguyên nhân clamp(24px, 3.2vw, 44px) để liếc từ ghế lái là đọc được. Nút là mảng màu đặc, không viền: Tắt tiếng cao 72 px (bình thường `--surface-2`; chú ý nền #1a1a18 chữ vàng; nguy hiểm nền trắng chữ đỏ), Hiệu chuẩn lại nền một bậc tối hơn màn hình. Lớp hiệu chuẩn phủ kín nền `--bg`. Màn hình bắt đầu hiện trạng thái kết nối.

- Bình thường (NORMAL): nền `--bg`, YÊN TĨNH. Chỉ một dòng nhỏ "Đang theo dõi" (20 px, `--text-muted`) kèm hình vuông nhỏ 12 px màu `--ok`, điểm rủi ro nhỏ ở góc. KHÔNG chữ khổng lồ, KHÔNG biểu tượng lớn.
- Chú ý (WARNING): nền `--warn-solid` đặc phủ toàn màn hình, chữ #1a1a18, từ "CHÚ Ý" cỡ 96 px trọng số 600, bên dưới là 1–2 nguyên nhân cỡ 28 px.
- Nguy hiểm (DANGER): nền `--danger-solid` đặc phủ toàn màn hình, chữ trắng, "NGUY HIỂM" cỡ 96 px trọng số 600, nguyên nhân cỡ 28 px, kèm một biểu tượng tam giác cảnh báo SVG đơn giản (nét 4 px, không phát sáng, không vòng tròn) bên trái chữ. Nút tắt tiếng viền trắng trên nền đỏ.
- Mất kết nối: nền `--bg`, dòng "Mất kết nối. Đang thử lại…" màu `--text`; viền trên 4 px `--border`.
- Chuyển trạng thái: đổi nền tức thì hoặc mờ 150 ms; KHÔNG nhấp nháy viền. Nguy hiểm kéo dài (leo thang) có thể nhấp nháy NỀN chậm (opacity 1 -> 0.85, chu kỳ 1,2 s) nhưng phải tắt khi `prefers-reduced-motion`.
- Nút "Tắt tiếng 15 giây": chữ nhật, cao ≥ 64 px, bo 8 px, nền `--surface` + viền 1 px (trong DANGER/WARNING dùng viền và chữ tương phản với nền). Nút "Hiệu chuẩn lại": chữ nhật cao 48 px, kiểu viền. Liên kết "Giám sát" là liên kết văn bản gạch chân, cao ≥ 48 px vùng bấm.
- Màn hình bắt đầu: tên "DriverGuard" (20 px, 600), một nút "Bắt đầu" (cao 64 px, nền `--accent`, chữ trắng, bo 8 px), một dòng nhỏ 14 px dưới nút: "Âm thanh cảnh báo sẽ được bật." Không biểu tượng khiên, không đoạn mô tả.
- Hiệu chuẩn: lớp phủ ở giữa, vòng tiến độ SVG mảnh (nét 4 px, màu `--accent`, không glow) + chữ "Nhìn thẳng phía trước" 28 px. Mất mặt: "Không thấy khuôn mặt".
- Chữ cho nguyên nhân (giữ nguyên bản đang có): Nhắm mắt kéo dài / Đang dùng điện thoại / Quay đầu lệch hướng / Cúi đầu / Ngáp / Không thấy khuôn mặt.

## 5. Màn hình Giám sát ("/monitor") – kiểu bảng điều khiển vận hành
- Nền `--bg`; các khối là mặt phẳng `--surface`, bo 8 px, KHÔNG viền và KHÔNG đổ bóng (phân lớp bằng bậc nền, theo luật skill taste). Tiêu đề khối 16 px, 600; chữ đọc tối thiểu 16 px. Chỉ bảng sự kiện giữ đường kẻ ngang.
- Khối "Bây giờ" cạnh video: điểm rủi ro lớn + chữ mức + nguyên nhân, nền đổi theo mức (vàng/đỏ như màn hình tài xế).
- Biểu đồ: vùng vẽ co giãn (preserveAspectRatio none, nét non-scaling), nhãn trục là HTML nên luôn đúng cỡ 13 px.
- Sức khỏe hệ thống dùng chữ trạng thái riêng (Đã kết nối, Hoạt động, Đang chạy, Có hình), không dùng nhãn mức rủi ro.
- Đầu trang: "DriverGuard · Giám sát" bên trái; bên phải trạng thái kết nối bằng CHỮ ("Đã kết nối" / "Mất kết nối") có hình vuông 8 px màu trạng thái, không viên thuốc.
- Trạng thái mức: nhãn vuông bo 4 px, nền `--ok-bg/--warn-bg/--danger-bg`, chữ `--ok/--warn/--danger` và có biểu tượng nhỏ (không chỉ dựa vào màu).
- Bảng sự kiện: bảng thật (đường kẻ ngang mảnh, hàng cao ≥ 44 px, số căn phải, `tabular-nums`), hàng hover nền `--bg`; cột "Chi tiết" mở ngăn bên (giữ như hiện có).
- Biểu đồ: một màu nhấn cho đường chính, các dải mức dùng `--ok-bg/--warn-bg/--danger-bg` rất nhạt, trục chữ 12 px `--text-muted`. Không viền cong, không đổ màu dưới đường.
- Nút: chữ nhật, viền 1 px, bo 6 px; nút chính nền `--accent`, chữ trắng; cao ≥ 44 px.
- Bố cục: tối đa 1200 px, lưới 12 cột, khoảng cách bội số của 4 (8/12/16/24).

## 6. Yêu cầu chung
- Giữ nguyên toàn bộ logic, API, kiểu dữ liệu, âm thanh, test; chỉ đổi giao diện (class, CSS, cấu trúc JSX, chữ hiển thị).
- Tương phản chữ ≥ 4.5:1, thành phần ≥ 3:1 ở CẢ sáng và tối. Có focus ring rõ (2 px `--accent`, offset 2 px).
- `prefers-reduced-motion`: tắt mọi animation.
- Không thêm dependency.
