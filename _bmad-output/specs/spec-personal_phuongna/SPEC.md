---
id: SPEC-personal_phuongna
companions:
  - glossary.md
  - ../../planning-artifacts/architecture/architecture-personal_phuongna-2026-08-20/ARCHITECTURE-SPINE.md
  - ../../planning-artifacts/ux-designs/ux-personal_phuongna-2026-08-19/DESIGN.md
  - ../../planning-artifacts/ux-designs/ux-personal_phuongna-2026-08-19/EXPERIENCE.md
sources:
  - ../../planning-artifacts/prds/prd-personal_phuongna-2026-08-19/prd.md
  - ../../planning-artifacts/briefs/brief-personal_phuongna-2026-08-19/brief.md
---

> **Canonical contract.** SPEC này và các file trong `companions:` là hợp đồng đầy đủ, đã kiểm chứng bảo toàn, cho việc build/test/validate. Các file trong `sources:` chỉ để tra cứu bối cảnh, không phải hợp đồng.

# SPEC: App Quản Lý Cá Nhân Đa Năng

## Why

Một vision cá nhân: một phụ nữ đi làm, cân bằng công việc, hai con nhỏ (4 tuổi và dưới 1 tuổi), và hai lộ trình tự học ngoài giờ (Tiếng Anh, Automation Test), hiện đang theo dõi 4 mảng việc hàng ngày — lịch trình, chi tiêu, thực đơn, học tập — bằng các cách rời rạc (giấy, trí nhớ, Excel) hoặc không theo dõi gì, dẫn đến không có kết quả rõ ràng ở bất kỳ mảng nào. Sản phẩm là một web app cá nhân duy nhất, đủ nhanh để dùng mỗi ngày, thay thế sự rời rạc đó — ưu tiên tốc độ nhập liệu và tính đơn giản hơn là tính năng đầy đủ.

## Capabilities

- **CAP-1**
  - **intent:** Tạo/sửa/xoá Task (tên, thời hạn trong ngày, mức ưu tiên) trong Mẫu lịch trình, dùng làm điểm khởi đầu cho mỗi Lịch trình ngày mới.
  - **success:** Sửa Mẫu lịch trình không làm thay đổi các Lịch trình ngày đã tạo trước đó.

- **CAP-2**
  - **intent:** Khởi tạo Lịch trình ngày mới từ Mẫu lịch trình hiện hành mỗi ngày, cho phép chỉnh riêng cho ngày đó mà không ảnh hưởng Mẫu gốc.
  - **success:** Lịch trình ngày của các ngày trước đó vẫn xem lại được nguyên trạng, không bị ghi đè.

- **CAP-3**
  - **intent:** Check-off Task Đã xong/Chưa xong trong Lịch trình ngày, xem tỷ lệ hoàn thành so với kế hoạch.
  - **success:** Trạng thái Đã xong/Chưa xong lưu theo từng ngày và xem lại được; tỷ lệ "Đã xong / Tổng số Task" của một ngày hiển thị đúng.

- **CAP-4**
  - **intent:** Ghi nhanh một Giao dịch (Chi hoặc Thu) gồm số tiền (VNĐ), ngày, Danh mục chi tiêu khi là khoản Chi, và một ghi chú tuỳ chọn.
  - **success:** Giao dịch ghi xong xuất hiện ngay trong tổng của tháng và của Danh mục tương ứng.

- **CAP-5**
  - **intent:** Quản lý Danh mục chi tiêu và đặt Ngân sách theo tháng cho từng Danh mục.
  - **success:** Đổi Ngân sách của tháng hiện tại không làm thay đổi Ngân sách của các tháng đã qua.

- **CAP-6**
  - **intent:** Cảnh báo ngay khi số dư còn lại của Ngân sách một Danh mục, trong tháng hiện tại, xuống dưới 30% hạn mức, và cảnh báo lại khi đã chi vượt 100%.
  - **success:** Cảnh báo hiện diện ngay tại thời điểm ghi Giao dịch khiến Danh mục chạm ngưỡng; ngưỡng 30% cố định, không tuỳ chỉnh theo từng Danh mục.

- **CAP-7**
  - **intent:** Xem tổng Thu, tổng Chi, và chi tiết theo từng Danh mục, theo bất kỳ tháng nào trong quá khứ.
  - **success:** Chọn được một tháng bất kỳ đã qua và xem đúng số liệu của đúng tháng đó, không chỉ tháng hiện tại.

- **CAP-8**
  - **intent:** Quản lý Ngân hàng món ăn — mỗi Món ăn gồm tên, danh sách Nguyên liệu, và một ảnh tuỳ chọn; tìm/lọc Món ăn theo Nguyên liệu.
  - **success:** Món ăn mới thêm chọn được ngay khi lên Thực đơn ngày; lọc theo một Nguyên liệu trả đúng các Món ăn có chứa nguyên liệu đó.

- **CAP-9**
  - **intent:** Lên Thực đơn ngày cho 3 bữa (sáng/trưa/tối), lập riêng theo 2 Nhóm khẩu phần độc lập: "Người lớn & bé 4 tuổi" và "Bé dưới 1 tuổi".
  - **success:** Thực đơn của hai Nhóm khẩu phần hoàn toàn độc lập với nhau; lên Thực đơn không tạo ra Giao dịch nào ở module Chi tiêu.

