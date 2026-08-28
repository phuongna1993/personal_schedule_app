import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "App Quản Lý Cá Nhân Đa Năng",
  description:
    "Ứng dụng cá nhân một-người-dùng: lịch trình, chi tiêu, thực đơn, học tập.",
};

/**
 * Chế độ sáng/tối là thao tác THỦ CÔNG (EXPERIENCE.md — không tự chuyển theo
 * giờ hệ thống). Script này chạy trước khi vẽ để khôi phục lựa chọn đã lưu,
 * tránh "chớp" sai bảng màu ở lần vẽ đầu.
 */
const SCRIPT_KHOI_PHUC_THEME = `
try {
  var t = localStorage.getItem('theme');
  if (t === 'dark' || t === 'light') {
    document.documentElement.setAttribute('data-theme', t);
  }
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" data-theme="light">
      <head>
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: SCRIPT_KHOI_PHUC_THEME }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
