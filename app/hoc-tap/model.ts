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
