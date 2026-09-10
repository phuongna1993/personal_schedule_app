/**
 * Kiểu và hằng số thuần của module Thực đơn — KHÔNG chạm Prisma.
 *
 * Tách khỏi `queries.ts`/`actions.ts` (vốn import `lib/db`) để Client
 * Component (`NganHangMonAnView.tsx`) dùng chung được các hằng số này (ví dụ
 * `accept` attr của `<input type="file">`) mà không kéo Prisma Client vào
 * bundle trình duyệt. Mirror `app/chi-tieu/model.ts`.
 */

/** Một Nguyên liệu — luôn thuộc về đúng một Món ăn (AD-1: Thực đơn sở hữu độc
 * quyền cả hai model). */
export type NguyenLieu = {
  id: number;
  ten: string;
  /** Đường dẫn TƯƠNG ĐỐI so với `app-data/uploads/` (AD-4) — UI ghép thành
   * `/uploads/${anh}` để render `<img>`, không bao giờ tự suy luận đường dẫn
   * khác. `null` khi Nguyên liệu này chưa có ảnh riêng (ảnh là tuỳ chọn). */
  anh: string | null;
};

/** Một Món ăn trong Ngân hàng món ăn (CAP-8). */
export type MonAn = {
  id: number;
  ten: string;
  /** Cùng quy ước đường dẫn tương đối với `NguyenLieu.anh`. `null` khi món
   * chưa có ảnh minh hoạ (ảnh là tuỳ chọn). */
  anh: string | null;
  nguyenLieu: NguyenLieu[];
};

/**
 * MIME type ảnh hợp lệ — dùng CHUNG cho `accept` attr của mọi
 * `<input type="file">` ảnh (client) và MIME sniff phía server
 * (`app/thuc-don/actions.ts`), để hai danh sách không trôi dạt khác nhau
 * (Design Notes: "reject anything else client-side (accept attr) and
 * server-side").
 */
export const LOAI_ANH_HOP_LE = ["image/jpeg", "image/png", "image/webp"] as const;

export type LoaiAnhHopLe = (typeof LOAI_ANH_HOP_LE)[number];

/** `accept` attr string dùng chung cho mọi `<input type="file">` ảnh. */
export const ACCEPT_ANH = LOAI_ANH_HOP_LE.join(",");

/** Giới hạn dung lượng MỘT file ảnh — 5MB (Design Notes). */
export const KICH_THUOC_ANH_TOI_DA_MB = 5;
export const KICH_THUOC_ANH_TOI_DA = KICH_THUOC_ANH_TOI_DA_MB * 1024 * 1024;
