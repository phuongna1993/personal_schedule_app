---
name: App Quản Lý Cá Nhân Đa Năng
status: final
created: 2026-08-19
updated: 2026-08-20
description: Ứng dụng cá nhân một-người-dùng (không đăng nhập, chỉ desktop) giúp một người mẹ đang đi làm quản lý lịch trình hằng ngày, chi tiêu, thực đơn gia đình và lộ trình học tập trong vài phút mỗi tối — hướng "Khoảng Thở": thẻ bo tròn, nhiều khoảng trắng, tông giấy kraft ấm pha xanh lá xô thơm.
colors:
  surface-base: '#F5F1EA'
  surface-raised: '#FCFAF6'
  surface-sunken: '#EAE3D6'
  border-hairline: '#DDD3BF'
  ink-primary: '#3D3730'
  ink-secondary: '#665D4F'
  ink-tertiary: '#948A78'
  accent: '#7A9471'
  accent-ink: '#FFFFFF'
  success: '#6B8F5E'
  surface-base-dark: '#211E17'
  surface-raised-dark: '#2B2820'
  surface-sunken-dark: '#363228'
  border-hairline-dark: '#47412F'
  ink-primary-dark: '#F0E9DA'
  ink-secondary-dark: '#C7BCA3'
  ink-tertiary-dark: '#8F8368'
  accent-dark: '#9BB98F'
  accent-ink-dark: '#1B2417'
  success-dark: '#8FAF83'
typography:
  stat:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 26px
    fontWeight: '800'
    lineHeight: '1'
  amount:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 22px
    fontWeight: '700'
    lineHeight: '1.1'
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.3'
  heading:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 16px
    fontWeight: '700'
    lineHeight: '1.3'
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 13.5px
    fontWeight: '500'
    lineHeight: '1.5'
  label-caps:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 12.5px
    fontWeight: '700'
    lineHeight: '1.4'
    letterSpacing: 0.4px
  caption:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 11.5px
    fontWeight: '600'
    lineHeight: '1.5'
  micro:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 10.5px
    fontWeight: '700'
    lineHeight: '1.3'
rounded:
  xs: 8px
  sm: 10px
  md: 12px
  lg: 16px
  xl: 22px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 24px
  '6': 32px
  '7': 40px
  gutter: 24px
  card-padding: '26px 28px'
  card-padding-compact: '18px 20px'
  sheet-padding: '22px 24px'
  screen-padding: '32px 40px 44px'
components:
  card:
    background: '{colors.surface-raised}'
    border: '1px solid {colors.border-hairline}'
    radius: '{rounded.xl}'
    radius-compact: '{rounded.lg}'
    padding: '{spacing.card-padding}'
    shadow: '0 14px 28px -20px rgba(61,55,48,.25)'
  filter-chip:
    background: '{colors.surface-raised}'
    background-active: '{colors.accent}'
    foreground: '{colors.ink-secondary}'
    foreground-active: '{colors.accent-ink}'
    border: '1px solid {colors.border-hairline}'
    radius: '{rounded.full}'
  segmented-toggle:
    track-border: '1px solid {colors.border-hairline}'
    item-foreground: '{colors.ink-tertiary}'
    item-background-active: '{colors.accent}'
    item-foreground-active: '{colors.accent-ink}'
    radius: '{rounded.full}'
  quick-add-sheet:
    background: '{colors.surface-raised}'
    border: '1px solid {colors.border-hairline}'
    radius: '{rounded.xl}'
    padding: '{spacing.sheet-padding}'
    scrim: '{colors.ink-primary} @ 32% opacity'
    shadow-floating: '0 24px 60px -20px rgba(61,55,48,.45)'
    shadow-docked: '0 -14px 40px -12px rgba(61,55,48,.35)'
  threshold-alert-tag:
    background: '{colors.accent}'
    foreground: '{colors.accent-ink}'
    radius: '{rounded.full}'
    parent-border-left: '4px solid {colors.accent}'
  confirmation-toast:
    background: '{colors.surface-raised}'
    foreground: '{colors.ink-primary}'
    border-left: '4px solid {colors.success}'
    radius: '{rounded.md}'
  info-callout:
    background: '{colors.surface-sunken}'
    foreground: '{colors.ink-secondary}'
    border-left: '4px solid {colors.ink-tertiary}'
    radius: '{rounded.md}'
  button-primary:
    background: '{colors.accent}'
    foreground: '{colors.accent-ink}'
    radius: '{rounded.full}'
  button-ghost:
    background: 'transparent'
    border: '1px solid {colors.border-hairline}'
    foreground: '{colors.ink-secondary}'
    radius: '{rounded.full}'
  button-icon:
    background: '{colors.surface-raised}'
    border: '1px solid {colors.border-hairline}'
    foreground: '{colors.ink-tertiary}'
    foreground-hover: '{colors.accent}'
    radius: '{rounded.xs}'
  input-field:
    background: '{colors.surface-sunken}'
    border: '1px solid {colors.border-hairline}'
    foreground: '{colors.ink-primary}'
    placeholder: '{colors.ink-tertiary}'
    radius: '{rounded.sm}'
  progress-bar:
    track: '{colors.surface-sunken}'
    fill: '{colors.accent}'
    radius: '{rounded.full}'
