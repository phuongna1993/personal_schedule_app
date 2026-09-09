"use client";

import { useId, useState, useTransition } from "react";
import type { KetQua, LoiAction } from "@/lib/ketQua";
import { formatNgayVN, layMocNgayVN, thamSoNgayVN } from "@/lib/ngayVn";
import {
  datHanMucNganSach,
  suaGiaoDich,
  themDanhMuc,
  themGiaoDich,
  xoaGiaoDich,
} from "./actions";
import {
  LOAI_GIAO_DICH,
  NHAN_LOAI_GIAO_DICH,
  type CanhBaoNganSach,
  type DanhMuc,
  type GiaoDich,
  type GiaoDichDaGhi,
  type LoaiGiaoDich,
} from "./model";
import type { DanhMucVoiHanMuc } from "./queries";

type DuLieuForm = {
  loai: LoaiGiaoDich;
  /** Số nguyên VNĐ; `0` nghĩa là ô số tiền đang trống. */
  soTien: number;
  /** `yyyy-mm-dd`, khớp `<input type="date">`. */
  ngay: string;
  danhMucChiTieuId: number | null;
  ghiChu: string;
};

function formTrong(): DuLieuForm {
  return {
    loai: "Chi",
    soTien: 0,
    ngay: thamSoNgayVN(layMocNgayVN()),
    danhMucChiTieuId: null,
    ghiChu: "",
  };
}

/**
 * Server Action có thể reject trước cả khi chạy tới `KetQua` (mất mạng, server
 * restart giữa chừng). Không bắt thì `useTransition` nuốt lỗi.
 */
const LOI_KET_NOI: LoiAction = {
  code: "LOI_KET_NOI",
  message: "Không lưu được, thử lại.",
};

function formatTien(so: number): string {
  return so.toLocaleString("vi-VN");
}

/**
 * Chi tiêu — quick-add form + inline category-create + inline edit/delete
 * log tháng hiện tại.
 *
 * Mọi thao tác ghi đi qua Server Actions (AD-3); các action tự
 * `revalidatePath` nên trang được Next.js vẽ lại từ server sau mỗi thao tác
 * mà không reload toàn trang — giống hệt `LichTrinhNgayView`. Không có
 * confirm dialog cho thao tác xoá (EXPERIENCE.md).
 */
