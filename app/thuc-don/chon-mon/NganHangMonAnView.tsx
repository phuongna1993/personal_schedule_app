"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import type { KetQua, LoiAction } from "@/lib/ketQua";
import {
  luuThucDonBe,
  luuThucDonNguoiLon,
  suaMonAn,
  themMonAn,
  xoaMonAn,
  xoaThucDonBe,
  xoaThucDonNguoiLon,
} from "../actions";
import {
  ACCEPT_ANH,
  type MonAn,
  NHAN_BUOI,
  NHOM_KHAU_PHAN,
  type NguyenLieu,
  type ThucDonNgayDuLieu,
  type ThucDonSlotBe,
  type ThucDonSlotNguoiLon,
} from "../model";

/**
 * Server Action có thể reject trước cả khi chạy tới `KetQua` (mất mạng, server
 * restart giữa chừng). Không bắt thì `useTransition` nuốt lỗi.
 */
const LOI_KET_NOI: LoiAction = {
  code: "LOI_KET_NOI",
  message: "Không lưu được, thử lại.",
};

function duongDanAnh(anh: string | null): string | undefined {
  return anh ? `/uploads/${anh}` : undefined;
}

type HangFormNguyenLieu = {
  /** Key React thuần, ổn định qua các lần render dù hàng bị xoá/thêm giữa
   * chừng — KHÔNG dùng id DB làm key vì hàng mới chưa có id. */
  key: string;
  /** `null` = hàng mới (chưa có trong DB); số = Nguyên liệu đã có, giữ
   * nguyên id để `suaMonAn` biết đây là UPDATE chứ không phải CREATE. */
  id: number | null;
  tenBanDau: string;
  anhBanDau: string | null;
};

function hangTuNguyenLieu(nl: NguyenLieu): HangFormNguyenLieu {
  return { key: `nl-${nl.id}`, id: nl.id, tenBanDau: nl.ten, anhBanDau: nl.anh };
}

/**
 * Ô chọn ảnh dùng chung cho ảnh món và ảnh từng Nguyên liệu: thumbnail (ảnh
 * đã lưu, hoặc xem trước file vừa chọn), `<input type="file">` native và nút
 * "Xoá ảnh". File vẫn đi qua FormData như cũ (input không controlled); chỉ
 * cờ xoá ảnh cũ là state, emit qua hidden input `tenCoXoa` = "1"/"". Hidden
 * input LUÔN được render (kể cả rỗng) để mảng `nguyenLieuXoaAnh` giữ cùng độ
 * dài/chỉ số với `nguyenLieuTen` (xem `docHangNguyenLieu`, actions.ts).
 */
function OChonAnh({
  id,
  tenFile,
  tenCoXoa,
  anhCu,
  nhanAria,
  loiAnh,
  lon = false,
}: {
  id?: string;
  tenFile: string;
  tenCoXoa: string;
  anhCu: string | null;
  nhanAria?: string;
  loiAnh?: boolean;
  lon?: boolean;
}) {
  const refInput = useRef<HTMLInputElement>(null);
  const [daXoaAnhCu, setDaXoaAnhCu] = useState(false);
  const [xemTruoc, setXemTruoc] = useState<string | null>(null);

  // Thu hồi object URL cũ mỗi khi đổi file / unmount — tránh rò bộ nhớ.
  useEffect(() => {
    return () => {
      if (xemTruoc) URL.revokeObjectURL(xemTruoc);
    };
  }, [xemTruoc]);

  function doiFile(suKien: React.ChangeEvent<HTMLInputElement>) {
    const file = suKien.currentTarget.files?.[0];
    setXemTruoc(file ? URL.createObjectURL(file) : null);
  }

  function xoaAnh() {
    if (refInput.current) refInput.current.value = "";
    setXemTruoc(null);
    if (anhCu) setDaXoaAnhCu(true);
  }

  const srcHienThi = xemTruoc ?? (daXoaAnhCu ? undefined : duongDanAnh(anhCu));

  return (
    <div className={lon ? "o-anh lon" : "o-anh"}>
      <input type="hidden" name={tenCoXoa} value={daXoaAnhCu ? "1" : ""} />
      {srcHienThi ? (
        <img className="o-anh-thumb" src={srcHienThi} alt="" />
      ) : (
        <span className="o-anh-thumb trong" aria-hidden="true" />
      )}
      <input
        ref={refInput}
        id={id}
        type="file"
        name={tenFile}
        accept={ACCEPT_ANH}
        onChange={doiFile}
        aria-label={nhanAria}
        aria-invalid={loiAnh || undefined}
      />
      {srcHienThi ? (
        <button type="button" className="link-xoa-anh" onClick={xoaAnh}>
          Xoá ảnh
        </button>
      ) : null}
    </div>
  );
}

