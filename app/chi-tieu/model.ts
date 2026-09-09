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

/** Một hàng Ngân sách (hạn mức Chi theo tháng của một Danh mục). */
export type NganSach = {
  id: number;
  danhMucChiTieuId: number;
  /** Mốc đầu tháng VN (`layMocDauThangVN()`, `lib/ngayVn.ts`). */
  thang: Date;
  /** VNĐ, số nguyên dương. */
  hanMuc: number;
};

/**
 * Cảnh báo ngưỡng Ngân sách (CAP-6) — trả kèm trong response của
 * `themGiaoDich`/`suaGiaoDich` ở `data.canhBaoNganSach` (AD-3's State &
 * cross-cutting convention), KHÔNG bao giờ qua kênh riêng.
 *
 * Chỉ mang giá trị của đúng Danh mục vừa kích hoạt cảnh báo — ngưỡng 30%/100%
 * cố định (không tuỳ chỉnh) nên UI tự suy ra hai trạng thái "dưới ngưỡng" hay
 * "đã vượt" từ `daChi`/`hanMuc`, không cần một field "loại cảnh báo" riêng.
 */
export type CanhBaoNganSach = {
  danhMucChiTieuId: number;
  tenDanhMuc: string;
  /** VNĐ, hạn mức tháng hiện tại của Danh mục này. */
  hanMuc: number;
  /** VNĐ, tổng đã Chi trong tháng hiện tại của Danh mục này (đã tính cả Giao
   * dịch vừa lưu). */
  daChi: number;
  /** Phần trăm CÒN LẠI của hạn mức, làm tròn XUỐNG — có thể âm khi đã chi
   * vượt hạn mức (ví dụ `daChi` = 120% `hanMuc` -> `-20`). */
  phanTramConLai: number;
};

/** Một Giao dịch vừa ghi, kèm cảnh báo Ngân sách nếu có (CAP-6). */
export type GiaoDichDaGhi = GiaoDich & {
  /** `null` khi là Thu, chưa có `NganSach` tháng này, hoặc chưa chạm ngưỡng. */
  canhBaoNganSach: CanhBaoNganSach | null;
};
