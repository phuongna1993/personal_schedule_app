"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import type { LoiAction } from "@/lib/ketQua";
import { formatNgayVN } from "@/lib/ngayVn";
import { ghiBuoiHoc, ghiDiemBaiTest, hoanThanhMoc, xoaBuoiHoc } from "./actions";
import {
  biChanHoanThanhBoiGateDiem,
  type DiemBaiTestLichSu,
  KY_NANG,
  type KyNangEnum,
  type LoTrinhDuLieu,
  type MocDuLieu,
  NHAN_KY_NANG,
  type TienDoKyNang,
} from "./model";

/**
 * Server Action có thể reject trước cả khi chạy tới `KetQua` (mất mạng, server
 * restart giữa chừng). Không bắt thì `useTransition` nuốt lỗi (mirror
 * `app/chi-tieu/ChiTieuView.tsx`'s `LOI_KET_NOI`).
 */
const LOI_KET_NOI: LoiAction = {
  code: "LOI_KET_NOI",
  message: "Không lưu được, thử lại.",
};

/** Gợi ý placeholder riêng cho từng Kỹ năng — form Automation Test không nên
 * hiện lại ví dụ từ vựng Tiếng Anh (và ngược lại). */
const GOI_Y_NOI_DUNG: Record<KyNangEnum, string> = {
  TiengAnh: "Ví dụ: ôn 20 từ vựng chủ đề du lịch",
  AutomationTest: "Ví dụ: học Playwright locators",
};

/** Hiển thị số phút có dấu phân cách hàng nghìn (mirror `ChiTieuView`'s
 * `formatTien()` — thời lượng không cần ký hiệu tiền tệ/thập phân, chỉ cần
 * cùng cách đọc số lớn như mọi số hiển thị khác trong app). */
function formatPhut(soPhut: number): string {
  return soPhut.toLocaleString("vi-VN");
}

/**
 * Học tập (CAP-11/CAP-12) — hai form ghi Buổi học ĐỘC LẬP HOÀN TOÀN, một cho
 * mỗi Kỹ năng cố định (mirror Story 7's hai cột `assign-col`/`assign-grid`
 * độc lập); bên dưới là tiến độ của từng Kỹ năng (streak, tổng thời lượng
 * tháng đang xem, danh sách Buổi học) quanh MỘT month-nav dùng chung cho cả
 * hai cột (Intent: "one shared `?thang=yyyy-mm` month-nav for both
 * columns"). Không có picker chọn Kỹ năng: form nào được submit tự ngầm định
 * Kỹ năng đó.
 *
 * Mỗi form tự quản lý state (nội dung/thời lượng/lỗi/đang gửi) riêng — gõ
 * hay lưu ở form này không bao giờ đọc/ghi/ảnh hưởng state của form kia; hai
 * cột tiến độ cũng vậy — Tiếng Anh không bao giờ đọc dữ liệu Automation Test
 * và ngược lại (Boundaries).
 */
