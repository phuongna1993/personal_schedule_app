---
title: Reconciliation — UX Spine (DESIGN.md + EXPERIENCE.md) vs. PRD + Brief
status: draft
created: 2026-08-20
sources:
  - DESIGN.md
  - EXPERIENCE.md
  - ../../prds/prd-personal_phuongna-2026-08-19/prd.md
  - ../../briefs/brief-personal_phuongna-2026-08-19/brief.md
---

# Reconciliation: UX Spine vs. PRD/Brief

Phạm vi: đối chiếu `DESIGN.md` + `EXPERIENCE.md` (spine) với `prd.md` (Source A) và `brief.md` (Source B), theo 4 câu hỏi được giao.

## 1. FR coverage (FR-1 → FR-13)

Tất cả 13 FR đều được mang sang spine dưới một hình thức nào đó — không có FR nào bị lược bỏ âm thầm.

| FR | Trạng thái trong spine | Ghi chú |
|---|---|---|
| FR-1 | Mock đầy đủ | IA table ("Mẫu lịch trình"), Component Patterns ("Sửa-không-ghi-đè-lịch-sử"), Key Flow bước 2. |
| FR-2 | Mock đầy đủ | Key Flow bước 2 ("Task khởi tạo tự động từ Mẫu"); State Patterns "Xem lại Lịch trình ngày của các ngày trước" (dẫn chiếu FR-2/FR-3). |
| FR-3 | Mock phần lớn, **một hệ quả bị thiếu** | Check-off (`chk`) mô tả đầy đủ. Hệ quả "xem số Task Đã xong trên tổng số Task đã lên kế hoạch" (tỉ lệ hoàn thành/tổng, để tự đối chiếu) **không được nêu lại rõ ràng** trong EXPERIENCE.md — chỉ có gợi ý gián tiếp ở DESIGN.md Components ("Progress bar... dùng cho cả tiến độ task trong ngày") mà không gắn với FR-3 hay xuất hiện trong bảng Component/State Patterns của EXPERIENCE.md. Xem Finding #2. |
| FR-4 | Mock đầy đủ | Quick-add sheet, Key Flow bước 3. |
| FR-5 | **Chưa mock, nhưng được flag rõ ràng** | IA table đánh dấu "Ngân sách & Danh mục chi tiêu — chưa mock"; hành vi forward-only (đổi Ngân sách tháng hiện tại không đổi tháng trước) vẫn được đặc tả trong Component Patterns ("Sửa-không-ghi-đè-lịch-sử", cột "dùng ở" liệt kê FR-5). Gap #1 trong "Khoảng trống & Quyết định còn mở". |
| FR-6 | Mock đầy đủ, chi tiết | Threshold alert tag, State Patterns (dưới 30%, vượt 100%), Key Flow bước 4. |
| FR-7 | **Chưa mock, được flag** | Chỉ xuất hiện trong dòng IA table (nhắc lại nguyên văn FR-7), không có đặc tả hành vi bổ sung nào khác (không mô tả cách chọn tháng bất kỳ trong quá khứ) — nhưng được liệt kê minh bạch trong cùng gap #1, không bị giấu. |
| FR-8 | Mock đầy đủ | Dish card & ingredient filter, Key Flow bước 5. |
| FR-9 | Mock đầy đủ | Portion Group assignment columns. |
| FR-10 | Mock đầy đủ | note-input chỉ tồn tại ở cột "Người lớn & bé 4 tuổi". |
| FR-11 | **Chưa mock trực quan, được flag + minh hoạ trong Key Flow** | IA table liệt kê rõ "chưa mock"; Key Flow bước 6 vẫn diễn hoạt hành vi ghi Buổi học. Gap #1. |
| FR-12 | **Chưa mock, được flag** | IA table dẫn FR-12 (lịch sử, streak/biểu đồ, điểm số Assessment Test theo thời gian) trong nhóm "chưa mock". Gap #1. |
| FR-13 | **Chưa mock trực quan, đặc tả hành vi đầy đủ** | Component Patterns "Milestone marker", State Patterns "Chặn hoàn thành Mốc Tiếng Anh", Gap #5 — hành vi gate rất chi tiết dù chưa có mock hình ảnh. |

**Kết luận Q1:** Không có FR nào bị rơi rụng âm thầm. FR-5/7/11/12/13 thiếu mock trực quan nhưng đều được liệt kê tường minh trong mục "Khoảng trống & Quyết định còn mở" — đúng yêu cầu "flag rõ, không silently drop". Một khoảng thiếu nhỏ: hệ quả cụ thể của FR-3 (tỉ lệ Task Đã xong/tổng) không được nhắc lại rõ trong EXPERIENCE.md dù không bị flag là gap — nó chỉ "trôi" vào một câu mô tả component chung chung ở DESIGN.md.

## 2. Tone/feel — có thực sự chuyển tải được ý định định tính không?

