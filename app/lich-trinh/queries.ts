import { prisma } from "@/lib/db";
import { laMucUuTien, type TaskMau } from "./model";

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
