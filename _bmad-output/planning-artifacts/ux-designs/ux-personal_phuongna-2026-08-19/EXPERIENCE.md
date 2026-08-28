---
title: App Quản Lý Cá Nhân Đa Năng
status: final
created: 2026-08-19
updated: 2026-08-20
sources:
  - ../../prds/prd-personal_phuongna-2026-08-19/prd.md
  - ../../briefs/brief-personal_phuongna-2026-08-19/brief.md
---

# App Quản Lý Cá Nhân Đa Năng — Experience Spine

> Paired with `DESIGN.md` (hướng "Khoảng Thở"). Desktop-only, một người dùng, không tài khoản, không thông báo chủ động ở bất kỳ module nào. Nguyên tắc IA xuyên suốt tài liệu này: **nhìn thấy kế hoạch là đủ.**

## Foundation

Ứng dụng cá nhân một-người-dùng, chạy hoàn toàn trên trình duyệt desktop — không có bản responsive cho mobile, không đăng nhập/tài khoản, không đồng bộ đa thiết bị (Non-Goals, PRD §5). Không có hệ UI component có sẵn (không shadcn, không Material...) — toàn bộ hệ thị giác là bespoke, mô tả trong `DESIGN.md` (thẻ bo tròn lớn, khoảng trắng rộng, một màu nhấn `{colors.accent}` duy nhất). `DESIGN.md` là tài liệu tham chiếu thị giác; spine này mô tả hành vi.

Sản phẩm được dùng trong một phiên ngắn mỗi tối (UJ-1: "dưới vài phút"), sau khi hai con đã ngủ — không phải một công cụ mở suốt ngày để theo dõi liên tục. Cả chế độ sáng và tối đều bắt buộc, chuyển bằng nút toggle thủ công ở góc giao diện (🌙/☀️); không có mock nào dựng cơ chế tự chuyển theo giờ hệ thống.

Nguyên tắc IA cốt lõi, chi phối mọi quyết định hành vi trong tài liệu này: **"nhìn thấy kế hoạch là đủ."** Không có bất kỳ thông báo/nhắc nhở chủ động nào ở bất kỳ module nào (Non-Goals, PRD §5, §6.2) — Lịch trình ngày không nhắc giờ, Ngân sách không đẩy cảnh báo qua kênh riêng, Lộ trình học không nhắc học. Toàn bộ giá trị nằm ở việc mở app lên là thấy ngay hiện trạng và kế hoạch, không cần app "gọi" người dùng quay lại. Hệ quả trực tiếp: mọi cảnh báo (ví dụ ngân sách) phải hiện diện ngay tại nơi/thời điểm phát sinh, không qua kênh thông báo riêng biệt (xem State Patterns).

