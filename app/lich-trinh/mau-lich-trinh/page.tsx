import type { Metadata } from "next";
import Link from "next/link";
import NutDoiTheme from "@/app/NutDoiTheme";
import { layMauLichTrinh } from "../queries";
import TrinhSoanThaoMau from "./TrinhSoanThaoMau";

export const metadata: Metadata = {
  title: "Mẫu lịch trình",
};

/**
 * Màn hình đọc trực tiếp từ SQLite cục bộ, luôn phải phản ánh trạng thái hiện
 * tại của DB — không được prerender tĩnh ở thời điểm build.
 */
export const dynamic = "force-dynamic";

/**
 * Màn hình Mẫu lịch trình (CAP-1 / FR-1).
 * Server Component: đọc trực tiếp qua hàm đọc của chính module (AD-1), rồi
 * giao phần tương tác cho một Client Component gọi Server Actions (AD-3).
 *
 * Ground truth thị giác:
 * `_bmad-output/planning-artifacts/ux-designs/ux-personal_phuongna-2026-08-19/mockups/routine-template.html`
 */
export default async function TrangMauLichTrinh() {
  const tasks = await layMauLichTrinh();

  return (
    <main className="screen">
      <div className="app-header">
        <div>
          <Link className="back-link" href="/lich-trinh">
            ← Về Lịch trình hôm nay
          </Link>
          <h1 className="screen-title">Mẫu lịch trình</h1>
          <p className="screen-sub">
            Danh sách Task mặc định · dùng để khởi tạo mọi Lịch trình ngày mới
          </p>
        </div>
        <div className="header-tools">
          <NutDoiTheme />
        </div>
      </div>

      {/* info-box: giải thích hành vi hệ thống trung tính (AD-2, append-only
          edit). Không phải cảnh báo — vai trò đó thuộc riêng alert-box. */}
      <div className="info-box">
        <span className="icon" aria-hidden="true">
          ⓘ
        </span>
        <p className="txt">
          Đây là <b>bản Mẫu</b>, không phải Lịch trình của một ngày cụ thể.
          Sửa/thêm/xoá Task ở đây chỉ ảnh hưởng các{" "}
          <b>Lịch trình ngày được khởi tạo sau này</b> — các ngày đã qua hoặc đã
          lên kế hoạch trước đó giữ nguyên, không bị ghi đè.
        </p>
      </div>

      <TrinhSoanThaoMau tasks={tasks} />
    </main>
  );
}
