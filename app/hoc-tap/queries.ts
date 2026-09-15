import { cache } from "react";
import { prisma } from "@/lib/db";
import {
  layMocDauThangKeTiepVN,
  layMocDauThangVN,
  layMocNgayVN,
  themNgay,
} from "@/lib/ngayVn";
import {
  type BuoiHocDaGhi,
  dinhDangBuoiHoc,
  KY_NANG,
  type KyNangEnum,
  type LoTrinhDuLieu,
  type MocDuLieu,
  MOC_THEO_KY_NANG,
} from "./model";

/** Re-export cho tầng tổng hợp Hôm nay (Story 11, AD-1) — chỉ được đọc kiểu
 * dữ liệu qua `queries.ts`, không bao giờ import trực tiếp `./model`. */
export type { KyNangEnum, LoTrinhDuLieu } from "./model";

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

// ---------------------------------------------------------------------------
// Lộ trình & Mốc (CAP-13, Story 10)
// ---------------------------------------------------------------------------

/**
 * Lazy-seed toàn bộ 10 hàng `Moc` cố định (3 TiengAnh + 7 AutomationTest),
 * nếu chưa tồn tại — mirror `taoLichTrinhNgayTuMau()`'s "AD-3 ngoại lệ 2"
 * lazy-init convention (`app/lich-trinh/actions.ts`): một INSERT xảy ra
 * NGẦM trong đường đọc, không phải một cổng ghi công khai cho UI gọi trực
 * tiếp.
 *
 * PHẢI gọi trước MỌI lần đọc dữ liệu Lộ trình (`layMocHienTai`, `layLoTrinh`)
 * — kể cả lần đọc đầu tiên khi bảng `Moc` còn rỗng (Boundaries: "First
 * visit, no Mốc seeded yet"). `upsert` trên khoá `@@unique([kyNang, thuTu])`
 * là idempotent — gọi lại nhiều lần không bao giờ tạo hàng trùng.
 *
 * Bọc trong React `cache()`: cả `layMocHienTai()` lẫn `layLoTrinh()` đều gọi
 * hàm này, và `page.tsx` gọi `layLoTrinh()` hai lần (một cho mỗi Kỹ năng)
 * trong CÙNG một request — không có `cache()`, một lượt xem trang bình
 * thường sẽ bắn lại toàn bộ 10 lệnh upsert nhiều lần một cách dư thừa.
 * `cache()` memoize theo request (kể cả một Server Action), nên tất cả các
 * lệnh gọi trong cùng request chia sẻ đúng MỘT promise.
 */
export const damBaoMocDaKhoiTao = cache(async (): Promise<void> => {
  const slot: { kyNang: KyNangEnum; thuTu: number }[] = [];
  for (const kyNang of KY_NANG) {
    for (const dinhNghia of MOC_THEO_KY_NANG[kyNang]) {
      slot.push({ kyNang, thuTu: dinhNghia.thuTu });
    }
  }

  await Promise.all(
    slot.map(({ kyNang, thuTu }) =>
      prisma.moc.upsert({
        where: { kyNang_thuTu: { kyNang, thuTu } },
        create: { kyNang, thuTu },
        update: {},
      }),
    ),
  );
});

/**
 * "Vị trí hiện tại" trên Lộ trình của một Kỹ năng (AD-2) — KHÔNG có cột con
 * trỏ vật lý riêng, luôn SUY RA bằng truy vấn: Mốc có `thuTu` nhỏ nhất mà
 * `ngayHoanThanh` còn `null`. Trả `null` khi mọi Mốc của Kỹ năng này đã Hoàn
 * thành (terminal state).
 *
 * MỌI nơi cần biết vị trí hiện tại (đây, `layLoTrinh()`, `hoanThanhMoc()`
 * trong `actions.ts`) phải gọi hàm DUY NHẤT này — không tự suy luận riêng lẻ
 * (mirror AD-2's yêu cầu về `layMocHienTai()` trong ARCHITECTURE-SPINE.md).
 */
export async function layMocHienTai(
  kyNang: KyNangEnum,
): Promise<{ id: number; thuTu: number } | null> {
  await damBaoMocDaKhoiTao();

  return prisma.moc.findFirst({
    where: { kyNang, ngayHoanThanh: null },
    orderBy: { thuTu: "asc" },
    select: { id: true, thuTu: true },
  });
}

/**
 * Toàn bộ Lộ trình đã sắp xếp của một Kỹ năng (CAP-13) — merge tiêu đề cố
 * định (`MOC_THEO_KY_NANG`) + trạng thái Hoàn thành từ DB. Với Kỹ năng Tiếng
 * Anh, đánh dấu thêm Mốc HIỆN TẠI đã có Điểm số Bài test hay chưa
 * (`coDiemBaiTest`) — CHỈ để gate nút "Hoàn thành Mốc" ở UI, KHÔNG trả toàn
 * bộ lịch sử Điểm số của mọi Mốc (deferred — Boundaries: "no dedicated Điểm
 * số history view across all BaiTestDanhGia rows").
 *
 * "Mốc hiện tại" ở đây LUÔN đến từ `layMocHienTai()` — không tự
 * `rows.find(...)` lại một lần suy luận thứ hai. Dù về mặt toán học hai cách
 * tính cho cùng kết quả (cùng lọc `kyNang`, cùng sắp `thuTu`), đây là bất
 * biến quan trọng nhất của story ("vị trí hiện tại luôn suy ra qua ĐÚNG MỘT
 * hàm") nên không được phép có một bản sao logic thứ hai, dù tương đương,
 * ở nơi khác (AD-2).
 */
export async function layLoTrinh(kyNang: KyNangEnum): Promise<LoTrinhDuLieu> {
  await damBaoMocDaKhoiTao();

  const [rows, mocHienTai] = await Promise.all([
    prisma.moc.findMany({
      where: { kyNang },
      orderBy: { thuTu: "asc" },
    }),
    layMocHienTai(kyNang),
  ]);

  const tenTheoThuTu = new Map(
    MOC_THEO_KY_NANG[kyNang].map((d) => [d.thuTu, d.ten]),
  );

  let coDiemBaiTestMocHienTai = false;
  if (kyNang === "TiengAnh" && mocHienTai) {
    const soLuong = await prisma.baiTestDanhGia.count({
      where: { mocId: mocHienTai.id },
    });
    coDiemBaiTestMocHienTai = soLuong > 0;
  }

  const moc: MocDuLieu[] = rows.map((row) => ({
    id: row.id,
    kyNang,
    thuTu: row.thuTu,
    ten: tenTheoThuTu.get(row.thuTu) ?? `Mốc ${row.thuTu}`,
    ngayHoanThanh: row.ngayHoanThanh,
    coDiemBaiTest:
      mocHienTai !== null && row.id === mocHienTai.id
        ? coDiemBaiTestMocHienTai
        : false,
  }));

  return { kyNang, moc, mocHienTaiId: mocHienTai?.id ?? null };
}
