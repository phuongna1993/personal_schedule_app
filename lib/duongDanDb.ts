import fs from "node:fs";
import path from "node:path";

/**
 * AD-6 — NGUỒN SỰ THẬT DUY NHẤT về vị trí file SQLite.
 *
 * Cả runtime (`lib/db.ts`) lẫn Prisma CLI (`prisma.config.ts`) đều lấy đường
 * dẫn từ đây, để hai bên không bao giờ trỏ vào hai file khác nhau.
 *
 * Vì sao `path.join` và `mkdirSync` nằm ở ĐÂY chứ không ở `lib/db.ts`:
 * static analysis của Turbopack chỉ gộp được hằng chuỗi trong cùng một
 * module. Nếu `lib/db.ts` gọi `path.join(process.cwd(), THU_MUC_DU_LIEU)` với
 * hằng import từ file khác, nó không suy ra được thư mục cụ thể và cảnh báo
 * rằng toàn bộ project sẽ bị trace vào output. Giữ literal cạnh lời gọi giải
 * quyết được điều đó mà vẫn chỉ có một chỗ khai báo đường dẫn.
 */

/** Đường dẫn tương đối so với thư mục gốc dự án: `app-data/db.sqlite`. */
export const DUONG_DAN_DB_TUONG_DOI = "app-data/db.sqlite";

/**
 * Đường dẫn tuyệt đối tới file SQLite, đảm bảo thư mục chứa đã tồn tại.
 * `app-data/` bị gitignore nên có thể chưa có trên một bản checkout mới.
 */
export function layDuongDanFileDb(): string {
  const thuMuc = path.join(process.cwd(), "app-data");
  fs.mkdirSync(thuMuc, { recursive: true });
  const file = path.join(thuMuc, "db.sqlite");

  // Hằng ở trên bị viết lặp (bắt buộc, xem ghi chú đầu file) — chốt lại rằng
  // hai lối viết luôn trỏ đúng một file, để Prisma CLI và runtime không thể
  // lệch nhau trong im lặng.
  const theoHangChung = path.join(process.cwd(), DUONG_DAN_DB_TUONG_DOI);
  if (file !== theoHangChung) {
    throw new Error(
      `AD-6: đường dẫn DB không khớp — runtime "${file}" vs Prisma CLI "${theoHangChung}".`,
    );
  }

  return file;
}