Kỷ luật một-màu-nhấn (`{colors.accent}`) không chỉ là quyết định thị giác — nó là một ràng buộc hành vi: trạng thái "đang chọn/active" (segmented toggle, filter chip) và trạng thái "cảnh báo" (ngân sách dưới 30%) dùng CHUNG một màu. Vì vậy hành vi bắt buộc phải phân biệt hai ý nghĩa này bằng chữ + icon + trọng lượng viền, không bao giờ được phép chỉ dựa vào màu sắc để truyền đạt ý nghĩa (xem Accessibility Floor).

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Hôm nay (Dashboard/hub) | Mở app (điểm vào duy nhất) | Toàn cảnh 4 mảng — Lịch trình ngày mai, Chi tiêu hôm nay, Thực đơn ngày mai, Học tập hôm nay — trong một lượt quét mắt, đủ để cả UJ-1 diễn ra mà không phải rời màn hình chính quá lâu. |
| Mẫu lịch trình (Routine Template editor) | Thẻ Lịch trình trên Hôm nay *(suy từ back-link "← Về Lịch trình hôm nay" trên chính màn Mẫu lịch trình — mock Hôm nay chưa dựng rõ nút bấm)* | Thêm/sửa/xoá Task mặc định dùng để khởi tạo mọi Lịch trình ngày mới (FR-1). |
| Ngân hàng món ăn & Thực đơn ngày | Thẻ Thực đơn trên Hôm nay *(cùng suy luận, theo địa chỉ `/thuc-don/chon-mon` trong mock)* | Duyệt/lọc Ngân hàng món ăn theo Nguyên liệu (FR-8) và gán Món ăn vào Thực đơn ngày cho từng bữa, tách riêng theo hai Nhóm khẩu phần (FR-9, FR-10). |
| Sheet thêm giao dịch nhanh | Thẻ Chi tiêu trên Hôm nay | Ghi một Giao dịch (Chi/Thu) mà không rời trang — overlay nổi trên Hôm nay đã làm mờ (FR-4). Cảnh báo ngân sách, nếu có, hiện ngay trên cùng bối cảnh này sau khi Lưu (FR-6). |
| Ngân sách & Danh mục chi tiêu — **chưa mock** | Thẻ Chi tiêu trên Hôm nay *(suy luận)* | Tạo/sửa/xoá Danh mục chi tiêu, đặt Ngân sách theo tháng, xem tổng Thu/Chi theo từng tháng bất kỳ trong quá khứ (FR-5, FR-7). Bố cục thực tế chưa được thiết kế — xem "Khoảng trống & Quyết định còn mở". |
| Lộ trình học tập (Kỹ năng: Tiếng Anh / Automation Test) — **chưa mock** | Thẻ Học tập trên Hôm nay *(suy luận)* | Ghi Buổi học (FR-11), xem lịch sử/tổng thời lượng + streak hoặc biểu đồ (FR-12), xem vị trí trên Lộ trình và đánh dấu Hoàn thành Mốc (FR-13; Tiếng Anh có thêm bước Bài test đánh giá bắt buộc trước khi hoàn thành Mốc). Bố cục màn hình này hoàn toàn chưa được mock trực quan — mô tả trong tài liệu này chỉ dựa vào hành vi nêu ở FR-11/12/13, không suy diễn thêm layout. |

