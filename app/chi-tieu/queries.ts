import { prisma } from "@/lib/db";
import { layMocDauThangKeTiepVN, layMocDauThangVN } from "@/lib/ngayVn";
import { laLoaiGiaoDich, type DanhMuc, type GiaoDich } from "./model";

/** Một dòng chi tiết theo Danh mục trong Báo cáo tháng (CAP-7) — `hanMuc:
 * null` khi Danh mục chưa có hàng `NganSach` cho đúng tháng đang xem. */
export type ChiTietDanhMucBaoCao = {
  danhMucChiTieuId: number;
  ten: string;
  /** VNĐ, tổng `soTien` các Giao dịch `loai === "Chi"` của Danh mục này
   * trong tháng đang xem. */
  daChi: number;
  hanMuc: number | null;
};

/** Báo cáo chi tiêu của MỘT THÁNG bất kỳ (CAP-7) — dùng cho `/chi-tieu?thang=`,
 * tách biệt với `GiaoDichThangDuLieu` (luôn là tháng hiện tại, dùng cho log +
 * quick-add, Boundaries: điều hướng tháng của báo cáo không ảnh hưởng chúng). */
export type BaoCaoThang = {
  /** Mốc đầu tháng (VN) của tháng đang xem. */
  thang: Date;
  tongChi: number;
  tongThu: number;
  /** Chỉ gồm các Danh mục có ít nhất một Giao dịch Chi trong tháng này, sắp
   * theo tên tăng dần (cùng quy ước `layDanhSachDanhMuc()`). */
  chiTietDanhMuc: ChiTietDanhMucBaoCao[];
};

/** Một Danh mục kèm hạn mức Ngân sách tháng hiện tại — dùng để prefill ô nhập
 * "Hạn mức tháng này". `hanMuc: null` khi Danh mục chưa có `NganSach` tháng
 * này (Boundaries: "không có hạn mức mặc định/kế thừa"). */
export type DanhMucVoiHanMuc = {
  danhMucChiTieuId: number;
  ten: string;
  hanMuc: number | null;
};

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

/**
 * Đọc toàn bộ Danh mục kèm hạn mức Ngân sách của THÁNG chứa `thoiDiem` (mặc
 * định: tháng hiện tại, giờ VN) — dùng để prefill ô "Hạn mức tháng này" trên
 * `/chi-tieu` (Code Map). `hanMuc` là `null` khi Danh mục chưa có hàng
 * `NganSach` cho đúng tháng này (không suy ra từ tháng khác).
 */
export async function layDanhMucVoiHanMucThangHienTai(
  thoiDiem: Date = new Date(),
): Promise<DanhMucVoiHanMuc[]> {
  const thang = layMocDauThangVN(thoiDiem);

  const rows = await prisma.danhMucChiTieu.findMany({
    orderBy: [{ ten: "asc" }, { id: "asc" }],
    include: {
      nganSach: { where: { thang }, select: { hanMuc: true } },
    },
  });

  return rows.map((row) => ({
    danhMucChiTieuId: row.id,
    ten: row.ten,
    hanMuc: row.nganSach[0]?.hanMuc ?? null,
  }));
}

/**
 * Mốc đầu tháng (VN) của THÁNG SỚM NHẤT đang có ít nhất một `GiaoDich`, hoặc
 * `null` khi chưa có Giao dịch nào — dùng để chặn "◀" của Báo cáo tháng không
 * cho lùi qua tháng chưa từng có dữ liệu (CAP-7), mirror `layNgaySomNhat()`
 * (`app/lich-trinh/queries.ts:109-114`).
 */
export async function layThangSomNhat(): Promise<Date | null> {
  const somNhat = await prisma.giaoDich.findFirst({
    orderBy: { ngay: "asc" },
  });
  return somNhat ? layMocDauThangVN(somNhat.ngay) : null;
}

/**
 * Đọc Báo cáo chi tiêu của THÁNG chứa `thoiDiem` (mặc định: tháng hiện tại,
 * giờ VN) — CAP-7: tổng Chi/Thu (cùng nguyên tắc cộng theo `loai` như
 * `layGiaoDichThangHienTai()`) và chi tiết đã chi theo từng Danh mục, kèm hạn
 * mức `NganSach` của đúng tháng đó khi có (`hanMuc: null` khi không có).
 *
 * Đọc-only: không bao giờ ghi `GiaoDich`/`NganSach`. Ranh giới tháng dùng
 * `[dauThang, dauThangKeTiep)` qua `lib/ngayVn.ts`, cùng quy ước với
 * `layGiaoDichThangHienTai()`.
 */
export async function layBaoCaoThang(
  thoiDiem: Date = new Date(),
): Promise<BaoCaoThang> {
  const dauThang = layMocDauThangVN(thoiDiem);
  const dauThangKeTiep = layMocDauThangKeTiepVN(thoiDiem);

  const rows = await prisma.giaoDich.findMany({
    where: { ngay: { gte: dauThang, lt: dauThangKeTiep } },
    include: { danhMucChiTieu: true },
  });

  let tongChi = 0;
  let tongThu = 0;
  // Cộng dồn `daChi` theo `danhMucChiTieuId` — chỉ những Danh mục có ít nhất
  // một Giao dịch Chi trong tháng này mới xuất hiện ở đây (Code Map).
  const theoDanhMuc = new Map<number, { ten: string; daChi: number }>();

  for (const row of rows) {
    const loai = laLoaiGiaoDich(row.loai) ? row.loai : "Chi";
    if (loai !== "Chi") {
      tongThu += row.soTien;
      continue;
    }

    tongChi += row.soTien;
    if (row.danhMucChiTieuId === null) continue;

    const hienCo = theoDanhMuc.get(row.danhMucChiTieuId);
    if (hienCo) {
      hienCo.daChi += row.soTien;
    } else {
      theoDanhMuc.set(row.danhMucChiTieuId, {
        ten: row.danhMucChiTieu?.ten ?? "Danh mục đã xoá",
        daChi: row.soTien,
      });
    }
  }

  const idDanhMuc = [...theoDanhMuc.keys()];
  const nganSachRows =
    idDanhMuc.length === 0
      ? []
      : await prisma.nganSach.findMany({
          where: { thang: dauThang, danhMucChiTieuId: { in: idDanhMuc } },
          select: { danhMucChiTieuId: true, hanMuc: true },
        });
  const hanMucTheoDanhMuc = new Map(
    nganSachRows.map((r) => [r.danhMucChiTieuId, r.hanMuc]),
  );

  const chiTietDanhMuc: ChiTietDanhMucBaoCao[] = [...theoDanhMuc.entries()]
    .map(([danhMucChiTieuId, { ten, daChi }]) => ({
      danhMucChiTieuId,
      ten,
      daChi,
      hanMuc: hanMucTheoDanhMuc.get(danhMucChiTieuId) ?? null,
    }))
    .sort(
      (a, b) => a.ten.localeCompare(b.ten) || a.danhMucChiTieuId - b.danhMucChiTieuId,
    );

  return { thang: dauThang, tongChi, tongThu, chiTietDanhMuc };
}