export default function HocTapView({
  tienDo,
  loTrinh,
  lichSuDiemBaiTest,
  nhanThang,
  hrefThangTruoc,
  hrefThangSau,
}: {
  tienDo: Record<KyNangEnum, TienDoKyNang>;
  loTrinh: Record<KyNangEnum, LoTrinhDuLieu>;
  /** Lịch sử Điểm số Bài test đánh giá (CAP-12, Story 12) — LUÔN của Tiếng
   * Anh (`layLichSuDiemBaiTest()` không nhận `kyNang`). Chỉ truyền tiếp cho
   * instance `LoTrinhCot` của Tiếng Anh bên dưới — Automation Test's column
   * không bao giờ nhận prop này (Boundaries: "structural absence, not
   * hidden"). */
  lichSuDiemBaiTest: DiemBaiTestLichSu[];
  nhanThang: string;
  hrefThangTruoc: string | null;
  hrefThangSau: string | null;
}) {
  return (
    <>
      <section className="assign-grid" aria-label="Ghi Buổi học theo Kỹ năng">
        {KY_NANG.map((kyNang) => (
          <KyNangForm key={kyNang} kyNang={kyNang} />
        ))}
      </section>

      <section className="card" aria-labelledby="tieu-de-tien-do">
        <h2 id="tieu-de-tien-do">Tiến độ học tập</h2>
        <p className="sub">
          Streak chạy cho từng Kỹ năng, cộng tổng thời lượng và lịch sử Buổi
          học của tháng đang xem
        </p>

        <nav className="day-nav" aria-label="Điều hướng theo tháng">
          {hrefThangTruoc ? (
            <Link
              className="day-nav-btn"
              href={hrefThangTruoc}
              aria-label="Xem tháng trước"
              title="Xem tháng trước"
            >
              <span aria-hidden="true">◀</span>
            </Link>
          ) : (
            <button
              type="button"
              className="day-nav-btn"
              disabled
              aria-label="Không có tháng trước để xem"
              title="Không có tháng trước để xem"
            >
              <span aria-hidden="true">◀</span>
            </button>
          )}

          <span className="day-nav-label">{nhanThang}</span>

          {hrefThangSau ? (
            <Link
              className="day-nav-btn"
              href={hrefThangSau}
              aria-label="Xem tháng sau"
              title="Xem tháng sau"
            >
              <span aria-hidden="true">▶</span>
            </Link>
          ) : (
            <button
              type="button"
              className="day-nav-btn"
              disabled
              aria-label="Không có tháng sau để xem"
              title="Không có tháng sau để xem"
            >
              <span aria-hidden="true">▶</span>
            </button>
          )}
        </nav>

        <div className="assign-grid">
          {KY_NANG.map((kyNang) => (
            <TienDoCot key={kyNang} kyNang={kyNang} tienDo={tienDo[kyNang]} />
          ))}
        </div>
      </section>

      <section className="card" aria-labelledby="tieu-de-lo-trinh">
        <h2 id="tieu-de-lo-trinh">Lộ trình học tập</h2>
        <p className="sub">
          Vị trí hiện tại trên Lộ trình của từng Kỹ năng — đánh dấu Hoàn thành
          Mốc để chuyển sang Mốc kế tiếp
        </p>

        <div className="assign-grid">
          {KY_NANG.map((kyNang) => (
            <LoTrinhCot
              key={kyNang}
              kyNang={kyNang}
              loTrinh={loTrinh[kyNang]}
              // Chỉ truyền cho instance Tiếng Anh — Automation Test's column
              // luôn nhận `undefined` ở đây, khiến section lịch sử không thể
              // render nhầm cho nó dù logic bên trong `LoTrinhCot` có đổi
              // (structural absence, không chỉ validated-away).
              lichSuDiem={kyNang === "TiengAnh" ? lichSuDiemBaiTest : undefined}
            />
          ))}
        </div>
      </section>
    </>
  );
}

/**
 * Một cột tiến độ của một Kỹ năng — streak line, tổng thời lượng tháng đang
 * xem, và danh sách Buổi học của tháng đó (hàng tái dùng `.task-row`, mirror
 * `ChiTieuView`'s log tháng). Mỗi hàng có nút ✕ xoá Buổi học; ghi Buổi học
 * vẫn là `KyNangForm` phía trên (story 8).
 */
