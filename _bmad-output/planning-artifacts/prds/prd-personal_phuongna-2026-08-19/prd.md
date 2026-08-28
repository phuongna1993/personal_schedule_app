---
title: App Quản Lý Cá Nhân Đa Năng
status: final
created: 2026-08-19
updated: 2026-08-19
---

# PRD: App Quản Lý Cá Nhân Đa Năng

## 0. Mục đích tài liệu

PRD này dành cho chính người dùng/chủ sở hữu sản phẩm với vai trò vừa là PM vừa là người xây dựng (dự án cá nhân, một người dùng duy nhất). Tài liệu dựa trực tiếp trên [brief đã hoàn thiện](../../briefs/brief-personal_phuongna-2026-08-19/brief.md) — không lặp lại phần Vấn đề/Đối tượng đã có ở đó, mà cụ thể hoá thành tính năng (Features) với Yêu cầu chức năng (FR) có ID ổn định để dùng cho các bước sau (UX, kiến trúc, epics/stories). Thuật ngữ dùng xuyên suốt tài liệu được định nghĩa một lần ở Glossary (§3) — không dùng từ đồng nghĩa khác ở nơi khác.

## 1. Vision

Một web app cá nhân, chạy trên máy tính, gộp 4 nhóm việc hàng ngày hiện đang bị quản lý rời rạc (giấy, trí nhớ, Excel) hoặc không quản lý được: lên lịch trình ngày, quản lý chi tiêu, quản lý thực đơn cho cả gia đình (người lớn, bé 4 tuổi, bé dưới 1 tuổi), và theo dõi tiến độ hai lộ trình tự học dài hạn (tiếng Anh A1→B1, automation test 7 mốc).

Giá trị cốt lõi không phải là tính năng phức tạp, mà là **một nơi duy nhất, đủ nhanh để dùng mỗi ngày** — để việc ghi nhận trở thành thói quen thay vì một việc bị bỏ dở như các cách làm rời rạc trước đây. Vì chỉ một người dùng, app ưu tiên tốc độ nhập liệu và tính đơn giản hơn là tính năng đầy đủ.

## 2. Đối tượng sử dụng

### 2.1 Jobs To Be Done

- **Chức năng**: Có một nơi duy nhất để lên kế hoạch cho một ngày và ghi nhận việc thực tế đã làm — thay vì rải rác trên giấy, trí nhớ, và Excel.
- **Chức năng**: Nhìn lại được tiến độ tích luỹ theo thời gian ở từng mảng (chi tiêu theo tháng, tiến độ theo lộ trình học) — thứ mà cách làm rời rạc hiện tại không cho phép.
- **Cảm xúc**: Giảm cảm giác quá tải/rối khi phải tự nhớ và cân bằng cùng lúc công việc, con cái, học tập, và chi tiêu ngoài giờ làm.
- **Bối cảnh**: Dùng ngoài giờ làm việc, xen giữa việc chăm hai con nhỏ (4 tuổi và dưới 1 tuổi) và buổi tối tự học.

Đây cũng là dự án của chính người dùng cho chính mình ("dogfooding") — không có nhu cầu người dùng thứ hai.

### 2.2 Key User Journeys

- **UJ-1. Một buổi tối điển hình.** Sau bữa tối, người dùng mở app trên máy tính: lên Lịch trình ngày mai từ Mẫu lịch trình có sẵn (chỉnh vài Task riêng cho ngày mai), ghi nhanh khoản chi mua đồ chiều nay, chọn Thực đơn ngày mai từ Ngân hàng món ăn (một bữa chung cho người lớn + bé 4 tuổi, một bữa riêng cho bé dưới 1 tuổi), rồi ghi log 30 phút vừa học Automation Test trước khi đóng máy. Bốn thao tác, một phiên, dưới vài phút.

## 3. Glossary