- **CAP-10**
  - **intent:** Thêm ghi chú điều chỉnh riêng cho bé 4 tuổi trên một Món ăn đã chọn ở Nhóm khẩu phần dùng chung với người lớn.
  - **success:** Ghi chú luôn là tuỳ chọn — không nhập ghi chú không cản trở việc lưu Thực đơn ngày.

- **CAP-11**
  - **intent:** Ghi một Buổi học (nội dung học, thời lượng) cho một Kỹ năng — Tiếng Anh hoặc Automation Test.
  - **success:** Buổi học ghi xong cộng dồn ngay vào tổng thời lượng học của đúng Kỹ năng đó.

- **CAP-12**
  - **intent:** Xem lịch sử Buổi học và tổng thời lượng học theo tuần/tháng, lọc theo Kỹ năng; với Kỹ năng Tiếng Anh, xem thêm lịch sử Điểm số các Bài test đánh giá theo thời gian.
  - **success:** Mỗi Kỹ năng hiển thị đúng ít nhất một trong hai hình thức streak hoặc biểu đồ theo thời gian; lịch sử Điểm số Bài test đánh giá của Tiếng Anh xem lại được theo thời gian.

- **CAP-13**
  - **intent:** Theo dõi vị trí hiện tại và tự đánh dấu Hoàn thành Mốc trên Lộ trình của một Kỹ năng — Automation Test có 7 Mốc cố định theo thứ tự, đánh dấu Hoàn thành thủ công thuần tuý; Tiếng Anh có 3 Mốc cố định (A1, A2, B1), yêu cầu một Bài test đánh giá kèm Điểm số gắn với Mốc đó trước khi đánh dấu Hoàn thành.
  - **success:** Không có Mốc nào ở cả hai Kỹ năng tự động hoàn thành dựa trên số giờ học tích luỹ; một Mốc của Lộ trình Tiếng Anh không thể đánh dấu Hoàn thành nếu chưa có Điểm số Bài test đánh giá gắn với Mốc đó.

## Constraints

- Chỉ một người dùng duy nhất, không đăng nhập/tài khoản — loại trừ mọi tính năng multi-user, chia sẻ, hay phân quyền khỏi mọi thiết kế sau này.
- Chỉ chạy trên desktop web, một máy — không cần responsive mobile hay đồng bộ đa thiết bị trong v1.
- Số tiền là VNĐ, số nguyên đồng — không cần hỗ trợ số thập phân cho tiền tệ.
- Ba thao tác ghi nhanh hàng ngày (check-off Task, ghi Giao dịch, ghi Buổi học) phải phản hồi gần như tức thời (tối đa vài giây thao tác) — giá trị cốt lõi của sản phẩm phụ thuộc vào việc ghi chép không tạo ma sát mỗi ngày.
- Không có kênh thông báo/nhắc nhở chủ động ở bất kỳ module nào — mọi cảnh báo (ví dụ ngân sách) phải hiện diện ngay tại đúng nơi/thời điểm phát sinh, không qua kênh riêng.
- Lịch sử đã phát sinh (Lịch trình ngày đã qua, Ngân sách của tháng đã qua, Mốc đã Hoàn thành) không bao giờ bị ghi đè khi sửa cấu hình hiện hành (Mẫu lịch trình, Ngân sách tháng đang chạy, vị trí trên Lộ trình).
- Dữ liệu của cả 4 module lưu trữ bền vững — không được mất khi đóng/mở lại app.

## Non-goals

- Không phục vụ nhiều người dùng; không có tính năng chia sẻ, mời người khác, hay tài khoản.
- Không có bản responsive cho mobile hay đồng bộ đa thiết bị trong v1.
- Không tích hợp tìm kiếm/nhập công thức nấu ăn từ nguồn ngoài.
- Không có hệ thống nhắc nhở/notification chủ động ở bất kỳ module nào.
- Không liên kết dữ liệu Thực đơn với module Chi tiêu.
- Không tự động hoàn thành Mốc dựa trên số giờ học tích luỹ, ở cả hai Kỹ năng.
- Không export/backup dữ liệu ra định dạng ngoài trong v1 — rủi ro một-điểm-lỗi dữ liệu cục bộ được chấp nhận có chủ đích, xem lại nếu phát sinh vấn đề thực tế.
- Không có mục tiêu thương mại hoá, phát hành, hay quảng bá sản phẩm.

## Success signal

Người dùng lên Lịch trình ngày và check-off ít nhất một lần mỗi ngày, đều đặn trong ≥4 tuần liên tiếp sau khi bắt đầu dùng v1, và số Danh mục chi tiêu vượt Ngân sách trong tháng giảm dần qua các tháng sử dụng so với trước đây. Ở mức thứ yếu, mỗi Lộ trình (Tiếng Anh, Automation Test) hoàn thành thêm ít nhất một Mốc mới mỗi 1–2 tháng. Thành công không được đo bằng số lượng bản ghi (Task/Giao dịch/Buổi học) — ghi hời hợt hoặc không trung thực để "có số liệu" không phải là thành công; ghi nhận đúng và đều đặn quan trọng hơn số lượng.
