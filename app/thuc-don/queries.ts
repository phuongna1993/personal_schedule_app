import { prisma } from "@/lib/db";
import type { MonAn } from "./model";

/**
 * AD-1 — Module Thực đơn sở hữu độc quyền các model `MonAn`/`NguyenLieu`, kể
 * cả đường ĐỌC. Mọi module khác (kể cả tầng tổng hợp `app/(dashboard)`, khi
 * tồn tại) phải lấy dữ liệu Thực đơn qua các hàm export ở file này, không bao
 * giờ import Prisma model của module này để tự query.
 *
 * File này chạm `lib/db` nên chỉ dùng được ở phía server.
 */

export type { MonAn, NguyenLieu } from "./model";

/** Đọc toàn bộ Món ăn trong Ngân hàng món ăn, kèm Nguyên liệu của từng món —
 * dùng cho lưới `/thuc-don/chon-mon` (CAP-8). Sắp theo id tăng dần (thứ tự
 * thêm vào) cho cả Món ăn lẫn Nguyên liệu bên trong mỗi món, ổn định qua các
 * lần đọc. */
export async function layDanhSachMonAn(): Promise<MonAn[]> {
  const rows = await prisma.monAn.findMany({
    orderBy: { id: "asc" },
    include: { nguyenLieu: { orderBy: { id: "asc" } } },
  });

  return rows.map((row) => ({
    id: row.id,
    ten: row.ten,
    anh: row.anh,
    nguyenLieu: row.nguyenLieu.map((n) => ({
      id: n.id,
      ten: n.ten,
      anh: n.anh,
    })),
  }));
}

/** Đọc tên các Nguyên liệu KHÁC NHAU đang xuất hiện trong Ngân hàng món ăn
 * (không lặp), sắp theo tên tăng dần — dùng để dựng dãy filter-chip lọc theo
 * Nguyên liệu trên `/thuc-don/chon-mon` (CAP-8). */
export async function layDanhSachNguyenLieuDuyNhat(): Promise<string[]> {
  const rows = await prisma.nguyenLieu.findMany({
    select: { ten: true },
    distinct: ["ten"],
    orderBy: { ten: "asc" },
  });

  return rows.map((row) => row.ten);
}
