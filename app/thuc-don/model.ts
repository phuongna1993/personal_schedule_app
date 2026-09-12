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

// ---------------------------------------------------------------------------
// Thực đơn ngày (Story 7, CAP-9/CAP-10) — 3 bữa cố định, 2 Nhóm khẩu phần độc
// lập. Mirror `MUC_UU_TIEN` pattern ở `app/lich-trinh/model.ts`.
// ---------------------------------------------------------------------------

/** 3 bữa cố định trong ngày — SPEC.md CAP-9. Mock's bữa "Phụ" (Bé dưới 1
 * tuổi) là minh hoạ, KHÔNG có trong SPEC.md, không build (Intent). */
export const BUOI = ["Sang", "Trua", "Toi"] as const;

export type BuoiEnum = (typeof BUOI)[number];

export function laBuoi(giaTri: unknown): giaTri is BuoiEnum {
  return (
    typeof giaTri === "string" && (BUOI as readonly string[]).includes(giaTri)
  );
}

/** Nhãn tiếng Việt hiển thị trên UI cho từng bữa. */
export const NHAN_BUOI: Record<BuoiEnum, string> = {
  Sang: "Sáng",
  Trua: "Trưa",
  Toi: "Tối",
};

/** Nhãn tiếng Việt của hai Nhóm khẩu phần — Glossary/CAP-9. Vật lý ánh xạ tới
 * hai bảng Prisma riêng biệt (`ThucDonNguoiLon`/`ThucDonBe`), không phải một
 * cột phân nhánh trong cùng một bảng. */
export const NHOM_KHAU_PHAN = {
  NguoiLon: "Người lớn & bé 4 tuổi",
  Be: "Bé dưới 1 tuổi",
} as const;

/** Một slot (một bữa) trong nhánh "Người lớn & bé 4 tuổi" — có ghi chú điều
 * chỉnh tuỳ chọn (FR-10/CAP-10). `monAnId`/`tenMon` là `null` khi slot này
 * "Chưa chọn món". `ghiChu` chỉ có ý nghĩa khi đã chọn món (cột `ghiChu` sống
 * cùng hàng với `monAnId`, không thể tồn tại độc lập). */
export type ThucDonSlotNguoiLon = {
  buoi: BuoiEnum;
  monAnId: number | null;
  tenMon: string | null;
  ghiChu: string | null;
};

/** Một slot trong nhánh "Bé dưới 1 tuổi" — CÙNG shape với
 * `ThucDonSlotNguoiLon` NGOẠI TRỪ không có `ghiChu` (Structural Seed: cột này
 * không tồn tại về mặt cấu trúc ở nhánh Bé). */
export type ThucDonSlotBe = {
  buoi: BuoiEnum;
  monAnId: number | null;
  tenMon: string | null;
};

/** Thực đơn ngày đầy đủ của MỘT ngày — 3 slot mỗi nhánh, luôn đủ 3 phần tử
 * theo đúng thứ tự `BUOI`, kể cả khi chưa có gì được gán (CAP-9). */
export type ThucDonNgayDuLieu = {
  nguoiLon: ThucDonSlotNguoiLon[];
  be: ThucDonSlotBe[];
};
