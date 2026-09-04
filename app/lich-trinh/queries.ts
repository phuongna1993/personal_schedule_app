import { prisma } from "@/lib/db";
import { layMocNgayVN } from "@/lib/ngayVn";
import { laMucUuTien, type TaskMau, type TaskNgay } from "./model";

/**
 * AD-1 — Module Lịch trình sở hữu độc quyền các model `MauLichTrinh` / `Task`,
 * kể cả đường ĐỌC. Mọi module khác (kể cả tầng tổng hợp `app/(dashboard)`)
 * phải lấy dữ liệu Lịch trình qua các hàm export ở file này, không bao giờ
 * import Prisma model của module này để tự query.
 *
 * File này chạm `lib/db` nên chỉ dùng được ở phía server.
 */

export type { MucUuTien, TaskMau } from "./model";

/**
 * Đọc toàn bộ Task của Mẫu lịch trình hiện hành, sắp theo Thời hạn tăng dần.
 *
 * Trả về mảng rỗng khi chưa có Mẫu nào (lần chạy đầu tiên) — đường đọc không
 * bao giờ ghi; việc tạo hàng `MauLichTrinh` là trách nhiệm của Server Action
 * đầu tiên ghi vào nó (AD-3).
 */
export async function layMauLichTrinh(): Promise<TaskMau[]> {
  const mau = await prisma.mauLichTrinh.findFirst({
    orderBy: { id: "asc" },
    include: {
      tasks: {
        // "HH:mm" zero-padded nên sắp theo chuỗi trùng khớp sắp theo thời gian.
        orderBy: [{ thoiHan: "asc" }, { id: "asc" }],
      },
    },
  });

  if (!mau) return [];

  return mau.tasks.map((task) => ({
    id: task.id,
    ten: task.ten,
    thoiHan: task.thoiHan,
    // Cột là String vì SQLite không có enum; chuẩn hoá lại về union ở biên đọc.
    mucUuTien: laMucUuTien(task.mucUuTien) ? task.mucUuTien : "TrungBinh",
  }));
}

export type LichTrinhNgayDuLieu = {
  /** Mốc ngày (VN) đã được chuẩn hoá — luôn khớp `layMocNgayVN(ngay)`. */
  ngay: Date;
  /**
   * `false` khi chưa từng có hàng `LichTrinhNgay` cho ngày này — khác với
   * "có hàng nhưng Mẫu rỗng" (`tonTai: true`, `tongSo: 0`). UI dùng cờ này để
   * phân biệt hai trạng thái rỗng trong I/O matrix của story.
   */
  tonTai: boolean;
  /** `null` khi `tonTai` là `false` — không có hàng để gắn Task mới vào. */
  id: number | null;
  tasks: TaskNgay[];
  soDaXong: number;
  tongSo: number;
};

/**
 * Đọc Lịch trình của một ngày cụ thể (mặc định: hôm nay theo giờ VN) kèm tỷ
 * lệ hoàn thành. Đường đọc THUẦN — không tự tạo hàng `LichTrinhNgay` nào; đó
 * là trách nhiệm riêng của Server Action `taoLichTrinhNgayTuMau()` (AD-3
 * ngoại lệ 2).
 */
export async function layLichTrinhNgay(
  ngay: Date = layMocNgayVN(),
): Promise<LichTrinhNgayDuLieu> {
  const moc = layMocNgayVN(ngay);

  const row = await prisma.lichTrinhNgay.findUnique({
    where: { ngay: moc },
    include: {
      tasks: {
        orderBy: [{ thoiHan: "asc" }, { id: "asc" }],
      },
    },
  });

  if (!row) {
    return { ngay: moc, tonTai: false, id: null, tasks: [], soDaXong: 0, tongSo: 0 };
  }

  const tasks: TaskNgay[] = row.tasks.map((task) => ({
    id: task.id,
    ten: task.ten,
    thoiHan: task.thoiHan,
    mucUuTien: laMucUuTien(task.mucUuTien) ? task.mucUuTien : "TrungBinh",
    daXong: task.daXong,
  }));

  return {
    ngay: moc,
    tonTai: true,
    id: row.id,
    tasks,
    soDaXong: tasks.filter((t) => t.daXong).length,
    tongSo: tasks.length,
  };
}

/**
 * Mốc ngày (VN) của hàng `LichTrinhNgay` sớm nhất đang có, hoặc `null` khi
 * chưa có hàng nào. Dùng để chặn ◀ không cho lùi qua ngày sớm hơn hàng sớm
 * nhất đang tồn tại (chỉ hôm nay mới tự khởi tạo — không backfill ngày đã
 * bỏ qua).
 */
export async function layNgaySomNhat(): Promise<Date | null> {
  const somNhat = await prisma.lichTrinhNgay.findFirst({
    orderBy: { ngay: "asc" },
  });
  return somNhat ? somNhat.ngay : null;
}