---

## Brand & Style

App Quản Lý Cá Nhân Đa Năng là không gian riêng của một người — không tài khoản chia sẻ, không thông báo đẩy, không tính năng "khoe" ai cả. Người dùng là một người mẹ đang đi làm, mở app vài phút mỗi tối sau khi hai con đã ngủ, để nhìn lại một ngày và chuẩn bị cho ngày mai: lịch trình, chi tiêu, thực đơn, và một chút học tập cho riêng mình. Toàn bộ hệ thị giác phục vụ đúng một khoảnh khắc đó — không phải một công cụ năng suất "hùng hổ", mà một cuốn sổ tay ấm áp, dễ lần giở.

Định hướng đã chọn là **"Khoảng Thở"**: bảng màu giấy kraft ấm (nền be ngà, không trắng lạnh) làm nền, một màu nhấn xanh lá xô thơm duy nhất, thẻ bo góc lớn và khoảng trắng rộng rãi để mắt không bị dồn nén sau một ngày dài. Đây là lựa chọn có chủ đích để đáp ứng đúng yêu cầu "phù hợp với phụ nữ, dễ sử dụng, nhẹ nhàng" — nữ tính bằng sự ấm áp và tinh tế của màu sắc/hình khối, không bằng màu hồng sáo rỗng; nhẹ nhàng bằng khoảng trắng và độ tương phản dịu, không bằng việc lược bớt thông tin. Mật độ nội dung ở mức "vừa/thoáng": đủ thấy toàn cảnh bốn mảng trong một lượt quét mắt, không bị ép phải cuộn nhiều nhưng cũng không nhồi nhét.

Cả hai chế độ sáng/tối đều là yêu cầu bắt buộc, không phải phần thêm — chế độ tối được xác nhận là chế độ dùng thực tế vào buổi tối/đêm, nên nó không được "xám xịt kỹ thuật" mà giữ đúng tinh thần ấm áp: nền tối ngả nâu kraft, chữ ngả kem, xanh xô thơm được làm sáng hơn để giữ tương phản mà không cần chuyển sang trắng gắt.

## Colors

Bảng màu tuân thủ kỷ luật "một màu nhấn duy nhất" của phong cách Giấy Kraft, cộng thêm một tông xanh xô thơm làm điểm nhấn cảm xúc.

