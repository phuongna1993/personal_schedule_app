---
title: Reconcile Brief -> PRD
created: 2026-08-19
---

# Đối chiếu Brief -> PRD

Nguồn:
- Brief: `_bmad-output/planning-artifacts/briefs/brief-personal_phuongna-2026-08-19/brief.md`
- PRD: `_bmad-output/planning-artifacts/prds/prd-personal_phuongna-2026-08-19/prd.md`

## 1. Cấu trúc 5 mảng -> 4 Feature

Brief liệt kê 5 mảng: Lịch trình ngày, Chi tiêu, Thực đơn, Học tiếng Anh (A1→B1), Tự học automation test.

PRD gộp 2 mảng học tập thành một Feature §4.4 "Tracker học tập (Tiếng Anh & Automation Test)", dùng chung cơ chế Buổi học + Lộ trình + Mốc, nhưng vẫn tách riêng Lộ trình theo từng Kỹ năng (Tiếng Anh: A1/A2/B1; Automation Test: 7 mốc cố định — liệt kê lại đúng nguyên văn 7 mốc từ brief ở FR-13). Đây là gộp có chủ đích, không mất nội dung — cả nội dung của cả hai lộ trình đều được bảo toàn đầy đủ (chỉ khác cách trình bày: 1 Feature thay vì 2). **Không có vấn đề.**

## 2. Bối cảnh gia đình (2 con nhỏ)

Brief: phụ nữ đi làm, 2 con nhỏ (4 tuổi, dưới 1 tuổi), dùng app ngoài giờ làm việc, xen giữa chăm con.

PRD carry-forward: Vision (§1), JTBD "Bối cảnh" (§2.1), UJ-1 (§2.3), Glossary "Nhóm khẩu phần" (§3), FR-9/FR-10 (thực đơn tách theo nhóm tuổi). Đầy đủ, nhất quán với brief. **Không có vấn đề.**

## 3. Pain points từng mảng

PRD §0 chủ động không lặp lại phần Vấn đề/Đối tượng của brief ("không lặp lại phần Vấn đề/Đối tượng đã có ở đó") và dẫn link ngược về brief — đây là lựa chọn cấu trúc hợp lý cho một PRD chuẩn FR, không phải mất nội dung, vì brief vẫn là tài liệu tham chiếu chính thức đứng cạnh PRD trong chain.

Đối chiếu từng pain point xem có được "giải quyết" bằng FR tương ứng hay không:
- Chi tiêu (quên ghi chép, vượt kế hoạch) -> FR-4 (ghi nhanh), FR-6 (cảnh báo 30%/100%), SM-2. Khớp.
- Lịch trình (trôi việc, quên việc, cảm giác ngày không hiệu quả) -> FR-1/2/3, triết lý "không cần nhắc nhở, chỉ cần nhìn thấy kế hoạch" được PRD giữ nguyên gần như nguyên văn ở §4.1 Description. Khớp.
- Học tiếng Anh & automation (ghi chép thủ công, học không đều, không nhìn lại được tiến độ) -> FR-11/12/13, streak/biểu đồ, điểm số Bài test. Khớp, có nâng cấp cụ thể hơn (xem mục 5).
- Thực đơn (không lên kế hoạch trước, ăn ngoài, phải tách khẩu phần bé <1 tuổi) -> FR-8/9/10, Ngân hàng món ăn + Nhóm khẩu phần. Khớp.

**Không có pain point nào bị rơi rụng.**

## 4. Tiêu chí thành công / Success Metrics

Brief: (a) lên kế hoạch + check-off/đối chiếu thực tế đều đặn; (b) ghi nhận đều đặn ở cả 5 module; (c) nhìn lại được cuối tháng có vượt ngân sách không, và đang ở đâu trên 2 lộ trình.

PRD: SM-1 (lên lịch + check-off ≥4 tuần liên tiếp), SM-2 (số danh mục vượt ngân sách giảm dần), SM-3 (hoàn thành ≥1 mốc mỗi 1-2 tháng/lộ trình), cộng SM-C1 (counter-metric chống ghi nhận hời hợt). PRD còn gắn mỗi metric với FR cụ thể ("Validates FR-x") — đây là bổ sung có giá trị (traceability) mà brief không có, không phải mâu thuẫn.