- **Task** — một việc cụ thể trong Lịch trình ngày, có trạng thái Chưa xong / Đã xong, một Thời hạn (khung giờ trong chính ngày đó), và một Mức ưu tiên. Task luôn nằm gọn trong một ngày — không có Task kéo dài qua nhiều ngày.
- **Mẫu lịch trình (Routine Template)** — bản mẫu các Task mặc định, dùng làm điểm khởi đầu cho Lịch trình ngày mỗi ngày mới.
- **Lịch trình ngày (Daily Schedule)** — danh sách Task của một ngày cụ thể, khởi tạo từ Mẫu lịch trình và có thể chỉnh sửa riêng mà không ảnh hưởng Mẫu gốc.
- **Giao dịch (Transaction)** — một khoản Chi hoặc Thu, gắn với một Danh mục chi tiêu (nếu là khoản chi), có số tiền và ngày.
- **Danh mục chi tiêu (Expense Category)** — nhóm phân loại các Giao dịch chi; mỗi Danh mục có một Ngân sách theo tháng.
- **Ngân sách (Budget)** — hạn mức chi tiêu đặt cho một Danh mục chi tiêu trong một tháng.
- **Nguyên liệu (Ingredient)** — một thành phần cụ thể dùng trong một Món ăn, có tên và một Ảnh tuỳ chọn.
- **Món ăn (Dish)** — một món cụ thể trong Ngân hàng món ăn, gồm tên, danh sách Nguyên liệu, và một Ảnh món ăn tuỳ chọn.
- **Ngân hàng món ăn (Dish Bank)** — tập hợp các Món ăn do người dùng tự nhập, dùng để chọn khi lên Thực đơn ngày.
- **Bài test đánh giá (Assessment Test)** — bài kiểm tra tự soạn/tự chọn gắn với một Mốc trong Lộ trình Tiếng Anh, có một Điểm số do người dùng tự nhập và lưu lại; làm bài test là điều kiện trước khi đánh dấu Hoàn thành Mốc đó.
- **Nhóm khẩu phần (Portion Group)** — một trong hai nhóm ăn của Thực đơn ngày: "Người lớn & bé 4 tuổi" (dùng chung, có thể ghi chú điều chỉnh riêng) hoặc "Bé dưới 1 tuổi" (tách biệt hoàn toàn).
- **Thực đơn ngày (Daily Menu)** — lựa chọn Món ăn cho 3 bữa (sáng/trưa/tối) của một ngày, lập riêng theo từng Nhóm khẩu phần.
- **Kỹ năng (Skill)** — một trong hai lĩnh vực tự học được theo dõi: Tiếng Anh hoặc Automation Test.
- **Lộ trình (Roadmap)** — chuỗi Mốc tuần tự cho một Kỹ năng (Tiếng Anh: 3 Mốc A1, A2, B1; Automation Test: 7 Mốc cố định, xem FR-13).
- **Mốc (Milestone)** — một giai đoạn/mục tiêu trong một Lộ trình; người dùng tự đánh dấu Hoàn thành để chuyển sang Mốc kế tiếp.
- **Buổi học (Study Session)** — một lần ghi log học cho một Kỹ năng, gồm nội dung học và thời lượng.

## 4. Features

### 4.1 Lịch trình ngày

**Description:** Cho phép lên kế hoạch cho một ngày dựa trên một Mẫu lịch trình lặp lại, rồi check-off từng Task khi hoàn thành. Không có nhắc nhở chủ động — giá trị nằm ở việc nhìn thấy kế hoạch, không phải bị nhắc. Realizes UJ-1.

**Functional Requirements:**

#### FR-1: Tạo và chỉnh sửa Mẫu lịch trình

Người dùng có thể tạo và chỉnh sửa một Mẫu lịch trình gồm danh sách Task mặc định (tên việc, Thời hạn trong ngày, Mức ưu tiên).

**Consequences (testable):**
- Sửa Mẫu lịch trình không làm thay đổi các Lịch trình ngày đã tạo trước đó.
- Có thể thêm, sửa, xoá Task trong Mẫu bất kỳ lúc nào.
- Thời hạn của Task chỉ là một khung giờ trong ngày (ví dụ 20:00) — hệ thống không cho phép Task kéo dài qua ngày hôm sau.

#### FR-2: Khởi tạo Lịch trình ngày từ Mẫu

Mỗi ngày, hệ thống khởi tạo một Lịch trình ngày mới từ Mẫu lịch trình hiện hành; người dùng có thể thêm/sửa/xoá Task riêng cho ngày đó.

