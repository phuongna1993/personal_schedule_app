import type { Metadata } from "next";
import { layMocNgayVN, themNgay } from "@/lib/ngayVn";
import DashboardView from "./DashboardView";
import {
  layCanhBaoNganSachHienTai,
  layDanhMucVoiHanMucThangHienTai,
} from "./chi-tieu/queries";
import { tinhStreak, layLoTrinh } from "./hoc-tap/queries";
import { taoLichTrinhNgayTuMau } from "./lich-trinh/actions";
import { layLichTrinhNgay } from "./lich-trinh/queries";
import { layThucDonNgay } from "./thuc-don/queries";

export const metadata: Metadata = {
  title: "Hôm nay",
};

/**
 * Màn hình đọc trực tiếp từ SQLite cục bộ, luôn phải phản ánh trạng thái hiện
 * tại của DB — không được prerender tĩnh ở thời điểm build (mirror mọi màn
 * hình khác của app).
 */
export const dynamic = "force-dynamic";

/**
 * Hôm nay (Story 11, spec-checkpoint) — hub tổng hợp CẢ 4 module trong MỘT
 * lượt quét mắt, điểm vào duy nhất của app (EXPERIENCE.md's UJ-1).
 *
 * AD-1: tầng tổng hợp này CHỈ được lấy dữ liệu 4 module qua các hàm export
 * trong `queries.ts` của từng module — không bao giờ import Prisma model của
 * module khác, kể cả để đọc. Không có Server Action nào được gọi từ trang
 * này ngoài `taoLichTrinhNgayTuMau()` (AD-3 ngoại lệ 2 — khởi tạo ngầm Lịch
 * trình HÔM NAY trong đường đọc, mirror `app/lich-trinh/page.tsx`).
 *
 * Ba trong bốn module KHÔNG cần đọc gì mới (Design Notes của story): Lịch
 * trình dùng `layLichTrinhNgay()` (HÔM NAY) nguyên trạng, Thực đơn dùng
 * `layThucDonNgay()` (NGÀY MAI) nguyên trạng, Học tập dùng `tinhStreak()` +
 * `layLoTrinh()` nguyên trạng cho cả hai Kỹ năng. Chi tiêu là module duy nhất
 * có đọc mới: `layCanhBaoNganSachHienTai()` (Story 11) — cộng thêm
 * `layDanhMucVoiHanMucThangHienTai()` (đã có từ Story 4) chỉ để phân biệt
 * "chưa đặt Ngân sách nào" khỏi "đã đặt nhưng mọi Danh mục đều lành mạnh",
 * hai trạng thái mà `layCanhBaoNganSachHienTai()` một mình không phân biệt
 * được (mảng rỗng khớp cả hai — I/O matrix).
 */
export default async function TrangHomNay() {
  await taoLichTrinhNgayTuMau();

  const homNay = layMocNgayVN();
  const ngayMai = themNgay(homNay, 1);

  const [
    lichTrinh,
    danhMucVoiHanMuc,
    canhBaoNganSach,
    thucDon,
    streakTiengAnh,
    streakAutomationTest,
    loTrinhTiengAnh,
    loTrinhAutomationTest,
  ] = await Promise.all([
    layLichTrinhNgay(),
    layDanhMucVoiHanMucThangHienTai(),
    layCanhBaoNganSachHienTai(),
    layThucDonNgay(ngayMai),
    tinhStreak("TiengAnh"),
    tinhStreak("AutomationTest"),
    layLoTrinh("TiengAnh"),
    layLoTrinh("AutomationTest"),
  ]);

  return (
    <main className="screen">
      <DashboardView
        ngayHomNay={homNay}
        lichTrinh={lichTrinh}
        coNganSachThangNay={danhMucVoiHanMuc.some((d) => d.hanMuc !== null)}
        canhBaoNganSach={canhBaoNganSach}
        ngayMai={ngayMai}
        thucDon={thucDon}
        hocTap={{
          TiengAnh: { streak: streakTiengAnh, loTrinh: loTrinhTiengAnh },
          AutomationTest: {
            streak: streakAutomationTest,
            loTrinh: loTrinhAutomationTest,
          },
        }}
      />
    </main>
  );
}
