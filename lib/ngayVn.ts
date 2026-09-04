/**
 * Helper NGÀY-VIÊT-NAM DUY NHẤT — mọi "ranh giới ngày" trong app (khởi tạo
 * Lịch trình ngày, điều hướng ◀/▶, hiển thị nhãn ngày) phải đi qua đây,
 * không tự tính giờ UTC làm mốc (Data & formats convention, AD-3 ngoại lệ 2).
 *
 * Việt Nam dùng UTC+7 cố định, không có giờ mùa hè (DST) — nên cộng/trừ đúng
 * 24h giữa hai mốc ngày luôn giữ đúng 00:00 giờ VN, bất kể server chạy ở TZ
 * nào.
 */

const MS_MOT_GIO = 60 * 60 * 1000;
const MS_MOT_NGAY = 24 * MS_MOT_GIO;
const LECH_GIO_VN = 7 * MS_MOT_GIO;

function padSo2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Thành phần Năm/Tháng/Ngày theo giờ VN của một thời điểm bất kỳ. */
function thanhPhanVN(thoiDiem: Date): { nam: number; thang: number; ngay: number } {
  const gioVN = new Date(thoiDiem.getTime() + LECH_GIO_VN);
  return {
    nam: gioVN.getUTCFullYear(),
    thang: gioVN.getUTCMonth() + 1,
    ngay: gioVN.getUTCDate(),
  };
}

/**
 * Chuẩn hoá một thời điểm về mốc 00:00 giờ Asia/Ho_Chi_Minh của đúng ngày
 * lịch VN chứa thời điểm đó. Dùng làm khoá unique `LichTrinhNgay.ngay` và
 * cho mọi phép so sánh/điều hướng theo ngày (◀/▶, "có phải hôm nay không").
 *
 * Giá trị trả về vẫn là một `Date` (một thời điểm tuyệt đối) — hai lần gọi
 * trong cùng một ngày lịch VN luôn cho ra đúng một mốc, bất kể server chạy
 * ở timezone nào.
 */
export function layMocNgayVN(thoiDiem: Date = new Date()): Date {
  const { nam, thang, ngay } = thanhPhanVN(thoiDiem);
  return new Date(Date.UTC(nam, thang - 1, ngay) - LECH_GIO_VN);
}

/** Lùi/tiến `soNgay` ngày lịch VN từ một mốc ngày đã chuẩn hoá bởi `layMocNgayVN`. */
export function themNgay(moc: Date, soNgay: number): Date {
  return new Date(moc.getTime() + soNgay * MS_MOT_NGAY);
}

/** Hiển thị UI theo `dd/mm/yyyy` (Data & formats convention). */
export function formatNgayVN(moc: Date): string {
  const { nam, thang, ngay } = thanhPhanVN(moc);
  return `${padSo2(ngay)}/${padSo2(thang)}/${nam}`;
}

/** Dạng `yyyy-mm-dd` dùng cho query string điều hướng ngày (`?ngay=...`). */
export function thamSoNgayVN(moc: Date): string {
  const { nam, thang, ngay } = thanhPhanVN(moc);
  return `${nam}-${padSo2(thang)}-${padSo2(ngay)}`;
}

/**
 * Mốc 00:00 giờ VN của NGÀY ĐẦU THÁNG chứa `thoiDiem` — dùng làm cận dưới khi
 * lọc dữ liệu theo "tháng hiện tại" (module Chi tiêu, CAP-4/CAP-7), cùng
 * nguyên tắc "ranh giới ngày tính theo giờ VN" như `layMocNgayVN()`.
 */
export function layMocDauThangVN(thoiDiem: Date = new Date()): Date {
  const { nam, thang } = thanhPhanVN(thoiDiem);
  return new Date(Date.UTC(nam, thang - 1, 1) - LECH_GIO_VN);
}

/**
 * Mốc 00:00 giờ VN của NGÀY ĐẦU THÁNG KẾ TIẾP — cận trên (exclusive) khi lọc
 * theo tháng, tránh phải tự tính "ngày cuối tháng" (số ngày/tháng khác nhau).
 * `Date.UTC` tự cuộn tháng 13 sang năm sau đúng ngữ nghĩa.
 */
export function layMocDauThangKeTiepVN(thoiDiem: Date = new Date()): Date {
  const { nam, thang } = thanhPhanVN(thoiDiem);
  return new Date(Date.UTC(nam, thang, 1) - LECH_GIO_VN);
}

/**
 * Parse ngược một chuỗi `yyyy-mm-dd` (query string) thành mốc ngày VN.
 * Trả `null` khi chuỗi không đúng dạng hoặc là một ngày lịch không tồn tại
 * (ví dụ "2026-02-30") — gọi nơi dùng phải tự rơi về `layMocNgayVN()`.
 */
export function tuThamSoNgay(gia: string): Date | null {
  const khop = /^(\d{4})-(\d{2})-(\d{2})$/.exec(gia);
  if (!khop) return null;

  const nam = Number(khop[1]);
  const thang = Number(khop[2]);
  const ngay = Number(khop[3]);
  const moc = new Date(Date.UTC(nam, thang - 1, ngay) - LECH_GIO_VN);

  // JS Date tự "cuộn" ngày không hợp lệ (30/02 -> 02/03) thay vì báo lỗi —
  // roundtrip lại để chặn những giá trị đó.
  if (thamSoNgayVN(moc) !== gia) return null;

  return moc;
}