**Consequences (testable):**
- Chỉnh sửa Task trong một Lịch trình ngày cụ thể không ảnh hưởng đến Mẫu lịch trình.
- Lịch trình ngày của các ngày trước đó vẫn xem lại được (không bị ghi đè).

#### FR-3: Check-off Task

Người dùng có thể đánh dấu một Task là Đã xong / Chưa xong trong Lịch trình ngày.

**Consequences (testable):**
- Trạng thái Đã xong/Chưa xong được lưu lại theo từng ngày, xem lại được ở các ngày trước.
- Người dùng có thể xem số Task Đã xong trên tổng số Task đã lên kế hoạch của một ngày, để tự đối chiếu thực tế đã làm so với kế hoạch ban đầu.

### 4.2 Quản lý chi tiêu

**Description:** Ghi chép nhanh thu/chi, theo dõi theo Danh mục có Ngân sách riêng, và cảnh báo khi vượt hạn mức. Realizes UJ-1.

**Functional Requirements:**

#### FR-4: Ghi Giao dịch

Người dùng có thể ghi nhanh một Giao dịch (Chi hoặc Thu), gồm số tiền, ngày, và Danh mục chi tiêu (nếu là khoản chi); ghi chú là tuỳ chọn.

**Consequences (testable):**
- Một Giao dịch ghi xong xuất hiện ngay trong tổng của tháng và Danh mục tương ứng.

#### FR-5: Quản lý Danh mục chi tiêu và Ngân sách

Người dùng có thể tạo/sửa/xoá Danh mục chi tiêu và đặt Ngân sách theo tháng cho từng Danh mục.

**Consequences (testable):**
- Ngân sách áp dụng theo tháng; đổi Ngân sách của tháng hiện tại không đổi Ngân sách các tháng trước.

#### FR-6: Cảnh báo vượt Ngân sách

Hệ thống cảnh báo người dùng khi số dư còn lại trong tháng hiện tại của Ngân sách một Danh mục xuống dưới 30% hạn mức (tức đã chi ≥70%), và cảnh báo lại khi đã chi vượt 100% hạn mức.

**Consequences (testable):**
- Ngưỡng 30% là cố định, không tuỳ chỉnh theo từng Danh mục.
- Cảnh báo hiển thị ngay khi ghi Giao dịch khiến Danh mục chạm ngưỡng — không cần người dùng chủ động vào xem báo cáo mới biết.

#### FR-7: Xem tổng thu/chi

Người dùng có thể xem tổng Thu, tổng Chi, và chi tiết theo từng Danh mục, theo từng tháng.

**Consequences (testable):**
- Có thể chọn xem một tháng bất kỳ trong quá khứ, không chỉ tháng hiện tại.

**Notes:** Đơn vị tiền tệ là VNĐ.

### 4.3 Quản lý thực đơn

**Description:** Ngân hàng món ăn tự xây dựng dùng để lên Thực đơn ngày, tách riêng theo Nhóm khẩu phần. Realizes UJ-1.

**Functional Requirements:**

#### FR-8: Quản lý Ngân hàng món ăn

Người dùng có thể thêm/sửa/xoá Món ăn trong Ngân hàng món ăn. Mỗi Món ăn gồm tên, danh sách Nguyên liệu, và một Ảnh món ăn tuỳ chọn; mỗi Nguyên liệu có tên và một Ảnh tuỳ chọn riêng.

**Consequences (testable):**
- Món ăn mới thêm vào Ngân hàng ngay lập tức chọn được khi lên Thực đơn ngày.
- Có thể tìm/lọc Món ăn theo Nguyên liệu (ví dụ lọc ra các món có "thịt bò").
- Ảnh (món ăn hoặc nguyên liệu) là tuỳ chọn — không bắt buộc phải có mới lưu được Món ăn/Nguyên liệu.

#### FR-9: Lên Thực đơn ngày theo Nhóm khẩu phần

Người dùng có thể chọn Món ăn từ Ngân hàng món ăn cho từng bữa (sáng/trưa/tối) của một ngày, lập riêng cho Nhóm khẩu phần "Người lớn & bé 4 tuổi" và Nhóm khẩu phần "Bé dưới 1 tuổi".

