import type { Metadata } from "next";
import NutDoiTheme from "@/app/NutDoiTheme";
import NutVeHome from "@/app/NutVeHome";
import {
  formatThangVN,
  layMocDauThangKeTiepVN,
  layMocDauThangVN,
  thamSoThangVN,
  themNgay,
  tuThamSoThang,
} from "@/lib/ngayVn";
import ChiTieuView from "./ChiTieuView";
import {
  layBaoCaoThang,
  layDanhMucVoiHanMucThangHienTai,
  layDanhSachDanhMuc,
  layGiaoDichThangHienTai,
  layThangSomNhat,
} from "./queries";

export const metadata: Metadata = {
  title: "Chi tiêu",
};

/**
 * Màn hình đọc trực tiếp từ SQLite cục bộ, luôn phải phản ánh trạng thái hiện
 * tại của DB — không được prerender tĩnh ở thời điểm build.
 */
export const dynamic = "force-dynamic";

/**
 * Màn hình Chi tiêu (CAP-4/CAP-7, FR-4) — ghi nhanh một Giao dịch, xem/sửa log
 * tháng hiện tại, và xem Báo cáo tháng (Chi/Thu + chi tiết theo Danh mục) của
 * bất kỳ tháng nào trong quá khứ. Không có dashboard hub nào để làm điểm vào
 * (Story 11 chưa build), nên đây là một trang standalone, không phải overlay
 * sheet (xem Design Notes của story).
 *
 * Server Component: đọc trực tiếp qua các hàm đọc của chính module (AD-1),
 * giao phần tương tác cho một Client Component gọi Server Actions (AD-3).
 * Điều hướng tháng của Báo cáo đi qua query string `?thang=yyyy-mm`, cùng
 * pattern `?ngay=yyyy-mm-dd` của `app/lich-trinh/page.tsx`.
 */
export default async function TrangChiTieu({
  searchParams,
}: {
  searchParams: Promise<{ thang?: string }>;
}) {
  const { thang: thangThamSo } = await searchParams;
  const thangHienTai = layMocDauThangVN();

  // `layThangSomNhat()` không phụ thuộc `thangXem` (nó dùng để TÍNH `thangXem`
  // qua bước kẹp bên dưới) nên chạy song song với ba lượt đọc còn lại thay vì
  // `await` riêng lẻ trước — chỉ `layBaoCaoThang()` mới cần đợi `thangXem` đã
  // kẹp xong.
  const [duLieuThang, danhSachDanhMuc, danhMucVoiHanMuc, thangSomNhat] =
    await Promise.all([
      layGiaoDichThangHienTai(),
      layDanhSachDanhMuc(),
      layDanhMucVoiHanMucThangHienTai(),
      layThangSomNhat(),
    ]);

  let thangXem = (thangThamSo && tuThamSoThang(thangThamSo)) || thangHienTai;

  // `?thang=` là input người dùng tự gõ lên URL — kẹp lại vào đúng khoảng cho
  // phép điều hướng (giữa tháng sớm nhất có Giao dịch và tháng hiện tại) ngay
  // ở đây, không chỉ dựa vào việc UI có render link ◀/▶ hay không (mirror
  // `app/lich-trinh/page.tsx:52-56`).
  if (thangXem.getTime() > thangHienTai.getTime()) {
    thangXem = thangHienTai;
  } else if (
    thangSomNhat !== null &&
    thangXem.getTime() < thangSomNhat.getTime()
  ) {
    thangXem = thangSomNhat;
  }

  const baoCaoThang = await layBaoCaoThang(thangXem);

  // ◀/▶ của Báo cáo chỉ di chuyển giữa tháng sớm nhất có Giao dịch và tháng
  // hiện tại — không bao giờ lùi qua tháng chưa từng có dữ liệu, không được
  // tiến qua tháng hiện tại (AD-2, Boundaries: never tương lai).
  const coTheLui =
    thangSomNhat !== null && thangXem.getTime() > thangSomNhat.getTime();
  const coTheToi = thangXem.getTime() < thangHienTai.getTime();
  const laThangHienTai = thangXem.getTime() === thangHienTai.getTime();

  const hrefThangTruoc = coTheLui
    ? `/chi-tieu?thang=${thamSoThangVN(layMocDauThangVN(themNgay(thangXem, -1)))}`
    : null;
  const hrefThangSau = coTheToi
    ? `/chi-tieu?thang=${thamSoThangVN(layMocDauThangKeTiepVN(thangXem))}`
    : null;

  // `formatThangVN` trả "Tháng M/yyyy" — ghép thẳng sau "Tháng này ·" sẽ lặp
  // từ "Tháng" hai lần liền nhau, nên tháng hiện tại chỉ lấy phần số "M/yyyy"
  // (mirror `app/lich-trinh`'s "Hôm nay · dd/mm/yyyy").
  const nhanThang = laThangHienTai
    ? `Tháng này · ${formatThangVN(thangXem).replace(/^Tháng /, "")}`
    : formatThangVN(thangXem);

  return (
    <main className="screen">
      <div className="app-header">
        <div>
          <h1 className="screen-title">Chi tiêu</h1>
          <p className="screen-sub">
            Ghi nhanh một Giao dịch Chi/Thu · xem lại và sửa log tháng này
          </p>
        </div>
        <div className="header-tools">
          <NutVeHome />
          <NutDoiTheme />
        </div>
      </div>

      <ChiTieuView
        giaoDich={duLieuThang.giaoDich}
        tongChi={duLieuThang.tongChi}
        tongThu={duLieuThang.tongThu}
        danhSachDanhMucBanDau={danhSachDanhMuc}
        danhMucVoiHanMuc={danhMucVoiHanMuc}
        baoCaoThang={baoCaoThang}
        nhanThang={nhanThang}
        hrefThangTruoc={hrefThangTruoc}
        hrefThangSau={hrefThangSau}
      />
    </main>
  );
}