function TienDoCot({
  kyNang,
  tienDo,
}: {
  kyNang: KyNangEnum;
  tienDo: TienDoKyNang;
}) {
  const [loiXoa, setLoiXoa] = useState<LoiAction | null>(null);
  const [dangXoa, batDauXoa] = useTransition();

  // Xoá ngay, không xác nhận — mirror `ChiTieuView`'s xoá Giao dịch.
  function xoa(id: number) {
    setLoiXoa(null);
    batDauXoa(async () => {
      try {
        const ketQua = await xoaBuoiHoc(id);
        if (!ketQua.ok) setLoiXoa(ketQua.error);
      } catch (loi) {
        console.error("[hoc-tap] xoaBuoiHoc thất bại:", loi);
        setLoiXoa(LOI_KET_NOI);
      }
    });
  }

  return (
    <div className="assign-col">
      <h3>{NHAN_KY_NANG[kyNang]}</h3>

      {tienDo.streak > 0 ? (
        <p className="group-sub">
          <span aria-hidden="true">🔥</span> {tienDo.streak} ngày liên tiếp
        </p>
      ) : (
        // Streak 0 dùng CHUNG treatment với streak đang chạy sẽ đọc nhầm
        // thành "vừa có một streak dài đúng 0" — một trạng thái trung tính
        // riêng, không icon 🔥 (Voice and Tone: số liệu trung tính, không
        // tạo áp lực/gamification).
        <p className="group-sub">
          Chưa có streak — ghi Buổi học hôm nay để bắt đầu.
        </p>
      )}

      <p className="sub">
        Tổng thời lượng tháng này: {formatPhut(tienDo.tongThoiLuongPhut)} phút
      </p>

      {tienDo.buoiHoc.length === 0 ? (
        <p className="empty-txt">
          Chưa có Buổi học nào của {NHAN_KY_NANG[kyNang]} trong tháng này.
        </p>
      ) : (
        tienDo.buoiHoc.map((bh) => (
          <div className="task-row" key={bh.id}>
            <span className="ttime wide">{formatNgayVN(bh.ngay)}</span>
            <span className="tname">
              {bh.noiDung}
              {bh.ghiChu ? (
                <details className="buoi-ghi-chu">
                  <summary>Ghi chú</summary>
                  <p>{bh.ghiChu}</p>
                </details>
              ) : null}
            </span>
            <span className="tname amt">{formatPhut(bh.thoiLuongPhut)} phút</span>
            <span className="row-actions">
              <button
                type="button"
                className="icon-btn"
                disabled={dangXoa}
                onClick={() => xoa(bh.id)}
                aria-label={`Xoá Buổi học ngày ${formatNgayVN(bh.ngay)}`}
                title="Xoá Buổi học"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </span>
          </div>
        ))
      )}

      {loiXoa ? (
        <p className="field-error" role="alert">
          {loiXoa.message}
        </p>
      ) : null}
    </div>
  );
}

type DuLieuForm = {
  noiDung: string;
  /** `"HH:mm"` (value gốc của `<input type="time">`), hoặc `""` khi ô đang
   * trống. Story 13 — client gửi thẳng hai mốc giờ này, không tự trừ; server
   * là nơi DUY NHẤT tính `thoiLuongPhut` (`kiemTraBuoiHoc()`,
   * `app/hoc-tap/actions.ts`). */
  gioBatDau: string;
  gioKetThuc: string;
  ghiChu: string;
};

function formTrong(): DuLieuForm {
  return { noiDung: "", gioBatDau: "", gioKetThuc: "", ghiChu: "" };
}

/** Mirror `DO_DAI_GHI_CHU_TOI_DA` ở `app/hoc-tap/actions.ts`. */
const DO_DAI_GHI_CHU_TOI_DA = 5000;

/** `"HH:mm"`, 24 giờ — mirror `REGEX_GIO` ở `app/hoc-tap/actions.ts`. Value
 * gốc của `<input type="time">` đã tự đúng dạng này; regex ở đây chỉ là một
 * guard phòng hờ cho việc hiển thị, không phải nguồn kiểm tra chính thức. */
const REGEX_GIO_XEM_TRUOC = /^([01]\d|2[0-3]):([0-5]\d)$/;

type XemTruocThoiLuong =
  | { trangThai: "chua-du" }
  | { trangThai: "hop-le"; phut: number }
  | { trangThai: "khong-hop-le" };

