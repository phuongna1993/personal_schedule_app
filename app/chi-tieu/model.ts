/**
 * Kiểu và hằng số thuần của module Chi tiêu — KHÔNG chạm Prisma.
 *
 * Tách khỏi `queries.ts` (vốn import `lib/db`) để Client Component dùng chung
 * được các hằng số này mà không kéo Prisma Client vào bundle trình duyệt.
 * Mirror `app/lich-trinh/model.ts`.
 */

/** Chiều Giao dịch — 2 giá trị cố định, không phải free text. */
export const LOAI_GIAO_DICH = ["Chi", "Thu"] as const;

export type LoaiGiaoDich = (typeof LOAI_GIAO_DICH)[number];

export const NHAN_LOAI_GIAO_DICH: Record<LoaiGiaoDich, string> = {
  Chi: "Chi",
  Thu: "Thu",
};

export function laLoaiGiaoDich(giaTri: unknown): giaTri is LoaiGiaoDich {
  return (
    typeof giaTri === "string" &&
    (LOAI_GIAO_DICH as readonly string[]).includes(giaTri)
  );
}

/** Một Danh mục chi tiêu. */
export type DanhMuc = {
  id: number;
  ten: string;
};

/** Một Giao dịch, đã chuẩn hoá kiểu cho UI. */
export type GiaoDich = {
  id: number;
  loai: LoaiGiaoDich;
  /** VNĐ, số nguyên dương. */
  soTien: number;
  /** Mốc ngày VN (00:00 Asia/Ho_Chi_Minh) — xem `lib/ngayVn.ts`. */
  ngay: Date;
  ghiChu: string | null;
  /** `null` khi `loai === "Thu"`, hoặc khi Danh mục Chi không còn tồn tại. */
  danhMucChiTieuId: number | null;
  /**
   * Tên Danh mục tại thời điểm đọc, đã join sẵn để UI không phải tự tra cứu
   * lại danh sách Danh mục cho mỗi hàng. `null` khi là Thu.
   */
  tenDanhMuc: string | null;
};