- **{colors.surface-base}** (`#F5F1EA` sáng / `#211E17` tối) là nền canvas của toàn app — be ngà ấm ở chế độ sáng, nâu kraft đậm ở chế độ tối. Không dùng trắng thuần hay đen thuần ở bất kỳ chế độ nào; đây là điều giữ cảm giác "giấy", không phải "màn hình".
- **{colors.surface-raised}** (`#FCFAF6` / `#2B2820`) là nền của mọi thẻ nội dung (card), sheet, và ô thoại — tách khỏi `surface-base` chỉ bằng sắc độ rất nhẹ, không dùng viền đậm hay đổ bóng gắt để phân lớp.
- **{colors.surface-sunken}** (`#EAE3D6` / `#363228`) là nền lõm cho các phần tử bên trong thẻ: khối nhập liệu nhanh, input, thanh tiến trình rỗng, nền chip không active. Đậm hơn `surface-raised` một bậc để tạo cảm giác "trũng xuống" nhẹ.
- **{colors.border-hairline}** (`#DDD3BF` / `#47412F`) là viền/chia dòng ở độ tương phản thấp nhất còn đọc được — dùng cho viền thẻ, viền input, và các dòng chia (thường là nét đứt) trong danh sách.
- **{colors.ink-primary}**, **{colors.ink-secondary}**, **{colors.ink-tertiary}** là ba bậc chữ: chính (tiêu đề, số liệu, tên món/việc), phụ (mô tả, nhãn phụ), và bậc ba (mốc giờ, chú thích, placeholder). Cả ba đều lấy từ cùng một tông nâu kraft ấm, chỉ khác độ đậm nhạt — không dùng xám lạnh.
- **{colors.accent}** (`#7A9471` / `#9BB98F` — xanh xô thơm) là màu nhấn *duy nhất* của toàn hệ thống. Dùng cho: nút hành động chính, trạng thái active của chip/toggle/tab, số phần trăm/tiến trình, avatar, và cảnh báo ngân sách (không phải qua một màu cảnh báo riêng — xem phần Do's and Don'ts). Không dùng cho trang trí, không dùng cho nhiều sắc thái khác nhau.
- **{colors.accent-ink}** là màu chữ đặt trên nền `accent`. Ở chế độ sáng đây là trắng thuần (`#FFFFFF`); ở chế độ tối, vì `accent` được làm sáng lên để đủ tương phản trên nền tối, chữ trên nó lại là **mực tối** (`#1B2417`), không phải trắng — đảo ngược logic thông thường "chữ sáng trên nút accent". Đây là chi tiết dễ bị bỏ sót khi lập trình dark mode.
- **{colors.success}** (`#6B8F5E` / `#8FAF83`) là một sắc xanh lá gần họ với `accent` nhưng tách biệt — dùng riêng cho xác nhận "đã lưu thành công" (toast). Nó không thay thế `accent` và không được dùng cho bất kỳ mục đích nào khác; sự tồn tại của nó là ngoại lệ duy nhất cho kỷ luật một-màu-nhấn, vì nó phục vụ một loại phản hồi khác (xác nhận, không phải nhấn mạnh hành động).

Tránh: đỏ/cam cho bất kỳ trạng thái nào (kể cả cảnh báo ngân sách), gradient, và mọi sắc thái chromatic ngoài `accent`/`success`.

## Typography

Toàn bộ hệ chữ dùng font hệ thống mặc định của trình duyệt/OS (`-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`) — không có bộ chữ tuỳ biến riêng. Đây là lựa chọn có chủ đích cho một sản phẩm cá nhân, chạy nhanh, không cần tải font ngoài.

Thang chữ đi từ số liệu nổi bật xuống chú thích nhỏ nhất:

- **{typography.stat}** (26px/800) — số phần trăm ngân sách còn lại (`pct-big`), điểm nhấn số liệu quan trọng nhất trên màn hình cảnh báo.
- **{typography.amount}** (22px/700) — số tiền đang nhập trong sheet thêm giao dịch nhanh, căn phải, đứng riêng để bấm nhanh mà không cần đọc kỹ.
- **{typography.title}** (20px/700) — lời chào đầu ngày ("Chào buổi tối 🌙"), tiêu đề màn hình con (vd. "Mẫu lịch trình").
- **{typography.heading}** (16px/700) — tiêu đề mỗi thẻ nội dung (`card h2`): "Lịch trình — Ngày mai", "Chi tiêu — Hôm nay", v.v.
- **{typography.body}** (13.5px/500) — nội dung chính trong danh sách: tên việc, tên món ăn, tên lộ trình học.
- **{typography.label-caps}** (12.5px/700, tracking 0.4px, viết hoa) — nhãn trường trong biểu mẫu ("SỐ TIỀN (VNĐ)", "TASK MỚI") và tiêu đề mục nhỏ.
- **{typography.caption}** (11.5px/600, thường dùng {colors.ink-tertiary}) — mốc giờ, dòng phụ chú (`sub`), mô tả ngắn dưới tiêu đề thẻ.
- **{typography.micro}** (10.5px/700) — nhãn pill nhỏ nhất: tag định hướng, badge mức ưu tiên, nhãn "khớp"/"hôm nay".