export default function ChiTieuView({
  giaoDich,
  tongChi,
  tongThu,
  danhSachDanhMucBanDau,
  danhMucVoiHanMuc,
}: {
  giaoDich: GiaoDich[];
  tongChi: number;
  tongThu: number;
  danhSachDanhMucBanDau: DanhMuc[];
  danhMucVoiHanMuc: DanhMucVoiHanMuc[];
}) {
  // Danh mục vừa tạo inline, hiện ngay trong khi chờ `revalidatePath` của
  // `themDanhMuc()` kéo props mới về từ server — tránh chip vừa tạo biến mất
  // rồi mới xuất hiện lại. Trùng id với props thì props thắng (không nhân đôi).
  const [danhMucCucBo, setDanhMucCucBo] = useState<DanhMuc[]>([]);
  const danhSachDanhMuc = [
    ...danhSachDanhMucBanDau,
    ...danhMucCucBo.filter(
      (dm) => !danhSachDanhMucBanDau.some((d) => d.id === dm.id),
    ),
  ];

  const [idDangSua, setIdDangSua] = useState<number | null>(null);
  const [loiHang, setLoiHang] = useState<LoiAction | null>(null);
  const [dangXoa, batDauXoa] = useTransition();

  // Cảnh báo Ngân sách (CAP-6) — kết quả của LẦN LƯU Giao dịch gần nhất
  // (`themGiaoDich`/`suaGiaoDich`'s `data.canhBaoNganSach`), hiện NGAY tại
  // đây, không qua kênh riêng (AD-3). Lưu lần lưu kế tiếp không có cảnh báo
  // sẽ tự xoá khối này đi — trạng thái luôn phản ánh đúng lần ghi gần nhất.
  const [canhBao, setCanhBao] = useState<CanhBaoNganSach | null>(null);

  function moFormSua(id: number) {
    setLoiHang(null);
    setIdDangSua(id);
  }

  function xoa(id: number) {
    setLoiHang(null);
    batDauXoa(async () => {
      try {
        const ketQua = await xoaGiaoDich(id);
        if (ketQua.ok) {
          // `xoaGiaoDich` không trả `canhBaoNganSach` (Never — story
          // boundary), nên một cảnh báo cũ gắn với Giao dịch vừa xoá có thể
          // không còn đúng nữa — dọn khối cảnh báo đi thay vì để nó tồn tại
          // sai lệch trên màn hình.
          setCanhBao(null);
        } else {
          setLoiHang(ketQua.error);
        }
      } catch (loi) {
        console.error("[chi-tieu] xoaGiaoDich thất bại:", loi);
        setLoiHang(LOI_KET_NOI);
      }
    });
  }

  return (
    <>
      <section className="card" aria-labelledby="tieu-de-them-gd">
        <h2 id="tieu-de-them-gd">Thêm giao dịch nhanh</h2>
        <p className="sub">
          Chi hoặc Thu — bấm Lưu là xong, không có bước xác nhận thêm
        </p>

        <FormGiaoDich
          tieuDe="Giao dịch mới"
          banDau={formTrong()}
          nhanLuu="Lưu giao dịch"
          danhSachDanhMuc={danhSachDanhMuc}
          onThemDanhMuc={(dm) =>
            setDanhMucCucBo((truoc) => [...truoc, dm])
          }
          onLuu={(duLieu) => themGiaoDich(duLieu)}
          onLuuXong={setCanhBao}
        />
      </section>

      {canhBao ? <KhoiCanhBaoNganSach canhBao={canhBao} /> : null}

      <section className="card" aria-labelledby="tieu-de-han-muc">
        <h2 id="tieu-de-han-muc">Hạn mức tháng này</h2>
        <p className="sub">
          Đặt/sửa hạn mức Chi theo tháng cho từng Danh mục — chỉ áp dụng cho
          tháng hiện tại, không đổi các tháng đã qua
        </p>

        {danhMucVoiHanMuc.length === 0 ? (
          <p className="empty-txt">
            Chưa có Danh mục nào — thêm một Danh mục ở form phía trên trước.
          </p>
        ) : (
          danhMucVoiHanMuc.map((dm) => (
            <HangHanMuc key={dm.danhMucChiTieuId} danhMuc={dm} />
          ))
        )}
      </section>

      <section className="card" aria-labelledby="tieu-de-thang">
        <h2 id="tieu-de-thang">Giao dịch tháng này</h2>
        <p className="sub">
          {giaoDich.length === 0
            ? "Chưa có giao dịch nào trong tháng này"
            : `Tổng Chi ${formatTien(tongChi)}đ · Tổng Thu ${formatTien(tongThu)}đ`}
        </p>

        {loiHang ? (
          <p className="field-error" role="alert">
            {loiHang.message}
          </p>
        ) : null}

        {giaoDich.length === 0 ? (
          <p className="empty-txt">
            Chưa có Giao dịch nào — thêm giao dịch đầu tiên ở form phía trên.
          </p>
        ) : (
          giaoDich.map((gd) =>
            idDangSua === gd.id ? (
              <FormGiaoDich
                key={gd.id}
                tieuDe="Sửa giao dịch"
                banDau={{
                  loai: gd.loai,
                  soTien: gd.soTien,
                  ngay: thamSoNgayVN(gd.ngay),
                  danhMucChiTieuId: gd.danhMucChiTieuId,
                  ghiChu: gd.ghiChu ?? "",
                }}
                nhanLuu="Lưu thay đổi"
                inline
                danhSachDanhMuc={danhSachDanhMuc}
                onThemDanhMuc={(dm) =>
                  setDanhMucCucBo((truoc) => [...truoc, dm])
                }
                onLuu={(duLieu) => suaGiaoDich(gd.id, duLieu)}
                onLuuXong={setCanhBao}
                onHuy={() => setIdDangSua(null)}
                onXong={() => setIdDangSua(null)}
              />
            ) : (
              <div className="task-row" key={gd.id}>
                <span className="ttime wide">{formatNgayVN(gd.ngay)}</span>
                <span className="tname">
                  {gd.loai === "Thu"
                    ? "Thu"
                    : (gd.tenDanhMuc ?? "Danh mục đã xoá")}
                  {gd.ghiChu ? ` · ${gd.ghiChu}` : ""}
                </span>
                <span className="tname amt">
                  {gd.loai === "Chi" ? "-" : "+"}
                  {formatTien(gd.soTien)}đ
                </span>
                <span className="row-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={dangXoa}
                    onClick={() => moFormSua(gd.id)}
                    aria-label={`Sửa giao dịch ngày ${formatNgayVN(gd.ngay)}`}
                    title="Sửa giao dịch"
                  >
                    <span aria-hidden="true">✎</span>
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={dangXoa}
                    onClick={() => xoa(gd.id)}
                    aria-label={`Xoá giao dịch ngày ${formatNgayVN(gd.ngay)}`}
                    title="Xoá giao dịch"
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                </span>
              </div>
            ),
          )
        )}
      </section>
    </>
  );
}

