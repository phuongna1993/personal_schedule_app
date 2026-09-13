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
