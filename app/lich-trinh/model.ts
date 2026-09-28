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

/** Một mốc giờ TRONG ngày, dạng "HH:mm" 24h. */
const REGEX_GIO = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function laGio(giaTri: unknown): giaTri is string {
  return typeof giaTri === "string" && REGEX_GIO.test(giaTri);
}

/**
 * Khung giờ Từ ~ Đến có hợp lệ không: cả hai đúng dạng "HH:mm" và giờ kết
 * thúc STRICTLY sau giờ bắt đầu. Hai mốc cùng một ngày nên `ketThuc <=
 * batDau` cũng chính là trường hợp vắt qua nửa đêm (vd 23:00 ~ 01:00) — bị
 * chặn luôn, không wraparound. Dùng chung cho `kiemTraTask()` (server, nguồn
 * kiểm tra chính thức) và form (client, chỉ để báo sớm). So sánh chuỗi
 * "HH:mm" zero-padded đúng bằng so sánh thời gian.
 */
export function laKhungGioHopLe(gioBatDau: string, gioKetThuc: string): boolean {
  return laGio(gioBatDau) && laGio(gioKetThuc) && gioKetThuc > gioBatDau;
}

/** Nhãn hiển thị khung giờ: "06:30 – 07:00", hoặc chỉ "06:30" cho Task cũ
 * tạo trước khi có giờ kết thúc. */
export function nhanKhungGio(task: {
  gioBatDau: string;
  gioKetThuc: string | null;
}): string {
  return task.gioKetThuc ? `${task.gioBatDau} – ${task.gioKetThuc}` : task.gioBatDau;
}

/** Một Task mặc định trong Mẫu lịch trình, đã chuẩn hoá kiểu cho UI. */
export type TaskMau = {
  id: number;
  ten: string;
  gioBatDau: string;
  /** `null` chỉ với Task cũ tạo trước khi có trường này. */
  gioKetThuc: string | null;
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

/** Được lên lịch trước tối đa bao nhiêu ngày tính từ hôm nay (giờ VN). Dùng
 * chung cho giới hạn điều hướng ▶ (`/lich-trinh/page.tsx`) và
 * `lenLichNgayTuongLai()` (actions.ts) — chặn URL/payload tự gõ ngày quá xa. */
export const SO_NGAY_LEN_LICH_TRUOC_TOI_DA = 365;