**Consequences (testable):**
- Thực đơn ngày của hai Nhóm khẩu phần là độc lập — chọn món cho nhóm này không ảnh hưởng nhóm kia.
- Thực đơn ngày không liên kết với module Chi tiêu (không tự tạo Giao dịch).

#### FR-10: Ghi chú điều chỉnh riêng cho bé 4 tuổi

Trên một Món ăn đã chọn cho Nhóm khẩu phần "Người lớn & bé 4 tuổi", người dùng có thể thêm ghi chú điều chỉnh riêng cho bé 4 tuổi (ví dụ: bớt cay, cắt nhỏ).

**Consequences (testable):**
- Ghi chú là tuỳ chọn, không bắt buộc phải nhập với mỗi Món ăn.

**Notes:** `[ASSUMPTION]` Món ăn không quản lý công thức các bước nấu hay lượng calorie ở v1 — chỉ tên, danh sách Nguyên liệu, và ảnh.

### 4.4 Tracker học tập (Tiếng Anh & Automation Test)

**Description:** Một cơ chế log buổi học và theo dõi Lộ trình dùng chung cho cả hai Kỹ năng — Tiếng Anh (A1→B1) và Automation Test (7 Mốc). Mỗi Kỹ năng có Lộ trình riêng nhưng cùng một cách tương tác. Realizes UJ-1.

**Functional Requirements:**

#### FR-11: Ghi Buổi học

Người dùng có thể ghi một Buổi học cho một Kỹ năng, gồm nội dung học và thời lượng, gắn với ngày ghi log.

**Consequences (testable):**
- Buổi học ghi xong cộng dồn ngay vào tổng thời lượng học của Kỹ năng đó.

#### FR-12: Xem lịch sử và tổng thời lượng học

Người dùng có thể xem danh sách Buổi học đã ghi và tổng thời lượng học theo tuần/tháng, lọc theo từng Kỹ năng.

**Consequences (testable):**
- Có thể xem chuỗi ngày học liên tục (streak) và/hoặc biểu đồ theo thời gian cho từng Kỹ năng — có ít nhất một trong hai hình thức là đạt yêu cầu.
- Với Kỹ năng Tiếng Anh, có thể xem lại Điểm số của các Bài test đánh giá đã làm theo thời gian, để thấy được xu hướng tiến bộ.

#### FR-13: Theo dõi và đánh dấu hoàn thành Mốc trên Lộ trình

Người dùng có thể xem đang ở Mốc nào trên Lộ trình của một Kỹ năng, và tự đánh dấu Hoàn thành một Mốc để chuyển sang Mốc kế tiếp.

**Consequences (testable):**
- Lộ trình Automation Test có đúng 7 Mốc theo thứ tự cố định: (1) Nền tảng Python + SQL, (2) Pytest + UI automation (Playwright), (3) UI automation + Page Object Model, (4) API automation (Pytest + requests), (5) CI/CD (GitHub Actions) + AI in testing, (6) Portfolio end-to-end + Mobile testing (Appium), (7) Security testing + Chứng chỉ + phỏng vấn TA. Đánh dấu Hoàn thành một Mốc ở Lộ trình này là quyết định thủ công, không cần Bài test đánh giá.
- Lộ trình Tiếng Anh có đúng 3 Mốc theo thứ tự cố định: A1, A2, B1. Trước khi đánh dấu Hoàn thành một Mốc, người dùng phải làm một Bài test đánh giá gắn với Mốc đó (nội dung bài test tự soạn/tự chọn bởi người dùng, không do hệ thống sinh ra); người dùng tự nhập điểm số của Bài test vào hệ thống để lưu lại và xem lại theo thời gian — hệ thống không tự chấm điểm.
- Ở cả hai Lộ trình, hệ thống không tự động tính hoàn thành dựa trên số giờ học tích luỹ.
- Mốc đã đánh dấu Hoàn thành vẫn xem lại được (không bị ẩn).

**Notes:** Quy tắc hoàn thành Mốc không đối xứng giữa hai Kỹ năng có chủ đích: trình độ ngôn ngữ (Tiếng Anh) khó tự đánh giá khách quan hơn — dễ tự nhận "đủ trình" khi chưa thực sự đạt — nên cần một Bài test làm bằng chứng trước khi qua Mốc; Automation Test không cần vì mỗi Mốc gắn với sản phẩm/kỹ năng cụ thể (ví dụ một bộ test tự động chạy được) mà bản thân người dùng tự thấy rõ đã làm được hay chưa.

