import Link from "next/link";
import NutDoiTheme from "@/app/NutDoiTheme";
import { formatNgayVN, thamSoNgayVN } from "@/lib/ngayVn";
import { type CanhBaoNganSach, xacDinhTrangThaiNganSach } from "./chi-tieu/model";
import type { KyNangEnum, LoTrinhDuLieu } from "./hoc-tap/queries";
import type { LichTrinhNgayDuLieu, MucUuTien } from "./lich-trinh/queries";
import type { ThucDonNgayDuLieu } from "./thuc-don/queries";

/**
 * `xacDinhTrangThaiNganSach()` là ngoại lệ có chủ đích, đã qua review, với
 * quy tắc "chỉ import queries.ts của module khác" (Boundaries) — hàm THUẦN
 * này (không chạm Prisma) mirror đúng cách `biChanHoanThanhBoiGateDiem()`
 * được tách vào `app/hoc-tap/model.ts` ở Story 10: bất biến hiển thị quan
 * trọng của một thẻ, cần unit-test trực tiếp vì repo không có hạ tầng test
 * component.
 *
 * Hằng số hiển thị bên dưới vẫn CỤC BỘ (không import từ `model.ts` của module
 * khác) — chỉ lặp lại đúng phần CHỮ đã cố định trong Glossary, không lặp lại
 * bất kỳ logic nghiệp vụ nào, nên giữ nguyên cách tách biệt cũ cho phần này.
 */
const NHAN_MUC_UU_TIEN_HOM_NAY: Record<MucUuTien, string> = {
  Cao: "Cao",
  TrungBinh: "Trung bình",
  Thap: "Thấp",
};

const LOP_BADGE_UU_TIEN_HOM_NAY: Record<MucUuTien, string> = {
  Cao: "hi",
  TrungBinh: "mid",
  Thap: "low",
};

const NHAN_BUOI_HOM_NAY: Record<string, string> = {
  Sang: "Sáng",
  Trua: "Trưa",
  Toi: "Tối",
};

const NHAN_KY_NANG_HOM_NAY: Record<KyNangEnum, string> = {
  TiengAnh: "Tiếng Anh",
  AutomationTest: "Automation Test",
};

const KY_NANG_HOM_NAY: readonly KyNangEnum[] = ["TiengAnh", "AutomationTest"];

/** Mirror `ChiTieuView.tsx`/`HocTapView.tsx`'s `formatTien()`. */
function formatTien(so: number): string {
  return so.toLocaleString("vi-VN");
}

/** Giờ hiện tại theo VN (UTC+7 cố định, không DST) — chỉ dùng cho lời chào
 * trang trí, KHÔNG phải một "ranh giới ngày" nên không cần qua
 * `lib/ngayVn.ts` (vốn chỉ cung cấp cấp độ NGÀY, không có giờ). */
function gioHienTaiVN(): number {
  return (new Date().getUTCHours() + 7) % 24;
}

function loiChaoTheoGio(): { text: string; icon: string } {
  const gio = gioHienTaiVN();
  if (gio < 5) return { text: "Chào đêm khuya", icon: "🌙" };
  if (gio < 11) return { text: "Chào buổi sáng", icon: "☀️" };
  if (gio < 18) return { text: "Chào buổi chiều", icon: "🌤" };
  return { text: "Chào buổi tối", icon: "🌙" };
}

function nhanThuTrongTuan(ngay: Date): string {
  const thu = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(ngay);
  return thu.charAt(0).toUpperCase() + thu.slice(1);
}

/**
 * Hôm nay (Story 11) — hub tổng hợp read-only của cả 4 module, một lượt quét
 * mắt (EXPERIENCE.md's UJ-1). KHÔNG có Server Action nào được gọi từ đây —
 * mỗi thẻ chỉ kết thúc bằng một liên kết sang màn của module đó cho mọi thao
 * tác sửa/thêm (Boundaries). Server Component thuần (không "use client") vì
 * không có gì tương tác ở đây (Design Notes).
 *
 * Tab order khớp EXPERIENCE.md's Accessibility Floor: brand → lời chào →
 * avatar → 4 thẻ theo đúng thứ tự Lịch trình → Chi tiêu → Thực đơn → Học tập.
 */
