import { defineConfig } from "prisma/config";
import { DUONG_DAN_DB_TUONG_DOI } from "./lib/duongDanDb";

/**
 * AD-6 — một môi trường cục bộ duy nhất: không có biến môi trường theo môi
 * trường triển khai, nên đường dẫn DB được ghi thẳng ở đây thay vì qua
 * `DATABASE_URL`. File nằm trong `app-data/` (gitignored).
 *
 * Đường dẫn tương đối được Prisma CLI giải theo thư mục gốc dự án (nơi chứa
 * file config này). Giá trị lấy từ `lib/duongDanDb.ts` — cùng module mà
 * `lib/db.ts` dùng ở runtime, để CLI và app không thể trỏ vào hai file khác
 * nhau.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: `file:./${DUONG_DAN_DB_TUONG_DOI}`,
  },
});
