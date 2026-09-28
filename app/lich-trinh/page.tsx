import type { Metadata } from "next";
import Link from "next/link";
import NutDoiTheme from "@/app/NutDoiTheme";
import NutVeHome from "@/app/NutVeHome";
import {
  formatNgayVN,
  layMocNgayVN,
  thamSoNgayVN,
  themNgay,
  tuThamSoNgay,
} from "@/lib/ngayVn";
import { taoLichTrinhNgayTuMau } from "./actions";
import LichTrinhNgayView from "./LichTrinhNgayView";
import { SO_NGAY_LEN_LICH_TRUOC_TOI_DA } from "./model";
import { layLichTrinhNgay, layNgaySomNhat } from "./queries";

export const metadata: Metadata = {
  title: "Lịch trình ngày",
};

/**
 * Màn hình đọc trực tiếp từ SQLite cục bộ, luôn phải phản ánh trạng thái hiện
 * tại của DB — không được prerender tĩnh ở thời điểm build.
 */
export const dynamic = "force-dynamic";

/**
 * Màn hình Lịch trình ngày (CAP-2 / CAP-3, FR-2/FR-3).
 *
 * Server Component: gọi `taoLichTrinhNgayTuMau()` trước (AD-3 ngoại lệ 2 —
 * khởi tạo ngầm HÔM NAY nếu chưa có hàng), rồi đọc ngày đang xem qua
 * `layLichTrinhNgay()`. Điều hướng ◀/▶ đi qua query string `?ngay=yyyy-mm-dd`
 * (một Link, không phải Client Component tự quản lý state ngày).
 *
 * Không có mockup pixel cho màn này — dựng theo EXPERIENCE.md's task-row/chk/
 * mini-progress text spec + CSS `.chk`/`.bar` từ mockups/dashboard.html.
 */
export default async function TrangLichTrinhNgay({
  searchParams,
}: {
  searchParams: Promise<{ ngay?: string }>;
}) {
  await taoLichTrinhNgayTuMau();

  const { ngay: ngayThamSo } = await searchParams;
  const homNay = layMocNgayVN();
  let ngayXem = (ngayThamSo && tuThamSoNgay(ngayThamSo)) || homNay;

  const ngaySomNhat = await layNgaySomNhat();

  // Ngày xa nhất được lên lịch trước (xem `SO_NGAY_LEN_LICH_TRUOC_TOI_DA`).
  const ngayXaNhat = themNgay(homNay, SO_NGAY_LEN_LICH_TRUOC_TOI_DA);

  // `?ngay=` là input người dùng tự gõ lên URL — kẹp lại vào đúng khoảng cho
  // phép điều hướng (giữa hàng LichTrinhNgay sớm nhất đang có và ngày xa
  // nhất được lên lịch trước) ngay ở đây, không chỉ dựa vào việc UI có render
  // link ◀/▶ hay không.
  if (ngayXem.getTime() > ngayXaNhat.getTime()) {
    ngayXem = ngayXaNhat;
  } else if (ngaySomNhat !== null && ngayXem.getTime() < ngaySomNhat.getTime()) {
    ngayXem = ngaySomNhat;
  }

  const duLieuNgay = await layLichTrinhNgay(ngayXem);

  // ◀ không bao giờ lùi qua hàng LichTrinhNgay sớm nhất đang có (quá khứ đã
  // bỏ qua không được tạo bù). ▶ được tiến qua hôm nay để lên lịch trước cho
  // ngày tương lai — nhưng chỉ HÔM NAY tự khởi tạo; ngày tương lai chỉ tạo
  // khi bấm "Lên lịch cho ngày này" (`lenLichNgayTuongLai`), không tự tạo
  // chỉ vì lướt qua.
  const coTheLui =
    ngaySomNhat !== null && duLieuNgay.ngay.getTime() > ngaySomNhat.getTime();
  const coTheToi = duLieuNgay.ngay.getTime() < ngayXaNhat.getTime();
  const laHomNay = duLieuNgay.ngay.getTime() === homNay.getTime();
  const laTuongLai = duLieuNgay.ngay.getTime() > homNay.getTime();
  const laNgayMai =
    duLieuNgay.ngay.getTime() === themNgay(homNay, 1).getTime();

  const hrefTruoc = coTheLui
    ? `/lich-trinh?ngay=${thamSoNgayVN(themNgay(duLieuNgay.ngay, -1))}`
    : null;
  const hrefSau = coTheToi
    ? `/lich-trinh?ngay=${thamSoNgayVN(themNgay(duLieuNgay.ngay, 1))}`
    : null;

  const nhanNgay = laHomNay
    ? `Hôm nay · ${formatNgayVN(duLieuNgay.ngay)}`
    : laNgayMai
      ? `Ngày mai · ${formatNgayVN(duLieuNgay.ngay)}`
      : formatNgayVN(duLieuNgay.ngay);

  return (
    <main className="screen">
      <div className="app-header">
        <div>
          <Link className="back-link" href="/lich-trinh/mau-lich-trinh">
            Xem Mẫu lịch trình →
          </Link>
          <h1 className="screen-title">Lịch trình ngày</h1>
          <p className="screen-sub">
            Khởi tạo từ Mẫu lịch trình · sửa riêng cho ngày này không ảnh
            hưởng Mẫu gốc
          </p>
        </div>
        <div className="header-tools">
          <NutVeHome />
          <NutDoiTheme />
        </div>
      </div>

      <LichTrinhNgayView
        lichTrinhNgayId={duLieuNgay.id}
        ghiChu={duLieuNgay.ghiChu}
        tonTai={duLieuNgay.tonTai}
        tasks={duLieuNgay.tasks}
        soDaXong={duLieuNgay.soDaXong}
        tongSo={duLieuNgay.tongSo}
        nhanNgay={nhanNgay}
        laHomNay={laHomNay}
        laTuongLai={laTuongLai}
        ngayThamSo={thamSoNgayVN(duLieuNgay.ngay)}
        hrefTruoc={hrefTruoc}
        hrefSau={hrefSau}
      />
    </main>
  );
}
