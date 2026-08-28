# Glossary — App Quản Lý Cá Nhân Đa Năng

Thuật ngữ dùng xuyên suốt SPEC.md và mọi companion/downstream. Dùng nguyên văn, không đổi từ đồng nghĩa.

- **Task** — một việc cụ thể trong Lịch trình ngày, có trạng thái Chưa xong / Đã xong, một Thời hạn (khung giờ trong chính ngày đó), và một Mức ưu tiên. Task luôn nằm gọn trong một ngày — không có Task kéo dài qua nhiều ngày.
- **Mẫu lịch trình (Routine Template)** — bản mẫu các Task mặc định, dùng làm điểm khởi đầu cho Lịch trình ngày mỗi ngày mới.
- **Lịch trình ngày (Daily Schedule)** — danh sách Task của một ngày cụ thể, khởi tạo từ Mẫu lịch trình và có thể chỉnh sửa riêng mà không ảnh hưởng Mẫu gốc.
- **Giao dịch (Transaction)** — một khoản Chi hoặc Thu, gắn với một Danh mục chi tiêu (nếu là khoản chi), có số tiền, ngày, và một ghi chú tuỳ chọn.
- **Danh mục chi tiêu (Expense Category)** — nhóm phân loại các Giao dịch chi; mỗi Danh mục có một Ngân sách theo tháng.
- **Ngân sách (Budget)** — hạn mức chi tiêu đặt cho một Danh mục chi tiêu trong một tháng.
- **Nguyên liệu (Ingredient)** — một thành phần cụ thể dùng trong một Món ăn, có tên và một Ảnh tuỳ chọn.
- **Món ăn (Dish)** — một món cụ thể trong Ngân hàng món ăn, gồm tên, danh sách Nguyên liệu, và một Ảnh món ăn tuỳ chọn.
- **Ngân hàng món ăn (Dish Bank)** — tập hợp các Món ăn do người dùng tự nhập, dùng để chọn khi lên Thực đơn ngày.
- **Nhóm khẩu phần (Portion Group)** — một trong hai nhóm ăn của Thực đơn ngày: "Người lớn & bé 4 tuổi" (dùng chung, có thể ghi chú điều chỉnh riêng) hoặc "Bé dưới 1 tuổi" (tách biệt hoàn toàn).
- **Thực đơn ngày (Daily Menu)** — lựa chọn Món ăn cho 3 bữa (sáng/trưa/tối) của một ngày, lập riêng theo từng Nhóm khẩu phần.
- **Kỹ năng (Skill)** — một trong hai lĩnh vực tự học được theo dõi: Tiếng Anh hoặc Automation Test.
- **Lộ trình (Roadmap)** — chuỗi Mốc tuần tự cho một Kỹ năng (Tiếng Anh: 3 Mốc A1, A2, B1; Automation Test: 7 Mốc cố định).
- **Mốc (Milestone)** — một giai đoạn/mục tiêu trong một Lộ trình; người dùng tự đánh dấu Hoàn thành để chuyển sang Mốc kế tiếp.
- **Buổi học (Study Session)** — một lần ghi log học cho một Kỹ năng, gồm nội dung học và thời lượng.
- **Bài test đánh giá (Assessment Test)** — bài kiểm tra tự soạn/tự chọn gắn với một Mốc trong Lộ trình Tiếng Anh, có một Điểm số do người dùng tự nhập và lưu lại; làm bài test là điều kiện trước khi đánh dấu Hoàn thành Mốc đó.

7 Mốc cố định của Lộ trình Automation Test, theo thứ tự: (1) Nền tảng Python + SQL, (2) Pytest + UI automation (Playwright), (3) UI automation + Page Object Model, (4) API automation (Pytest + requests), (5) CI/CD (GitHub Actions) + AI in testing, (6) Portfolio end-to-end + Mobile testing (Appium), (7) Security testing + Chứng chỉ + phỏng vấn TA.
