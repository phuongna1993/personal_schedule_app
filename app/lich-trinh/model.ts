/**
 * Kiểu và hằng số thuần của module Lịch trình — KHÔNG chạm Prisma.
 *
 * Tách khỏi `queries.ts` (vốn import `lib/db`) để Client Component dùng chung
 * được các hằng số này mà không kéo Prisma Client vào bundle trình duyệt.
 */

/** Mức ưu tiên của một Task — 3 giá trị cố định, không phải free text. */
export const MUC_UU_TIEN = ["Cao", "TrungBinh", "Thap"] as const;

export type MucUuTien = (typeof MUC_UU_TIEN)[number];

/**
 * Nhãn tiếng Việt hiển thị trên UI. `badge-pri` luôn kèm nhãn chữ, không bao
 * giờ chỉ dựa vào màu/độ đậm nền (Accessibility Floor — EXPERIENCE.md).
 */
export const NHAN_MUC_UU_TIEN: Record<MucUuTien, string> = {
  Cao: "Cao",
  TrungBinh: "Trung bình",
  Thap: "Thấp",
};

/** Lớp CSS badge tương ứng, theo mockups/routine-template.html. */
export const LOP_BADGE_UU_TIEN: Record<MucUuTien, string> = {
  Cao: "hi",
  TrungBinh: "mid",
  Thap: "low",
};

export function laMucUuTien(giaTri: unknown): giaTri is MucUuTien {
  return (
    typeof giaTri === "string" &&
    (MUC_UU_TIEN as readonly string[]).includes(giaTri)
  );
}

/** Thời hạn là một khung giờ TRONG ngày, dạng "HH:mm" 24h. */
const REGEX_THOI_HAN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function laThoiHan(giaTri: unknown): giaTri is string {
  return typeof giaTri === "string" && REGEX_THOI_HAN.test(giaTri);
}

/** Một Task mặc định trong Mẫu lịch trình, đã chuẩn hoá kiểu cho UI. */
export type TaskMau = {
  id: number;
  ten: string;
  thoiHan: string;
  mucUuTien: MucUuTien;
};

/**
 * Một Task trong Lịch trình của một ngày cụ thể (Story 2) — cùng hình dạng
 * `TaskMau` cộng `daXong`. Model Prisma đứng sau là `TaskNgay`, một bảng
 * riêng hoàn toàn khỏi `Task` của Mẫu (AD-2) — type ở đây chỉ tình cờ trông
 * giống `TaskMau`, không phải cùng một hàng dữ liệu.
 */
export type TaskNgay = TaskMau & {
  daXong: boolean;
};
