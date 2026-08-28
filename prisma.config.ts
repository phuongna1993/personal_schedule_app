import { defineConfig } from "prisma/config";

/**
 * AD-6 — một môi trường cục bộ duy nhất: không có biến môi trường theo môi
 * trường triển khai, nên đường dẫn DB được ghi thẳng ở đây thay vì qua
 * `DATABASE_URL`. File nằm trong `app-data/` (gitignored).
 *
 * Đường dẫn tương đối được Prisma CLI giải theo thư mục gốc dự án (nơi chứa
 * file config này).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: "file:./app-data/db.sqlite",
  },
});