- **"Phù hợp với phụ nữ, dễ sử dụng, nhẹ nhàng"** — DESIGN.md trích dẫn nguyên văn cụm này và giải thích rõ cách "Khoảng Thở" đáp ứng (ấm áp bằng màu/hình khối, không phải hồng sáo rỗng; nhẹ nhàng bằng khoảng trắng, không phải lược bớt thông tin). Đáp ứng tốt, có chủ đích, không chỉ là tuyên bố suông.
- **Bối cảnh cảm xúc "mẹ vừa đi làm vừa chăm 2 con"** — được nhân cách hoá xuyên suốt: Foundation ("một người mẹ đang đi làm, mở app vài phút mỗi tối sau khi hai con đã ngủ"), Key Flow dùng nhân vật "chị Linh" để diễn hoạt UJ-1 nguyên văn ("dưới vài phút", "hai con đã ngủ"). Việc đặt tên nhân vật ("chị Linh") không có trong PRD/brief (cả hai đều không đặt tên người dùng) — đây là chi tiết hư cấu thêm vào, vô hại cho một tài liệu spine kể chuyện, nhưng đáng ghi nhận là không truy nguyên được về nguồn.
- **"Tốc độ hơn tính năng"** — phản ánh rõ và nhất quán: Interaction Primitives ("một-cú-bấm-là-xong: friction bằng 0"), không có confirm dialog nào trong toàn app, quick-add sheet không chuyển trang, single-hub IA. Đây là phần được chuyển tải mạnh nhất trong spine.
- **SM-C1 (không tối ưu số lượng, không thưởng cho ghi chép hời hợt/không trung thực)** — **đây là khoảng hụt rõ nhất của cả hai tài liệu.** Không có bất kỳ chỗ nào trong DESIGN.md hoặc EXPERIENCE.md nhắc trực tiếp đến SM-C1 hoặc tinh thần "ghi đều & đúng quan trọng hơn ghi nhiều". Điểm chạm gần nhất là một dòng trong Voice and Tone: tránh ngôn ngữ gamification cho streak ("🔥 12 ngày" thay vì "Tuyệt vời, đừng bỏ lỡ chuỗi ngày của bạn!") — đây là một tín hiệu gián tiếp tốt (không tạo áp lực số lượng qua ngôn ngữ), nhưng nó không đối diện trực tiếp với rủi ro chính mà SM-C1 nêu: chính triết lý "một-cú-bấm-là-xong, friction=0" của spine (tối ưu tốc độ tối đa cho check-off/log) tự nó tạo điều kiện cho việc tick giả/ghi qua loa — không có bất kỳ cơ chế, microcopy, hay ghi chú thiết kế nào phản ánh sự căng thẳng này hoặc chủ động giảm thiểu nó (ví dụ: không có gợi ý nào về việc phân biệt "đã làm" với "định làm", không có bất kỳ suy nghĩ nào về cách hiển thị dữ liệu để không khuyến khích ghi khống). Đây là một khoảng trống định tính thực sự — định dạng theo cấu trúc FR/component dường như đã làm phẳng mất mối lo về tính trung thực trong ghi chép mà PRD nêu ở SM-C1.

**Kết luận Q2:** 3/4 yêu cầu định tính (nữ tính/nhẹ nhàng, bối cảnh cảm xúc, tốc độ) được chuyển tải tốt và có chủ đích rõ ràng, dẫn chiếu đúng nguồn. SM-C1 là khoảng hụt thực sự — không bị mâu thuẫn, nhưng cũng không được đối diện, chỉ được chạm nhẹ gián tiếp qua nguyên tắc tránh gamification.

## 3. Non-Goals có bị tái nhập lén không?

Không tìm thấy trường hợp nào. Kiểm tra cụ thể từng Non-Goal:

- **Notification/reminder chủ động**: Cả hai tài liệu liên tục nhắc lại nguyên tắc "không có thông báo/nhắc nhở chủ động ở bất kỳ module nào" (EXPERIENCE.md Foundation, Accessibility Floor). Toast xác nhận và threshold alert đều được minh định rõ là **hệ quả trực tiếp của một hành động người dùng vừa thực hiện**, không phải kênh thông báo riêng biệt/nền — đúng tinh thần Non-Goal, không vi phạm.
- **Responsive/mobile**: DESIGN.md và EXPERIENCE.md đều nói rõ "không có breakpoint mobile", "chỉ chạy trên desktop". Không có gợi ý layout responsive nào.
- **Đa người dùng / chia sẻ / mời**: Không xuất hiện ở đâu. Brand & Style còn nhấn thêm "không tài khoản chia sẻ... không tính năng 'khoe' ai cả".
- **Đăng nhập/tài khoản**: Foundation nêu rõ "không đăng nhập/tài khoản". Không có màn hình hay component nào gợi ý login/account.
- **Export/backup/sync đa thiết bị**: Không được nhắc tới ở đâu trong cả hai tài liệu (kiểm tra grep riêng, không có kết quả) — không bị tái nhập.

**Kết luận Q3:** Không có Non-Goal nào bị tái nhập, kể cả ẩn ý. Cả hai tài liệu chủ động nhắc lại Non-Goals nhiều lần như một ràng buộc thiết kế, không chỉ tránh né mà còn biến thành nguyên tắc tích cực ("nhìn thấy kế hoạch là đủ").