/**
 * Ngân hàng món ăn (`/thuc-don/chon-mon`, CAP-8) — filter-chip lọc TỨC THỜI
 * (client-side, không round-trip server), lưới Món ăn, và form thêm/sửa
 * inline (theo precedent inline-expanding-form của `ChiTieuView`'s tạo Danh
 * mục, không phải modal — Design Notes).
 *
 * Mọi thao tác ghi đi qua Server Actions nhận `FormData` (AD-3's ngoại lệ
 * duy nhất của story này — `File` không băng qua được payload JSON-shaped);
 * các action tự `revalidatePath` nên trang được vẽ lại từ server sau mỗi
 * thao tác mà không reload toàn trang. Không có confirm dialog cho xoá
 * (EXPERIENCE.md).
 *
 * Pending-state của sửa/xoá/lưu được scope THEO TỪNG DÒNG món (Boundaries:
 * "not one shared transition disabling every row") bằng cách để MỖI thẻ
 * (`MonAnCard`) và MỖI form (`FormMonAn`) là một COMPONENT INSTANCE riêng
 * gọi `useTransition()` của chính nó — tương đương về mặt kiến trúc với
 * "useTransition keyed by monAnId" nhưng qua cách ly instance thay vì một Map
 * thủ công ở component cha.
 *
 * Bên dưới Ngân hàng món ăn là "Gán món cho Thực đơn ngày" (Story 7,
 * CAP-9/CAP-10, `GanThucDonNgayView` — component con cùng file per Code Map)
 * — ngày-scoped, độc lập hoàn toàn với phần filter/CRUD Món ăn ở trên; hai
 * phần chỉ dùng chung `danhSachMonAnBanDau` làm nguồn cho dropdown chọn món.
 */