/**
 * Xem trước thời lượng CHỈ ĐỂ HIỂN THỊ (UX) — mirror đúng rule cùng-ngày của
 * `kiemTraBuoiHoc()` (`app/hoc-tap/actions.ts`) để người dùng thấy ngay
 * "= X phút" hoặc lời nhắc trong lúc chọn giờ, thay vì chỉ biết sau khi
 * submit thất bại. Giá trị này KHÔNG BAO GIỜ được gửi lên server — `gui()`
 * bên dưới vẫn chỉ gửi hai chuỗi `gioBatDau`/`gioKetThuc` thô, server tự
 * tính lại hoàn toàn độc lập, không tin bất cứ giá trị nào tính sẵn ở client
 * (Boundaries: "never trust client-computed values").
 */
function xemTruocThoiLuong(
  gioBatDau: string,
  gioKetThuc: string,
): XemTruocThoiLuong {
  if (gioBatDau.length === 0 || gioKetThuc.length === 0) {
    return { trangThai: "chua-du" };
  }

  const khopBatDau = REGEX_GIO_XEM_TRUOC.exec(gioBatDau);
  const khopKetThuc = REGEX_GIO_XEM_TRUOC.exec(gioKetThuc);
  if (!khopBatDau || !khopKetThuc) return { trangThai: "chua-du" };

  const batDauPhut = Number(khopBatDau[1]) * 60 + Number(khopBatDau[2]);
  const ketThucPhut = Number(khopKetThuc[1]) * 60 + Number(khopKetThuc[2]);
  if (ketThucPhut <= batDauPhut) return { trangThai: "khong-hop-le" };
  return { trangThai: "hop-le", phut: ketThucPhut - batDauPhut };
}

