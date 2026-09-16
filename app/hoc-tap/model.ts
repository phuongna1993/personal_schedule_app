/**
 * Kiểu và hằng số thuần của module Học tập — KHÔNG chạm Prisma.
 *
 * Tách khỏi `actions.ts` (vốn import `lib/db`) để Client Component
 * (`HocTapView.tsx`) dùng chung được các hằng số này mà không kéo Prisma
 * Client vào bundle trình duyệt. Mirror `app/chi-tieu/model.ts`/
 * `app/thuc-don/model.ts`.
 */

/** Kỹ năng — 2 giá trị cố định (Glossary), không phải free text. `KyNang` là
 * một enum tầng ứng dụng (mirror `MUC_UU_TIEN`/`BUOI`/`loai`) — KHÔNG phải
 * model Prisma riêng (Boundaries: SQLite không có kiểu enum). */
export const KY_NANG = ["TiengAnh", "AutomationTest"] as const;

export type KyNangEnum = (typeof KY_NANG)[number];

export function laKyNang(giaTri: unknown): giaTri is KyNangEnum {
  return (
    typeof giaTri === "string" && (KY_NANG as readonly string[]).includes(giaTri)
  );
}

/** Nhãn tiếng Việt hiển thị trên UI cho từng Kỹ năng. */
export const NHAN_KY_NANG: Record<KyNangEnum, string> = {
  TiengAnh: "Tiếng Anh",
  AutomationTest: "Automation Test",
};

/** Một Buổi học vừa ghi (CAP-11), đã chuẩn hoá kiểu cho UI. */
export type BuoiHocDaGhi = {
  id: number;
  kyNang: KyNangEnum;
  noiDung: string;
  /** Phút, số nguyên dương. */
  thoiLuongPhut: number;
  /** Mốc ngày VN (00:00 Asia/Ho_Chi_Minh) — luôn là ngày ghi, xem
   * `lib/ngayVn.ts`. */
  ngay: Date;
};

/** Hình dạng thô của một hàng Prisma `BuoiHoc` — đủ trường để
 * `dinhDangBuoiHoc()` chuẩn hoá, không phụ thuộc kiểu Prisma cụ thể nào (để
 * file này không phải import `lib/generated/prisma`). */
export type BuoiHocHangPrisma = {
  id: number;
  kyNang: string;
  noiDung: string;
  thoiLuongPhut: number;
  ngay: Date;
};

/** Chuẩn hoá một hàng Prisma `BuoiHoc` thô về `BuoiHocDaGhi` — dùng chung bởi
 * `actions.ts` (biên GHI) và `queries.ts` (biên ĐỌC) để không có hai bản sao
 * trôi dạt khác nhau của cùng một logic chuẩn hoá `kyNang`. */
export function dinhDangBuoiHoc(row: BuoiHocHangPrisma): BuoiHocDaGhi {
  return {
    id: row.id,
    kyNang: laKyNang(row.kyNang) ? row.kyNang : "TiengAnh",
    noiDung: row.noiDung,
    thoiLuongPhut: row.thoiLuongPhut,
    ngay: row.ngay,
  };
}

/** Tiến độ (CAP-12) của MỘT Kỹ năng — streak chạy (không phụ thuộc tháng
 * đang xem) + lịch sử/tổng thời lượng của đúng tháng đang xem qua
 * `?thang=`. Đây là dữ liệu tầng đọc (kết quả `tinhStreak()` +
 * `layLichSuThang()` gộp lại ở `page.tsx`), không phải UI state cục bộ — nên
 * nằm ở `model.ts`, không phải `HocTapView.tsx`. */
export type TienDoKyNang = {
  /** Số ngày liên tiếp có ít nhất một Buổi học, tính tới hôm nay — KHÔNG đổi
   * theo `?thang=` đang xem (Boundaries: "never scoped to the displayed
   * month"). */
  streak: number;
  /** Buổi học của Kỹ năng này trong tháng đang xem. */
  buoiHoc: BuoiHocDaGhi[];
  /** Tổng `thoiLuongPhut` của tháng đang xem. */
  tongThoiLuongPhut: number;
};

// ---------------------------------------------------------------------------
// Lộ trình & Mốc (CAP-13, Story 10)
// ---------------------------------------------------------------------------

/** Một Mốc cố định — chỉ `thuTu` + `ten`. Titles/order là hằng số tầng ứng
 * dụng, KHÔNG BAO GIỜ user-edited hay lưu trong DB (Boundaries). */
export type MocDinhNghia = { thuTu: number; ten: string };

/** 3 Mốc cố định của Lộ trình Tiếng Anh, theo thứ tự (Glossary). */
export const MOC_TIENG_ANH: readonly MocDinhNghia[] = [
  { thuTu: 1, ten: "A1" },
  { thuTu: 2, ten: "A2" },
  { thuTu: 3, ten: "B1" },
];

