---
title: Product Brief - App Quản Lý Cá Nhân Đa Năng
status: final
created: 2026-08-19
updated: 2026-08-19
---

# Product Brief: App Quản Lý Cá Nhân Đa Năng

## Tóm tắt

Đây là một web app cá nhân, dùng riêng cho một người phụ nữ vừa đi làm vừa quản lý cuộc sống gia đình (bao gồm hai con nhỏ — một bé 4 tuổi và một bé dưới 1 tuổi). App gộp 5 mảng theo dõi hàng ngày đang bị quản lý rời rạc hoặc không quản lý được: lịch trình một ngày, chi tiêu, thực đơn, học tiếng Anh (A1→B1), và tự học automation test. Hiện tại mỗi mảng dùng một cách khác nhau (giấy, trí nhớ, Excel) hoặc không dùng gì cả, dẫn đến không có kết quả rõ ràng ở bất kỳ mảng nào. Mục tiêu là một nơi duy nhất để lên kế hoạch mỗi ngày, ghi nhận thực tế, và nhìn lại tiến độ — cho cả công việc nhà lẫn hai lộ trình tự học dài hạn.

## Vấn đề

Cả 5 mảng công việc/mục tiêu hàng ngày đang được quản lý theo cách khác nhau, không cách nào hiệu quả:

- **Chi tiêu**: quản lý bằng file Excel, nhưng hay quên ghi chép nên đến cuối tháng không biết tiền đã đi đâu, và thường xuyên chi vượt kế hoạch.
- **Lịch trình ngày**: không theo dõi gì — nhớ việc nào thì làm việc đó — dẫn đến trôi việc, quên việc, và cảm giác một ngày trôi qua không hiệu quả.
- **Học tiếng Anh (A1→B1)** và **tự học automation test**: ghi chép thủ công, học không đều, bị gián đoạn, và không có cách nào nhìn lại để biết mình đang tiến bộ tới đâu trên lộ trình.
- **Thực đơn**: không lên kế hoạch trước, nên đến bữa mới nghĩ ăn gì, nhiều lúc phải ăn ngoài vì không chuẩn bị kịp — với thêm ràng buộc là phải tính riêng khẩu phần cho em bé dưới 1 tuổi (bé 4 tuổi ăn chung thực đơn người lớn, có điều chỉnh nhẹ).

Điểm chung: không phải thiếu công cụ, mà là công cụ rời rạc và không có thói quen ghi nhận đều đặn, nên không mảng nào tích lũy được dữ liệu để nhìn lại và cải thiện.

## Giải pháp

Một web app duy nhất với 5 module, xây dựng **đồng thời** ngay từ v1 (không chia giai đoạn):

### 1. Lịch trình ngày
Lên kế hoạch cho cả ngày trước, sau đó check-off từng việc khi hoàn thành. Không cần nhắc nhở/reminder chủ động — chỉ cần nhìn thấy kế hoạch là đủ để tự nhắc bản thân.

### 2. Quản lý chi tiêu
Ghi chép nhanh mỗi lần chi tiêu, theo dõi cả khoản thu. Đặt ngân sách (budget) theo từng danh mục, xem tổng theo tháng. **Cảnh báo chủ động** khi chi tiêu sắp/đã vượt hạn mức ngân sách của danh mục đó.

### 3. Quản lý thực đơn
Xây dựng "ngân hàng món ăn" theo nhóm nguyên liệu (ví dụ nhóm thịt bò: bò sốt vang, bò xào thập cẩm...), từ đó chọn món cho từng bữa trong ngày. Chia thành 2 nhóm thực đơn: (1) người lớn và bé 4 tuổi ăn chung — 3 bữa sáng/trưa/tối, có thể ghi chú điều chỉnh nhẹ riêng cho bé 4 tuổi khi cần; (2) bé dưới 1 tuổi — 3 bữa sáng/trưa/tối riêng biệt. Không liên kết với module chi tiêu.

### 4. Tracker học tiếng Anh (A1→B1)
Ghi log mỗi buổi học (nội dung học, thời lượng), xem tiến độ theo thời gian (streak, biểu đồ, hoặc % hoàn thành lộ trình A1→B1).

### 5. Tracker tự học automation test
Ghi log mỗi buổi học tương tự tracker tiếng Anh, nhưng theo lộ trình 7 cột mốc do người dùng tự xây dựng:
1. Nền tảng Python + SQL
2. Pytest + UI automation (Playwright)
3. UI automation + Page Object Model (POM)
4. API automation (Pytest + requests)
5. CI/CD (GitHub Actions) + AI in testing
6. Portfolio end-to-end + Mobile testing (Appium)
7. Security testing + Chứng chỉ + phỏng vấn TA (Test Automation)

## Đối tượng sử dụng

Người dùng duy nhất: chính chủ sở hữu sản phẩm — một phụ nữ đi làm, đang cân bằng giữa công việc, tự học nâng cao kỹ năng (automation test, tiếng Anh), và trách nhiệm gia đình (chăm hai con nhỏ — một bé 4 tuổi và một bé dưới 1 tuổi) ngoài giờ làm việc. Không có người dùng thứ hai, không có ý định chia sẻ hay phát hành ra ngoài.

## Tiêu chí thành công

Vì đây là sản phẩm cá nhân, thành công được đo bằng **thói quen sử dụng đều đặn**, không phải chỉ số kinh doanh:

- Lên kế hoạch cho ngày hôm sau đều đặn mỗi ngày, và check-off/đối chiếu thực tế so với kế hoạch.
- Ghi nhận đều đặn hàng ngày ở cả 5 module: khoản chi tiêu mới, thực đơn mới cho ngày hôm đó, buổi học tiếng Anh và automation test (kèm thời lượng + nội dung).
- Nhìn lại được: cuối tháng biết chi tiêu có vượt ngân sách không; nhìn lại được mình đang ở đâu trên lộ trình A1→B1 và lộ trình automation test 7 mốc.

## Phạm vi

**Trong phạm vi (v1) — build đồng thời cả 5 module:**
- Lên lịch trình ngày + check-off việc
- Ghi chi tiêu + thu nhập, ngân sách theo danh mục, cảnh báo vượt ngân sách
- Ngân hàng món ăn + lên thực đơn theo bữa, tách riêng người lớn / trẻ dưới 1 tuổi
- Log học tiếng Anh + xem tiến độ theo lộ trình A1→B1
- Log học automation test + xem tiến độ theo lộ trình 7 mốc

**Ngoài phạm vi (rõ ràng không làm ở v1):**
- Reminder/thông báo chủ động cho lịch trình ngày (chỉ cần hiển thị)
- Liên kết dữ liệu thực đơn với chi tiêu ăn uống
- Responsive mobile / đồng bộ đa thiết bị — v1 chỉ dùng trên máy tính (desktop web)
- Tìm kiếm/tích hợp công thức nấu ăn từ nguồn ngoài — ngân hàng món ăn tự nhập thủ công
- Bất kỳ tính năng nào phục vụ nhiều người dùng, chia sẻ, hay phát hành công khai
