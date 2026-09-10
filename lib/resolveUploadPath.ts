import path from "node:path";

/**
 * AD-4 — Hàm ghép đường dẫn ảnh DUY NHẤT, dùng CHUNG giữa write-side (Server
 * Action ghi ảnh Món ăn/Nguyên liệu, `app/thuc-don/actions.ts`) và read-side
 * (Route Handler chỉ-đọc phục vụ lại ảnh, `app/uploads/[...path]/route.ts`)
 * — không tự nối chuỗi đường dẫn riêng lẻ ở từng nơi. Mirror phong cách của
 * `lib/duongDanDb.ts` (nguồn sự thật duy nhất về một đường dẫn dùng chung),
 * không phải mirror CODE của nó — không có Prisma CLI nào cần đường dẫn này.
 *
 * Khác `layDuongDanFileDb()`: hàm này KHÔNG tự `mkdir`. Phía ghi tự tạo thư
 * mục cha trước khi `writeFile` (file ảnh nằm trong thư mục con theo loại,
 * `mon-an/`/`nguyen-lieu/`, tạo lười theo nhu cầu); phía đọc chỉ cần đọc, tạo
 * thư mục ở đó không có ý nghĩa gì.
 */

/** Ném khi `relativePath` không hợp lệ — path traversal (`../`), ký tự NUL,
 * hoặc một đường dẫn tuyệt đối lẫn vào giá trị lẽ ra phải tương đối. */
export class DuongDanKhongHopLe extends Error {}

/**
 * Ghép `relativePath` (giá trị đã lưu trong cột `MonAn.anh`/`NguyenLieu.anh`,
 * hoặc do write-side tự sinh trước khi ghi) vào dưới `app-data/uploads/`, trả
 * về đường dẫn TUYỆT ĐỐI trên đĩa.
 *
 * Sau khi chuẩn hoá, kết quả PHẢI vẫn nằm trong `app-data/uploads/` — nếu
 * không (path traversal, ký tự NUL...), ném `DuongDanKhongHopLe` thay vì âm
 * thầm đọc/ghi ra ngoài thư mục cho phép. Gọi nơi này KHÔNG được tự bắt lỗi
 * rồi coi như "không có ảnh" — một `relativePath` không hợp lệ là dấu hiệu dữ
 * liệu hỏng/bị can thiệp, phải lộ ra ngoài rõ ràng.
 */
export function resolveUploadPath(relativePath: string): string {
  // `path.isAbsolute()` được kiểm TƯỜNG MINH ở đây, TRƯỚC khi join — không
  // dựa vào việc `path.join(thuMucGoc, relativePath)` "tình cờ" giữ kết quả
  // nằm trong `thuMucGoc`. `path.join` không reset về gốc filesystem khi gặp
  // một segment tuyệt đối (khác `path.resolve`), nên một `relativePath` kiểu
  // "/etc/passwd" vẫn bị join thành "<thuMucGoc>/etc/passwd" — về mặt path
  // traversal thì vô hại (không thoát được `thuMucGoc`), nhưng im lặng chấp
  // nhận một giá trị lẽ ra không bao giờ được coi là "tương đối" là hành vi
  // mong manh, phụ thuộc chi tiết cài đặt của `path.join` chứ không phải một
  // quyết định tường minh — chặn thẳng ở input thay vì suy ra gián tiếp.
  if (
    relativePath.length === 0 ||
    relativePath.includes("\0") ||
    path.isAbsolute(relativePath)
  ) {
    throw new DuongDanKhongHopLe(`Đường dẫn ảnh không hợp lệ: "${relativePath}".`);
  }

  const thuMucGoc = path.join(process.cwd(), "app-data", "uploads");
  const duongDanTuyetDoi = path.join(thuMucGoc, relativePath);

  // Lớp chặn thứ hai (defense-in-depth) cho path traversal kiểu `../` sau khi
  // đã join+chuẩn hoá — độc lập với kiểm tra `isAbsolute()` ở trên, vốn chỉ
  // xét CHÍNH `relativePath`, không xét kết quả sau khi ghép.
  const quanHe = path.relative(thuMucGoc, duongDanTuyetDoi);
  if (quanHe.startsWith("..") || path.isAbsolute(quanHe)) {
    throw new DuongDanKhongHopLe(`Đường dẫn ảnh không hợp lệ: "${relativePath}".`);
  }

  return duongDanTuyetDoi;
}
