import type { Metadata } from "next";
import NutDoiTheme from "@/app/NutDoiTheme";
import ChiTieuView from "./ChiTieuView";
import {
  layDanhMucVoiHanMucThangHienTai,
  layDanhSachDanhMuc,
  layGiaoDichThangHienTai,
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
 * Màn hình Chi tiêu (CAP-4, FR-4) — ghi nhanh một Giao dịch và xem/sửa log
 * tháng hiện tại. Không có dashboard hub nào để làm điểm vào (Story 11 chưa
 * build), nên đây là một trang standalone, không phải overlay sheet (xem
 * Design Notes của story).
 *
 * Server Component: đọc trực tiếp qua các hàm đọc của chính module (AD-1),
 * giao phần tương tác cho một Client Component gọi Server Actions (AD-3).
 */
export default async function TrangChiTieu() {
  const [duLieuThang, danhSachDanhMuc, danhMucVoiHanMuc] = await Promise.all([
    layGiaoDichThangHienTai(),
    layDanhSachDanhMuc(),
    layDanhMucVoiHanMucThangHienTai(),
  ]);

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
          <NutDoiTheme />
        </div>
      </div>

      <ChiTieuView
        giaoDich={duLieuThang.giaoDich}
        tongChi={duLieuThang.tongChi}
        tongThu={duLieuThang.tongThu}
        danhSachDanhMucBanDau={danhSachDanhMuc}
        danhMucVoiHanMuc={danhMucVoiHanMuc}
      />
    </main>
  );
}
