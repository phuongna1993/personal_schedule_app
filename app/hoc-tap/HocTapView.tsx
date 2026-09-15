"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import type { LoiAction } from "@/lib/ketQua";
import { formatNgayVN } from "@/lib/ngayVn";
import { ghiBuoiHoc, ghiDiemBaiTest, hoanThanhMoc } from "./actions";
import {
  biChanHoanThanhBoiGateDiem,
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
  nhanThang,
  hrefThangTruoc,
  hrefThangSau,
}: {
  tienDo: Record<KyNangEnum, TienDoKyNang>;
  loTrinh: Record<KyNangEnum, LoTrinhDuLieu>;
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
 * `ChiTieuView`'s log tháng). Đọc-only, không có input/nút Lưu nào ở đây
 * (ghi Buổi học là `KyNangForm` phía trên, story 8, không đổi).
 */
function TienDoCot({
  kyNang,
  tienDo,
}: {
  kyNang: KyNangEnum;
  tienDo: TienDoKyNang;
}) {
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
            <span className="tname">{bh.noiDung}</span>
            <span className="tname amt">{formatPhut(bh.thoiLuongPhut)} phút</span>
          </div>
        ))
      )}
    </div>
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

/**
 * Một cột Lộ trình của một Kỹ năng (CAP-13) — danh sách Mốc đã Hoàn thành
 * (viewable), thẻ Mốc HIỆN TẠI (`MocHienTaiCard`), rồi các Mốc CÒN LẠI hiển
 * thị mờ (chưa tới lượt, không tương tác được). Không có history list Điểm
 * số ở đây (deferred, xem `deferred-work.md` qua story's Boundaries).
 */
function LoTrinhCot({
  kyNang,
  loTrinh,
}: {
  kyNang: KyNangEnum;
  loTrinh: LoTrinhDuLieu;
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
