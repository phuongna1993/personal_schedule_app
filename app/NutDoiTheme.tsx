"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/**
 * Nút chuyển sáng/tối ở góc giao diện (🌙 ↔ ☀️).
 * Thao tác thủ công, không tự động theo giờ hệ thống (EXPERIENCE.md).
 * Luôn giữ `aria-label`/`title` mô tả hành động, không để icon trần.
 */
export default function NutDoiTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const hienTai = document.documentElement.getAttribute("data-theme");
    setTheme(hienTai === "dark" ? "dark" : "light");
  }, []);

  function doiTheme() {
    const moi: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", moi);
    try {
      localStorage.setItem("theme", moi);
    } catch {
      // localStorage bị chặn — vẫn đổi được theme cho phiên hiện tại.
    }
    setTheme(moi);
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={doiTheme}
      title="Chuyển giao diện sáng/tối"
      aria-label="Chuyển giao diện sáng/tối"
    >
      <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
    </button>
  );
}