export default function DashboardView({
  ngayHomNay,
  lichTrinh,
  coNganSachThangNay,
  canhBaoNganSach,
  ngayMai,
  thucDon,
  hocTap,
}: {
  ngayHomNay: Date;
  lichTrinh: LichTrinhNgayDuLieu;
  /** `true` khi ÍT NHẤT một Danh mục có hàng `NganSach` cho tháng hiện tại —
   * phân biệt "chưa đặt Ngân sách nào" khỏi "đã đặt nhưng đều lành mạnh"
   * (I/O matrix, `canhBaoNganSach` rỗng khớp cả hai trạng thái đó). */
  coNganSachThangNay: boolean;
  canhBaoNganSach: CanhBaoNganSach[];
  ngayMai: Date;
  thucDon: ThucDonNgayDuLieu;
  hocTap: Record<
    KyNangEnum,
    { streak: number; loTrinh: LoTrinhDuLieu; daTungCoBuoiHoc: boolean }
  >;
}) {
  const { text: loiChao, icon: iconChao } = loiChaoTheoGio();

  return (
    <>
      <div className="app-header">
        <div>
          <span className="brand">Quản Lý Cá Nhân</span>
          <div className="greeting">
            {loiChao} <span aria-hidden="true">{iconChao}</span>
            <span className="date">
              {nhanThuTrongTuan(ngayHomNay)}, {formatNgayVN(ngayHomNay)}
            </span>
          </div>
        </div>
        <div className="header-tools">
          {/* Trang trí thuần — AD-5: không có model User, không bao giờ gắn
              với dữ liệu người dùng thật nào. */}
          <div className="avatar" aria-hidden="true">
            P
          </div>
          <NutDoiTheme />
        </div>
      </div>

      <div className="hub-grid">
        <TheLichTrinh lichTrinh={lichTrinh} />
        <TheChiTieu
          coNganSachThangNay={coNganSachThangNay}
          canhBaoNganSach={canhBaoNganSach}
        />
        <TheThucDon ngayMai={ngayMai} thucDon={thucDon} />
        <TheHocTap hocTap={hocTap} />
      </div>
    </>
  );
}

const SO_TASK_HIEN_TOI_DA = 5;

/** Thẻ Lịch trình — tái dùng `layLichTrinhNgay()` (HÔM NAY) nguyên trạng
 * (Boundaries). Task row đọc-only: checkbox luôn `disabled`, không có
 * check-off nào ở đây (Never). */
function TheLichTrinh({ lichTrinh }: { lichTrinh: LichTrinhNgayDuLieu }) {
  const { tasks, soDaXong, tongSo } = lichTrinh;
  const phanTram = tongSo === 0 ? 0 : Math.round((soDaXong / tongSo) * 100);
  // Task CHƯA xong luôn hiện trước Task đã xong trong danh sách bị cắt —
  // sort ổn định (giữ nguyên thứ tự thoiHan/id trong từng nhóm) chỉ đổi chỗ
  // theo daXong, tránh việc 5 Task ĐÃ xong sớm nhất trong ngày che mất những
  // Task CHƯA xong muộn hơn (mục đích của thẻ là "còn gì phải làm hôm nay").
  const hienThi = [...tasks]
    .sort((a, b) => Number(a.daXong) - Number(b.daXong))
    .slice(0, SO_TASK_HIEN_TOI_DA);
  const conLai = tasks.length - hienThi.length;

  return (
    <section className="card" aria-labelledby="tieu-de-lich-trinh-hom-nay">
      <h2 id="tieu-de-lich-trinh-hom-nay">Lịch trình — Hôm nay</h2>
      <p className="sub">
        {tongSo === 0
          ? "Chưa có Task nào cho hôm nay"
          : `${tongSo} việc hôm nay`}
      </p>

      {tongSo > 0 ? (
        <>
          {hienThi.map((task) => (
            <div
              key={task.id}
              className={`task-row${task.daXong ? " done" : ""}`}
            >
              <input
                type="checkbox"
                className={`chk${task.daXong ? " done" : ""}`}
                checked={task.daXong}
                disabled
                readOnly
                aria-label={`${task.ten}, mức ưu tiên ${
                  NHAN_MUC_UU_TIEN_HOM_NAY[task.mucUuTien]
                }, ${task.daXong ? "đã xong" : "chưa xong"}`}
              />
              <span className="ttime">{task.thoiHan}</span>
              <span className="tname">{task.ten}</span>
              <span
                className={`badge-pri ${LOP_BADGE_UU_TIEN_HOM_NAY[task.mucUuTien]}`}
              >
                {NHAN_MUC_UU_TIEN_HOM_NAY[task.mucUuTien]}
              </span>
            </div>
          ))}
          {conLai > 0 ? (
            <p className="empty-txt">+ {conLai} việc khác trong ngày</p>
          ) : null}

          <div className="mini-progress-wrap">
            <div className="mini-progress-label">
              <span>Hôm nay đã làm</span>
              <span>
                {soDaXong}/{tongSo}
              </span>
            </div>
            <div className="bar">
              <span style={{ width: `${phanTram}%` }} />
            </div>
          </div>
        </>
      ) : null}

      <Link className="link-add" href="/lich-trinh">
        {tongSo === 0 ? "Thêm việc cho hôm nay →" : "Xem Lịch trình đầy đủ →"}
      </Link>
    </section>
  );
}

