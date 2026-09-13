import { prisma } from "@/lib/db";
import {
  layMocDauThangKeTiepVN,
  layMocDauThangVN,
  layMocNgayVN,
  themNgay,
} from "@/lib/ngayVn";
import { type BuoiHocDaGhi, dinhDangBuoiHoc, type KyNangEnum } from "./model";

/**
 * AD-1 — Module Học tập sở hữu độc quyền model `BuoiHoc`, kể cả đường ĐỌC.
 * Server Action hoặc truy vấn của module khác (kể cả tầng tổng hợp
 * `app/(dashboard)`, khi tồn tại) không được import Prisma model này để tự
 * query — mọi nơi đọc dữ liệu Học tập phải đi qua các hàm export ở file này.
 *
 * File này chạm `lib/db` nên chỉ dùng được ở phía server (mirror
 * `app/chi-tieu/queries.ts`). `dinhDangBuoiHoc()` (chuẩn hoá `kyNang` ở biên
 * đọc) dùng chung với `actions.ts` — khai báo tại `./model` (Prisma-free) để
 * không có hai bản sao trôi dạt.
 */

/**
 * Mốc đầu tháng (VN) của THÁNG SỚM NHẤT đang có ít nhất một `BuoiHoc`, tính
 * trên CẢ HAI Kỹ năng gộp lại (không lọc theo `kyNang`) — dùng để chặn "◀"
 * của month-nav không cho lùi qua tháng chưa từng có dữ liệu ở bất kỳ Kỹ năng
 * nào (CAP-12), mirror `layThangSomNhat()` (`app/chi-tieu/queries.ts`).
 *
 * `null` khi chưa có `BuoiHoc` nào (ở cả hai Kỹ năng).
 */
export async function layThangSomNhatHocTap(): Promise<Date | null> {
  const somNhat = await prisma.buoiHoc.findFirst({
    orderBy: { ngay: "asc" },
  });
  return somNhat ? layMocDauThangVN(somNhat.ngay) : null;
}

/** Lịch sử một THÁNG của một Kỹ năng (CAP-12) — `buoiHoc` sắp theo ngày giảm
 * dần (mới nhất trước), rồi id giảm dần khi cùng ngày (mirror
 * `layGiaoDichThangHienTai()`'s orderBy). `tongThoiLuongPhut` cộng dồn TẤT CẢ
 * các hàng trong tháng — kể cả nhiều hàng cùng `ngay` (Boundaries: "Counted
 * once toward streak; month total sums both"), khác hẳn cách `tinhStreak()`
 * dedupe theo ngày. */
export type LichSuThangHocTap = {
  buoiHoc: BuoiHocDaGhi[];
  tongThoiLuongPhut: number;
};

/**
 * Đọc lịch sử `BuoiHoc` của một Kỹ năng trong THÁNG chứa `thoiDiem` (mặc
 * định: tháng hiện tại, giờ VN) + tổng `thoiLuongPhut` của tháng đó.
 *
 * Đọc-only, không bao giờ ghi. Ranh giới tháng dùng `[dauThang,
 * dauThangKeTiep)` qua `lib/ngayVn.ts`, cùng quy ước với module Chi tiêu. Ghi
 * cho một Kỹ năng không bao giờ đọc/trộn dữ liệu Kỹ năng còn lại — luôn lọc
 * cứng theo `kyNang` truyền vào (Boundaries: hai Kỹ năng độc lập hoàn toàn).
 */
export async function layLichSuThang(
  kyNang: KyNangEnum,
  thoiDiem: Date = new Date(),
): Promise<LichSuThangHocTap> {
  const dauThang = layMocDauThangVN(thoiDiem);
  const dauThangKeTiep = layMocDauThangKeTiepVN(thoiDiem);

  const rows = await prisma.buoiHoc.findMany({
    where: { kyNang, ngay: { gte: dauThang, lt: dauThangKeTiep } },
    orderBy: [{ ngay: "desc" }, { id: "desc" }],
  });

  const buoiHoc = rows.map(dinhDangBuoiHoc);
  const tongThoiLuongPhut = buoiHoc.reduce(
    (tong, bh) => tong + bh.thoiLuongPhut,
    0,
  );

  return { buoiHoc, tongThoiLuongPhut };
}

/**
 * Streak (số ngày liên tiếp có ít nhất một `BuoiHoc`) của một Kỹ năng
 * (CAP-12) — CHẠY, không phụ thuộc tháng đang xem qua `?thang=` (Boundaries:
 * "never scoped to the displayed month").
 *
 * Thuật toán: lấy toàn bộ `ngay` của Kỹ năng này, dedupe vào một `Set` theo
 * ngày lịch VN (nhiều Buổi học cùng ngày chỉ tính một lần), rồi đi lùi từ hôm
 * nay. Nếu hôm nay CHƯA có Buổi học, bắt đầu đếm từ hôm qua thay vì coi như
 * streak đã đứt (Boundaries: "a day not yet over doesn't break the streak").
 */
export async function tinhStreak(kyNang: KyNangEnum): Promise<number> {
  const rows = await prisma.buoiHoc.findMany({
    where: { kyNang },
    select: { ngay: true },
  });

  const cacNgayCoBuoiHoc = new Set(rows.map((row) => row.ngay.getTime()));

  const homNay = layMocNgayVN();
  let ngayDangXet = homNay;

  if (!cacNgayCoBuoiHoc.has(ngayDangXet.getTime())) {
    ngayDangXet = themNgay(homNay, -1);
    if (!cacNgayCoBuoiHoc.has(ngayDangXet.getTime())) return 0;
  }

  let streak = 0;
  while (cacNgayCoBuoiHoc.has(ngayDangXet.getTime())) {
    streak += 1;
    ngayDangXet = themNgay(ngayDangXet, -1);
  }

  return streak;
}
