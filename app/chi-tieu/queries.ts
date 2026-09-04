import { prisma } from "@/lib/db";
import { layMocDauThangKeTiepVN, layMocDauThangVN } from "@/lib/ngayVn";
import { laLoaiGiaoDich, type DanhMuc, type GiaoDich } from "./model";

/**
 * AD-1 — Module Chi tiêu sở hữu độc quyền các model `DanhMucChiTieu` /
 * `GiaoDich`, kể cả đường ĐỌC. Mọi module khác (kể cả tầng tổng hợp
 * `app/(dashboard)`, khi tồn tại) phải lấy dữ liệu Chi tiêu qua các hàm
 * export ở file này, không bao giờ import Prisma model của module này để tự
 * query.
 *
 * File này chạm `lib/db` nên chỉ dùng được ở phía server.
 */

export type { DanhMuc, GiaoDich, LoaiGiaoDich } from "./model";

export type GiaoDichThangDuLieu = {
  /** Mốc đầu tháng (VN) của tháng đang đọc. */
  dauThang: Date;
  /** Giao dịch trong tháng, sắp theo ngày giảm dần (mới nhất trước). */
  giaoDich: GiaoDich[];
  /** Tổng `soTien` các Giao dịch `loai === "Chi"` trong tháng. */
  tongChi: number;
  /** Tổng `soTien` các Giao dịch `loai === "Thu"` trong tháng. */
  tongThu: number;
};

/**
 * Đọc toàn bộ Giao dịch của THÁNG chứa `thoiDiem` (mặc định: tháng hiện tại,
 * giờ VN), kèm tổng Chi/Thu — tính bằng cách CỘNG/TRỪ theo `loai`, không bao
 * giờ cộng dồn `soTien` trực tiếp bất kể chiều (Data & formats convention).
 *
 * Ranh giới tháng dùng `[dauThang, dauThangKeTiep)` — cận trên loại trừ, tính
 * qua `lib/ngayVn.ts` để không lệch ngày theo giờ server.
 */
export async function layGiaoDichThangHienTai(
  thoiDiem: Date = new Date(),
): Promise<GiaoDichThangDuLieu> {
  const dauThang = layMocDauThangVN(thoiDiem);
  const dauThangKeTiep = layMocDauThangKeTiepVN(thoiDiem);

  const rows = await prisma.giaoDich.findMany({
    where: { ngay: { gte: dauThang, lt: dauThangKeTiep } },
    include: { danhMucChiTieu: true },
    orderBy: [{ ngay: "desc" }, { id: "desc" }],
  });

  const giaoDich: GiaoDich[] = rows.map((row) => ({
    id: row.id,
    // Cột là String vì SQLite không có enum; chuẩn hoá lại về union ở biên
    // đọc, cùng nguyên tắc `laMucUuTien` của module Lịch trình.
    loai: laLoaiGiaoDich(row.loai) ? row.loai : "Chi",
    soTien: row.soTien,
    ngay: row.ngay,
    ghiChu: row.ghiChu,
    danhMucChiTieuId: row.danhMucChiTieuId,
    tenDanhMuc: row.danhMucChiTieu?.ten ?? null,
  }));

  let tongChi = 0;
  let tongThu = 0;
  for (const gd of giaoDich) {
    if (gd.loai === "Chi") {
      tongChi += gd.soTien;
    } else {
      tongThu += gd.soTien;
    }
  }

  return { dauThang, giaoDich, tongChi, tongThu };
}

/** Đọc toàn bộ Danh mục chi tiêu, sắp theo tên tăng dần. */
export async function layDanhSachDanhMuc(): Promise<DanhMuc[]> {
  const rows = await prisma.danhMucChiTieu.findMany({
    orderBy: [{ ten: "asc" }, { id: "asc" }],
  });

  return rows.map((row) => ({ id: row.id, ten: row.ten }));
}