Không có kiểu chữ in nghiêng hay độ đậm nào ngoài 500/600/700/800 — giữ bảng chữ gọn để cảm giác luôn nhất quán, không "ồn".

## Layout & Spacing

Sản phẩm chỉ chạy trên desktop (không có breakpoint mobile), nên bố cục được thiết kế thẳng cho khung rộng: dashboard dùng lưới 2×2 thẻ đều nhau (`gap: {spacing.gutter}`), màn hình gán thực đơn dùng hai cột song song bằng nhau cho hai Nhóm khẩu phần. Không có sidebar cố định hay điều hướng phức tạp — mỗi màn hình là một trang riêng với đường "← Về..." để quay lại, phù hợp một phiên dùng vài phút mỗi tối.

Padding nội dung màn hình chính là `{spacing.screen-padding}` (32px trên/dưới lệch, 40px hai bên) — rộng rãi có chủ đích. Thẻ dùng `{spacing.card-padding}` (26px/28px); các thẻ phụ/thu gọn trong ngữ cảnh dày hơn (ví dụ khối ngân sách cạnh sheet) dùng `{spacing.card-padding-compact}`. Khoảng cách giữa các thẻ trong lưới và giữa các khối lớn là `{spacing.gutter}` (24px) — đây là "nhịp thở" chính giữa các mảng nội dung.

Bên trong một thẻ, các dòng danh sách (task, món ăn, môn học) cách nhau 8–14px và phân tách bằng đường viền **nét đứt** ở `{colors.border-hairline}` — nét đứt thay vì nét liền là lựa chọn nhất quán trong toàn bộ mock, tạo cảm giác "sổ tay kẻ dòng" thay vì bảng dữ liệu cứng nhắc. Dòng cuối cùng trong mỗi danh sách luôn bỏ viền dưới.

## Elevation & Depth

Đổ bóng được dùng có chừng mực, mềm và tán rộng — không phải bóng cứng kiểu Material. Mọi bóng đều lấy màu từ `{colors.ink-primary}` ở độ mờ thấp (`rgba(61,55,48, .25–.45)`), tạo cảm giác thẻ "nổi nhẹ" trên nền giấy chứ không phải vật thể kim loại có nguồn sáng rõ. Ba mức xuất hiện trong mock:

- Thẻ nội dung thường: bóng lan toả rộng nhưng rất nhạt (`0 14px 28px -20px`), gần như chỉ đọc được ở viền dưới thẻ.
- Sheet/modal nổi (thêm giao dịch nhanh): bóng đậm và lan rộng hơn hẳn (`0 24px 60px -20px`, mờ .45) để tách nó khỏi nền dashboard đã bị làm mờ (`scrim` — `{colors.ink-primary}` phủ 32% lên toàn bộ nền phía sau).
- Sheet dạng "gắn đáy" (docked, ví dụ bảng xem trước ở góc dashboard): bóng hắt lên phía trên (`0 -14px 40px -12px`) vì nó neo ở cạnh dưới màn hình.

Lưu ý: các giá trị bóng trong mock không có biến thể riêng cho chế độ tối — cùng một giá trị `rgba` được dùng cho cả sáng và tối. Khi lên production nên cân nhắc giảm nhẹ độ mờ ở chế độ tối (nền tối khiến bóng cùng thông số trông đậm hơn), nhưng đây là suy luận hợp lý, không phải giá trị đã chốt trong mock.

## Shapes

Bo góc là đặc điểm nhận diện rõ nhất của hệ thống — không có góc vuông sắc ở bất kỳ thành phần tương tác nào.

- **{rounded.xs}** (8px) — nút icon nhỏ (sửa/xoá trên mỗi dòng task).
- **{rounded.sm}** (10px) — mọi ô nhập liệu, ô chọn kiểu dropdown (input, note-input, date-field, meal-select).
- **{rounded.md}** (12px) — khối callout: hộp cảnh báo ngân sách, hộp giải thích trung tính, toast xác nhận.
- **{rounded.lg}** (16px) — thẻ món ăn trong Ngân hàng món ăn, thẻ "thêm món mới" (nét đứt).
- **{rounded.xl}** (22px) — thẻ nội dung chính trên dashboard, sheet/modal nổi. Đây là bo góc lớn nhất cho một khối chữ nhật, đúng tinh thần "thẻ mềm" của hướng Khoảng Thở.
- **{rounded.full}** (9999px, hoặc 50% cho hình tròn hoàn hảo) — mọi thứ có thể bấm hoặc chọn: nút, chip, tag, segmented toggle, thanh tiến trình, avatar, các chấm tròn trạng thái/mức ưu tiên.

