# User Stories

Suy ra từ `01_ACTORS_AND_USER_REQUIREMENTS.md` (UR), `06_REQUIREMENTS.md` (FR/NFR) và `docs/mvp-contract.md`.
Mức ưu tiên theo MoSCoW: **M** = Must (MVP), **S** = Should, **C** = Could.

Định dạng: *Là một `<actor>`, tôi muốn `<việc>` để `<giá trị>`.*

## Epic 1 — Giám sát tài xế realtime

| ID | User story | Tiêu chí chấp nhận | Truy vết | Ưu tiên |
|---|---|---|---|---|
| US-01 | Là **tài xế**, tôi muốn hệ thống đọc camera trong cabin và xử lý liên tục để tôi được giám sát mà không phải thao tác gì. | Đọc được webcam local; ≥ 20 FPS trên máy phát triển; UI không treo khi inference. | UR-01, UR-15, FR-01, NFR-01 | M |
| US-02 | Là **AI/ML engineer**, tôi muốn chạy pipeline trên file video để kiểm thử offline, không cần ngồi trước camera. | Chạy được trên video file và cho ra telemetry/event giống chế độ camera. | FR-02 | S |
| US-03 | Là **tài xế**, tôi muốn hiệu chuẩn tư thế ngồi bình thường lúc bắt đầu để hệ thống không báo nhầm do tôi ngồi lệch. | Có lệnh calibrate; telemetry có `calibrated`; góc đầu tính tương đối so với baseline. | FR-06, `POST /sessions/calibrate` | M |

## Epic 2 — Phát hiện hành vi nguy hiểm

| ID | User story | Tiêu chí chấp nhận | Truy vết | Ưu tiên |
|---|---|---|---|---|
| US-04 | Là **tài xế**, tôi muốn được cảnh báo khi nhắm mắt kéo dài để không ngủ gật khi đang lái. | Phát hiện bằng EAR theo chuỗi thời gian; sinh `DROWSINESS_ACUTE`; 1 frame nhắm mắt **không** gây cảnh báo. | UR-02, UR-06, FR-04 | M |
| US-05 | Là **tài xế**, tôi muốn hệ thống nhận ra ngáp nhiều và mệt mỏi tích lũy để được nhắc nghỉ trước khi quá muộn. | Phát hiện ngáp bằng MAR + logic thời gian; sinh `CHRONIC_FATIGUE` khi mệt kéo dài. | UR-02, FR-05 | M |
| US-06 | Là **tài xế**, tôi muốn được cảnh báo khi quay đầu khỏi hướng lái quá lâu. | Sinh `LOOKING_AWAY` khi vượt ngưỡng thời gian cấu hình; không báo khi liếc gương ngắn. | UR-03, FR-06 | M |
| US-07 | Là **tài xế**, tôi muốn được cảnh báo khi cúi đầu lâu (ví dụ nhìn xuống đùi hoặc gật gù). | Sinh `LOOKING_DOWN` khi pitch tương đối vượt ngưỡng đủ lâu. | UR-03, FR-06 | M |
| US-08 | Là **tài xế**, tôi muốn được cảnh báo khi dùng điện thoại lúc lái. | Object detector thấy điện thoại gần mặt/tay đủ lâu mới sinh `PHONE_USAGE`. | UR-04, FR-07 | M |
| US-09 | Là **tài xế**, tôi muốn hệ thống báo khi không thấy mặt tôi trong camera. | Sinh `DRIVER_ABSENCE` khi mất mặt quá ngưỡng; không báo khi chỉ mất 1–2 frame. | UR-05, FR-03 | M |
| US-10 | Là **tài xế**, tôi muốn hệ thống chỉ cảnh báo khi hành vi đã kéo dài để không bị làm phiền bởi báo giả. | Mọi event đi qua lớp temporal (FSM smoothing); không có cảnh báo nguy hiểm từ một frame đơn lẻ. | UR-06, FR-08 | M |

## Epic 3 — Mức rủi ro và cảnh báo

| ID | User story | Tiêu chí chấp nhận | Truy vết | Ưu tiên |
|---|---|---|---|---|
| US-11 | Là **tài xế**, tôi muốn thấy mức rủi ro hiện tại (NORMAL / WARNING / DANGER) và điểm 0–100 để biết mình đang an toàn tới đâu. | Risk score 0–100; phân loại 3 mức; hành vi cấp tính (acute) vượt thẳng lên DANGER, mệt mạn tính (chronic) suy giảm dần. | UR-07, FR-09, FR-10 | M |
| US-12 | Là **tài xế**, tôi muốn nghe cảnh báo âm thanh và thấy cảnh báo trên màn hình khi ở WARNING/DANGER để kịp phản ứng. | Có cảnh báo âm thanh + trực quan; giao diện tài xế dễ đọc trong 1 cái liếc, chữ lớn, nút bấm lớn. | UR-08, FR-11 | M |
| US-13 | Là **tài xế**, tôi muốn tắt tiếng cảnh báo tạm thời (ví dụ 15 giây) khi tôi đã biết và đang xử lý. | Lệnh mute theo `duration_seconds`; telemetry có `muted`; hết thời gian tự bật lại. | `POST /alerts/mute` | S |
| US-14 | Là **tài xế**, tôi muốn biết **vì sao** hệ thống cảnh báo để tin và sửa hành vi. | Mỗi cảnh báo/event có `reason` rõ nguyên nhân (vd. "Nhắm mắt 1,8 s; điểm 78"). | UR-13, NFR-07 | M |

