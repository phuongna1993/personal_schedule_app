"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import type { KetQua, LoiAction } from "@/lib/ketQua";
import { danhDauTask, suaTaskNgay, themTaskNgay, xoaTaskNgay } from "./actions";
import {
  LOP_BADGE_UU_TIEN,
  MUC_UU_TIEN,
  NHAN_MUC_UU_TIEN,
  type MucUuTien,
  type TaskNgay,
} from "./model";

type DuLieuForm = {
  ten: string;
  thoiHan: string;
  mucUuTien: MucUuTien;
};

const FORM_TRONG: DuLieuForm = {
  ten: "",
  thoiHan: "08:00",
  mucUuTien: "TrungBinh",
};

/**
 * Server Action có thể reject trước cả khi chạy tới `KetQua` (mất mạng, server
 * restart giữa chừng). Không bắt thì `useTransition` nuốt lỗi.
 */
const LOI_KET_NOI: LoiAction = {
  code: "LOI_KET_NOI",
  message: "Không lưu được, thử lại.",
};

/** Dùng khi không có `lichTrinhNgayId` để gắn thao tác ghi vào (xem `tonTai`). */
const LOI_KHONG_CO_HANG: KetQua<never> = {
  ok: false,
  error: {
    code: "KHONG_CO_LICH_TRINH_NGAY",
    message: "Chưa có Lịch trình ngày cho ngày này.",
  },
};

/**
 * Lịch trình của MỘT ngày cụ thể — check-off, thêm/sửa/xoá Task riêng cho
 * ngày đó, điều hướng ◀/▶.
 *
 * Mọi thao tác ghi đi qua Server Actions (AD-3); các action tự
 * `revalidatePath` nên trang được Next.js vẽ lại từ server sau mỗi thao tác
 * MÀ KHÔNG reload toàn trang (FR-3: check-off "flips ngay, ratio cập nhật,
 * không reload"). Không có confirm dialog cho thao tác xoá (EXPERIENCE.md).
 */