const SO_CANH_BAO_HIEN_TOI_DA = 5;

/** Thẻ Chi tiêu — CAP-6, ba trạng thái phân biệt theo I/O matrix của story:
 * chưa đặt Ngân sách / đã đặt và lành mạnh / có ít nhất một cảnh báo. */
function TheChiTieu({
  coNganSachThangNay,
  canhBaoNganSach,
}: {
  coNganSachThangNay: boolean;
  canhBaoNganSach: CanhBaoNganSach[];
}) {
  const trangThai = xacDinhTrangThaiNganSach(coNganSachThangNay, canhBaoNganSach);
  // Mirror TheLichTrinh's cắt-danh-sách-còn-đếm-phần-dư — một người dùng với
  // nhiều Danh mục cùng vượt ngưỡng trong một tháng không được phép làm thẻ
  // này cao vô hạn, phá vỡ bố cục "một lượt quét mắt" của cả 4 thẻ.
  const canhBaoHienThi = canhBaoNganSach.slice(0, SO_CANH_BAO_HIEN_TOI_DA);
  const canhBaoConLai = canhBaoNganSach.length - canhBaoHienThi.length;

  return (
    <section className="card" aria-labelledby="tieu-de-chi-tieu-hom-nay">
      <h2 id="tieu-de-chi-tieu-hom-nay">Chi tiêu — Tháng này</h2>
      <p className="sub">Ngân sách theo Danh mục</p>

      {trangThai === "chua-dat" ? (
        <p className="empty-txt">Chưa đặt Ngân sách nào cho tháng này.</p>
      ) : trangThai === "lanh-manh" ? (
        <div className="info-box">
          <span className="icon" aria-hidden="true">
            ℹ
          </span>
          <p className="txt">Mọi Danh mục đang trong hạn mức tháng này.</p>
        </div>
      ) : (
        <>
          {canhBaoHienThi.map((canhBao) => (
            <KhoiCanhBaoDanhMuc key={canhBao.danhMucChiTieuId} canhBao={canhBao} />
          ))}
          {canhBaoConLai > 0 ? (
            <p className="empty-txt">+ {canhBaoConLai} Danh mục khác đang cảnh báo</p>
          ) : null}
        </>
      )}

      <Link className="link-add" href="/chi-tieu">
        {trangThai === "chua-dat" ? "Đặt Ngân sách →" : "Xem Chi tiêu đầy đủ →"}
      </Link>
    </section>
  );
}

/** Mirror `ChiTieuView.tsx`'s `KhoiCanhBaoNganSach()` — cùng class
 * `.budget-card`/`.pct-big`/`.bar`/`.threshold-tag`, bớt khối `.alert-box`
 * diễn giải dài (mật độ hiển thị cho một thẻ tóm tắt, Design Notes). Luôn
 * mang đủ icon ⚠ + nhãn chữ + số cụ thể (Accessibility Floor). */
function KhoiCanhBaoDanhMuc({ canhBao }: { canhBao: CanhBaoNganSach }) {
  const daVuot = canhBao.daChi > canhBao.hanMuc;
  const phanTramHienThi = Math.max(canhBao.phanTramConLai, 0);
  const phanTramThanh = Math.min(
    100,
    Math.round((canhBao.daChi / canhBao.hanMuc) * 100),
  );

  return (
    <div className="budget-card" role="status">
      <div className="row-top">
        <div>
          <h4>{canhBao.tenDanhMuc}</h4>
          <p className="spent">
            Đã chi {formatTien(canhBao.daChi)} / {formatTien(canhBao.hanMuc)}đ
            trong tháng
          </p>
        </div>
        <div className="pct-big">
          {phanTramHienThi}%<span className="lbl">còn lại</span>
        </div>
      </div>
      <div className="bar">
        <span style={{ width: `${phanTramThanh}%` }} />
      </div>
      <span className="threshold-tag">
        <span aria-hidden="true">⚠</span>{" "}
        {daVuot ? "Đã vượt ngân sách" : "Dưới ngưỡng cảnh báo 30%"}
      </span>
    </div>
  );
}

/** Thẻ Thực đơn — tái dùng `layThucDonNgay()` (NGÀY MAI) nguyên trạng
 * (Boundaries). Rỗng khi CẢ HAI nhánh chưa có ô nào được gán; ngược lại hiện
 * đúng những gì đã gán, ô trống đọc là "Chưa chọn món" (I/O matrix: "partially
 * assigned"). */