function FormGiaoDich({
  tieuDe,
  banDau,
  nhanLuu,
  inline = false,
  danhSachDanhMuc,
  onThemDanhMuc,
  onLuu,
  onLuuXong,
  onHuy,
  onXong,
}: {
  tieuDe: string;
  banDau: DuLieuForm;
  nhanLuu: string;
  inline?: boolean;
  danhSachDanhMuc: DanhMuc[];
  onThemDanhMuc: (danhMuc: DanhMuc) => void;
  // `themGiaoDich`/`suaGiaoDich` đều trả `KetQua<GiaoDichDaGhi>` (CAP-6) —
  // dùng thẳng kiểu đó thay vì `unknown` để đọc được `data.canhBaoNganSach`.
  onLuu: (duLieu: unknown) => Promise<KetQua<GiaoDichDaGhi>>;
  // Gọi lại với `canhBaoNganSach` của lần lưu vừa xong (kể cả `null`, để dọn
  // khối cảnh báo cũ đi nếu lần lưu này không còn cảnh báo) — CAP-6, hiện
  // NGAY tại `/chi-tieu`, không qua kênh riêng (AD-3).
  onLuuXong?: (canhBao: CanhBaoNganSach | null) => void;
  onHuy?: () => void;
  onXong?: () => void;
}) {
  const [gia, setGia] = useState<DuLieuForm>(banDau);
  const [loi, setLoi] = useState<LoiAction | null>(null);
  const [dangGui, batDau] = useTransition();
  const idForm = useId();

  const [dangTaoDanhMuc, setDangTaoDanhMuc] = useState(false);
  const [tenDanhMucMoi, setTenDanhMucMoi] = useState("");
  const [loiDanhMuc, setLoiDanhMuc] = useState<LoiAction | null>(null);
  const [dangGuiDanhMuc, batDauDanhMuc] = useTransition();

  const homNay = thamSoNgayVN(layMocNgayVN());

  function gui(suKien: React.FormEvent<HTMLFormElement>) {
    suKien.preventDefault();
    setLoi(null);

    // Người dùng gõ tên Danh mục mới nhưng bấm thẳng "Lưu giao dịch" thay vì
    // "Thêm" (hoặc Enter) để xác nhận trước — chặn submit, không để tên vừa
    // gõ bị âm thầm rơi mất (nó chưa hề được gửi lên `themDanhMuc()`).
    if (dangTaoDanhMuc && tenDanhMucMoi.trim().length > 0) {
      setLoiDanhMuc({
        code: "DANH_MUC_CHUA_XAC_NHAN",
        message:
          "Bấm \"Thêm\" (hoặc Enter) để xác nhận Danh mục mới trước khi lưu giao dịch.",
        field: "ten",
      });
      return;
    }

    batDau(async () => {
      try {
        const ketQua = await onLuu({
          loai: gia.loai,
          soTien: gia.soTien,
          ngay: gia.ngay,
          ghiChu: gia.ghiChu,
          // Ép null khi Thu ngay tại biên gửi đi — dù `onChange` của seg đã
          // xoá `danhMucChiTieuId` khi đổi loại, đây là lớp chặn thứ hai
          // trước khi payload rời khỏi component (server vẫn tự ép lại lần
          // nữa, xem `kiemTraGiaoDich()`).
          danhMucChiTieuId: gia.loai === "Chi" ? gia.danhMucChiTieuId : null,
        });
        if (ketQua.ok) {
          onLuuXong?.(ketQua.data.canhBaoNganSach);
          onXong?.();
          // Form thêm-nhanh không dismiss — reset để sẵn sàng nhập giao dịch
          // kế tiếp ngay (one-click-is-done, không cần mở lại form).
          if (!inline) setGia(formTrong());
        } else {
          setLoi(ketQua.error);
        }
      } catch (loiGoi) {
        console.error("[chi-tieu] lưu Giao dịch thất bại:", loiGoi);
        setLoi(LOI_KET_NOI);
      }
    });
  }

  function guiDanhMucMoi() {
    const ten = tenDanhMucMoi.trim();
    if (ten.length === 0) {
      setLoiDanhMuc({
        code: "TEN_TRONG",
        message: "Tên Danh mục không được để trống.",
        field: "ten",
      });
      return;
    }
    setLoiDanhMuc(null);
    batDauDanhMuc(async () => {
      try {
        const ketQua = await themDanhMuc({ ten });
        if (ketQua.ok) {
          onThemDanhMuc(ketQua.data);
          setGia((truoc) => ({ ...truoc, danhMucChiTieuId: ketQua.data.id }));
          setTenDanhMucMoi("");
          setDangTaoDanhMuc(false);
        } else {
          setLoiDanhMuc(ketQua.error);
        }
      } catch (loiGoi) {
        console.error("[chi-tieu] themDanhMuc thất bại:", loiGoi);
        setLoiDanhMuc(LOI_KET_NOI);
      }
    });
  }

  return (
    <form
      className={inline ? "task-form inline" : "task-form"}
      onSubmit={gui}
      noValidate
    >
      <div className="form-title">{tieuDe}</div>

      <div id={`${idForm}-nhan-loai`} className="field-label">
        Loại giao dịch
      </div>
      <div
        className="seg"
        role="radiogroup"
        aria-labelledby={`${idForm}-nhan-loai`}
      >
        {LOAI_GIAO_DICH.map((loai) => (
          <label
            key={loai}
            className={`seg-btn${gia.loai === loai ? " active" : ""}`}
          >
            <input
              className="sr-only"
              type="radio"
              name={`${idForm}-loai`}
              value={loai}
              checked={gia.loai === loai}
              onChange={() =>
                setGia((truoc) => ({
                  ...truoc,
                  loai,
                  // Chuyển sang Thu: xoá lựa chọn Danh mục NGAY, không giữ
                  // giá trị cũ (AC: switch Chi->Thu mid-form không persist
                  // danhMucChiTieuId; EXPERIENCE.md's quick-add sheet).
                  danhMucChiTieuId: loai === "Thu" ? null : truoc.danhMucChiTieuId,
                }))
              }
            />
            {NHAN_LOAI_GIAO_DICH[loai]}
          </label>
        ))}
      </div>

      <div id={`${idForm}-nhan-so-tien`} className="field-label">
        Số tiền (VNĐ)
      </div>
      <div className="amount-field">
        <input
          type="text"
          inputMode="numeric"
          aria-labelledby={`${idForm}-nhan-so-tien`}
          value={gia.soTien === 0 ? "" : formatTien(gia.soTien)}
          aria-invalid={loi?.field === "soTien" || undefined}
          onChange={(e) => {
            const chiSo = e.target.value.replace(/\D/g, "");
            const so = chiSo.length === 0 ? 0 : Number(chiSo);
            setGia((truoc) => ({
              ...truoc,
              soTien: Number.isFinite(so) ? so : 0,
            }));
          }}
        />
        <span className="cur">đ</span>
      </div>

      {gia.loai === "Chi" ? (
        <>
          <div className="field-label">Danh mục</div>
          <div className="cat-wrap">
            {danhSachDanhMuc.map((dm) => (
              <button
                key={dm.id}
                type="button"
                className={`cat-chip${gia.danhMucChiTieuId === dm.id ? " active" : ""}`}
                onClick={() =>
                  setGia((truoc) => ({ ...truoc, danhMucChiTieuId: dm.id }))
                }
              >
                {dm.ten}
              </button>
            ))}
            <button
              type="button"
              className="cat-chip"
              onClick={() => setDangTaoDanhMuc(true)}
            >
              + Danh mục mới
            </button>
          </div>

          {dangTaoDanhMuc ? (
            <div className="form-row">
              <div className="field">
                <label htmlFor={`${idForm}-danh-muc-moi`}>
                  Tên Danh mục mới
                </label>
                <input
                  id={`${idForm}-danh-muc-moi`}
                  className="input"
                  type="text"
                  value={tenDanhMucMoi}
                  aria-invalid={loiDanhMuc?.field === "ten" || undefined}
                  onChange={(e) => setTenDanhMucMoi(e.target.value)}
                  onKeyDown={(e) => {
                    // Input này nằm TRONG cùng `<form>` với Giao dịch — Enter
                    // mặc định trình duyệt sẽ implicit-submit form ngoài
                    // (bấm "Lưu giao dịch"), âm thầm bỏ qua tên Danh mục vừa
                    // gõ. Chặn lại và tự xử lý như bấm "Thêm".
                    if (e.key === "Enter") {
                      e.preventDefault();
                      guiDanhMucMoi();
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="ghost"
                  disabled={dangGuiDanhMuc}
                  onClick={guiDanhMucMoi}
                >
                  Thêm
                </button>
                <button
                  type="button"
                  className="ghost"
                  disabled={dangGuiDanhMuc}
                  onClick={() => {
                    setDangTaoDanhMuc(false);
                    setTenDanhMucMoi("");
                    setLoiDanhMuc(null);
                  }}
                >
                  Huỷ
                </button>
              </div>
            </div>
          ) : null}
          {loiDanhMuc ? (
            <p className="field-error" role="alert">
              {loiDanhMuc.message}
            </p>
          ) : null}
        </>
      ) : null}

      <div className="field-label">Ngày</div>
      <div className="date-field">
        <span className="ic" aria-hidden="true">
          📅
        </span>
        <input
          type="date"
          aria-label="Ngày giao dịch"
          value={gia.ngay}
          onChange={(e) =>
            setGia((truoc) => ({ ...truoc, ngay: e.target.value }))
          }
        />
        {gia.ngay === homNay ? (
          <span className="today-tag">Hôm nay</span>
        ) : null}
      </div>

      <div id={`${idForm}-nhan-ghi-chu`} className="field-label">
        Ghi chú — tuỳ chọn
      </div>
      <input
        className="note-field"
        type="text"
        aria-labelledby={`${idForm}-nhan-ghi-chu`}
        placeholder="Ví dụ: mua rau, thịt buổi chiều"
        value={gia.ghiChu}
        onChange={(e) =>
          setGia((truoc) => ({ ...truoc, ghiChu: e.target.value }))
        }
      />

      {loi ? (
        <p className="field-error" role="alert">
          {loi.message}
        </p>
      ) : null}

      <div className="form-actions">
        <button className="btn" type="submit" disabled={dangGui}>
          {nhanLuu}
        </button>
        {onHuy ? (
          <button
            className="ghost"
            type="button"
            onClick={onHuy}
            disabled={dangGui}
          >
            Huỷ
          </button>
        ) : null}
      </div>
    </form>
  );
}

/**
 * Khối cảnh báo Ngân sách (CAP-6) — `.budget-card` + `.threshold-tag` +
 * `.alert-box`, port từ `mockups/quick-transaction.html:277-297` (Design
 * Notes). Ngưỡng 30%/100% cố định nên hai trạng thái ("dưới ngưỡng"/"đã
 * vượt") được SUY RA ngay ở đây từ `daChi`/`hanMuc`, không cần một field
 * "loại cảnh báo" riêng trên `CanhBaoNganSach` (Boundaries: chỉ mang
 * `hanMuc`/`daChi`/`phanTramConLai`).
 *
 * Accessibility Floor (EXPERIENCE.md): `{colors.accent}` dùng chung cho cả
 * active lẫn cảnh báo, nên khối này luôn mang đủ icon ⚠ + nhãn chữ tường
 * minh + số cụ thể — không bao giờ chỉ dựa vào màu.
 */
function KhoiCanhBaoNganSach({ canhBao }: { canhBao: CanhBaoNganSach }) {
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
            trong tháng này
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

      <div className="alert-box" style={{ marginTop: "14px" }}>
        <span className="icon" aria-hidden="true">
          ⚠
        </span>
        <p className="txt">
          {daVuot ? (
            <>
              <b>{canhBao.tenDanhMuc}</b> đã chi vượt hạn mức tháng này{" "}
              <b>{formatTien(canhBao.daChi - canhBao.hanMuc)}đ</b>.
            </>
          ) : (
            <>
              Giao dịch vừa lưu đã đẩy <b>{canhBao.tenDanhMuc}</b> xuống dưới
              ngưỡng cảnh báo cố định 30% còn lại trong tháng.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * Một hàng "Danh mục — hạn mức tháng này" — input hạn mức + nút Lưu, gọi
 * `datHanMucNganSach()`. Luôn upsert THÁNG HIỆN TẠI ở tầng Server Action
 * (Boundaries: never một tháng khác), input này không có trường chọn tháng.
 */
function HangHanMuc({ danhMuc }: { danhMuc: DanhMucVoiHanMuc }) {
  const [gia, setGia] = useState(danhMuc.hanMuc ?? 0);
  const [loi, setLoi] = useState<LoiAction | null>(null);
  const [dangGui, batDau] = useTransition();
  const idInput = useId();

  function luu() {
    setLoi(null);
    batDau(async () => {
      try {
        const ketQua = await datHanMucNganSach(danhMuc.danhMucChiTieuId, gia);
        if (!ketQua.ok) setLoi(ketQua.error);
      } catch (loiGoi) {
        console.error("[chi-tieu] datHanMucNganSach thất bại:", loiGoi);
        setLoi(LOI_KET_NOI);
      }
    });
  }

  return (
    // Fragment (không phải <div>) để `.task-row` vẫn là con trực tiếp của
    // `<section>` — giữ đúng selector `.task-row:last-of-type` (bỏ viền dưới
    // ở hàng cuối) hoạt động qua danh sách nhiều Danh mục.
    <>
      <div className="task-row">
        <label htmlFor={idInput} className="tname">
          {danhMuc.ten}
        </label>
        <div className="amount-field" style={{ flex: "0 0 160px" }}>
          <input
            id={idInput}
            type="text"
            inputMode="numeric"
            aria-invalid={loi?.field === "hanMuc" || undefined}
            value={gia === 0 ? "" : formatTien(gia)}
            onChange={(e) => {
              const chiSo = e.target.value.replace(/\D/g, "");
              const so = chiSo.length === 0 ? 0 : Number(chiSo);
              setGia(Number.isFinite(so) ? so : 0);
            }}
          />
          <span className="cur">đ</span>
        </div>
        <span className="row-actions">
          <button
            type="button"
            className="ghost"
            disabled={dangGui}
            onClick={luu}
          >
            Lưu
          </button>
        </span>
      </div>
      {loi ? (
        <p className="field-error" role="alert">
          {loi.message}
        </p>
      ) : null}
    </>
  );
}
