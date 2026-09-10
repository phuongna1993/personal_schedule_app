"use client";

import { useId, useRef, useState, useTransition } from "react";
import type { KetQua, LoiAction } from "@/lib/ketQua";
import { suaMonAn, themMonAn, xoaMonAn } from "../actions";
import { ACCEPT_ANH, type MonAn, type NguyenLieu } from "../model";

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
 */
export default function NganHangMonAnView({
  danhSachMonAnBanDau,
  danhSachNguyenLieu,
}: {
  danhSachMonAnBanDau: MonAn[];
  danhSachNguyenLieu: string[];
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

  const anhMonHienTai = duongDanAnh(monAn?.anh ?? null);

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
          Ảnh món — tuỳ chọn{anhMonHienTai ? ", chọn ảnh khác để thay ảnh cũ" : ""}
        </label>
        {anhMonHienTai ? (
          <img className="dish-thumb-preview" src={anhMonHienTai} alt="" />
        ) : null}
        <input
          id={`${idForm}-anh`}
          type="file"
          name="anh"
          accept={ACCEPT_ANH}
          aria-invalid={loi?.field === "anh" || undefined}
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
          {hang.anhBanDau ? (
            <img className="ing-thumb" src={duongDanAnh(hang.anhBanDau)} alt="" />
          ) : null}
          <input
            type="file"
            name="nguyenLieuAnh"
            accept={ACCEPT_ANH}
            aria-label={`Ảnh cho nguyên liệu ${hang.tenBanDau || "mới"}`}
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
