---
type: adversarial-review
target: ../ARCHITECTURE-SPINE.md
purpose: Tìm cặp unit "một tầng dưới spine" (2 Server Actions / 2 màn hình) mà mỗi cái đều tuân thủ đúng chữ của một/nhiều AD, nhưng build ra kết quả không tương thích với nhau.
method: đọc từng AD + Consistency Conventions, tìm chỗ Rule chỉ ràng buộc "cái gì được phép/cấm" mà không ràng buộc "hình dạng cụ thể" — khoảng trống đó là nơi hai lần code (hai action, hai màn hình, hoặc cùng action viết ở hai thời điểm khác nhau bởi AI coding agent không có bộ nhớ giữa các phiên) có thể chọn hai hình dạng khác nhau, cả hai đều hợp lệ với chữ của AD.
verdict: Spine chặn tốt các vi phạm ranh giới lớn (module đọc chéo bảng, ghi ngoài Server Action, blob ảnh trong DB) — nhưng KHÔNG chặn phân kỳ hình dạng ở tầng "giao diện dữ liệu giữa các unit cùng module hoặc giữa module và tầng tổng hợp Dashboard". Tìm được 9 lỗ hổng phân kỳ cụ thể, xếp theo mức độ nghiêm trọng.
updated: '2026-08-29'
---

# Adversarial Review — ARCHITECTURE-SPINE.md

## Tóm tắt verdict

Spine này rất chặt ở tầng "ai được phép chạm gì" (AD-1, AD-3, AD-5, AD-6 đều là loại rule cấm-đường-vào, dễ kiểm tra bằng cách đọc import statement). Nhưng có **6 AD/convention chỉ định nghĩa một union/kiểu dữ liệu ở mức khung** (`{ ok, data|error }`, "đường dẫn tương đối", "DateTime ISO 8601", "số nguyên đồng", "một hàng con trỏ hiện hành", "một callout") mà không khoá **hình dạng cụ thể bên trong khung đó**. Một AI coding agent build từng Server Action/màn hình riêng lẻ, không có bộ nhớ giữa các phiên, sẽ hợp lý hoá phần chưa khoá đó theo hai cách khác nhau ở hai lần gọi — và cả hai lần đều "đúng luật" khi review riêng lẻ từng cái với spine. Đây chính là cách một agent build-theo-spine vẫn tạo ra hàng ghép nối lỗi.

9 lỗ hổng cụ thể dưới đây, nghiêm trọng nhất trước.

---

## 1. Dấu số tiền `GiaoDich.soTien` — không có quy ước dương/âm

**AD/Convention khai thác:** Consistency Conventions → Data & formats ("Số tiền VNĐ lưu dưới dạng số nguyên đồng (`Int`)...") + AD-3 (mỗi Server Action tự validate/tính toán độc lập) + FR-6 alert convention ("Server Action ghi `GiaoDich` phải tự tính... trạng thái cảnh báo ngân sách").