function TheThucDon({
  ngayMai,
  thucDon,
}: {
  ngayMai: Date;
  thucDon: ThucDonNgayDuLieu;
}) {
  const tatCaChuaChon =
    thucDon.nguoiLon.every((slot) => slot.monAnId === null) &&
    thucDon.be.every((slot) => slot.monAnId === null);
  const hrefChonMon = `/thuc-don/chon-mon?ngay=${thamSoNgayVN(ngayMai)}`;

  return (
    <section className="card" aria-labelledby="tieu-de-thuc-don-ngay-mai">
      <h2 id="tieu-de-thuc-don-ngay-mai">Thực đơn — Ngày mai</h2>
      <p className="sub">{formatNgayVN(ngayMai)}</p>

      {tatCaChuaChon ? (
        <p className="empty-txt">Chưa có Thực đơn nào cho ngày mai.</p>
      ) : (
        <>
          <p className="sub">Người lớn &amp; bé 4 tuổi</p>
          {thucDon.nguoiLon.map((slot) => (
            <div className="task-row" key={`nguoi-lon-${slot.buoi}`}>
              <span className="ttime">
                {NHAN_BUOI_HOM_NAY[slot.buoi] ?? slot.buoi}
              </span>
              <span className="tname">{slot.tenMon ?? "Chưa chọn món"}</span>
              {slot.ghiChu ? (
                <span className="cat-chip">{slot.ghiChu}</span>
              ) : null}
            </div>
          ))}

          <p className="sub" style={{ marginTop: 14 }}>
            Bé dưới 1 tuổi
          </p>
          {thucDon.be.map((slot) => (
            <div className="task-row" key={`be-${slot.buoi}`}>
              <span className="ttime">
                {NHAN_BUOI_HOM_NAY[slot.buoi] ?? slot.buoi}
              </span>
              <span className="tname">{slot.tenMon ?? "Chưa chọn món"}</span>
            </div>
          ))}
        </>
      )}

      <Link className="link-add" href={hrefChonMon}>
        {tatCaChuaChon
          ? "Lên thực đơn ngày mai →"
          : "Xem/sửa Thực đơn ngày mai →"}
      </Link>
    </section>
  );
}

/** Thẻ Học tập — tái dùng `tinhStreak()`/`layLoTrinh()` nguyên trạng cho cả
 * hai Kỹ năng (Boundaries); KHÔNG gọi thêm hàm đọc lịch sử `BuoiHoc` nào khác
 * của module Học tập. Hai Kỹ năng độc lập hoàn toàn — mỗi dòng chỉ đọc đúng
 * dữ liệu của Kỹ năng đó (I/O matrix). */
function TheHocTap({
  hocTap,
}: {
  hocTap: Record<
    KyNangEnum,
    { streak: number; loTrinh: LoTrinhDuLieu; daTungCoBuoiHoc: boolean }
  >;
}) {
  return (
    <section className="card" aria-labelledby="tieu-de-hoc-tap-hom-nay">
      <h2 id="tieu-de-hoc-tap-hom-nay">Học tập — Hôm nay</h2>
      <p className="sub">2 lộ trình</p>

      {KY_NANG_HOM_NAY.map((kyNang) => (
        <DongKyNang key={kyNang} kyNang={kyNang} tienDo={hocTap[kyNang]} />
      ))}

      <Link className="link-add" href="/hoc-tap">
        Xem Học tập đầy đủ →
      </Link>
    </section>
  );
}

function DongKyNang({
  kyNang,
  tienDo,
}: {
  kyNang: KyNangEnum;
  tienDo: { streak: number; loTrinh: LoTrinhDuLieu; daTungCoBuoiHoc: boolean };
}) {
  const { streak, loTrinh, daTungCoBuoiHoc } = tienDo;

  if (!daTungCoBuoiHoc) {
    return (
      <div className="budget-card">
        <h4>{NHAN_KY_NANG_HOM_NAY[kyNang]}</h4>
        <p className="empty-txt">Chưa có buổi học nào.</p>
        <Link className="link-add" href="/hoc-tap">
          Ghi buổi học đầu tiên →
        </Link>
      </div>
    );
  }

  if (loTrinh.mocHienTaiId === null) {
    return (
      <div className="budget-card">
        <h4>{NHAN_KY_NANG_HOM_NAY[kyNang]}</h4>
        <p className="spent">Đã hoàn thành Lộ trình</p>
      </div>
    );
  }

  const mocHienTai = loTrinh.moc.find((m) => m.id === loTrinh.mocHienTaiId);

  return (
    <div className="budget-card">
      <div className="row-top">
        <div>
          <h4>{NHAN_KY_NANG_HOM_NAY[kyNang]}</h4>
          <p className="spent">
            Mốc hiện tại: {mocHienTai?.ten ?? ""} ({mocHienTai?.thuTu}/
            {loTrinh.moc.length})
          </p>
        </div>
        <div className="pct-big">
          {streak > 0 ? (
            <>
              <span aria-hidden="true">🔥</span>
              {streak}
              <span className="lbl">ngày</span>
            </>
          ) : (
            <span className="lbl">Chưa có streak</span>
          )}
        </div>
      </div>
    </div>
  );
}