## 4. Glossary — từ đồng nghĩa khác cho thuật ngữ PRD?

EXPERIENCE.md tự đặt ra quy tắc rõ ràng ở Voice and Tone: dùng đúng thuật ngữ Glossary xuyên suốt (Task, Giao dịch, Danh mục chi tiêu, Ngân sách, Món ăn, Ngân hàng món ăn, Nhóm khẩu phần, Thực đơn ngày, Kỹ năng, Lộ trình, Mốc, Buổi học, Bài test đánh giá, Mẫu lịch trình, Lịch trình ngày), và liệt kê chính xác các ví dụ **không được làm**: gọi Giao dịch là "khoản", gọi Mốc là "cấp độ", gọi Buổi học là "phiên học".

**Phát hiện: chính tài liệu vi phạm quy tắc của mình.** Ở Key Flows, bước 4 (dòng 128): *"Vì **khoản chi** này đẩy danh mục Ăn uống xuống dưới ngưỡng 30% còn lại trong tháng..."* — "khoản chi" ở đây dùng để chỉ lại chính Giao dịch (Chi) vừa ghi ở bước 3. Đây đúng là biến thể của từ "khoản" mà bảng Do's/Don'ts ngay phía trên (dòng 51) liệt kê là ví dụ **không nên** dùng để thay cho "Giao dịch". Một sự không nhất quán nội bộ thực sự, dù nhỏ và chỉ xuất hiện một lần, trong phần kể chuyện (Key Flows) chứ không phải trong đặc tả hành vi chính thức (Component/State Patterns, nơi "Giao dịch" được dùng đúng và nhất quán).

Các thuật ngữ khác đã rà soát và **không** phát hiện vi phạm: "Mốc" không bị gọi là "cấp độ" ở đâu khác; "Buổi học" không bị gọi là "phiên học" ở đâu khác; "Nhóm khẩu phần", "Ngân hàng món ăn", "Thực đơn ngày", "Bài test đánh giá", "Mẫu lịch trình" đều dùng nhất quán, đúng chữ hoa, đúng nghĩa xuyên suốt cả hai tài liệu.

Một điểm biên nhẹ khác (không hẳn là vi phạm): DESIGN.md, mục Typography, mô tả nội dung style `body` là "tên việc, tên món ăn, tên lộ trình học" — dùng "tên việc" (danh từ chung, viết thường) thay vì "tên Task" (thuật ngữ Glossary, viết hoa). Vì đây là mô tả kiểu chữ áp dụng cho nội dung UI nói chung (không phải microcopy hiển thị trực tiếp cho người dùng), mức độ nghiêm trọng thấp hơn nhiều so với phát hiện "khoản chi" ở trên — nhưng cùng một dạng trôi thuật ngữ nên được liệt kê để tham khảo.

**Kết luận Q4:** Một vi phạm Glossary thực sự được tìm thấy — "khoản chi" (EXPERIENCE.md dòng 128) dùng thay cho "Giao dịch", ngay trong tài liệu tự đặt ra quy tắc cấm chính cách dùng này. Ngoài ra, không phát hiện thêm vi phạm nào khác đáng kể.

## Tổng hợp Findings (ưu tiên theo mức độ)

1. **[Định tính, trung bình]** SM-C1 (counter-metric chống ghi chép hời hợt/không trung thực) không được đối diện trực tiếp ở đâu trong DESIGN.md/EXPERIENCE.md. Điểm chạm duy nhất là nguyên tắc tránh ngôn ngữ gamification cho streak — gián tiếp, không đủ. Triết lý "một-cú-bấm-là-xong, friction=0" xuyên suốt spine thậm chí có thể làm trầm trọng thêm đúng rủi ro mà SM-C1 cảnh báo, mà không có ghi chú thiết kế nào phản ánh sự đánh đổi này.
2. **[Glossary, nhỏ nhưng cụ thể]** EXPERIENCE.md dòng 128 dùng "khoản chi" để chỉ Giao dịch, vi phạm đúng quy tắc mà bảng Voice and Tone (dòng 51) của chính tài liệu đó liệt kê là ví dụ cấm.
3. **[FR coverage, nhỏ]** Hệ quả của FR-3 về xem "số Task Đã xong trên tổng số Task đã lên kế hoạch" không được nêu lại rõ ràng trong EXPERIENCE.md (chỉ gợi ý gián tiếp qua mô tả Progress bar chung ở DESIGN.md, không gắn với FR-3, không xuất hiện trong bảng Component/State Patterns).
4. **[Không sourced, rất nhỏ]** Tên nhân vật "chị Linh" trong Key Flows không có căn cứ từ PRD/brief (cả hai không đặt tên người dùng) — chi tiết hư cấu vô hại nhưng đáng ghi chú.

Không tìm thấy: FR bị lược bỏ âm thầm (Q1 — sạch), Non-Goal bị tái nhập (Q3 — sạch).