## 5. Non-Goals (Explicit)

- Không phục vụ nhiều người dùng; không có tính năng chia sẻ, mời người khác, hay tài khoản.
- Không có bản responsive cho mobile hay app di động trong v1 — chỉ desktop web.
- Không tích hợp tìm kiếm/nhập công thức nấu ăn từ nguồn ngoài.
- Không có hệ thống nhắc nhở/notification chủ động ở bất kỳ module nào.
- Không liên kết dữ liệu Thực đơn với module Chi tiêu.
- Không có mục tiêu thương mại hoá, phát hành, hay quảng bá sản phẩm.

## 6. MVP Scope

### 6.1 In Scope

- Cả 4 Feature (§4.1–4.4) hoạt động đầy đủ cho v1, build đồng thời — không chia giai đoạn. Rủi ro đã biết: build 4 module cùng lúc là khối lượng lớn cho một người tự xây; được chấp nhận vì mỗi module đều nhỏ và không phụ thuộc lẫn nhau (không module nào chặn module khác), nên có thể dừng/hoãn một module mà không ảnh hưởng 3 module còn lại nếu cần.
- Chạy như một web app desktop, không cần đăng nhập/tài khoản (chỉ một người dùng).
- Dữ liệu của cả 4 module lưu trữ bền vững (không mất khi đóng/mở lại app).
- Các thao tác ghi nhanh hàng ngày (thêm Giao dịch, check-off Task, ghi Buổi học) phản hồi tức thời, không quá vài giây thao tác — vì giá trị cốt lõi của app phụ thuộc vào việc ghi chép không tạo ma sát mỗi ngày.

### 6.2 Out of Scope for MVP

- Đăng nhập/tài khoản, phân quyền — không cần vì chỉ một người dùng.
- Responsive mobile, đồng bộ đa thiết bị.
- Reminder/notification chủ động cho Lịch trình ngày.
- Liên kết Thực đơn ↔ Chi tiêu.
- Tự động hoàn thành Mốc dựa trên số giờ học tích luỹ — chỉ đánh dấu thủ công.
- Export/backup dữ liệu ra định dạng ngoài (CSV/Excel...) — hiện chưa cần. `[NON-GOAL for MVP]` Rủi ro chấp nhận: dữ liệu chỉ tồn tại trên một máy, không có bản sao lưu ngoài — nếu máy hỏng/mất dữ liệu thì lịch sử nhiều tháng (chi tiêu, tiến độ học) mất theo. Xem xét lại nếu rủi ro này trở thành vấn đề thực tế.

## 7. Success Metrics

Vì đây là sản phẩm cá nhân, thành công đo bằng thói quen sử dụng đều đặn, không phải chỉ số kinh doanh.

**Primary**
- **SM-1**: Lên Lịch trình ngày và check-off ít nhất một lần mỗi ngày, đều đặn trong ≥4 tuần liên tiếp sau khi bắt đầu dùng v1. Validates FR-2, FR-3.
- **SM-2**: Số Danh mục chi tiêu vượt Ngân sách trong tháng giảm dần qua các tháng sử dụng, so với việc không kiểm soát được trước đây. Validates FR-5, FR-6.

**Secondary**
- **SM-3**: Hoàn thành ít nhất một Mốc mới mỗi 1-2 tháng ở mỗi Lộ trình (Tiếng Anh, Automation Test). Validates FR-13.

**Counter-metrics (do not optimize)**
- **SM-C1**: Không tối ưu theo *số lượng* Task/Giao dịch/Buổi học được ghi — ghi nhiều nhưng hời hợt hoặc không trung thực (tick Task giả, ghi qua loa cho có) không phải là thành công. Ghi nhận đúng và đều đặn quan trọng hơn số lượng. Counterbalances SM-1.

## 8. Open Questions

Không còn câu hỏi mở nào cần giải quyết trước khi sang bước tiếp theo.

## 9. Assumptions Index

- §4.3 FR-8 `[ASSUMPTION]` — Món ăn không quản lý công thức các bước nấu hay lượng calorie ở v1.
