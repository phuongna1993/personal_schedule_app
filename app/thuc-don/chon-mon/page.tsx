import type { Metadata } from "next";
import NutDoiTheme from "@/app/NutDoiTheme";
import { formatNgayVN, layMocNgayVN, thamSoNgayVN, themNgay, tuThamSoNgay } from "@/lib/ngayVn";
import NganHangMonAnView from "./NganHangMonAnView";
import { layDanhSachMonAn, layDanhSachNguyenLieuDuyNhat, layThucDonNgay } from "../queries";

export const metadata: Metadata = {
  title: "Ngân hàng món ăn",
};

/**
 * Màn hình đọc trực tiếp từ SQLite cục bộ, luôn phải phản ánh trạng thái hiện
 * tại của DB — không được prerender tĩnh ở thời điểm build.
 */
export const dynamic = "force-dynamic";

/**
 * Ngân hàng món ăn & Thực đơn ngày (`/thuc-don/chon-mon`, CAP-8/CAP-9/CAP-10)
 * — CRUD Món ăn (tên, danh sách Nguyên liệu, ảnh tuỳ chọn), lọc tức thời theo
 * Nguyên liệu, và bên dưới là "Gán món cho Thực đơn ngày" (Story 7): 3 bữa ×
 * 2 Nhóm khẩu phần độc lập cho một ngày cụ thể, điều hướng ◀/▶.
 *
 * Không có dashboard hub nào để làm điểm vào (Story 11 chưa build), nên đây
 * là một trang standalone — mirror `app/chi-tieu/page.tsx`.
 *
 * Server Component: đọc trực tiếp qua các hàm đọc của chính module (AD-1),
 * giao phần tương tác (filter tức thời, form thêm/sửa/xoá Món ăn, gán/gỡ
 * slot Thực đơn) cho một Client Component gọi Server Actions (AD-3).
 *
 * Day scoping mirrors `app/lich-trinh/page.tsx`'s pattern: `?ngay=yyyy-mm-dd`
 * qua `layMocNgayVN()`/`thamSoNgayVN()`/`tuThamSoNgay()` (`lib/ngayVn.ts`),
 * ◀/▶ prev/next-day links; một `?ngay=` dị dạng rơi về hôm nay (giống
 * `app/lich-trinh/page.tsx`'s `(ngayThamSo && tuThamSoNgay(ngayThamSo)) ||
 * homNay`). KHÔNG áp min/max clamp giữa "ngày sớm nhất"/"hôm nay" như Lịch
 * trình — Thực đơn không có khái niệm khởi tạo/entity-neo-ngày (không
 * `ThucDonNgay` singleton nào tự sinh mỗi ngày như `LichTrinhNgay`), mỗi slot
 * chỉ là một hàng tuỳ chọn theo (ngay, buoi) — lên thực đơn trước cho một
 * ngày tương lai (ví dụ ngày mai) là một nhu cầu hợp lệ, không phải input
 * ngoài phạm vi cần chặn (I/O matrix: "First visit to a day, no menu yet" áp
 * dụng cho MỌI ngày, không chỉ ngày sau một mốc sớm nhất).
 */
export default async function TrangChonMon({
  searchParams,
}: {
  searchParams: Promise<{ ngay?: string }>;
}) {
  const { ngay: ngayThamSo } = await searchParams;
  const homNay = layMocNgayVN();
  const ngayXem = (ngayThamSo && tuThamSoNgay(ngayThamSo)) || homNay;

  const [danhSachMonAn, danhSachNguyenLieu, duLieuThucDon] = await Promise.all([
    layDanhSachMonAn(),
    layDanhSachNguyenLieuDuyNhat(),
    layThucDonNgay(ngayXem),
  ]);

  const laHomNay = ngayXem.getTime() === homNay.getTime();
  const nhanNgay = laHomNay
    ? `Hôm nay · ${formatNgayVN(ngayXem)}`
    : formatNgayVN(ngayXem);
  const hrefNgayTruoc = `/thuc-don/chon-mon?ngay=${thamSoNgayVN(themNgay(ngayXem, -1))}`;
  const hrefNgaySau = `/thuc-don/chon-mon?ngay=${thamSoNgayVN(themNgay(ngayXem, 1))}`;

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
        ngayThamSo={thamSoNgayVN(ngayXem)}
        nhanNgay={nhanNgay}
        hrefNgayTruoc={hrefNgayTruoc}
        hrefNgaySau={hrefNgaySau}
        duLieuThucDon={duLieuThucDon}
      />
    </main>
  );
}