export default function NganHangMonAnView({
  danhSachMonAnBanDau,
  danhSachNguyenLieu,
  ngayThamSo,
  nhanNgay,
  hrefNgayTruoc,
  hrefNgaySau,
  duLieuThucDon,
}: {
  danhSachMonAnBanDau: MonAn[];
  danhSachNguyenLieu: string[];
  ngayThamSo: string;
  nhanNgay: string;
  hrefNgayTruoc: string;
  hrefNgaySau: string;
  duLieuThucDon: ThucDonNgayDuLieu;
}) {
  const [filterActive, setFilterActive] = useState<string | null>(null);
  const [dangThem, setDangThem] = useState(false);
  const [idDangSua, setIdDangSua] = useState<number | null>(null);
  const [loiHang, setLoiHang] = useState<LoiAction | null>(null);

  function moFormThem() {
    setIdDangSua(null);
    setLoiHang(null);
    setDangThem(true);
  }

  function moFormSua(id: number) {
    setDangThem(false);
    setLoiHang(null);
    setIdDangSua(id);
  }

  // `null` khi "Tất cả" đang active (không lọc) — khác `0`, vốn là một kết
  // quả lọc HỢP LỆ (0/N món khớp).
  const soKhop =
    filterActive === null
      ? null
      : danhSachMonAnBanDau.filter((mon) =>
          mon.nguyenLieu.some((nl) => nl.ten === filterActive),
        ).length;

  return (
    <>
      <section className="card" aria-labelledby="tieu-de-ngan-hang">
      <h2 id="tieu-de-ngan-hang">Ngân hàng món ăn</h2>
      <p className="sub">
        {danhSachMonAnBanDau.length === 0
          ? "Chưa có Món ăn nào — thêm món đầu tiên"
          : `${danhSachMonAnBanDau.length} món đã lưu`}
      </p>

      {danhSachNguyenLieu.length > 0 ? (
        <>
          <div className="cat-wrap" role="group" aria-label="Lọc theo Nguyên liệu">
            <button
              type="button"
              className={`cat-chip${filterActive === null ? " active" : ""}`}
              aria-pressed={filterActive === null}
              onClick={() => setFilterActive(null)}
            >
              Tất cả
            </button>
            {danhSachNguyenLieu.map((ten) => (
              <button
                key={ten}
                type="button"
                className={`cat-chip${filterActive === ten ? " active" : ""}`}
                aria-pressed={filterActive === ten}
                onClick={() => setFilterActive(ten)}
              >
                {ten}
              </button>
            ))}
          </div>

          {filterActive !== null ? (
            soKhop === 0 ? (
              <p className="filter-note">
                Không có món nào chứa nguyên liệu &quot;{filterActive}&quot; ·{" "}
                <button
                  type="button"
                  className="link-add"
                  onClick={() => setFilterActive(null)}
                >
                  Xoá bộ lọc
                </button>
              </p>
            ) : (
              <p className="filter-note">
                Đang lọc theo nguyên liệu <b>&quot;{filterActive}&quot;</b> —{" "}
                <b>
                  {soKhop}/{danhSachMonAnBanDau.length}
                </b>{" "}
                món phù hợp, các món còn lại được làm mờ bên dưới.
              </p>
            )
          ) : null}
        </>
      ) : null}

      {loiHang ? (
        <p className="field-error" role="alert">
          {loiHang.message}
        </p>
      ) : null}

      <div className="dish-grid">
        {danhSachMonAnBanDau.map((mon) =>
          idDangSua === mon.id ? (
            <FormMonAn
              key={mon.id}
              tieuDe={`Sửa món · ${mon.ten}`}
              monAn={mon}
              nhanLuu="Lưu thay đổi"
              onLuu={(formData) => suaMonAn(mon.id, formData)}
              onXong={() => setIdDangSua(null)}
              onHuy={() => setIdDangSua(null)}
            />
          ) : (
            <MonAnCard
              key={mon.id}
              monAn={mon}
              filterActive={filterActive}
              onSua={() => moFormSua(mon.id)}
              onXoaXong={setLoiHang}
            />
          ),
        )}

        {!dangThem ? (
          <button type="button" className="add-dish-card" onClick={moFormThem}>
            <span className="plus" aria-hidden="true">
              +
            </span>
            <span className="lbl">Thêm món mới vào Ngân hàng</span>
            <span className="hint">Tên món · Nguyên liệu · Ảnh (tuỳ chọn)</span>
          </button>
        ) : null}
      </div>

      {dangThem ? (
        <FormMonAn
          tieuDe="Món mới"
          monAn={null}
          nhanLuu="Lưu món"
          onLuu={(formData) => themMonAn(formData)}
          onXong={() => setDangThem(false)}
          onHuy={() => setDangThem(false)}
        />
      ) : null}
      </section>

      <GanThucDonNgayView
        ngayThamSo={ngayThamSo}
        nhanNgay={nhanNgay}
        hrefNgayTruoc={hrefNgayTruoc}
        hrefNgaySau={hrefNgaySau}
        danhSachMonAn={danhSachMonAnBanDau}
        duLieuThucDon={duLieuThucDon}
      />
    </>
  );
}

/**
 * Một thẻ Món ăn trong lưới — riêng `useTransition()` cho thao tác xoá CỦA
 * CHÍNH NÓ, không chia sẻ với thẻ khác (Boundaries: pending-state per dish
 * row). Xoá không có bước xác nhận (EXPERIENCE.md).
 */