## Epic 4 — Lịch sử sự kiện và dashboard

| ID | User story | Tiêu chí chấp nhận | Truy vết | Ưu tiên |
|---|---|---|---|---|
| US-15 | Là **người giám sát an toàn**, tôi muốn xem camera trực tiếp có overlay để theo dõi tài xế ngay lúc đó. | Luồng MJPEG có overlay; ngắt luồng khi tab ẩn để tiết kiệm băng thông. | UR-10, FR-13 | M |
| US-16 | Là **người giám sát an toàn**, tôi muốn xem danh sách sự kiện (loại, thời gian, mức rủi ro, độ tin cậy, thời lượng, lý do) để biết chuyện gì đã xảy ra. | `GET /events` trả mới nhất trước; bảng sự kiện có chi tiết từng dòng. | UR-09, FR-12 | M |
| US-17 | Là **người giám sát an toàn**, tôi muốn thấy timeline rủi ro theo thời gian để nhận ra khoảng nguy hiểm tập trung ở đâu. | Timeline ~5 phút gần nhất, lấy từ telemetry WebSocket. | UR-10 | S |
| US-18 | Là **người giám sát an toàn**, tôi muốn thấy FPS, độ trễ và trạng thái hệ thống để biết số liệu đáng tin hay không. | Hiển thị FPS (camera/face/phone), latency, trạng thái worker/camera. | UR-10, NFR-09 | M |
| US-19 | Là **quản lý đội xe**, tôi muốn có tổng hợp sau mỗi hành trình (số sự kiện theo loại, thời gian rủi ro cao) để đánh giá và huấn luyện tài xế. | Mỗi phiên có start/end time, số event, summary. | FR-15, mục tiêu 10 của overview | S |

## Epic 5 — Cấu hình và vận hành

| ID | User story | Tiêu chí chấp nhận | Truy vết | Ưu tiên |
|---|---|---|---|---|
| US-20 | Là **quản trị viên hệ thống**, tôi muốn chỉnh ngưỡng (thời gian nhắm mắt, nhìn đi chỗ khác, ngáp, điện thoại, trọng số rủi ro) mà không sửa code. | Ngưỡng nằm trong file cấu hình tập trung; `GET /config` trả giá trị hiện tại; không hard-code rải rác. | UR-12, FR-14, NFR-08 | M |
| US-21 | Là **quản trị viên hệ thống**, tôi muốn bật/tắt từng module (ví dụ phone, pose fallback) khi máy yếu hoặc cần thử nghiệm. | Cờ cấu hình cho từng module; module thay thế độc lập. | NFR-05 | S |
| US-22 | Là **quản trị viên hệ thống**, tôi muốn biết khi AI worker hoặc camera chết để xử lý. | `GET /health` trả `ai_worker_alive`, `camera_connected`; lỗi detector không làm sập backend. | NFR-02, NFR-09 | M |

## Epic 6 — Riêng tư, offline và đánh giá

| ID | User story | Tiêu chí chấp nhận | Truy vết | Ưu tiên |
|---|---|---|---|---|
| US-23 | Là **tài xế**, tôi muốn hệ thống chạy hoàn toàn trên thiết bị, không gửi hình ảnh lên cloud, để dữ liệu của tôi được riêng tư. | Cảnh báo cốt lõi chạy offline, không phụ thuộc Internet/LLM; chỉ lưu metadata/event, không bắt buộc lưu video; không nhận dạng danh tính. | UR-11, UR-14, NFR-03, NFR-04 | M |
| US-24 | Là **AI/ML engineer**, tôi muốn đo Precision, Recall, F1, FPS và latency trên dữ liệu có nhãn để biết chất lượng thực của từng detector. | Có script đánh giá và báo cáo; temporal/risk logic test được không cần camera thật. | NFR-06, `08_TESTING_AND_EVALUATION.md` | M |
| US-25 | Là **người dùng bất kỳ**, tôi muốn biết rõ đây là prototype hỗ trợ lái xe, không phải hệ thống an toàn được chứng nhận, để không phụ thuộc quá mức vào nó. | Có ghi chú giới hạn an toàn trong tài liệu và giao diện. | NFR-10 | M |

## Ngoài phạm vi MVP (không viết story)

Can thiệp phanh/ga/vô lăng, nhận dạng danh tính tài xế, chẩn đoán y tế, ADAS tự hành, quản lý đội xe quy mô cloud, huấn luyện foundation model riêng.

## Ghi chú

- Chưa gắn trạng thái hoàn thành cho từng story; cần đối chiếu với `MEMORY.md` và `docs/MVP_REPORT.md` nếu cần.
- "Tay rời vô lăng" đã thử ở EXP-011 nhưng chưa đưa vào pipeline nên không có story trong MVP.