function KyNangForm({ kyNang }: { kyNang: KyNangEnum }) {
  const [gia, setGia] = useState<DuLieuForm>(formTrong());
  const [loi, setLoi] = useState<LoiAction | null>(null);
  const [daLuu, setDaLuu] = useState(false);
  const [dangGui, batDau] = useTransition();
  const idForm = useId();

  // Chỉ để hiển thị — xem "Boundaries" ở JSDoc của `xemTruocThoiLuong()`.
  const xemTruoc = xemTruocThoiLuong(gia.gioBatDau, gia.gioKetThuc);

  function gui(suKien: React.FormEvent<HTMLFormElement>) {
    suKien.preventDefault();
    setLoi(null);
    setDaLuu(false);

    batDau(async () => {
      try {
        const ketQua = await ghiBuoiHoc({
          kyNang,
          noiDung: gia.noiDung,
          // Gửi thẳng hai chuỗi "HH:mm" thô — không trừ ở client (Boundaries:
          // "the server is the sole source of truth" cho thời lượng).
          gioBatDau: gia.gioBatDau,
          gioKetThuc: gia.gioKetThuc,
          ghiChu: gia.ghiChu,
        });
        if (ketQua.ok) {
          // Một-cú-bấm-là-xong, không có bước xác nhận thứ hai — form clear
          // ngay để sẵn sàng cho lần ghi kế tiếp (Boundaries).
          setGia(formTrong());
          setDaLuu(true);
        } else {
          setLoi(ketQua.error);
        }
      } catch (loiGoi) {
        console.error("[hoc-tap] ghiBuoiHoc thất bại:", loiGoi);
        setLoi(LOI_KET_NOI);
      }
    });
  }

  return (
    <div className="assign-col">
      <h3>{NHAN_KY_NANG[kyNang]}</h3>
      <p className="group-sub">Ghi một Buổi học cho {NHAN_KY_NANG[kyNang]}</p>

      <form className="task-form" onSubmit={gui} noValidate>
        <div id={`${idForm}-nhan-noi-dung`} className="field-label">
          Nội dung đã học
        </div>
        <input
          className="note-field"
          type="text"
          aria-labelledby={`${idForm}-nhan-noi-dung`}
          placeholder={GOI_Y_NOI_DUNG[kyNang]}
          value={gia.noiDung}
          aria-invalid={loi?.field === "noiDung" || undefined}
          // Mirror biên `DO_DAI_NOI_DUNG_TOI_DA` ở `app/hoc-tap/actions.ts` —
          // chặn ngay trên trình duyệt thay vì để người dùng chỉ biết sau khi
          // submit thất bại.
          maxLength={500}
          onChange={(e) => {
            setDaLuu(false);
            setGia((truoc) => ({ ...truoc, noiDung: e.target.value }));
          }}
        />

        <div id={`${idForm}-nhan-ghi-chu`} className="field-label">
          Ghi chú chi tiết — tuỳ chọn
        </div>
        <textarea
          className="note-field ghi-chu-buoi-hoc"
          rows={4}
          aria-labelledby={`${idForm}-nhan-ghi-chu`}
          placeholder="Ghi lại chi tiết buổi học: đã làm gì, chỗ nào chưa hiểu, cần ôn lại gì…"
          value={gia.ghiChu}
          aria-invalid={loi?.field === "ghiChu" || undefined}
          maxLength={DO_DAI_GHI_CHU_TOI_DA}
          onChange={(e) => {
            setDaLuu(false);
            setGia((truoc) => ({ ...truoc, ghiChu: e.target.value }));
          }}
        />
        {gia.ghiChu.length > 0 ? (
          <p className="sub">
            {gia.ghiChu.length.toLocaleString("vi-VN")}/
            {DO_DAI_GHI_CHU_TOI_DA.toLocaleString("vi-VN")} ký tự
          </p>
        ) : null}

        <p className="group-sub">
          Giờ bắt đầu và giờ kết thúc phải cùng một ngày — chưa hỗ trợ buổi
          học qua đêm.
        </p>

        <div className="form-row">
          <div className="field narrow">
            <div id={`${idForm}-nhan-gio-bat-dau`} className="field-label">
              Giờ bắt đầu
            </div>
            <input
              className="note-field"
              type="time"
              aria-labelledby={`${idForm}-nhan-gio-bat-dau`}
              aria-invalid={loi?.field === "gioBatDau" || undefined}
              value={gia.gioBatDau}
              onChange={(e) => {
                setDaLuu(false);
                setGia((truoc) => ({ ...truoc, gioBatDau: e.target.value }));
              }}
            />
          </div>
          <div className="field narrow">
            <div id={`${idForm}-nhan-gio-ket-thuc`} className="field-label">
              Giờ kết thúc
            </div>
            <input
              className="note-field"
              type="time"
              aria-labelledby={`${idForm}-nhan-gio-ket-thuc`}
              aria-invalid={loi?.field === "gioKetThuc" || undefined}
              value={gia.gioKetThuc}
              onChange={(e) => {
                setDaLuu(false);
                setGia((truoc) => ({ ...truoc, gioKetThuc: e.target.value }));
              }}
            />
          </div>
        </div>

        {/* Xem trước thời lượng — chỉ hiển thị, không gửi lên server (xem
            JSDoc `xemTruocThoiLuong()` ở trên). Im lặng cho tới khi cả hai ô
            đã điền, tránh nhấp nháy "chưa hợp lệ" ngay từ ô đầu tiên. */}
        {xemTruoc.trangThai === "hop-le" ? (
          <p className="sub">= {formatPhut(xemTruoc.phut)} phút</p>
        ) : xemTruoc.trangThai === "khong-hop-le" ? (
          <p className="sub">Giờ kết thúc phải sau giờ bắt đầu.</p>
        ) : null}

        {loi ? (
          <p className="field-error" role="alert">
            {loi.message}
          </p>
        ) : null}

        <div className="form-actions">
          <button className="btn" type="submit" disabled={dangGui}>
            Lưu buổi học
          </button>
          {daLuu ? (
            <span className="saved-tag" role="status">
              Đã lưu ✓
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}

/**
 * Một cột Lộ trình của một Kỹ năng (CAP-13) — danh sách Mốc đã Hoàn thành
 * (viewable), thẻ Mốc HIỆN TẠI (`MocHienTaiCard`), rồi các Mốc CÒN LẠI hiển
 * thị mờ (chưa tới lượt, không tương tác được). Với Tiếng Anh, thêm một
 * section lịch sử Điểm số Bài test đánh giá bên dưới cùng (CAP-12, Story
 * 12) — `lichSuDiem` chỉ khác `undefined` cho instance Tiếng Anh (truyền từ
 * `HocTapView`), nên điều kiện `kyNang === "TiengAnh"` dưới đây là một lớp
 * bảo vệ kép, không phải điều kiện DUY NHẤT quyết định hiển thị.
 */
function LoTrinhCot({
  kyNang,
  loTrinh,
  lichSuDiem,
}: {
  kyNang: KyNangEnum;
  loTrinh: LoTrinhDuLieu;
  lichSuDiem?: DiemBaiTestLichSu[];
}) {
  // Type predicate: sau `.filter`, `m.ngayHoanThanh` hẹp đúng về `Date` (thay
  // vì `Date | null`) cho `formatNgayVN()` dưới đây, không cần ép kiểu rời.
  const mocDaXong = loTrinh.moc.filter(
    (m): m is MocDuLieu & { ngayHoanThanh: Date } => m.ngayHoanThanh !== null,
  );
  const mocHienTai =
    loTrinh.moc.find((m) => m.id === loTrinh.mocHienTaiId) ?? null;
  const mocConLai = loTrinh.moc.filter(
    (m) => m.ngayHoanThanh === null && m.id !== loTrinh.mocHienTaiId,
  );

  return (
    <div className="assign-col">
      <h3>{NHAN_KY_NANG[kyNang]}</h3>
      <p className="group-sub">Lộ trình {NHAN_KY_NANG[kyNang]}</p>

      {mocDaXong.map((m) => (
        <div className="task-row" key={m.id}>
          <span aria-hidden="true">✓</span>
          <span className="ttime wide">{formatNgayVN(m.ngayHoanThanh)}</span>
          <span className="tname">{m.ten}</span>
        </div>
      ))}

      {mocHienTai ? (
        // `key` buộc React remount toàn bộ card (kể cả state Điểm số/lỗi cục
        // bộ bên trong) mỗi khi Mốc hiện tại đổi — sau khi Hoàn thành một
        // Mốc, ô nhập Điểm số của Mốc kế tiếp phải bắt đầu trống, không kế
        // thừa state của Mốc vừa xong.
        <MocHienTaiCard key={mocHienTai.id} kyNang={kyNang} moc={mocHienTai} />
      ) : (
        // Terminal state — mọi Mốc của Kỹ năng này đã Hoàn thành, không còn
        // thẻ Mốc hiện tại nào để hiển thị (Boundaries).
        <p className="empty-txt">Đã hoàn thành Lộ trình.</p>
      )}

      {mocConLai.map((m) => (
        <div className="task-row moc-future" key={m.id}>
          <span className="tname">{m.ten}</span>
        </div>
      ))}

      {kyNang === "TiengAnh" && lichSuDiem ? (
        <>
          <p className="field-label">Lịch sử Điểm số Bài test đánh giá</p>

          {lichSuDiem.length === 0 ? (
            <p className="empty-txt">
              Chưa có Điểm số Bài test đánh giá nào.
            </p>
          ) : (
            lichSuDiem.map((d) => (
              <div className="task-row" key={d.id}>
                <span className="tname">
                  {d.mocTen} — {d.diemSo} ({formatNgayVN(d.ngay)})
                </span>
              </div>
            ))
          )}
        </>
      ) : null}
    </div>
  );
}

/**
 * Thẻ Mốc hiện tại — nút "Hoàn thành Mốc" cho cả hai Kỹ năng; riêng Tiếng
 * Anh thêm ô nhập Điểm số Bài test đánh giá TẠI CHỖ (không mở modal riêng,
 * EXPERIENCE.md's Milestone marker pattern) và nút bị vô hiệu hoá cho tới
 * khi Mốc này đã có Điểm số (`moc.coDiemBaiTest`).
 */
function MocHienTaiCard({
  kyNang,
  moc,
}: {
  kyNang: KyNangEnum;
  moc: MocDuLieu;
}) {
  const idForm = useId();

  const [diemSo, setDiemSo] = useState("");
  const [loiDiem, setLoiDiem] = useState<LoiAction | null>(null);
  const [daLuuDiem, setDaLuuDiem] = useState(false);
  const [dangGuiDiem, batDauDiem] = useTransition();

  const [loi, setLoi] = useState<LoiAction | null>(null);
  const [dangGui, batDau] = useTransition();

  function guiDiem(suKien: React.FormEvent<HTMLFormElement>) {
    suKien.preventDefault();
    setLoiDiem(null);
    setDaLuuDiem(false);

    batDauDiem(async () => {
      try {
        const ketQua = await ghiDiemBaiTest(diemSo);
        if (ketQua.ok) {
          setDiemSo("");
          setDaLuuDiem(true);
        } else {
          setLoiDiem(ketQua.error);
        }
      } catch (loiGoi) {
        console.error("[hoc-tap] ghiDiemBaiTest thất bại:", loiGoi);
        setLoiDiem(LOI_KET_NOI);
      }
    });
  }

  function guiHoanThanh() {
    setLoi(null);

    batDau(async () => {
      try {
        const ketQua = await hoanThanhMoc(moc.id);
        if (!ketQua.ok) {
          setLoi(ketQua.error);
        }
        // Thành công: `revalidatePath` trong action re-render `page.tsx` với
        // Mốc hiện tại mới — không cần cập nhật state cục bộ nào thêm ở đây.
      } catch (loiGoi) {
        console.error("[hoc-tap] hoanThanhMoc thất bại:", loiGoi);
        setLoi(LOI_KET_NOI);
      }
    });
  }

  const biChanBoiGateDiem = biChanHoanThanhBoiGateDiem(
    kyNang,
    moc.coDiemBaiTest,
  );

  return (
    <div className="moc-current">
      <p className="field-label">Mốc hiện tại</p>
      <p className="tname">{moc.ten}</p>

      {kyNang === "TiengAnh" ? (
        <form className="task-form inline" onSubmit={guiDiem} noValidate>
          <div id={`${idForm}-nhan-diem`} className="field-label">
            Điểm số bài test
          </div>
          <input
            className="note-field"
            type="text"
            aria-labelledby={`${idForm}-nhan-diem`}
            aria-invalid={loiDiem?.field === "diemSo" || undefined}
            maxLength={100}
            value={diemSo}
            onChange={(e) => {
              setDaLuuDiem(false);
              // Reset lỗi validation cũ NGAY khi người dùng bắt đầu sửa —
              // để lại `loiDiem` cũ trong lúc gõ sẽ hiện một thông báo đã
              // hết hiệu lực (và `aria-invalid` sai) trong lúc sửa.
              setLoiDiem(null);
              setDiemSo(e.target.value);
            }}
          />

          {loiDiem ? (
            <p className="field-error" role="alert">
              {loiDiem.message}
            </p>
          ) : null}

          <div className="form-actions">
            <button className="btn" type="submit" disabled={dangGuiDiem}>
              Lưu điểm số
            </button>
            {daLuuDiem ? (
              <span className="saved-tag" role="status">
                Đã lưu ✓
              </span>
            ) : null}
          </div>
        </form>
      ) : null}

      {loi ? (
        <p className="field-error" role="alert">
          {loi.message}
        </p>
      ) : null}

      <div className="form-actions">
        <button
          className="btn"
          type="button"
          disabled={dangGui || biChanBoiGateDiem}
          aria-disabled={biChanBoiGateDiem || undefined}
          title={
            biChanBoiGateDiem
              ? "Cần nhập Điểm số Bài test đánh giá trước"
              : undefined
          }
          onClick={guiHoanThanh}
        >
          Hoàn thành Mốc
        </button>
      </div>
    </div>
  );
}
