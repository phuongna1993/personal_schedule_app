import type { Metadata } from "next";
import NutDoiTheme from "@/app/NutDoiTheme";
import {
  formatThangVN,
  layMocDauThangKeTiepVN,
  layMocDauThangVN,
  thamSoThangVN,
  themNgay,
  tuThamSoThang,
} from "@/lib/ngayVn";
import HocTapView from "./HocTapView";
import {
  layLichSuThang,
  layThangSomNhatHocTap,
  tinhStreak,
} from "./queries";

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
 * Màn hình Học tập (CAP-11/CAP-12, FR-11/FR-12) — ghi một Buổi học cho một
 * trong hai Kỹ năng (Story 8, không đổi ở story này), cộng thêm xem tiến độ:
 * streak chạy (không phụ thuộc `?thang=`), tổng thời lượng của tháng đang
 * xem, và danh sách Buổi học của tháng đó — cho từng Kỹ năng độc lập (Story
 * 9, CAP-12).
 *
 * Điều hướng tháng dùng chung MỘT `?thang=yyyy-mm` cho cả hai cột, mirror
 * đúng pattern `app/chi-tieu/page.tsx` (parse -> kẹp giữa tháng sớm nhất có
 * `BuoiHoc` ở CẢ HAI Kỹ năng và tháng hiện tại -> không bao giờ tương lai).
 */
export default async function TrangHocTap({
  searchParams,
}: {
  searchParams: Promise<{ thang?: string }>;
}) {
  const { thang: thangThamSo } = await searchParams;
  const thangHienTai = layMocDauThangVN();

  // `layThangSomNhatHocTap()`/`tinhStreak()` không phụ thuộc `thangXem` (streak
  // luôn là con số chạy, độc lập tháng đang xem — Boundaries) nên chạy song
  // song, cùng lúc với clamp bên dưới, thay vì đợi tuần tự.
  const [thangSomNhat, streakTiengAnh, streakAutomationTest] =
    await Promise.all([
      layThangSomNhatHocTap(),
      tinhStreak("TiengAnh"),
      tinhStreak("AutomationTest"),
    ]);

  let thangXem = (thangThamSo && tuThamSoThang(thangThamSo)) || thangHienTai;

  // `?thang=` là input người dùng tự gõ lên URL — kẹp lại vào đúng khoảng cho
  // phép điều hướng (giữa tháng sớm nhất có `BuoiHoc` và tháng hiện tại) ngay
  // ở đây, không chỉ dựa vào việc UI có render link ◀/▶ hay không (mirror
  // `app/chi-tieu/page.tsx:62-75`).
  if (thangXem.getTime() > thangHienTai.getTime()) {
    thangXem = thangHienTai;
  } else if (
    thangSomNhat !== null &&
    thangXem.getTime() < thangSomNhat.getTime()
  ) {
    thangXem = thangSomNhat;
  }

  const [lichSuTiengAnh, lichSuAutomationTest] = await Promise.all([
    layLichSuThang("TiengAnh", thangXem),
    layLichSuThang("AutomationTest", thangXem),
  ]);

  // ◀/▶ chỉ di chuyển giữa tháng sớm nhất có `BuoiHoc` (ở bất kỳ Kỹ năng nào)
  // và tháng hiện tại — không bao giờ lùi qua tháng chưa từng có dữ liệu,
  // không được tiến qua tháng hiện tại (AD-2, Boundaries: never tương lai).
  const coTheLui =
    thangSomNhat !== null && thangXem.getTime() > thangSomNhat.getTime();
  const coTheToi = thangXem.getTime() < thangHienTai.getTime();
  const laThangHienTai = thangXem.getTime() === thangHienTai.getTime();

  const hrefThangTruoc = coTheLui
    ? `/hoc-tap?thang=${thamSoThangVN(layMocDauThangVN(themNgay(thangXem, -1)))}`
    : null;
  const hrefThangSau = coTheToi
    ? `/hoc-tap?thang=${thamSoThangVN(layMocDauThangKeTiepVN(thangXem))}`
    : null;

  // `formatThangVN` trả "Tháng M/yyyy" — ghép thẳng sau "Tháng này ·" sẽ lặp
  // từ "Tháng" hai lần liền nhau (mirror `app/chi-tieu/page.tsx`).
  const nhanThang = laThangHienTai
    ? `Tháng này · ${formatThangVN(thangXem).replace(/^Tháng /, "")}`
    : formatThangVN(thangXem);

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

      <HocTapView
        tienDo={{
          TiengAnh: { streak: streakTiengAnh, ...lichSuTiengAnh },
          AutomationTest: {
            streak: streakAutomationTest,
            ...lichSuAutomationTest,
          },
        }}
        nhanThang={nhanThang}
        hrefThangTruoc={hrefThangTruoc}
        hrefThangSau={hrefThangSau}
      />
    </main>
  );
}