Một điểm brief có mà PRD chỉ ngầm định: "đối chiếu thực tế so với kế hoạch" (so sánh việc đã lên kế hoạch với việc đã làm) — PRD không có FR/SM riêng cho việc "so sánh/đối chiếu" tường minh, chỉ có khả năng xem lại Lịch trình ngày quá khứ (FR-2 consequence) và trạng thái Đã xong/Chưa xong được lưu lại (FR-3 consequence). Về mặt dữ liệu, khả năng đối chiếu vẫn tồn tại (do cả kế hoạch và trạng thái check-off đều được lưu và xem lại được), chỉ là không có FR mô tả một "view đối chiếu" tường minh. Đây là điểm nhỏ, mức độ rủi ro thấp — có thể chấp nhận vì dữ liệu nền tảng đã đủ để làm việc này ở bước UX sau.

## 5. Các tinh chỉnh hợp lệ trong lúc làm PRD (không mâu thuẫn với brief)

- Ưu tiên/thời hạn cho Task — brief không đề cập, PRD thêm Mức ưu tiên + Thời hạn (khung giờ) vào Glossary và FR-1. Không mâu thuẫn brief, nhưng **xem mục 7 — có xung đột nội bộ trong chính PRD**.
- Ảnh món ăn/nguyên liệu — brief không đề cập, PRD thêm tuỳ chọn ảnh (FR-8, FR-9's Món ăn/Nguyên liệu). Không mâu thuẫn, không bắt buộc nên an toàn.
- Lộ trình tiếng Anh tách thành mốc A1/A2/B1 + Bài test đánh giá + Điểm số bắt buộc trước khi hoàn thành mốc — brief chỉ nói chung chung "xem tiến độ (streak, biểu đồ, hoặc % hoàn thành lộ trình A1→B1)". PRD cụ thể hoá thành cơ chế mốc thủ công + test bắt buộc, khác với "% tự động" nhưng đây là lựa chọn thiết kế hợp lý (brief chỉ đưa ra ví dụ, không cam kết cơ chế %). Không mâu thuẫn.
- Cảnh báo ngân sách ở mốc 30% còn lại (= đã chi 70%) và lại ở 100% — brief chỉ nói "cảnh báo khi sắp/đã vượt". PRD cụ thể hoá con số ngưỡng, không mâu thuẫn.
- Không cần export/backup — brief không đề cập export. PRD thêm mục này vào Out of Scope kèm ghi chú "có thể xem xét lại sau". Không mâu thuẫn, ghi chú rõ ràng đây là quyết định tạm thời.

Tất cả các tinh chỉnh trên đều nhất quán với instruction: đây là elaboration hợp lệ, không phải drift so với brief.

## 6. Phạm vi (Scope) và Non-Goals

Đối chiếu từng dòng Out of scope của brief với Non-Goals (§5) + MVP Out of Scope (§6.2) của PRD:
- Reminder chủ động cho lịch trình -> có trong Non-Goals và §6.2. Khớp.
- Liên kết thực đơn <-> chi tiêu -> có (Non-Goals, §6.2, và FR-9 consequence). Khớp.
- Responsive mobile/đa thiết bị -> có (Non-Goals, §6.2). Khớp.
- Tìm kiếm/tích hợp công thức ngoài -> có (Non-Goals). Khớp.
- Tính năng đa người dùng/chia sẻ/phát hành -> có (Non-Goals, và JTBD "dogfooding — không có nhu cầu người dùng thứ hai"). Khớp.

PRD bổ sung thêm 2 mục Non-Goals brief không nói tới: "Đăng nhập/tài khoản, phân quyền" và "Tự động hoàn thành Mốc dựa trên giờ học tích luỹ". Cả hai đều là hệ quả logic hợp lý từ brief (chỉ 1 người dùng => không cần tài khoản; brief không yêu cầu tự động tính hoàn thành mốc theo giờ, chỉ nói "xem % hoàn thành" như một cách hiển thị, không phải cơ chế hoàn thành). Không mâu thuẫn.

**Không có vấn đề về phạm vi.**

## 7. Vấn đề cần lưu ý — mâu thuẫn nội bộ trong chính PRD (không phải giữa Brief và PRD)

Đây là phát hiện quan trọng nhất, nằm trong chính văn bản PRD chứ không phải khác biệt so với brief:

- **Glossary (§3, dòng định nghĩa Task)**: "Task ... có trạng thái Chưa xong / Đã xong, một Thời hạn (khung giờ trong chính ngày đó), và một Mức ưu tiên."
- **FR-1 (§4.1, thân yêu cầu)**: "Người dùng có thể tạo và chỉnh sửa một Mẫu lịch trình gồm danh sách Task mặc định (tên việc, Thời hạn trong ngày, Mức ưu tiên)."
- **FR-1 Notes (ngay bên dưới, cùng mục)**: "`[ASSUMPTION]` Task không có thời hạn hay mức ưu tiên (priority) — chỉ có tên và trạng thái xong/chưa xong. Nếu cần phân loại/độ ưu tiên, đây là điểm cần bổ sung ở vòng sau."

Glossary và thân FR-1 khẳng định Task CÓ Thời hạn + Mức ưu tiên (đúng như tinh chỉnh mà user đã chốt trong hội thoại PRD). Nhưng Notes ngay bên dưới lại giả định NGƯỢC LẠI — rằng Task KHÔNG có các trường này. Đây rõ ràng là phần sót lại từ một bản nháp trước khi tinh chỉnh "priority/deadline" được chốt, chưa được dọn dẹp. Mục 9 "Assumptions Index" cũng không liệt kê assumption "không có priority" này (chỉ liệt kê assumption khác về việc Task không kéo dài qua ngày), càng khẳng định đây là câu chữ thừa/lỗi thời cần xoá, không phải một assumption đang còn hiệu lực.

**Cần sửa trước khi PRD sang bước UX/kiến trúc**: xoá hoặc viết lại câu Notes dưới FR-1 cho khớp với Glossary/FR-1 body (Task đã có Thời hạn + Mức ưu tiên, không còn là assumption/open point).

## 8. Giọng điệu / cảm xúc — có bị mất khi chuyển sang cấu trúc FR không?

Brief truyền tải rõ cảm giác quá tải của một người mẹ vừa đi làm vừa nuôi 2 con nhỏ, và triết lý "không cần nhắc nhở, chỉ cần nhìn kế hoạch". Rà lại PRD:
- §2.1 JTBD "Cảm xúc: Giảm cảm giác quá tải/rối khi phải tự nhớ và cân bằng cùng lúc công việc, con cái, học tập, và chi tiêu ngoài giờ làm" — giữ nguyên tinh thần này.
- §4.1 Description lặp lại gần nguyên văn triết lý "không cần nhắc nhở chủ động — giá trị nằm ở việc nhìn thấy kế hoạch, không phải bị nhắc".
- §1 Vision: "một nơi duy nhất, đủ nhanh để dùng mỗi ngày — để việc ghi nhận trở thành thói quen thay vì một việc bị bỏ dở" — giữ đúng tinh thần "công cụ rời rạc, không có thói quen ghi nhận đều đặn" của brief.

**Không phát hiện mất mát về giọng điệu/cảm xúc.** Đây là một điểm PRD làm tốt, không rơi vào lỗi thường gặp của tài liệu FR-hoá (khô cứng, chỉ còn checklist).

## Kết luận

PRD trung thành với brief ở gần như mọi khía cạnh load-bearing: 5 mảng -> 4 feature là gộp có chủ đích và không mất nội dung; bối cảnh gia đình, pain points, tiêu chí thành công, và ranh giới phạm vi đều được giữ nguyên hoặc cụ thể hoá hợp lý; các tinh chỉnh phát sinh trong hội thoại PRD (priority/deadline, ảnh món ăn, mốc A1/A2/B1 + test, ngưỡng cảnh báo 30%, không cần export) đều là elaboration hợp lệ, không mâu thuẫn brief.

Vấn đề thực sự duy nhất là nội bộ PRD (mục 7): câu Notes dưới FR-1 mâu thuẫn trực tiếp với Glossary và thân FR-1 về việc Task có hay không có Thời hạn/Mức ưu tiên — cần dọn trước khi dùng PRD làm input cho UX/kiến trúc.