**Hai unit không tương thích:**
- **Unit A — `taoGiaoDich` (sheet ghi nhanh, FR-4/FR-6, `chi-tieu/actions.ts`):** lưu `soTien: Int` luôn dương, kèm cột `loai: 'THU' | 'CHI'`. Khi tính cảnh báo vượt ngân sách, action này `SUM(soTien) WHERE loai = 'CHI' AND thang = X` — logic đúng, tự-chứa trong action này, đúng luật AD-3 và convention Int.
- **Unit B — query "Xem tổng thu/chi theo tháng" (FR-7, có thể là một Server Component gọi Prisma trực tiếp, hợp lệ theo AD-3's "Đọc dữ liệu có thể qua Server Component gọi Prisma trực tiếp"):** được build ở một phiên khác, agent chọn quy ước "chi tiêu lưu số âm, thu lưu số dương" (một cách phổ biến trong ví dụ kế toán mà agent học được), nên viết `tổng = SUM(soTien)` trực tiếp không lọc theo `loai`, giả định dấu tự mã hoá chiều.

**Phân kỳ cụ thể:** Nếu schema Prisma cuối cùng theo Unit A (số luôn dương + cột `loai`), FR-7 query của Unit B cho ra "tổng thu/chi" sai (cộng dồn cả hai chiều thành một số dương khổng lồ thay vì hiệu số). Ngược lại nếu ai đó review Unit B trước và fix schema cho phép âm, thì cảnh báo ngân sách của Unit A (lọc `loai='CHI'` rồi cộng số dương) vẫn chạy đúng nhưng giờ tổng chi và tổng theo FR-7 lệch nhau ở happy-path lẫn khi có dữ liệu Thu. Đây là cùng một cột `GiaoDich.soTien` bị hai unit ngầm định hai ngữ nghĩa khác nhau — không AD nào cấm việc này vì cả hai đều "lưu Int".

**Đề xuất tightening AD:** Thêm vào convention Data & formats một câu khoá cứng: *"`GiaoDich.soTien` luôn lưu giá trị dương (`Int > 0`); chiều Thu/Chi được xác định độc lập qua cột `loai`. Mọi phép tính tổng (ngân sách, FR-7) phải luôn lọc/nhân dấu theo `loai`, không bao giờ suy ra chiều từ dấu của `soTien`."*

---

## 2. Vị trí payload cảnh báo ngân sách trong response — không có schema

**AD/Convention khai thác:** Consistency Conventions → State & cross-cutting ("Server Action ghi `GiaoDich` phải tự tính và trả kèm trạng thái cảnh báo ngân sách... ngay trong cùng response").

**Hai unit không tương thích:**
- **Unit A — `taoGiaoDich`:** trả `{ ok: true, data: { giaoDich, canhBaoNganSach: { vuotNguong: boolean, phanTram: number } } }` — cảnh báo nằm lồng trong `data`.
- **Unit B — `suaGiaoDich`** (sửa một giao dịch đã ghi — cũng làm thay đổi tổng chi trong tháng nên cũng thuộc phạm vi rule này, cùng file `actions.ts`, build ở lượt sau): trả `{ ok: true, data: giaoDich, canhBao: { vuotNguong, phanTram } }` — cảnh báo nằm ngang hàng `data`, không lồng bên trong.

**Phân kỳ cụ thể:** Component `threshold-alert-tag` (đã chốt ở EXPERIENCE.md) được build một lần, dùng chung cho cả hai action này (sheet ghi nhanh cho phép sửa giao dịch tại chỗ). Nếu component đọc `result.data.canhBaoNganSach`, nó câm lặng với `suaGiaoDich` (field không tồn tại ở đường dẫn đó). Không AD nào bị vi phạm — cả hai action đều "trả kèm trạng thái cảnh báo ngân sách... trong cùng response".

**Đề xuất tightening AD:** Khoá cứng shape: *"Mọi Server Action có nghĩa vụ trả cảnh báo ngân sách phải dùng đúng field `data.canhBaoNganSach: { vuotNguong: boolean; phanTram: number } | null`, không có field top-level nào khác chứa cảnh báo này."*

---

## 3. Đường dẫn ảnh tương đối — tương đối so với đâu?

**AD/Convention khai thác:** AD-4 ("cột tương ứng trong bảng Prisma chỉ lưu đường dẫn tương đối (string)").

**Hai unit không tương thích:**
- **Unit A — `themMonAn` (tạo Món ăn kèm ảnh):** lưu path tương đối-so-với-thư-mục-uploads, ví dụ `mon-an/123.jpg`, và Route Handler ghép `path.join('app-data/uploads', segment)`.
- **Unit B — `themNguyenLieu` (tạo Nguyên liệu kèm ảnh, cùng AD-4, build phiên khác):** hiểu "đường dẫn tương đối" là tương đối-so-với-project-root (cách hiểu literal khác của "relative path" mà agent học từ context Node.js phổ biến), nên lưu `app-data/uploads/nguyen-lieu/456.jpg`.

**Phân kỳ cụ thể:** Route Handler `app/uploads/[...path]/route.ts` (một handler dùng chung cho cả hai loại ảnh, theo đúng AD-4) chỉ có một quy tắc ghép path. Nếu nó được viết khớp Unit A, ảnh Nguyên liệu của Unit B sẽ resolve thành `app-data/uploads/app-data/uploads/nguyen-lieu/456.jpg` — 404. Cả hai action đều tuân thủ đúng chữ AD-4 ("lưu đường dẫn tương đối, không lưu blob").

**Đề xuất tightening AD:** Thêm câu: *"Đường dẫn tương đối được lưu LUÔN tính từ gốc `app-data/uploads/` (không bao gồm tiền tố này); Route Handler ghép `path.join('app-data/uploads', giaTriCotLuu)`."*

---

## 4. Kiểu `error` trong union response — không có schema

**AD/Convention khai thác:** Consistency Conventions → State & cross-cutting ("Mỗi Server Action trả về một union tường minh dạng `{ ok: true; data } | { ok: false; error }`").

**Hai unit không tương thích:**
- **Unit A — `danhDauHoanThanhTask` (Lịch trình, FR-3):** `error: string` — một câu message tiếng Việt sẵn để hiện thẳng ra toast.
- **Unit B — `taoGiaoDich` (Chi tiêu, FR-4):** `error: { code: string; message: string; field?: string }` — object có cấu trúc để UI có thể highlight đúng field bị lỗi trong form.

**Phân kỳ cụ thể:** Cả hai đều khớp `{ ok: false; error }` — "error" không bị AD ràng buộc kiểu. Một component toast/snackbar dùng chung ở tầng Dashboard (hợp lý để tái dùng, không màn nào cấm) viết một lần để nhận `error` rồi `toast(result.error)` sẽ hiện `"[object Object]"` cho Unit B, hoặc nếu viết theo Unit B (`toast(result.error.message)`) thì crash/`undefined` khi nhận string thuần từ Unit A.

**Đề xuất tightening AD:** Khoá `error` thành một shape cụ thể ngay trong AD, ví dụ: *"`error` luôn có dạng `{ message: string }` tối thiểu (thêm field khác nếu cần nhưng `message` bắt buộc và luôn là string hiển thị được trực tiếp)."*

---

## 5. "Vị trí hiện tại trên Lộ trình" — cột con trỏ vật lý hay giá trị suy ra?

**AD/Convention khai thác:** AD-2 ("`hàng con trỏ hiện hành`" được liệt là ví dụ config hiện hành cho `LoTrinh`; "Thao tác sửa config hiện hành chỉ được phép... thay đổi hàng con trỏ hiện hành").

**Hai unit không tương thích:**
- **Unit A — `danhDauHoanThanhMoc` (Học tập, FR-13):** coi "vị trí hiện tại" là **suy ra được** — không có cột con trỏ nào cả; action chỉ UPDATE cờ `hoanThanh`/`ngayHoanThanh` trên hàng `Moc` tương ứng (đây vẫn đúng luật AD-2: không UPDATE hàng lịch sử đã Hoàn thành trước đó, chỉ ghi hàng hiện tại đang xử lý).
- **Unit B — Dashboard "Hôm nay" (tầng tổng hợp ở `app/(dashboard)/`, AD-1 cho phép tầng này đọc trực tiếp) hiển thị card tóm tắt Học tập:** được build giả định tồn tại cột vật lý `LoTrinh.mocHienTaiId` (khớp cách đọc literal của "hàng con trỏ hiện hành" — một hàng/cột con trỏ thật), nên query `loTrinh.mocHienTaiId` để hiện Mốc đang học.

**Phân kỳ cụ thể:** Nếu Học tập module không maintain cột con trỏ đó (vì AD-2 không bắt buộc nó phải tồn tại, chỉ nói "được phép thay đổi nếu có"), Dashboard đọc field `undefined`/`null` vĩnh viễn — card Học tập trên Hôm nay không bao giờ cập nhật, dù dữ liệu Mốc hoàn thành đã đúng theo AD-2. Ngược lại nếu Học tập module MỚI maintain con trỏ, `danhDauHoanThanhMoc` phải nhớ UPDATE thêm `LoTrinh.mocHienTaiId` trong cùng transaction — một chi tiết AD-2 không bắt buộc rõ, dễ bị quên ở một trong hai lần build.

**Đề xuất tightening AD:** AD-2 nên chốt dứt khoát MỘT trong hai cách, ví dụ: *"'Vị trí hiện tại trên Lộ trình' KHÔNG phải một cột vật lý; luôn được suy ra bằng truy vấn `Moc` đầu tiên theo thứ tự tuần tự có `hoanThanh = false`. Không tạo cột `mocHienTaiId` hay tương đương."* (hoặc ngược lại, bắt buộc cột và yêu cầu mọi action ghi Mốc phải update nó trong cùng transaction).

---

## 6. Gate Bài test đánh giá cho Mốc Tiếng Anh — một action dùng chung hay hai action tách riêng?

**AD/Convention khai thác:** AD-2 ("Server Action đánh dấu Hoàn thành phải tự kiểm tra điều kiện này trước khi ghi").

**Hai unit không tương thích:**
- **Unit A:** một Server Action duy nhất `danhDauHoanThanhMoc(mocId)` trong `hoc-tap/actions.ts`, bên trong tự branch: `if (kyNang.ten === 'Tiếng Anh') { kiểm tra BaiTestDanhGia... }`. Đúng luật AD-2 chữ-đúng-nghĩa.
- **Unit B:** hai action tách riêng `danhDauHoanThanhMocTiengAnh(mocId, diem)` và `danhDauHoanThanhMocAutomation(mocId)` — cũng "tự kiểm tra điều kiện trước khi ghi" (action Tiếng Anh bắt buộc tham số `diem`/kiểm tra tồn tại `BaiTestDanhGia`, action Automation không có gate) — cũng đúng luật AD-2 chữ-đúng-nghĩa, vì AD-2 không nói "một" hay "nhiều" action.

**Phân kỳ cụ thể:** Một component UI dùng chung "nút Hoàn thành Mốc" (hợp lý để tái dùng giữa 2 Kỹ năng, không AD nào cấm việc tái dùng UI) được viết cho Unit A sẽ gọi sai signature nếu Học tập module thật ra build theo Unit B (cần biết trước phải gọi action nào tuỳ `kyNang`, và với Tiếng Anh cần truyền thêm `diem` mà nút dùng chung không có ngữ cảnh đó). Đây là type-mismatch giữa UI-layer giả định và action-layer thật, cả hai phía đều tuân AD-2.

**Đề xuất tightening AD:** *"Chỉ có MỘT Server Action `danhDauHoanThanhMoc(mocId)` cho mọi Kỹ năng; logic rẽ nhánh gate nằm bên trong action đó, không tách thành nhiều action theo Kỹ năng."*

---

## 7. Callout AD-2 — hiện luôn hay chỉ hiện khi đã có hàng lịch sử?

**AD/Convention khai thác:** AD-2 ("Mọi màn hình áp dụng quy tắc này phải nêu rõ bằng một callout trung tính tại thời điểm sửa... không im lặng").

**Hai unit không tương thích:**
- **Unit A — `mau-lich-trinh/page.tsx`:** hiện callout **luôn luôn** mỗi khi vào màn sửa Mẫu lịch trình, kể cả khi chưa có `LichTrinhNgay` nào được sinh ra (callout tĩnh, không cần query kiểm tra điều kiện) — đúng luật ("phải nêu rõ... tại thời điểm sửa", không nói điều kiện).
- **Unit B — `ngan-sach/page.tsx`:** hiện callout **có điều kiện** — chỉ query và hiện nếu tồn tại ít nhất một hàng `NganSach` của tháng đã qua (tức sửa ngân sách hiện hành thực sự có nguy cơ đè lịch sử); nếu app mới tinh chưa có tháng nào qua, callout ẩn — cũng "đúng luật" theo diễn giải "callout chỉ cần thiết khi có nguy cơ thật".

**Phân kỳ cụ thể:** Hai màn hình cùng áp dụng một AD nhưng cho ra hai hành vi UX khác hẳn nhau (một cái luôn ồn ào, một cái im lặng ở app mới) — người dùng (không có nền tảng web, dựa hoàn toàn vào tín hiệu UI để hiểu app) học được quy tắc ngầm sai ("callout chỉ xuất hiện khi có vấn đề") từ Unit B rồi hoang mang khi Unit A luôn hiện. Cả hai không vi phạm chữ AD-2.

**Đề xuất tightening AD:** *"Callout hiện KHÔNG điều kiện, mỗi lần vào màn sửa config hiện hành, bất kể đã có hàng lịch sử hay chưa — nhất quán tuyệt đối giữa các màn hình."*

---

## 8. `DateTime` ISO 8601 — biên giới ngày theo timezone nào?

**AD/Convention khai thác:** Consistency Conventions → Data & formats ("Ngày lưu dưới dạng `DateTime`... chuẩn ISO 8601").

**Hai unit không tương thích:**
- **Unit A — `taoLichTrinhNgay` (Lịch trình, FR-2):** parse ngày người dùng chọn bằng `new Date('2026-08-29')` (JS hiểu chuỗi date-only này là UTC midnight) rồi lưu thẳng.
- **Unit B — `taoGiaoDich` (Chi tiêu, FR-4):** parse bằng `new Date(year, month-1, day)` (constructor này tạo **local midnight**, không phải UTC) rồi lưu.

**Phân kỳ cụ thể:** Cả hai đều "DateTime chuẩn ISO 8601" đúng luật. Nhưng ở múi giờ Việt Nam (UTC+7), `new Date('2026-08-29')` lưu ra `2026-08-29T00:00:00Z` = `29/08 07:00 giờ VN`, còn `new Date(2026,7,29)` lưu ra `2026-08-28T17:00:00Z`. Khi tầng tổng hợp Dashboard (AD-1's carve-out) join "hôm nay" giữa `LichTrinhNgay.ngay` và `GiaoDich.ngay` bằng cùng một điều kiện `ngay = todayMidnightUTC`, một trong hai bảng sẽ lệch mất 7 tiếng — giao dịch ghi buổi tối bị xếp nhầm sang ngày hôm sau (hoặc ngược lại) trên card tổng hợp "Hôm nay", dù từng module riêng lẻ tự thấy dữ liệu của mình "đúng".

**Đề xuất tightening AD:** *"Mọi giá trị `DateTime` biểu diễn 'ngày' (không có thành phần giờ ý nghĩa) phải chuẩn hoá về local midnight giờ Việt Nam trước khi lưu (ví dụ luôn dùng `new Date(year, month-1, day)`, không dùng `new Date('YYYY-MM-DD')`)."*

---

## 9. Tầng tổng hợp Dashboard — Prisma trực tiếp hay gọi lại hàm đọc của từng module?

**AD/Convention khai thác:** AD-1 ("muốn tổng hợp dữ liệu liên module... phải qua một tầng tổng hợp ở `app/(dashboard)/`, không phải qua module này gọi thẳng bảng của module kia").

**Hai unit không tương thích:**
- **Unit A:** `app/(dashboard)/page.tsx` tự import `lib/db.ts` (Prisma Client) và query trực tiếp `prisma.lichTrinhNgay.findFirst(...)`, `prisma.giaoDich.aggregate(...)`, v.v. cho cả 4 module — hợp lệ vì AD-1 chỉ cấm **module** đọc chéo bảng module khác; Dashboard không phải một trong 4 module, và AD-3 cho phép Server Component đọc Prisma trực tiếp.
- **Unit B:** (build ở một epic khác, hoặc bởi một agent theo trực giác "đóng gói" khác) mỗi module export thêm một hàm đọc riêng, ví dụ `hoc-tap/actions.ts` export `layTomTatHocTap()`, và Dashboard gọi các hàm này thay vì đụng Prisma trực tiếp — cũng hợp lệ, thậm chí "sạch" hơn về mặt encapsulation, và không vi phạm chữ nào của AD-1 (AD-1 chỉ nói tầng tổng hợp không được là "module này gọi thẳng bảng module kia", không nói tầng tổng hợp phải/không được gọi Prisma trực tiếp).

**Phân kỳ cụ thể:** Đây không phải lỗi crash ngay, mà là **phân kỳ kiến trúc âm thầm**: nếu 2 trong 4 module được build theo Unit A (Dashboard tự query Prisma) và 2 module còn lại theo Unit B (Dashboard gọi hàm export), file `app/(dashboard)/page.tsx` trở thành hỗn hợp hai pattern — mỗi lần một module đổi shape bảng Prisma của nó, tác giả sửa Dashboard phải biết chỗ nào là "đọc trực tiếp" (phải sửa Dashboard) và chỗ nào là "đọc qua hàm" (chỉ cần module tự sửa hàm, Dashboard không đổi). Với một agent build không có bộ nhớ dài hạn, không có gì trong AD-1 buộc chọn nhất quán một pattern, nên rủi ro trộn lẫn là cao, và không AD nào bị "vi phạm" khi review từng đoạn code riêng lẻ.

**Đề xuất tightening AD:** *"Tầng tổng hợp Dashboard (`app/(dashboard)/`) LUÔN đọc qua Prisma trực tiếp cho cả 4 module (không gọi hàm export từ `actions.ts` của module), để tránh mỗi module tự định nghĩa một 'read API' hình dạng khác nhau cho tầng tổng hợp."* (hoặc chốt chiều ngược lại — điểm quan trọng là AD-1 phải chọn MỘT chiều, hiện đang bỏ ngỏ.)

---

## Bảng tổng hợp

| # | AD/Convention | Cặp unit | Loại phân kỳ |
| --- | --- | --- | --- |
| 1 | Data & formats (VNĐ Int) | `taoGiaoDich` vs query FR-7 | dấu số tiền — sai tổng tiền thật |
| 2 | State & cross-cutting (cảnh báo NS) | `taoGiaoDich` vs `suaGiaoDich` | vị trí field response |
| 3 | AD-4 | `themMonAn` vs `themNguyenLieu` | gốc tương đối của path ảnh — 404 |
| 4 | State & cross-cutting (union) | `danhDauHoanThanhTask` vs `taoGiaoDich` | kiểu `error` — string vs object |
| 5 | AD-2 (con trỏ hiện hành) | `danhDauHoanThanhMoc` vs Dashboard card Học tập | cột vật lý vs giá trị suy ra |
| 6 | AD-2 (gate Bài test) | action gộp vs 2 action tách theo Kỹ năng | signature action không tương thích với UI dùng chung |
| 7 | AD-2 (callout) | `mau-lich-trinh` vs `ngan-sach` | điều kiện hiện callout không nhất quán |
| 8 | Data & formats (DateTime) | `taoLichTrinhNgay` vs `taoGiaoDich` | timezone/biên giới ngày — lệch join "Hôm nay" |
| 9 | AD-1 (tầng tổng hợp) | Dashboard-đọc-Prisma vs Dashboard-gọi-hàm-module | hai pattern trộn lẫn trong cùng 1 file |