Quy tắc ngầm: **hình chữ nhật chứa nội dung → bo lớn (16–22px); hình tương tác/nhãn nhỏ → bo tràn (pill/tròn)**. Không có giá trị bo góc nào ở giữa hai nhóm này — sự tương phản giữa "khối" và "nút" là một phần của ngôn ngữ hình khối.

## Components

- **Card** — `{components.card}`. Khối chứa chính của mọi màn hình (Lịch trình, Chi tiêu, Thực đơn, Học tập, và mỗi cột Nhóm khẩu phần). Nền `surface-raised`, viền hairline mảnh, bo `{rounded.xl}`, bóng nhẹ. Luôn có `heading` + dòng `caption` phụ đề ngay dưới, rồi đến danh sách nội dung.
- **Task/list row** — dòng trong Card, gồm mốc giờ (`caption`, cột cố định ~44–46px), tên (`body`), và một chấm/badge mức ưu tiên ở cuối. Ngăn cách bằng viền đứt, dòng cuối không viền.
- **Priority badge** (`badge-pri`) — ba trạng thái: Cao (nền `accent` đặc, chữ `accent-ink`), Trung bình (nền `surface-sunken`, viền hairline, chữ `ink-secondary`), Thấp (trong suốt, viền đứt, chữ `ink-tertiary`). Mức độ nhấn giảm dần bằng độ "đặc" của nền, không đổi màu sắc.
- **Filter/category chip** (`filter-chip`, dùng lại cho `cat-chip` chọn danh mục chi tiêu và `ing-chip` lọc nguyên liệu) — `{components.filter-chip}`. Trạng thái active luôn là nền `accent` đặc + chữ `accent-ink`; trạng thái thường là viền hairline mảnh trên nền `surface-raised`.
- **Segmented toggle** (`seg`/`seg-btn`) — dùng cho Chi/Thu, chọn Nhóm khẩu phần, chọn mức ưu tiên khi thêm task. `{components.segmented-toggle}`. Cùng logic active với chip: nền `accent` đặc là dấu hiệu duy nhất của lựa chọn hiện tại.
- **Quick-add sheet** (`sheet-modal` + `scrim`, và biến thể gắn đáy `sheet`) — `{components.quick-add-sheet}`. Nổi trên dashboard đã bị làm mờ bằng scrim, không chuyển trang. Có tiêu đề canh giữa, các trường theo thứ tự loại giao dịch → số tiền → danh mục (chỉ hiện khi Chi) → ngày (mặc định hôm nay, có nhãn "Hôm nay") → ghi chú tuỳ chọn, và hai nút hành động cuối cùng (Huỷ dạng ghost, Lưu dạng primary).
- **Threshold alert tag & budget card** (`threshold-tag`, `pct-big`, `alert-box`) — `{components.threshold-alert-tag}`. Khi một danh mục ngân sách tụt dưới ngưỡng cố định 30% còn lại, hệ thống nhấn mạnh bằng: số phần trăm lớn (`stat`), pill cảnh báo nền `accent` đặc ("⚠ Dưới ngưỡng cảnh báo 30%"), và một khối giải thích riêng (`alert-box`, viền trái 4px `accent`) — **không** đổi sang màu đỏ/cam. Cảnh báo là một hình thức *nhấn mạnh bằng chính màu accent*, không phải một kênh màu sắc riêng.
- **Confirmation toast** (`toast`) — `{components.confirmation-toast}`. Xuất hiện ngay sau khi lưu giao dịch thành công, viền trái 4px màu `success` — màu duy nhất trong hệ thống tách biệt khỏi `accent`, chỉ dùng cho xác nhận tích cực tức thời.
- **Info callout** (`info-box`) — `{components.info-callout}`. Khác `alert-box` ở chỗ trung tính: viền trái `ink-tertiary` thay vì `accent`, dùng để giải thích hành vi hệ thống (vd. "sửa Mẫu lịch trình không ảnh hưởng các Lịch trình ngày đã tạo trước", "hai Nhóm khẩu phần hoàn toàn độc lập") — không phải cảnh báo, chỉ là ghi chú giúp hiểu đúng mô hình dữ liệu.
- **Dish card** (`dish-card`, `dish-photo`) — thẻ trong lưới Ngân hàng món ăn, bo `{rounded.lg}`. Ảnh minh hoạ được thay bằng khối màu đặc + emoji (chưa có ảnh thật/mạng); món khớp bộ lọc nguyên liệu được viền `accent` + nhãn "✓ khớp", món không khớp bị làm mờ (`opacity: .5`) thay vì ẩn hẳn — giữ ngữ cảnh toàn bộ Ngân hàng luôn hiện diện.
- **Nguyên liệu chip** (`ing-chip`) — chip nhỏ trong thẻ món, trạng thái "khớp bộ lọc" (`hit`) đảo nền sang `accent` đặc để nổi bật ngay trong danh sách nguyên liệu.
- **Buttons** — `{components.button-primary}` (nền `accent`, pill, dùng cho hành động chính: Lưu), `{components.button-ghost}` (viền hairline, trong suốt, dùng cho Huỷ/phụ), `{components.button-icon}` (hình vuông bo `{rounded.xs}`, dùng cho sửa/xoá dòng — đổi màu viền/chữ sang `accent` khi hover).
- **Input field** — `{components.input-field}`. Nền `surface-sunken` (trũng hơn thẻ chứa nó), viền hairline, bo `{rounded.sm}`. Dùng chung cho input text, ô ghi chú, ô ngày, ô chọn dropdown-style.
- **Progress bar** (`bar`) — `{components.progress-bar}`. Track `surface-sunken`, phần đã hoàn thành/đã chi tô `accent` đặc. Dùng cho cả tiến độ task trong ngày và tỉ lệ ngân sách đã dùng — cùng một thị giác cho hai khái niệm "đã hoàn thành bao nhiêu phần".
- **Iconography** — không dùng bộ icon vector riêng; toàn bộ ký hiệu là emoji/glyph Unicode đơn giản (⚠, ℹ, ✓, 📅, 🌙, ✎, ✕, 🥩, 🐟...). Đây là lựa chọn nhất quán xuyên suốt mọi mock, giữ chi phí dựng giao diện thấp cho một sản phẩm cá nhân.

