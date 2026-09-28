"use client";

import { useId, useState, useTransition } from "react";
import type { KetQua, LoiAction } from "@/lib/ketQua";
import { suaTask, themTask, xoaTask } from "../actions";
import {
  LOP_BADGE_UU_TIEN,
  laKhungGioHopLe,
  MUC_UU_TIEN,
  NHAN_MUC_UU_TIEN,
  type MucUuTien,
  nhanKhungGio,
  type TaskMau,
} from "../model";

type DuLieuForm = {
  ten: string;
  gioBatDau: string;
  gioKetThuc: string;
  mucUuTien: MucUuTien;
};

const FORM_TRONG: DuLieuForm = {
  ten: "",
  gioBatDau: "08:00",
  gioKetThuc: "08:30",
  mucUuTien: "TrungBinh",
};

/**
 * Server Action có thể reject trước cả khi chạy tới `KetQua` (mất mạng, server
 * restart giữa chừng, lỗi tuần tự hoá payload). Không bắt thì `useTransition`
 * nuốt lỗi và người dùng thấy nút "Lưu" chớp một cái rồi không có gì xảy ra.
 */
const LOI_KET_NOI: LoiAction = {
  code: "LOI_KET_NOI",
  message: "Không lưu được, thử lại.",
};

/** Mirror `GIO_KET_THUC_KHONG_SAU_GIO_BAT_DAU` của `kiemTraTask()`
 * (app/lich-trinh/actions.ts) — cùng ngày nên cũng chặn luôn vắt qua đêm. */
const LOI_KHUNG_GIO: LoiAction = {
  code: "GIO_KET_THUC_KHONG_SAU_GIO_BAT_DAU",
  message: "Giờ kết thúc phải sau giờ bắt đầu, trong cùng một ngày.",
  field: "gioKetThuc",
};

/**
 * Trình soạn thảo Mẫu lịch trình — thêm/sửa/xoá Task.
 *
 * Mọi thao tác ghi đi qua Server Actions (AD-3); các action tự
 * `revalidatePath` nên danh sách được vẽ lại từ server mà KHÔNG tải lại trang.
 * Không có confirm dialog cho thao tác xoá (EXPERIENCE.md — Interaction
 * Primitives).
 */
export default function TrinhSoanThaoMau({ tasks }: { tasks: TaskMau[] }) {
  const [dangThem, setDangThem] = useState(false);
  const [idDangSua, setIdDangSua] = useState<number | null>(null);
  const [loiHang, setLoiHang] = useState<LoiAction | null>(null);
  const [dangChay, batDau] = useTransition();

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

  function xoa(task: TaskMau) {
    setLoiHang(null);
    batDau(async () => {
      try {
        const ketQua = await xoaTask(task.id);
        if (!ketQua.ok) setLoiHang(ketQua.error);
      } catch (loi) {
        console.error("[mau-lich-trinh] xoaTask thất bại:", loi);
        setLoiHang(LOI_KET_NOI);
      }
    });
  }

  const soTask = tasks.length;

  return (
    <section className="card" aria-labelledby="tieu-de-mau">
      <h2 id="tieu-de-mau">Task mặc định</h2>
      <p className="sub">
        {soTask === 0
          ? "Chưa có Task nào · Lịch trình ngày mới sẽ được khởi tạo rỗng"
          : `${soTask} việc · áp dụng từ lần khởi tạo Lịch trình ngày tiếp theo`}
      </p>

      {loiHang ? (
        <p className="field-error" role="alert">
          {loiHang.message}
        </p>
      ) : null}

      {tasks.map((task) =>
        idDangSua === task.id ? (
          <FormTask
            key={task.id}
            tieuDe={`Sửa Task · ${task.ten}`}
            banDau={{
              ten: task.ten,
              gioBatDau: task.gioBatDau,
              // Task cũ chưa có giờ kết thúc -> để trống, buộc nhập khi sửa.
              gioKetThuc: task.gioKetThuc ?? "",
              mucUuTien: task.mucUuTien,
            }}
            nhanLuu="Lưu thay đổi"
            inline
            onHuy={() => setIdDangSua(null)}
            onLuu={(duLieu) => suaTask(task.id, duLieu)}
            onXong={() => setIdDangSua(null)}
          />
        ) : (
          <div className="task-row" key={task.id}>
            <span className="ttime khung">{nhanKhungGio(task)}</span>
            <span className="tname">{task.ten}</span>
            <span className={`badge-pri ${LOP_BADGE_UU_TIEN[task.mucUuTien]}`}>
              {NHAN_MUC_UU_TIEN[task.mucUuTien]}
            </span>
            <span className="row-actions">
              <button
                type="button"
                className="icon-btn"
                disabled={dangChay}
                onClick={() => moFormSua(task.id)}
                aria-label={`Sửa Task ${task.ten}`}
                title={`Sửa Task ${task.ten}`}
              >
                <span aria-hidden="true">✎</span>
              </button>
              <button
                type="button"
                className="icon-btn"
                disabled={dangChay}
                onClick={() => xoa(task)}
                aria-label={`Xoá Task ${task.ten}`}
                title={`Xoá Task ${task.ten}`}
              >
                <span aria-hidden="true">✕</span>
              </button>
            </span>
          </div>
        ),
      )}

      {/* Trạng thái rỗng lần đầu: một dòng gợi ý ngắn + nút hành động chính
          (EXPERIENCE.md — State Patterns). */}
      {soTask === 0 && !dangThem ? (
        <div className="empty-row">
          <span className="empty-txt">
            Chưa có Task nào trong Mẫu — thêm việc đầu tiên để mỗi Lịch trình
            ngày mới có sẵn điểm khởi đầu.
          </span>
          <button type="button" className="btn" onClick={moFormThem}>
            + Thêm Task đầu tiên
          </button>
        </div>
      ) : null}

      {soTask > 0 && !dangThem ? (
        <button type="button" className="link-add" onClick={moFormThem}>
          + Thêm Task mới
        </button>
      ) : null}

      {dangThem ? (
        <FormTask
          tieuDe="Task mới"
          banDau={FORM_TRONG}
          nhanLuu="Lưu Task"
          onHuy={() => setDangThem(false)}
          onLuu={(duLieu) => themTask(duLieu)}
          onXong={() => setDangThem(false)}
        />
      ) : null}
    </section>
  );
}

