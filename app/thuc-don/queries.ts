import { prisma } from "@/lib/db";
import { layMocNgayVN } from "@/lib/ngayVn";
import { BUOI, type MonAn, type ThucDonNgayDuLieu } from "./model";

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

/**
 * Đọc Thực đơn ngày của MỘT ngày cụ thể (CAP-9/CAP-10) — cả hai nhánh Nhóm
 * khẩu phần, LUÔN đủ 3 slot mỗi nhánh theo đúng thứ tự `BUOI`, kể cả khi chưa
 * có hàng nào cho ngày đó (I/O matrix: "First visit to a day, no menu yet").
 *
 * Đường đọc THUẦN — không tự tạo hàng nào (khác `taoLichTrinhNgayTuMau()` của
 * module Lịch trình, module này không có khái niệm khởi tạo/template, xem
 * Boundaries — Never).
 */
export async function layThucDonNgay(ngay: Date): Promise<ThucDonNgayDuLieu> {
  const moc = layMocNgayVN(ngay);

  const [hangNguoiLon, hangBe] = await Promise.all([
    prisma.thucDonNguoiLon.findMany({
      where: { ngay: moc },
      include: { monAn: { select: { ten: true } } },
    }),
    prisma.thucDonBe.findMany({
      where: { ngay: moc },
      include: { monAn: { select: { ten: true } } },
    }),
  ]);

  const nguoiLonTheoBuoi = new Map(hangNguoiLon.map((h) => [h.buoi, h] as const));
  const beTheoBuoi = new Map(hangBe.map((h) => [h.buoi, h] as const));

  return {
    nguoiLon: BUOI.map((buoi) => {
      const hang = nguoiLonTheoBuoi.get(buoi);
      return {
        buoi,
        monAnId: hang?.monAnId ?? null,
        tenMon: hang?.monAn.ten ?? null,
        ghiChu: hang?.ghiChu ?? null,
      };
    }),
    be: BUOI.map((buoi) => {
      const hang = beTheoBuoi.get(buoi);
      return {
        buoi,
        monAnId: hang?.monAnId ?? null,
        tenMon: hang?.monAn.ten ?? null,
      };
    }),
  };
}
