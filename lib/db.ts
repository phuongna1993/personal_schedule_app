import fs from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/prisma/client";

/**
 * AD-6 — Tầng DUY NHẤT chạm SQLite.
 *
 * File DB nằm ở `app-data/db.sqlite`, một thư mục ngoài git repo. Không có
 * biến môi trường theo môi trường triển khai: chỉ tồn tại đúng một môi trường
 * cục bộ, nên đường dẫn được suy ra thẳng từ thư mục gốc dự án.
 *
 * Không file nào khác trong app được import `PrismaClient` hay
 * `better-sqlite3` trực tiếp.
 */
const DB_DIR = path.join(process.cwd(), "app-data");
const DB_FILE = path.join(DB_DIR, "db.sqlite");

function taoPrismaClient(): PrismaClient {
  // `app-data/` bị gitignore nên có thể chưa tồn tại trên một bản checkout mới.
  fs.mkdirSync(DB_DIR, { recursive: true });

  const adapter = new PrismaBetterSqlite3({ url: `file:${DB_FILE}` });
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