Mỗi màn con có một đường "← Về..." để quay lại Hôm nay (theo `DESIGN.md`'s Layout & Spacing) — không có sidebar cố định hay điều hướng lồng nhiều cấp; overlay (sheet thêm giao dịch) chỉ nổi một lớp trên Hôm nay, không có overlay chồng overlay.

→ Composition reference: [mockups/dashboard.html](mockups/dashboard.html) (Hôm nay), [mockups/routine-template.html](mockups/routine-template.html) (Mẫu lịch trình), [mockups/meal-picker.html](mockups/meal-picker.html) (Ngân hàng món ăn & Thực đơn ngày), [mockups/quick-transaction.html](mockups/quick-transaction.html) (sheet giao dịch + trạng thái cảnh báo ngân sách). Spine thắng khi có xung đột với mock.

## Voice and Tone

Giọng thương hiệu/tính cách chung nằm ở `DESIGN.md`'s Brand & Style — một cuốn sổ tay ấm áp, không "hùng hổ". Phần này chỉ nói về microcopy hành vi: cách app "nói" khi xác nhận, cảnh báo, giải thích hành vi hệ thống.

| Nên | Không nên |
|---|---|
| "Đã lưu giao dịch: -45.000đ · Ăn uống · 20/08/2026" — nêu sự kiện đã xảy ra kèm dữ kiện cụ thể | "Lưu thành công! 🎉" — mừng rỡ thái quá cho một thao tác ghi nhanh hằng ngày |
| "Ngân sách 'Ăn uống' chỉ còn 22%" — số liệu cụ thể, trung tính | "Cảnh báo! Bạn tiêu quá nhiều!" — phán xét, gây lo lắng |
| "Đây là bản Mẫu, không phải Lịch trình của một ngày cụ thể. Sửa/thêm/xoá Task ở đây chỉ ảnh hưởng các Lịch trình ngày được khởi tạo sau này." — giải thích mô hình dữ liệu, trung tính | "Cẩn thận: hành động này không thể hoàn tác!" — doạ nạt cho một hành vi thực ra vốn an toàn (sửa Mẫu không ghi đè quá khứ) |
| "🔥 12 ngày" hiển thị như một con số sự kiện | "Tuyệt vời, đừng bỏ lỡ chuỗi ngày của bạn!" — biến số liệu thành áp lực/gamification |
| Streak/tỷ lệ hoàn thành trình bày trung tính, không xếp hạng, không nhắc nhở ép buộc quay lại — vì PRD's SM-C1 nói rõ thành công không đo bằng *số lượng* mục đã ghi, ghi hời hợt/không trung thực không phải thành công. Giao diện chủ động không tạo áp lực số lượng dù mọi thao tác ghi nhanh đều "một-cú-bấm-là-xong": tốc độ phục vụ việc ghi *thật* không bị cản trở, chứ không phải để khuyến khích ghi *nhiều*. | Leaderboard, huy hiệu, hay bất kỳ cơ chế thưởng nào theo số lượng bản ghi — kể cả khi kỹ thuật dễ làm |
| Nhãn trường viết hoa ngắn gọn: "SỐ TIỀN (VNĐ)", "TASK MỚI" | Câu hỏi mớm ý kiến kiểu "Bạn có chắc muốn tiếp tục?" cho các thao tác ghi nhanh hằng ngày |
| Dùng đúng thuật ngữ Glossary của PRD xuyên suốt: Task, Giao dịch, Danh mục chi tiêu, Ngân sách, Món ăn, Ngân hàng món ăn, Nhóm khẩu phần, Thực đơn ngày, Kỹ năng, Lộ trình, Mốc, Buổi học, Bài test đánh giá, Mẫu lịch trình, Lịch trình ngày | Từ đồng nghĩa tự sáng tác (gọi Giao dịch là "khoản", gọi Mốc là "cấp độ", gọi Buổi học là "phiên học"...) |
| Mọi câu chữ trên màn hình tự đủ ngữ cảnh (ngày, số liệu cụ thể) — vì không có notification chủ động, đây là kênh duy nhất người dùng nhận được thông tin | Câu chữ mơ hồ giả định người dùng "đã biết" nhờ một thông báo trước đó (app không gửi thông báo nào) |

## Component Patterns

Hành vi. Đặc tả thị giác nằm ở `DESIGN.md`'s Components.

| Component | Dùng ở | Quy tắc hành vi |
|---|---|---|
| Task row (`task-row`, `chk`, `badge-pri`) | Hôm nay (Lịch trình), Mẫu lịch trình | Bấm `chk` đảo trạng thái Đã xong/Chưa xong ngay lập tức, không có bước xác nhận (FR-3) — đây là một trong ba thao tác "ghi nhanh hàng ngày" phải phản hồi tức thời (PRD §6.1). Badge mức ưu tiên (Cao/Trung bình/Thấp) luôn có nhãn chữ đi kèm, không chỉ dựa vào màu/độ đậm nền. Thẻ Lịch trình trên Hôm nay hiển thị thêm tỷ lệ "X/Y việc đã xong" (`{components.progress-bar}`) để tự đối chiếu thực tế với kế hoạch (FR-3). |
| Quick-add sheet (`sheet-modal` + `scrim`) | Overlay nổi trên Hôm nay | `{components.quick-add-sheet}`. Nổi giữa màn hình, đè lên Hôm nay đã bị làm mờ bằng `scrim`; không chuyển trang, không có bước trung gian nào giữa lúc mở sheet và lúc bấm Lưu. Trường Danh mục chỉ **tồn tại** trong luồng nhập khi loại giao dịch đang chọn là Chi — chọn Thu thì khối Danh mục biến mất hoàn toàn, không phải chỉ ẩn đi rồi vẫn giữ giá trị cũ. Ngày mặc định là hôm nay (nhãn "Hôm nay"), sửa được. Bấm Lưu chốt Giao dịch ngay và đóng sheet — đây là hành động lưu duy nhất, không có bước xác nhận thứ hai kiểu "Bạn có chắc?". |
| Threshold alert tag & budget card (`threshold-tag`, `pct-big`, `alert-box`) | Ngay sau khi Lưu Giao dịch, trên cùng Hôm nay | `{components.threshold-alert-tag}`. Phải xuất hiện **ngay tại thời điểm và bối cảnh** Giao dịch vừa được lưu — không đẩy sang một màn báo cáo riêng (FR-6, hệ quả: "Cảnh báo hiển thị ngay khi ghi Giao dịch khiến Danh mục chạm ngưỡng"). Vì `{colors.accent}` dùng chung cho cả trạng thái active lẫn cảnh báo, khối này luôn phải mang đủ ba dấu hiệu cùng lúc: icon ⚠, nhãn chữ tường minh ("Dưới ngưỡng cảnh báo 30%"), và số phần trăm lớn (`{typography.stat}`) — không bao giờ chỉ dựa vào màu accent một mình. |
| Confirmation toast (`toast`) | Ngay sau khi Lưu Giao dịch | `{components.confirmation-toast}`. Xuất hiện tức thời, tự đủ ngữ cảnh (số tiền, danh mục, ngày) vì không có kênh thông báo nào khác nhắc lại việc này. Không yêu cầu bấm để đóng — tự ẩn sau 3 giây, hoặc bị thay ngay bởi lượt tương tác kế tiếp nếu có. |
| Info callout (`info-box`) | Mẫu lịch trình, Ngân hàng món ăn & Thực đơn ngày | `{components.info-callout}`. Dùng riêng để giải thích **hành vi hệ thống trung tính** (không phải cảnh báo): "sửa Mẫu lịch trình không ảnh hưởng các Lịch trình ngày đã tạo trước", "hai Nhóm khẩu phần hoàn toàn độc lập". Không bao giờ dùng để cảnh báo — vai trò đó thuộc riêng về `alert-box`/`threshold-tag`. Hai component không được trộn lẫn ý nghĩa. |
| Dish card & ingredient filter (`dish-card`, `filter-chip`, `ing-chip`) | Ngân hàng món ăn | Bấm một `filter-chip` nguyên liệu lọc **tức thời, trực tiếp** — không có nút "Áp dụng" riêng. Món khớp được viền nổi bật + nhãn "✓ khớp" (`match-flag`); món không khớp bị làm **mờ** (`opacity`) chứ không bị ẩn khỏi lưới, giữ toàn bộ Ngân hàng luôn hiện diện trong tầm mắt (FR-8, hệ quả "có thể tìm/lọc Món ăn theo Nguyên liệu"). Bấm "+ Thêm vào thực đơn" trên một thẻ gán món đó vào ô bữa đang mở của cột Nhóm khẩu phần đang thao tác — không tạo Giao dịch nào (FR-9, hệ quả: "Thực đơn ngày không liên kết với module Chi tiêu"). |
| Portion Group assignment columns (`assign-col`) | Ngân hàng món ăn & Thực đơn ngày | Hai cột "Người lớn & bé 4 tuổi" và "Bé dưới 1 tuổi" vận hành **hoàn toàn độc lập** — chọn món/giờ/ghi chú ở cột này không bao giờ đọc/ghi lên cột kia (FR-9). Trường ghi chú điều chỉnh (`note-input`) chỉ tồn tại về mặt cấu trúc ở cột "Người lớn & bé 4 tuổi" — cột "Bé dưới 1 tuổi" không có trường này (không phải ẩn, mà không tồn tại), vì ghi chú điều chỉnh là khái niệm riêng của FR-10, không áp dụng cho ăn dặm. Ghi chú luôn tuỳ chọn, để trống không chặn việc lưu bữa ăn. |
| Segmented toggle (`seg`/`seg-btn`) | Chi/Thu, Nhóm khẩu phần, Mức ưu tiên | `{components.segmented-toggle}`. Bấm một lựa chọn đổi trạng thái active ngay, loại trừ lẫn nhau trong cùng nhóm (chọn "Chi" tự động bỏ chọn "Thu"), không cần xác nhận riêng. |
| **Sửa-không-ghi-đè-lịch-sử (append-only edit)** — mẫu hành vi dùng lại xuyên 3 module | Mẫu lịch trình (FR-1), Ngân sách theo tháng (FR-5), Mốc/Lộ trình (FR-13) | Quy tắc lặp lại có chủ đích, không phải trùng hợp: **mọi chỉnh sửa "bản hiện hành" chỉ áp dụng về sau (forward-only), không bao giờ viết đè dữ liệu đã ghi nhận trong quá khứ.** Cụ thể — sửa Mẫu lịch trình chỉ ảnh hưởng các Lịch trình ngày khởi tạo *sau* thời điểm sửa, các Lịch trình ngày trước đó xem lại nguyên trạng; đổi Ngân sách của tháng hiện tại không đổi Ngân sách các tháng đã qua; đánh dấu Hoàn thành một Mốc chỉ đẩy Lộ trình tới Mốc kế tiếp, các Mốc đã hoàn thành trước đó vẫn hiển thị nguyên trạng, không bị ẩn hay viết đè. Bất kỳ màn hình nào áp dụng quy tắc này đều phải nêu rõ bằng `info-box` trung tính ngay tại thời điểm chỉnh sửa, không im lặng — xem cách diễn đạt trong Mẫu lịch trình. |
| Milestone marker (Lộ trình) — **chưa mock trực quan** | Lộ trình học tập | Theo FR-13: người dùng tự bấm đánh dấu Hoàn thành một Mốc để chuyển sang Mốc kế tiếp — không có tự động hoàn thành theo giờ học tích luỹ ở cả hai Kỹ năng. Với Kỹ năng Tiếng Anh, hành động này bị **chặn (gate)** cho tới khi có một Bài test đánh giá + Điểm số đã nhập gắn với Mốc đó; với Automation Test, hành động là quyết định thủ công thuần tuý, không có bước chặn nào. Cả hai chia sẻ cùng một mẫu tương tác nền ("xem vị trí hiện tại trên Lộ trình → bấm Hoàn thành → chuyển Mốc kế tiếp, Mốc cũ vẫn xem lại được"); Tiếng Anh chỉ thêm đúng một bước gate phía trước. Cơ chế: nút "Hoàn thành Mốc" hiển thị mờ/vô hiệu hoá ngay trong thẻ Mốc đó cho tới khi Điểm số Bài test được nhập tại chỗ — không mở modal riêng, giữ đúng nguyên tắc một-hub-không-điều-hướng-thừa. |

## State Patterns

Các mock hiện có dựng chủ yếu trạng thái đã có dữ liệu (happy path) cộng một trạng thái cảnh báo ngân sách cụ thể; các trạng thái biên chưa được mock được ghi rõ bên dưới thay vì suy diễn.

| Trạng thái | Màn hình | Xử lý |
|---|---|---|
| Ngân sách xuống dưới 30% còn lại | Hôm nay, ngay sau khi Lưu Giao dịch | `budget-card` + `{components.threshold-alert-tag}` hiện tức thời trên cùng bối cảnh, không có bước điều hướng nào (FR-6). Thanh tiến trình (`{components.progress-bar}`) tô `{colors.accent}` đến đúng tỉ lệ đã chi. |
| Ngân sách vượt quá 100% hạn mức | Hôm nay | Dùng lại nguyên `{components.threshold-alert-tag}` và `budget-card` đã có, chỉ đổi nhãn chữ thành "Đã vượt ngân sách" kèm số tiền vượt cụ thể — không thêm màu hay ngôn ngữ thị giác mới (FR-6). |
| Lọc Nguyên liệu không khớp món nào (0/N) | Ngân hàng món ăn | Lưới hiện thông điệp trung tính "Không có món nào chứa nguyên liệu này" + liên kết chữ "Xoá bộ lọc", thay vì để lưới trống không giải thích. |
| Ngân hàng món ăn chưa có Món ăn nào | Ngân hàng món ăn | Suy luận nhẹ từ việc thẻ "+ Thêm món mới" (`add-dish-card`) luôn hiện diện độc lập với số món trong lưới — khi rỗng, lưới chỉ còn lại đúng thẻ này. Đây là suy luận hợp lý từ cấu trúc mock, không phải một trạng thái được mock riêng. |
| Xem lại Lịch trình ngày của các ngày trước | Thẻ Lịch trình, Hôm nay | Điều hướng bằng nút lùi/tiến ngày (◀ ▶) ngay trên thẻ, kèm chỉ báo ngày đang xem — không tách thành surface riêng (FR-2/FR-3). |
| Chặn hoàn thành Mốc Tiếng Anh khi chưa có Bài test | Lộ trình học tập (chưa mock) | Theo FR-13, nút "Hoàn thành Mốc" hiển thị mờ/vô hiệu hoá cho tới khi có Điểm số Bài test đánh giá gắn với Mốc đó, nhập tại chỗ trong thẻ Mốc — không mở modal riêng (xem Component Patterns). |
| Trạng thái rỗng lần đầu dùng app (chưa có Task/Giao dịch/Món ăn/Buổi học nào ở bất kỳ module nào) | Toàn bộ | Mỗi thẻ trong 4 thẻ ở Hôm nay hiện một dòng gợi ý ngắn + nút hành động chính để tạo mục đầu tiên (ví dụ thẻ Học tập rỗng: "Chưa có buổi học nào — Ghi buổi học đầu tiên"). |

## Interaction Primitives

- Ba thao tác "ghi nhanh hàng ngày" theo NFR (PRD §6.1) — check-off Task, ghi Giao dịch, ghi Buổi học — đều hoàn tất bằng **đúng một hành động xác nhận** (bấm `chk`, bấm "Lưu giao dịch", bấm lưu Buổi học), không có bước xác nhận thứ hai, không dialog "Bạn có chắc chắn?". Đây không phải autosave-khi-gõ kiểu composer văn bản (Giao dịch vẫn cần bấm Lưu) mà là **một-cú-bấm-là-xong**: friction bằng 0 sau khi đã điền dữ liệu, không có màn xác nhận trung gian nào chen giữa.
- Bấm là hành động chính duy nhất trong toàn app — không có kéo-thả, không có vuốt, không có phím tắt bàn phím riêng nào được định nghĩa trong bất kỳ mock nào. Đây là sản phẩm chuột-trước, phiên ngắn mỗi tối, không cần một lớp tương tác bàn phím chuyên biệt kiểu công cụ năng suất cho dân kỹ thuật.
- Bộ lọc Nguyên liệu (Ngân hàng món ăn) là **thao tác trực tiếp**: bấm chip lọc phản ánh ngay trên lưới món (làm mờ/nổi bật), không có nút "Áp dụng" hay "Xoá lọc" riêng biệt được mock.
- Chuyển sáng/tối là **thao tác thủ công** qua nút toggle (🌙 ↔ ☀️) ở góc giao diện — không có tự động theo giờ hệ thống. Chuyển đổi có hiệu ứng mờ dần nhẹ trên nền/chữ (~250ms, cùng một giá trị transition trong mọi mock) — không "chớp" đột ngột giữa hai bảng màu. Khi ở chế độ tối, chữ trên nút hành động chính đảo sang mực tối (`{colors.accent-ink}` đảo nghĩa trong dark mode) vì `{colors.accent}` được làm sáng lên — đây là hệ quả hành vi trực tiếp của quyết định thị giác trong `DESIGN.md`, không phải lỗi.
- Sheet thêm giao dịch nhanh mở nổi giữa màn hình kèm `scrim` làm mờ Hôm nay phía sau. Bấm "Huỷ" hoặc bấm vào vùng `scrim` đều đóng sheet ngay, không lưu gì — hai đường đóng tương đương nhau.
- Không có bước xác nhận xoá (confirm dialog) cho nút xoá Task (✕) trong Mẫu lịch trình — nhất quán với việc toàn app không dùng confirm dialog cho bất kỳ thao tác nào.

## Accessibility Floor

Hành vi. Độ tương phản thị giác nằm ở `DESIGN.md`.

- Vì `{colors.accent}` dùng chung cho cả trạng thái active và cảnh báo, không bao giờ được phép chỉ dựa vào màu sắc để phân biệt hai ý nghĩa này — mọi trạng thái cảnh báo ngân sách phải luôn đi kèm icon ⚠ + nhãn chữ tường minh ("Dưới ngưỡng cảnh báo 30%") + số phần trăm cụ thể, không chỉ đổi màu nền. Tương tự, Priority badge luôn có nhãn chữ ("Cao"/"Trung bình"/"Thấp") đi cùng, không dựa vào độ đậm màu một mình.
- Toàn bộ thao tác phải khả dụng bằng bàn phím dù không có phím tắt riêng nào: `Tab` di chuyển theo đúng thứ tự đọc trên màn hình (brand → lời chào → avatar → lưới 4 thẻ theo thứ tự Lịch trình → Chi tiêu → Thực đơn → Học tập). Khi sheet thêm giao dịch mở, focus phải chuyển vào bên trong sheet và bị giữ ở đó (focus trap) cho tới khi đóng; đóng sheet (bấm Huỷ/Lưu) phải trả focus về đúng phần tử đã mở nó.
- Nút icon-only (✎, ✕ trên mỗi Task row) hiện chỉ có glyph, không có chữ hiển thị — bắt buộc phải có `aria-label` mô tả hành động cụ thể ("Sửa Task {tên}", "Xoá Task {tên}"), không được để trống nhãn hoặc dùng nhãn chung chung "nút".
- Checkbox Task (`chk`) công bố đủ ba phần khi có công nghệ hỗ trợ: tên Task, Mức ưu tiên, và trạng thái Đã xong/Chưa xong; đảo trạng thái phải công bố ngay trạng thái mới.
- Segmented toggle (Chi/Thu, Nhóm khẩu phần, Mức ưu tiên) triển khai theo ngữ nghĩa nhóm lựa chọn loại trừ lẫn nhau (radio-group), công bố lựa chọn đang active.
- Nút chuyển sáng/tối đã có `aria-label`/`title` mô tả hành động ("Chuyển giao diện sáng/tối") trong mọi mock — giữ nguyên khi lên code thật, không rút gọn thành icon trần không nhãn.
- Toàn bộ icon dùng emoji/glyph (⚠ ℹ ✓ 🌙 📅...) theo `DESIGN.md`'s Iconography không bao giờ là kênh mang nghĩa duy nhất — luôn đi kèm chữ (đã đúng xuyên suốt mọi mock); icon thuần trang trí phải đánh dấu `aria-hidden`.
- Vì không có notification chủ động ở bất kỳ module nào, không có luồng gián đoạn bất ngờ nào cần xử lý cho công nghệ hỗ trợ — không có toast/banner tự bật ngoài luồng thao tác của chính người dùng; mọi thông báo trên màn hình đều là hệ quả trực tiếp của một hành động người dùng vừa thực hiện.

## Khoảng trống & Quyết định còn mở

Các điểm dưới đây đã được quyết định (áp dụng nhất quán các nguyên tắc đã có trong tài liệu: không friction, không confirm dialog, một hub duy nhất, forward-only edit) thay vì để ngỏ — nêu lại ở đây để lần review tiếp theo dễ xác nhận hoặc chỉnh sửa:

1. **Màn hình Lộ trình học tập** và **Ngân sách & Danh mục chi tiêu** — vẫn chưa có mock trực quan (chỉ có đặc tả hành vi từ FR-5/7/11/12/13). Không chặn tiến độ vì hành vi đã đủ rõ để kiến trúc/build dựa vào; bố cục cụ thể để lại cho lúc code màn hình đó.
2. **Xem lại Lịch trình ngày của các ngày trước**: điều hướng bằng nút lùi/tiến ngày (◀ ▶) ngay trên thẻ Lịch trình ở Hôm nay, kèm chỉ báo ngày đang xem — không tách thành surface riêng.
3. **Ngân sách vượt quá 100%**: dùng lại nguyên `threshold-alert-tag` đã có, chỉ đổi nhãn chữ thành "Đã vượt ngân sách" + số tiền vượt cụ thể — không thêm ngôn ngữ thị giác mới.
4. **Lọc Nguyên liệu 0 món khớp**: lưới hiện thông điệp trung tính "Không có món nào chứa nguyên liệu này" + một liên kết chữ "Xoá bộ lọc".
5. **Gate hoàn thành Mốc Tiếng Anh**: nút "Hoàn thành Mốc" hiển thị mờ/vô hiệu hoá ngay trong thẻ Mốc đó cho tới khi Điểm số Bài test được nhập tại chỗ — không mở modal riêng, giữ đúng nguyên tắc "một hub, không điều hướng thừa".
6. **Xoá Task khỏi Mẫu lịch trình**: không có bước xác nhận — nhất quán với việc không có confirm dialog nào khác trong toàn app.
7. **Trạng thái rỗng lần đầu dùng app**: mỗi thẻ trong 4 thẻ ở Hôm nay hiện một dòng gợi ý ngắn + nút hành động chính để tạo mục đầu tiên (ví dụ thẻ Học tập rỗng: "Chưa có buổi học nào — Ghi buổi học đầu tiên").
8. **Thời lượng hiển thị Confirmation toast**: tự ẩn sau 3 giây.
9. **Bấm vào `scrim`**: đóng sheet ngay, không lưu — hành vi giống hệt bấm "Huỷ".

## Key Flows

### UJ-1 — Một buổi tối điển hình (chị Linh*, sau bữa tối, hai con đã ngủ)

*"Chị Linh" là tên minh hoạ cho persona người dùng (PRD/brief không đặt tên cụ thể) — dùng để hành văn journey tự nhiên hơn, không phải một chi tiết sản phẩm.

1. Chị Linh dọn dẹp xong bếp, ngồi vào máy tính, mở app. Hôm nay hiện ra ngay: 4 thẻ Lịch trình, Chi tiêu, Thực đơn, Học tập — đủ thấy toàn cảnh trong một lượt quét mắt, không cần điều hướng.
2. Thẻ "Lịch trình — Ngày mai" đã có sẵn các Task khởi tạo tự động từ Mẫu lịch trình. Chị bấm "+ Thêm việc cho ngày mai", chỉnh vài Task riêng cho hôm sau (ví dụ dời giờ đón con) — chỉ ảnh hưởng Lịch trình ngày mai, không đụng Mẫu gốc.
3. Chị mở sheet thêm giao dịch nhanh từ thẻ Chi tiêu, chọn Chi, gõ số tiền vừa mua rau thịt buổi chiều, chọn danh mục Ăn uống, để ngày mặc định hôm nay, bấm Lưu. Sheet đóng ngay, toast xác nhận hiện.
4. Vì Giao dịch này đẩy danh mục Ăn uống xuống dưới ngưỡng 30% còn lại trong tháng, khối cảnh báo ngân sách hiện NGAY trên cùng Hôm nay — chị nhìn thấy hệ quả tức thời, không phải rời sang một màn báo cáo riêng mới biết.
5. Chị chuyển sang thẻ Thực đơn, mở Ngân hàng món ăn, lọc theo một nguyên liệu đang có sẵn trong tủ lạnh. Ở cột "Người lớn & bé 4 tuổi", chị chọn món cho ba bữa và thêm ghi chú điều chỉnh riêng cho bé 4 tuổi ở bữa trưa; độc lập hoàn toàn, chị chọn món ăn dặm riêng cho cột "Bé dưới 1 tuổi" — hai cột không ảnh hưởng lẫn nhau.
6. Trước khi đóng máy, chị mở thẻ Học tập, ghi một Buổi học 30 phút vừa hoàn thành cho Automation Test, kèm nội dung đã học.
7. **Đỉnh điểm:** Chị đóng máy. Hôm nay giờ phản chiếu trọn vẹn buổi tối vừa rồi ngay trên cùng một màn hình duy nhất: Lịch trình ngày mai đã sẵn sàng, ngân sách Ăn uống đang ở trạng thái cảnh báo nhưng đã được nhìn thấy chứ không bị giấu, Thực đơn ngày mai đủ cho cả ba miệng ăn trong nhà, và Học tập vừa cộng thêm 30 phút vào Lộ trình 7 Mốc. Bốn thao tác, một phiên, chưa đầy vài phút — đúng như UJ-1 mô tả — và không có gì cần chờ thông báo hay quay lại kiểm tra sau.

Gián đoạn: nếu chị bị gián đoạn giữa chừng (ví dụ con thức giấc ngay lúc đang gõ ghi chú Nhóm khẩu phần), mọi thao tác đã bấm Lưu trước đó (Task check-off, Giao dịch, Buổi học) vẫn giữ nguyên — vì mỗi thao tác tự chốt ngay khi bấm hành động chính của nó, không có một trạng thái "nháp" gộp chung cho cả phiên có thể bị mất theo.
