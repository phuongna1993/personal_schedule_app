import type { Metadata } from "next";
import NutDoiTheme from "@/app/NutDoiTheme";
import NganHangMonAnView from "./NganHangMonAnView";
import { layDanhSachMonAn, layDanhSachNguyenLieuDuyNhat } from "../queries";

export const metadata: Metadata = {
  title: "Ngân hàng món ăn",
};

/**
 * Màn hình đọc trực tiếp từ SQLite cục bộ, luôn phải phản ánh trạng thái hiện
 * tại của DB — không được prerender tĩnh ở thời điểm build.
 */
export const dynamic = "force-dynamic";

/**
 * Ngân hàng món ăn (`/thuc-don/chon-mon`, CAP-8) — CRUD Món ăn (tên, danh
 * sách Nguyên liệu, ảnh tuỳ chọn) và lọc tức thời theo một Nguyên liệu. Việc
 * "Gán món cho Thực đơn ngày" (mock's assign-grid) là Story 7's scope, không
 * build ở đây (Never).
 *
 * Không có dashboard hub nào để làm điểm vào (Story 11 chưa build), nên đây
 * là một trang standalone — mirror `app/chi-tieu/page.tsx`.
 *
 * Server Component: đọc trực tiếp qua các hàm đọc của chính module (AD-1),
 * giao phần tương tác (filter tức thời, form thêm/sửa, xoá) cho một Client
 * Component gọi Server Actions (AD-3).
 */
export default async function TrangChonMon() {
  const [danhSachMonAn, danhSachNguyenLieu] = await Promise.all([
    layDanhSachMonAn(),
    layDanhSachNguyenLieuDuyNhat(),
  ]);

  return (
    <main className="screen">
      <div className="app-header">
        <div>
          <h1 className="screen-title">Ngân hàng món ăn</h1>
          <p className="screen-sub">
            Thêm/sửa/xoá Món ăn · lọc theo Nguyên liệu để tìm nhanh
          </p>
        </div>
        <div className="header-tools">
          <NutDoiTheme />
        </div>
      </div>

      <NganHangMonAnView
        danhSachMonAnBanDau={danhSachMonAn}
        danhSachNguyenLieu={danhSachNguyenLieu}
      />
    </main>
  );
}
