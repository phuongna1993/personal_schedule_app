import Link from "next/link";

/**
 * Nút về Dashboard Hôm nay (`/`) trên header mọi màn hình con — đứng cạnh
 * `NutDoiTheme`, cùng hình dạng nút tròn. Dashboard không render nút này vì
 * chính nó là Home.
 */
export default function NutVeHome() {
  return (
    <Link
      href="/"
      className="theme-toggle home-btn"
      title="Về màn hình Home"
      aria-label="Về màn hình Home"
    >
      <span aria-hidden="true">🏠</span>
    </Link>
  );
}
