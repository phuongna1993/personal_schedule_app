import type { Metadata } from "next";
import NutDoiTheme from "@/app/NutDoiTheme";
import HocTapView from "./HocTapView";

export const metadata: Metadata = {
  title: "Học tập",
};

/**
 * Màn hình đọc trực tiếp từ SQLite cục bộ, luôn phải phản ánh trạng thái hiện
 * tại của DB — không được prerender tĩnh ở thời điểm build (mirror mọi màn
 * hình khác của app).
 */
export const dynamic = "force-dynamic";

/**
 * Màn hình Học tập (CAP-11, FR-11) — ghi một Buổi học cho một trong hai Kỹ
 * năng, không có picker: form nào được submit tự ngầm định Kỹ năng đó (mirror
 * Story 7's hai cột độc lập).
 *
 * Server Component không cần đọc gì (không có dashboard hub, và xem lại lịch
 * sử/tổng thời lượng là CAP-12, Story 9 — ngoài phạm vi story này) — chỉ
 * render `HocTapView`, một Client Component gọi thẳng `ghiBuoiHoc()` (AD-3).
 */
export default function TrangHocTap() {
  return (
    <main className="screen">
      <div className="app-header">
        <div>
          <h1 className="screen-title">Học tập</h1>
          <p className="screen-sub">
            Ghi nhanh một Buổi học cho Tiếng Anh hoặc Automation Test
          </p>
        </div>
        <div className="header-tools">
          <NutDoiTheme />
        </div>
      </div>

      <HocTapView />
    </main>
  );
}