function FormTask({
  tieuDe,
  banDau,
  nhanLuu,
  inline = false,
  onLuu,
  onHuy,
  onXong,
}: {
  tieuDe: string;
  banDau: DuLieuForm;
  nhanLuu: string;
  inline?: boolean;
  // Dùng thẳng `KetQua` của `lib/ketQua.ts` (AD-3) thay vì khai lại một kiểu
  // cùng hình dạng ở đây — khai lại chính là kiểu trôi mà AD-3 muốn tránh.
  onLuu: (duLieu: DuLieuForm) => Promise<KetQua<unknown>>;
  onHuy: () => void;
  onXong: () => void;
}) {
  const [gia, setGia] = useState<DuLieuForm>(banDau);
  const [loi, setLoi] = useState<LoiAction | null>(null);
  const [dangGui, batDau] = useTransition();
  const idForm = useId();
  // Báo ngay khi đang chọn giờ (cả hai ô đã có giá trị) thay vì đợi submit.
  const khungGioSai =
    gia.gioBatDau !== "" &&
    gia.gioKetThuc !== "" &&
    !laKhungGioHopLe(gia.gioBatDau, gia.gioKetThuc);

  function gui(su_kien: React.FormEvent<HTMLFormElement>) {
    su_kien.preventDefault();
    setLoi(null);
    // Chặn sớm ở client (server vẫn kiểm tra lại độc lập trong `kiemTraTask`).
    if (!laKhungGioHopLe(gia.gioBatDau, gia.gioKetThuc)) {
      setLoi(LOI_KHUNG_GIO);
      return;
    }
    batDau(async () => {
      try {
        const ketQua = await onLuu(gia);
        if (ketQua.ok) {
          onXong();
        } else {
          setLoi(ketQua.error);
        }
      } catch (loiGoi) {
        console.error("[mau-lich-trinh] lưu Task thất bại:", loiGoi);
        setLoi(LOI_KET_NOI);
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

      <div className="form-row">
        <div className="field">
          <label htmlFor={`${idForm}-ten`}>Tên việc</label>
          <input
            id={`${idForm}-ten`}
            className="input"
            type="text"
            value={gia.ten}
            autoFocus
            aria-invalid={loi?.field === "ten" || undefined}
            aria-describedby={loi ? `${idForm}-loi` : undefined}
            onChange={(e) => setGia({ ...gia, ten: e.target.value })}
          />
        </div>
        <div className="field narrow">
          <label htmlFor={`${idForm}-gio-bat-dau`}>Từ</label>
          <input
            id={`${idForm}-gio-bat-dau`}
            className="input"
            type="time"
            value={gia.gioBatDau}
            aria-invalid={loi?.field === "gioBatDau" || undefined}
            onChange={(e) => setGia({ ...gia, gioBatDau: e.target.value })}
          />
        </div>
        <div className="field narrow">
          <label htmlFor={`${idForm}-gio-ket-thuc`}>Đến</label>
          <input
            id={`${idForm}-gio-ket-thuc`}
            className="input"
            type="time"
            value={gia.gioKetThuc}
            min={gia.gioBatDau || undefined}
            aria-invalid={loi?.field === "gioKetThuc" || khungGioSai || undefined}
            onChange={(e) => setGia({ ...gia, gioKetThuc: e.target.value })}
          />
        </div>
      </div>

      {khungGioSai ? (
        <p className="field-error" role="alert">
          {LOI_KHUNG_GIO.message}
        </p>
      ) : null}

      <div className="field">
        <span id={`${idForm}-nhan-uu-tien`} className="nhan-uu-tien">
          Mức ưu tiên
        </span>
        <div
          className="seg"
          role="radiogroup"
          aria-labelledby={`${idForm}-nhan-uu-tien`}
        >
          {MUC_UU_TIEN.map((muc) => (
            <label
              key={muc}
              className={`seg-btn${gia.mucUuTien === muc ? " active" : ""}`}
            >
              <input
                className="sr-only"
                type="radio"
                name={`${idForm}-muc-uu-tien`}
                value={muc}
                checked={gia.mucUuTien === muc}
                onChange={() => setGia({ ...gia, mucUuTien: muc })}
              />
              {NHAN_MUC_UU_TIEN[muc]}
            </label>
          ))}
        </div>
      </div>

      {loi ? (
        <p className="field-error" id={`${idForm}-loi`} role="alert">
          {loi.message}
        </p>
      ) : null}

      <div className="form-actions">
        <button className="btn" type="submit" disabled={dangGui || khungGioSai}>
          {nhanLuu}
        </button>
        <button
          className="ghost"
          type="button"
          onClick={onHuy}
          disabled={dangGui}
        >
          Huỷ
        </button>
      </div>
    </form>
  );
}