/** 7 Mốc cố định của Lộ trình Automation Test, theo thứ tự (glossary.md). */
export const MOC_AUTOMATION_TEST: readonly MocDinhNghia[] = [
  { thuTu: 1, ten: "Nền tảng Python + SQL" },
  { thuTu: 2, ten: "Pytest + UI automation (Playwright)" },
  { thuTu: 3, ten: "UI automation + Page Object Model" },
  { thuTu: 4, ten: "API automation (Pytest + requests)" },
  { thuTu: 5, ten: "CI/CD (GitHub Actions) + AI in testing" },
  { thuTu: 6, ten: "Portfolio end-to-end + Mobile testing (Appium)" },
  { thuTu: 7, ten: "Security testing + Chứng chỉ + phỏng vấn TA" },
];

/** Tra cứu bộ Mốc cố định theo Kỹ năng — dùng chung bởi `queries.ts` (seed +
 * merge tiêu đề) thay vì rẽ nhánh `if (kyNang === ...)` rải rác. */
export const MOC_THEO_KY_NANG: Record<KyNangEnum, readonly MocDinhNghia[]> = {
  TiengAnh: MOC_TIENG_ANH,
  AutomationTest: MOC_AUTOMATION_TEST,
};

/** Một Mốc trong Lộ trình đã đọc — merge tiêu đề cố định (`MOC_THEO_KY_NANG`)
 * + trạng thái từ DB (`Moc` row). */
export type MocDuLieu = {
  id: number;
  kyNang: KyNangEnum;
  thuTu: number;
  ten: string;
  /** `null` = chưa Hoàn thành. */
  ngayHoanThanh: Date | null;
  /** Chỉ có ý nghĩa cho Mốc HIỆN TẠI của Tiếng Anh (dùng để gate nút "Hoàn
   * thành Mốc") — `true` khi Mốc này đã có ít nhất một hàng
   * `BaiTestDanhGia`. Luôn `false` cho Automation Test và cho mọi Mốc không
   * phải Mốc hiện tại (không phải "lịch sử đầy đủ" — CAP-12's Điểm số
   * history view bị deferred, xem story's Boundaries). */
  coDiemBaiTest: boolean;
};

/** Toàn bộ Lộ trình đã sắp xếp của MỘT Kỹ năng (CAP-13). */
export type LoTrinhDuLieu = {
  kyNang: KyNangEnum;
  /** Đủ 3 hoặc 7 Mốc, sắp theo `thuTu` tăng dần. */
  moc: MocDuLieu[];
  /** id của Mốc hiện tại (`layMocHienTai()`'s result) — `null` khi mọi Mốc
   * của Kỹ năng này đã Hoàn thành (terminal state). */
  mocHienTaiId: number | null;
};

/** Một Điểm số Bài test đánh giá vừa ghi (`ghiDiemBaiTest()`). */
export type BaiTestDanhGiaDaGhi = {
  id: number;
  mocId: number;
  diemSo: string;
  ngay: Date;
};

/**
 * Một hàng trong lịch sử Điểm số Bài test đánh giá (CAP-12, Story 12) —
 * LUÔN của Tiếng Anh (Boundaries: `layLichSuDiemBaiTest()` không nhận tham
 * số `kyNang`, hardcode Tiếng Anh, mirror `ghiDiemBaiTest()`). Khác
 * `BaiTestDanhGiaDaGhi` ở chỗ mang sẵn `mocThuTu`/`mocTen` đã merge từ
 * `MOC_TIENG_ANH` (đọc lại toàn bộ lịch sử cần biết Mốc nào, không chỉ
 * `mocId`) — không tái dùng lại type đó để tránh hai hình dạng khác nhau bị
 * lẫn lộn.
 */
export type DiemBaiTestLichSu = {
  id: number;
  mocThuTu: number;
  mocTen: string;
  /** Free-form text, định dạng cố ý để ngỏ (mirror `BaiTestDanhGia.diemSo`'s
   * schema comment, ARCHITECTURE-SPINE.md's Deferred) — KHÔNG phải một điểm
   * số numeric đã chuẩn hoá, không parse/so sánh số học ở đây. */
  diemSo: string;
  ngay: Date;
};

/**
 * Nút "Hoàn thành Mốc" có bị GATE chặn hay không — CHỈ Tiếng Anh mới có gate
 * (Automation Test luôn `false`, bất kể `coDiemBaiTest`, mirror
 * `hoanThanhMoc()`'s server-side rule ở `actions.ts`).
 *
 * Tách thành một hàm THUẦN, export riêng thay vì để logic JSX inline trong
 * `HocTapView.tsx`: đây là bất biến quan trọng nhất của story, và repo này
 * không có hạ tầng test component nào để bắt lỗi nếu logic JSX bị đơn giản
 * hoá nhầm (ví dụ lỡ bỏ điều kiện `kyNang === "TiengAnh"`, khoá vĩnh viễn
 * nút của Automation Test). Một hàm thuần thì unit-test trực tiếp được mà
 * không cần dựng component.
 */
export function biChanHoanThanhBoiGateDiem(
  kyNang: KyNangEnum,
  coDiemBaiTest: boolean,
): boolean {
  return kyNang === "TiengAnh" && !coDiemBaiTest;
}