function MonAnCard({
  monAn,
  filterActive,
  onSua,
  onXoaXong,
}: {
  monAn: MonAn;
  filterActive: string | null;
  onSua: () => void;
  onXoaXong: (loi: LoiAction | null) => void;
}) {
  const [dangXoa, batDauXoa] = useTransition();

  const dangLoc = filterActive !== null;
  const khop = dangLoc && monAn.nguyenLieu.some((nl) => nl.ten === filterActive);

  function xoa() {
    onXoaXong(null);
    batDauXoa(async () => {
      try {
        const ketQua = await xoaMonAn(monAn.id);
        if (!ketQua.ok) onXoaXong(ketQua.error);
      } catch (loiGoi) {
        console.error("[thuc-don] xoaMonAn thất bại:", loiGoi);
        onXoaXong(LOI_KET_NOI);
      }
    });
  }

  const anhMon = duongDanAnh(monAn.anh);

  return (
    <div className={`dish-card${dangLoc ? (khop ? " match" : " dim") : ""}`}>
      <div className="dish-photo">
        {anhMon ? (
          <img src={anhMon} alt={monAn.ten} />
        ) : (
          <span aria-hidden="true">🍽</span>
        )}
      </div>
      <div className="dish-body">
        <div className="dish-name">
          <span>{monAn.ten}</span>
          {khop ? <span className="match-flag">✓ khớp</span> : null}
        </div>

        {monAn.nguyenLieu.length > 0 ? (
          <div className="ing-list">
            {monAn.nguyenLieu.map((nl) => (
              <span
                key={nl.id}
                className={`cat-chip${dangLoc && nl.ten === filterActive ? " active" : ""}`}
              >
                {nl.anh ? (
                  <img className="ing-thumb" src={duongDanAnh(nl.anh)} alt="" />
                ) : null}
                {nl.ten}
              </span>
            ))}
          </div>
        ) : null}

        <div className="dish-actions">
          <button
            type="button"
            className="icon-btn"
            disabled={dangXoa}
            onClick={onSua}
            aria-label={`Sửa món ${monAn.ten}`}
            title="Sửa món"
          >
            <span aria-hidden="true">✎</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            disabled={dangXoa}
            onClick={xoa}
            aria-label={`Xoá món ${monAn.ten}`}
            title="Xoá món"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Form thêm/sửa một Món ăn — dùng chung cho cả hai chế độ (`monAn: null` =
 * thêm mới). Input tên/ảnh là NATIVE, không controlled (`defaultValue`, không
 * `value`/`onChange`) — gửi lên qua `new FormData(form)` khi submit, vì một
 * `File` gốc không thể giữ trong React state rồi băng qua payload JSON-shaped
 * như các module khác (AD-3's ngoại lệ, Code Map). Riêng danh sách HÀNG
 * Nguyên liệu (bao nhiêu hàng, hàng nào ứng với `NguyenLieu` nào) vẫn cần
 * React state để thêm/xoá hàng động — nhưng giá trị BÊN TRONG mỗi hàng
 * (tên/ảnh) vẫn native, không state.
 *
 * `useTransition()` ở đây là RIÊNG của instance form này — form sửa chỉ mount
 * cho đúng một dòng đang sửa tại một thời điểm (Boundaries: pending-state
 * scoped per row).
 */
function FormMonAn({
  tieuDe,
  monAn,
  nhanLuu,
  onLuu,
  onXong,
  onHuy,
}: {
  tieuDe: string;
  monAn: MonAn | null;
  nhanLuu: string;
  onLuu: (formData: FormData) => Promise<KetQua<MonAn>>;
  onXong: () => void;
  onHuy: () => void;
}) {
  const idForm = useId();
  const demHang = useRef(0);

  function hangTrongMoi(): HangFormNguyenLieu {
    demHang.current += 1;
    return { key: `moi-${demHang.current}`, id: null, tenBanDau: "", anhBanDau: null };
  }

  const [hangNguyenLieu, setHangNguyenLieu] = useState<HangFormNguyenLieu[]>(() =>
    monAn && monAn.nguyenLieu.length > 0
      ? monAn.nguyenLieu.map(hangTuNguyenLieu)
      : [hangTrongMoi()],
  );
  const [loi, setLoi] = useState<LoiAction | null>(null);
  const [dangGui, batDau] = useTransition();

  function themHang() {
    setHangNguyenLieu((truoc) => [...truoc, hangTrongMoi()]);
  }

  function xoaHang(key: string) {
    setHangNguyenLieu((truoc) => truoc.filter((h) => h.key !== key));
  }

  function gui(suKien: React.FormEvent<HTMLFormElement>) {
    suKien.preventDefault();
    setLoi(null);
    const formData = new FormData(suKien.currentTarget);
    batDau(async () => {
      try {
        const ketQua = await onLuu(formData);
        if (ketQua.ok) {
          onXong();
        } else {
          setLoi(ketQua.error);
        }
      } catch (loiGoi) {
        console.error("[thuc-don] lưu Món ăn thất bại:", loiGoi);
        setLoi(LOI_KET_NOI);
      }
    });
  }

  return (
    <form className="task-form" onSubmit={gui} noValidate>
      <div className="form-title">{tieuDe}</div>

      <div className="field">
        <label htmlFor={`${idForm}-ten`}>Tên món</label>
        <input
          id={`${idForm}-ten`}
          className="input"
          type="text"
          name="ten"
          defaultValue={monAn?.ten ?? ""}
          aria-invalid={loi?.field === "ten" || undefined}
          autoFocus
        />
      </div>

      <div className="field">
        <label htmlFor={`${idForm}-anh`}>
          Ảnh món — tuỳ chọn{monAn?.anh ? ", chọn ảnh khác để thay ảnh cũ" : ""}
        </label>
        <OChonAnh
          id={`${idForm}-anh`}
          tenFile="anh"
          tenCoXoa="xoaAnh"
          anhCu={monAn?.anh ?? null}
          loiAnh={loi?.field === "anh"}
          lon
        />
      </div>

      <div className="field-label">Nguyên liệu</div>
      {hangNguyenLieu.map((hang) => (
        <div className="ing-row" key={hang.key}>
          <input type="hidden" name="nguyenLieuId" defaultValue={hang.id !== null ? String(hang.id) : ""} />
          <input
            className="input"
            type="text"
            name="nguyenLieuTen"
            placeholder="Tên nguyên liệu"
            defaultValue={hang.tenBanDau}
            aria-label="Tên nguyên liệu"
          />
          <button
            type="button"
            className="icon-btn"
            onClick={() => xoaHang(hang.key)}
            aria-label="Xoá nguyên liệu này khỏi món"
            title="Xoá nguyên liệu"
          >
            <span aria-hidden="true">✕</span>
          </button>
          <OChonAnh
            tenFile="nguyenLieuAnh"
            tenCoXoa="nguyenLieuXoaAnh"
            anhCu={hang.anhBanDau}
            nhanAria={`Ảnh cho nguyên liệu ${hang.tenBanDau || "mới"}`}
          />
        </div>
      ))}
      <button type="button" className="link-add" onClick={themHang}>
        + Thêm nguyên liệu
      </button>

      {loi ? (
        <p className="field-error" role="alert">
          {loi.message}
        </p>
      ) : null}

      <div className="form-actions">
        <button className="btn" type="submit" disabled={dangGui}>
          {nhanLuu}
        </button>
        <button className="ghost" type="button" onClick={onHuy} disabled={dangGui}>
          Huỷ
        </button>
      </div>
    </form>
  );
}

/**
 * "Gán món cho Thực đơn ngày" (Story 7, CAP-9/CAP-10) — hai cột ĐỘC LẬP HOÀN
 * TOÀN, một per Nhóm khẩu phần, mỗi cột 3 bữa cố định (Sáng/Trưa/Tối). Mock's
 * bữa "Phụ" ở nhánh Bé là minh hoạ, KHÔNG có trong SPEC.md, không build
 * (Intent). Ngày-scoped qua `ngayThamSo`/`hrefNgayTruoc`/`hrefNgaySau` do
 * `page.tsx` tính sẵn (day-nav mirror `app/lich-trinh/page.tsx`'s pattern).
 */
function GanThucDonNgayView({
  ngayThamSo,
  nhanNgay,
  hrefNgayTruoc,
  hrefNgaySau,
  danhSachMonAn,
  duLieuThucDon,
}: {
  ngayThamSo: string;
  nhanNgay: string;
  hrefNgayTruoc: string;
  hrefNgaySau: string;
  danhSachMonAn: MonAn[];
  duLieuThucDon: ThucDonNgayDuLieu;
}) {
  return (
    <section aria-labelledby="tieu-de-gan-thuc-don">
      <div className="section-divider">
        <h2 id="tieu-de-gan-thuc-don">Gán món cho Thực đơn ngày</h2>
        <div className="line" />
        <span className="sub">tách riêng theo Nhóm khẩu phần</span>
      </div>

      <nav className="day-nav" aria-label="Điều hướng theo ngày">
        <Link
          className="day-nav-btn"
          href={hrefNgayTruoc}
          aria-label="Xem ngày trước"
          title="Xem ngày trước"
        >
          <span aria-hidden="true">◀</span>
        </Link>
        <span className="day-nav-label">{nhanNgay}</span>
        <Link
          className="day-nav-btn"
          href={hrefNgaySau}
          aria-label="Xem ngày sau"
          title="Xem ngày sau"
        >
          <span aria-hidden="true">▶</span>
        </Link>
      </nav>

      <div className="assign-grid">
        <div className="assign-col">
          <h3>
            <span aria-hidden="true">👨‍👩‍👧</span> {NHOM_KHAU_PHAN.NguoiLon}
          </h3>
          <div className="group-sub">
            3 bữa · có thể ghi chú điều chỉnh riêng cho từng bữa
          </div>
          {duLieuThucDon.nguoiLon.map((slot) => (
            <NguoiLonSlot
              key={slot.buoi}
              ngayThamSo={ngayThamSo}
              slot={slot}
              danhSachMonAn={danhSachMonAn}
            />
          ))}
        </div>

        <div className="assign-col">
          <h3>
            <span aria-hidden="true">🍼</span> {NHOM_KHAU_PHAN.Be}
          </h3>
          <div className="group-sub">3 bữa · hoàn toàn độc lập với nhóm còn lại</div>
          {duLieuThucDon.be.map((slot) => (
            <BeSlot
              key={slot.buoi}
              ngayThamSo={ngayThamSo}
              slot={slot}
              danhSachMonAn={danhSachMonAn}
            />
          ))}
        </div>
      </div>

      <div className="info-box">
        <span className="icon" aria-hidden="true">
          ℹ
        </span>
        <div className="txt">
          <b>Hai nhóm khẩu phần hoàn toàn độc lập</b> — món ăn, khung giờ và
          ghi chú điều chỉnh của &quot;{NHOM_KHAU_PHAN.NguoiLon}&quot; không
          ảnh hưởng đến thực đơn của &quot;{NHOM_KHAU_PHAN.Be}&quot;, và ngược
          lại. Món trong Ngân hàng chỉ được đưa vào Thực đơn ngày khi được
          chọn thủ công ở đây.
        </div>
      </div>
    </section>
  );
}

/** Dropdown chọn Món ăn dùng chung cho cả hai nhánh — value rỗng = "Chưa
 * chọn món" (gỡ slot), value = `monAnId` (gán/thay slot). Tên hiển thị đến
 * hoàn toàn từ `aria-label` — không có `<label htmlFor>` nào tham chiếu tới
 * phần tử này, nên không có `id` nào cần thiết ở đây. */
function ChonMonSelect({
  ariaLabel,
  monAnId,
  danhSachMonAn,
  disabled,
  onChon,
}: {
  ariaLabel: string;
  monAnId: number | null;
  danhSachMonAn: MonAn[];
  disabled: boolean;
  onChon: (monAnIdMoi: string) => void;
}) {
  return (
    <select
      className="meal-select"
      aria-label={ariaLabel}
      value={monAnId !== null ? String(monAnId) : ""}
      disabled={disabled}
      onChange={(suKien) => onChon(suKien.target.value)}
    >
      <option value="">Chưa chọn món</option>
      {danhSachMonAn.map((mon) => (
        <option key={mon.id} value={mon.id}>
          {mon.ten}
        </option>
      ))}
    </select>
  );
}

/**
 * Một slot (một bữa) của nhánh "Người lớn & bé 4 tuổi" — dropdown chọn món +
 * ghi chú điều chỉnh tuỳ chọn (CAP-10). `useTransition()` riêng của instance
 * này (pending-state scoped per slot, cùng nguyên tắc với `MonAnCard`/
 * `FormMonAn` ở trên). Ghi chú CHỈ lưu được khi slot đã có món (cột `ghiChu`
 * sống cùng hàng với `monAnId`, không thể tồn tại độc lập) — input bị vô
 * hiệu hoá khi chưa chọn món.
 */
function NguoiLonSlot({
  ngayThamSo,
  slot,
  danhSachMonAn,
}: {
  ngayThamSo: string;
  slot: ThucDonSlotNguoiLon;
  danhSachMonAn: MonAn[];
}) {
  const [loi, setLoi] = useState<LoiAction | null>(null);
  const [dangGui, batDau] = useTransition();

  function chonMon(monAnIdMoi: string) {
    setLoi(null);
    batDau(async () => {
      try {
        // Đổi sang một Món ăn KHÁC cho slot đã có sẵn -> ghi chú cũ bị XOÁ
        // (`null`), không mang sang món mới: ghi chú mô tả một điều chỉnh
        // CHO ĐÚNG món nó được viết ra, giữ lại khi đổi món dễ gây hiểu lầm
        // (ghi chú của món cũ hiện ra như đang áp cho món mới). `luuGhiChu()`
        // bên dưới mới là đường DUY NHẤT set/giữ ghi chú cho món hiện tại.
        const ketQua =
          monAnIdMoi === ""
            ? await xoaThucDonNguoiLon(ngayThamSo, slot.buoi)
            : await luuThucDonNguoiLon(
                ngayThamSo,
                slot.buoi,
                Number(monAnIdMoi),
                null,
              );
        if (!ketQua.ok) setLoi(ketQua.error);
      } catch (loiGoi) {
        console.error("[thuc-don] lưu Thực đơn (Người lớn) thất bại:", loiGoi);
        setLoi(LOI_KET_NOI);
      }
    });
  }

  function luuGhiChu(ghiChuMoi: string) {
    if (slot.monAnId === null) return;
    setLoi(null);
    batDau(async () => {
      try {
        const ketQua = await luuThucDonNguoiLon(
          ngayThamSo,
          slot.buoi,
          slot.monAnId,
          ghiChuMoi,
        );
        if (!ketQua.ok) setLoi(ketQua.error);
      } catch (loiGoi) {
        console.error("[thuc-don] lưu ghi chú thất bại:", loiGoi);
        setLoi(LOI_KET_NOI);
      }
    });
  }

  return (
    <div className="meal-slot">
      <div className="meal-slot-head">
        <span className="meal-time">{NHAN_BUOI[slot.buoi]}</span>
        <ChonMonSelect
          ariaLabel={`Món ăn bữa ${NHAN_BUOI[slot.buoi]} — ${NHOM_KHAU_PHAN.NguoiLon}`}
          monAnId={slot.monAnId}
          danhSachMonAn={danhSachMonAn}
          disabled={dangGui}
          onChon={chonMon}
        />
      </div>
      <input
        className="note-input"
        type="text"
        placeholder="Ghi chú điều chỉnh (tuỳ chọn)…"
        defaultValue={slot.ghiChu ?? ""}
        disabled={dangGui || slot.monAnId === null}
        onBlur={(suKien) => luuGhiChu(suKien.target.value)}
        aria-label={`Ghi chú bữa ${NHAN_BUOI[slot.buoi]} — ${NHOM_KHAU_PHAN.NguoiLon}`}
        key={`${slot.buoi}-${slot.monAnId ?? "trong"}-${slot.ghiChu ?? ""}`}
      />
      {loi ? (
        <p className="field-error" role="alert">
          {loi.message}
        </p>
      ) : null}
    </div>
  );
}

/** Một slot của nhánh "Bé dưới 1 tuổi" — cùng luật với `NguoiLonSlot`, KHÔNG
 * có ghi chú (Structural Seed: cột này không tồn tại ở nhánh Bé, nên không
 * render input nào ở đây — không phải một input bị ẩn). */
function BeSlot({
  ngayThamSo,
  slot,
  danhSachMonAn,
}: {
  ngayThamSo: string;
  slot: ThucDonSlotBe;
  danhSachMonAn: MonAn[];
}) {
  const [loi, setLoi] = useState<LoiAction | null>(null);
  const [dangGui, batDau] = useTransition();

  function chonMon(monAnIdMoi: string) {
    setLoi(null);
    batDau(async () => {
      try {
        const ketQua =
          monAnIdMoi === ""
            ? await xoaThucDonBe(ngayThamSo, slot.buoi)
            : await luuThucDonBe(ngayThamSo, slot.buoi, Number(monAnIdMoi));
        if (!ketQua.ok) setLoi(ketQua.error);
      } catch (loiGoi) {
        console.error("[thuc-don] lưu Thực đơn (Bé) thất bại:", loiGoi);
        setLoi(LOI_KET_NOI);
      }
    });
  }

  return (
    <div className="meal-slot">
      <div className="meal-slot-head">
        <span className="meal-time">{NHAN_BUOI[slot.buoi]}</span>
        <ChonMonSelect
          ariaLabel={`Món ăn bữa ${NHAN_BUOI[slot.buoi]} — ${NHOM_KHAU_PHAN.Be}`}
          monAnId={slot.monAnId}
          danhSachMonAn={danhSachMonAn}
          disabled={dangGui}
          onChon={chonMon}
        />
      </div>
      {loi ? (
        <p className="field-error" role="alert">
          {loi.message}
        </p>
      ) : null}
    </div>
  );
}