## Do's and Don'ts

| Nên | Không nên |
|---|---|
| Dùng `{colors.accent}` cho mọi hành động chính, trạng thái active, VÀ cảnh báo ngân sách | Thêm màu đỏ/cam/vàng cảnh báo riêng ngoài palette |
| Nhấn mạnh cảnh báo bằng viền trái đậm + pill chữ đậm + số liệu lớn | Dùng icon chuông/dấu than màu đỏ để báo động |
| Giữ `{colors.success}` chỉ cho xác nhận "đã lưu" tức thời | Dùng `success` cho tiến độ, hoàn thành task, hay trạng thái khác |
| Bo góc lớn (`{rounded.lg}`–`{rounded.xl}`) cho khối nội dung, bo tràn (`{rounded.full}`) cho mọi thứ bấm được | Bo góc nhỏ/vuông cho card hoặc dùng bo tràn cho khối chứa nội dung dài |
| Viền chia dòng bằng nét đứt, độ tương phản thấp | Dùng viền liền đậm hoặc nền sọc để phân tách danh sách |
| Đảo `{colors.accent-ink}` sang mực tối khi ở chế độ tối (vì accent được làm sáng lên) | Giữ chữ trắng trên nút accent ở chế độ tối (sẽ mất tương phản/không nhất quán) |
| Sheet thêm nhanh nổi trên nền bị làm mờ, không chuyển trang | Chuyển sang trang riêng cho thao tác dùng nhiều nhất trong ngày |
| Card không khớp bộ lọc thì làm mờ (`opacity`), vẫn hiện diện | Ẩn hẳn kết quả không khớp khỏi Ngân hàng món ăn |
| Icon là emoji/glyph đơn giản, nhất quán | Trộn thêm bộ icon vector khác vào cùng giao diện |
