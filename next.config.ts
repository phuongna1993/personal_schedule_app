import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Mặc định 1MB — quá nhỏ cho `themMonAn`/`suaMonAn` (module Thực đơn,
      // Story 6), vốn có thể gửi ảnh món (tối đa 5MB) CỘNG ảnh của nhiều
      // Nguyên liệu (mỗi ảnh tối đa 5MB) trong CÙNG một FormData. Nới lên đủ
      // rộng cho vài file 5MB một lượt gửi; không đổi hạn mức 5MB/file đã
      // quyết ở tầng Server Action (`app/thuc-don/actions.ts`).
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
