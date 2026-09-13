"use client";

import { useId, useState, useTransition } from "react";
import type { LoiAction } from "@/lib/ketQua";
import { ghiBuoiHoc } from "./actions";
import { KY_NANG, type KyNangEnum, NHAN_KY_NANG } from "./model";

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

/**
 * Học tập — hai form ghi Buổi học ĐỘC LẬP HOÀN TOÀN, một cho mỗi Kỹ năng cố
 * định (mirror Story 7's hai cột `assign-col`/`assign-grid` độc lập). Không
 * có picker chọn Kỹ năng: form nào được submit tự ngầm định Kỹ năng đó.
 *
 * Mỗi form tự quản lý state (nội dung/thời lượng/lỗi/đang gửi) riêng — gõ
 * hay lưu ở form này không bao giờ đọc/ghi/ảnh hưởng state của form kia.
 */
export default function HocTapView() {
  return (
    <section
      className="assign-grid"
      aria-label="Ghi Buổi học theo Kỹ năng"
    >
      {KY_NANG.map((kyNang) => (
        <KyNangForm key={kyNang} kyNang={kyNang} />
      ))}
    </section>
  );
}

type DuLieuForm = {
  noiDung: string;
  /** `""` nghĩa là ô thời lượng đang trống. */
  thoiLuongPhut: string;
};

function formTrong(): DuLieuForm {
  return { noiDung: "", thoiLuongPhut: "" };
}

function KyNangForm({ kyNang }: { kyNang: KyNangEnum }) {
  const [gia, setGia] = useState<DuLieuForm>(formTrong());
  const [loi, setLoi] = useState<LoiAction | null>(null);
  const [daLuu, setDaLuu] = useState(false);
  const [dangGui, batDau] = useTransition();
  const idForm = useId();

  function gui(suKien: React.FormEvent<HTMLFormElement>) {
    suKien.preventDefault();
    setLoi(null);
    setDaLuu(false);

    batDau(async () => {
      try {
        const ketQua = await ghiBuoiHoc({
          kyNang,
          noiDung: gia.noiDung,
          thoiLuongPhut:
            gia.thoiLuongPhut.length === 0 ? 0 : Number(gia.thoiLuongPhut),
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

        <div id={`${idForm}-nhan-thoi-luong`} className="field-label">
          Thời lượng (phút)
        </div>
        <div className="amount-field">
          <input
            type="text"
            inputMode="numeric"
            aria-labelledby={`${idForm}-nhan-thoi-luong`}
            aria-invalid={loi?.field === "thoiLuongPhut" || undefined}
            value={gia.thoiLuongPhut}
            onChange={(e) => {
              setDaLuu(false);
              const chiSo = e.target.value.replace(/\D/g, "");
              setGia((truoc) => ({ ...truoc, thoiLuongPhut: chiSo }));
            }}
          />
          <span className="unit-label">phút</span>
        </div>

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
