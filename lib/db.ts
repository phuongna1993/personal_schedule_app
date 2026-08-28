import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { layDuongDanFileDb } from "./duongDanDb";
import { PrismaClient } from "./generated/prisma/client";

/**
 * AD-6 — Tầng DUY NHẤT chạm SQLite.
 *
 * File DB nằm ở `app-data/db.sqlite`, một thư mục ngoài git repo. Không có
 * biến môi trường theo môi trường triển khai: chỉ tồn tại đúng một môi trường
 * cục bộ, nên đường dẫn được suy ra thẳng từ thư mục gốc dự án.
 *
 * Vị trí file đến từ `lib/duongDanDb.ts` — cùng module mà `prisma.config.ts`
 * dùng, nên runtime và Prisma CLI không thể trỏ vào hai file khác nhau.
 *
 * Không file nào khác trong app được import `PrismaClient` hay
 * `better-sqlite3` trực tiếp.
 */
function taoPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({
    url: `file:${layDuongDanFileDb()}`,
  });
  return new PrismaClient({ adapter });
}

// Singleton: `next dev` hot-reload dựng lại module liên tục; nếu không giữ
// instance trên globalThis thì mỗi lần reload lại mở thêm một kết nối SQLite.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma: PrismaClient = globalForPrisma.prisma ?? taoPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