export default function LichTrinhNgayView({
  lichTrinhNgayId,
  tonTai,
  tasks,
  soDaXong,
  tongSo,
  nhanNgay,
  laHomNay,
  hrefTruoc,
  hrefSau,
}: {
  lichTrinhNgayId: number | null;
  tonTai: boolean;
  tasks: TaskNgay[];
  soDaXong: number;
  tongSo: number;
  nhanNgay: string;
  laHomNay: boolean;
  hrefTruoc: string | null;
  hrefSau: string | null;
}) {
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

  function doiDaXong(task: TaskNgay) {
    if (lichTrinhNgayId === null) return;
    setLoiHang(null);
    batDau(async () => {
      try {
        const ketQua = await danhDauTask(
          task.id,
          lichTrinhNgayId,
          !task.daXong,
        );
        if (!ketQua.ok) setLoiHang(ketQua.error);
      } catch (loi) {
        console.error("[lich-trinh] danhDauTask thất bại:", loi);
        setLoiHang(LOI_KET_NOI);
      }
    });
  }

  function xoa(task: TaskNgay) {
    if (lichTrinhNgayId === null) return;
    setLoiHang(null);
    batDau(async () => {
      try {
        const ketQua = await xoaTaskNgay(task.id, lichTrinhNgayId);
        if (!ketQua.ok) setLoiHang(ketQua.error);
      } catch (loi) {
        console.error("[lich-trinh] xoaTaskNgay thất bại:", loi);
        setLoiHang(LOI_KET_NOI);
      }
    });
  }

  const phanTram = tongSo === 0 ? 0 : Math.round((soDaXong / tongSo) * 100);

  return (
    <>
      <nav className="day-nav" aria-label="Điều hướng theo ngày">
        {hrefTruoc ? (
          <Link
            className="day-nav-btn"
            href={hrefTruoc}
            aria-label="Xem ngày trước"
            title="Xem ngày trước"
          >
            <span aria-hidden="true">◀</span>
          </Link>
        ) : (
          <button
            type="button"
            className="day-nav-btn"
            disabled
            aria-label="Không có ngày trước để xem"
            title="Không có ngày trước để xem"
          >
            <span aria-hidden="true">◀</span>
          </button>
        )}

        <span className="day-nav-label">{nhanNgay}</span>

        {hrefSau ? (
          <Link
            className="day-nav-btn"
            href={hrefSau}
            aria-label="Xem ngày sau"
            title="Xem ngày sau"
          >
            <span aria-hidden="true">▶</span>
          </Link>
        ) : (
          <button
            type="button"
            className="day-nav-btn"
            disabled
            aria-label="Không có ngày sau để xem"
            title="Không có ngày sau để xem"
          >
            <span aria-hidden="true">▶</span>
          </button>
        )}
      </nav>

      <section className="card" aria-labelledby="tieu-de-ngay">
        <h2 id="tieu-de-ngay">Task trong ngày</h2>
        <p className="sub">
          {tonTai
            ? tongSo === 0
              ? "Chưa có Task nào cho ngày này"
              : `${tongSo} việc · sửa ở đây không ảnh hưởng Mẫu lịch trình`
            : "Ngày này chưa có Lịch trình — chưa từng ghé qua ngày này"}
        </p>

        {loiHang ? (
          <p className="field-error" role="alert">
            {loiHang.message}
          </p>
        ) : null}

        {!tonTai ? (
          <p className="empty-txt">
            Không có Lịch trình ngày nào được lưu cho ngày này — app không tự
            tạo lại các ngày đã bỏ qua trong quá khứ.
          </p>
        ) : (
          <>
            {tasks.map((task) =>
              idDangSua === task.id ? (
                <FormTaskNgay
                  key={task.id}
                  tieuDe={`Sửa Task · ${task.ten}`}
                  banDau={{
                    ten: task.ten,
                    thoiHan: task.thoiHan,
                    mucUuTien: task.mucUuTien,
                  }}
                  nhanLuu="Lưu thay đổi"
                  inline
                  onHuy={() => setIdDangSua(null)}
                  onLuu={(duLieu) =>
                    lichTrinhNgayId === null
                      ? Promise.resolve(LOI_KHONG_CO_HANG)
                      : suaTaskNgay(task.id, lichTrinhNgayId, duLieu)
                  }
                  onXong={() => setIdDangSua(null)}
                />
              ) : (
                <div
                  className={`task-row${task.daXong ? " done" : ""}`}
                  key={task.id}
                >
                  <input
                    type="checkbox"
                    className={`chk${task.daXong ? " done" : ""}`}
                    checked={task.daXong}
                    disabled={dangChay || lichTrinhNgayId === null}
                    onChange={() => doiDaXong(task)}
                    aria-label={`${task.ten}, mức ưu tiên ${NHAN_MUC_UU_TIEN[task.mucUuTien]}`}
                  />
                  <span className="ttime">{task.thoiHan}</span>
                  <span className="tname">{task.ten}</span>
                  <span
                    className={`badge-pri ${LOP_BADGE_UU_TIEN[task.mucUuTien]}`}
                  >
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

            {tongSo === 0 && !dangThem ? (
              <div className="empty-row">
                <span className="empty-txt">
                  Chưa có Task nào cho ngày này — thêm việc đầu tiên.
                </span>
                <button type="button" className="btn" onClick={moFormThem}>
                  + Thêm Task đầu tiên
                </button>
              </div>
            ) : null}

            {tongSo > 0 && !dangThem ? (
              <button type="button" className="link-add" onClick={moFormThem}>
                + Thêm Task mới
              </button>
            ) : null}

            {dangThem ? (
              <FormTaskNgay
                tieuDe="Task mới"
                banDau={FORM_TRONG}
                nhanLuu="Lưu Task"
                onHuy={() => setDangThem(false)}
                onLuu={(duLieu) =>
                  lichTrinhNgayId === null
                    ? Promise.resolve(LOI_KHONG_CO_HANG)
                    : themTaskNgay(lichTrinhNgayId, duLieu)
                }
                onXong={() => setDangThem(false)}
              />
            ) : null}

            <div className="mini-progress-wrap">
              <div className="mini-progress-label">
                <span>{laHomNay ? "Hôm nay đã làm" : "Đã làm"}</span>
                <span>
                  {soDaXong}/{tongSo}
                </span>
              </div>
              <div className="bar">
                <span style={{ width: `${phanTram}%` }} />
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}

function FormTaskNgay({
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
  // cùng hình dạng ở đây.
  onLuu: (duLieu: DuLieuForm) => Promise<KetQua<unknown>>;
  onHuy: () => void;
  onXong: () => void;
}) {
  const [gia, setGia] = useState<DuLieuForm>(banDau);
  const [loi, setLoi] = useState<LoiAction | null>(null);
  const [dangGui, batDau] = useTransition();
  const idForm = useId();

  function gui(su_kien: React.FormEvent<HTMLFormElement>) {
    su_kien.preventDefault();
    setLoi(null);
    batDau(async () => {
      try {
        const ketQua = await onLuu(gia);
        if (ketQua.ok) {
          onXong();
        } else {
          setLoi(ketQua.error);
        }
      } catch (loiGoi) {
        console.error("[lich-trinh] lưu Task ngày thất bại:", loiGoi);
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
          <label htmlFor={`${idForm}-thoi-han`}>Thời hạn</label>
          <input
            id={`${idForm}-thoi-han`}
            className="input"
            type="time"
            value={gia.thoiHan}
            aria-invalid={loi?.field === "thoiHan" || undefined}
            onChange={(e) => setGia({ ...gia, thoiHan: e.target.value })}
          />
        </div>
      </div>

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
        <button className="btn" type="submit" disabled={dangGui}>
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
