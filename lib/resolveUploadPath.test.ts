import path from "node:path";
import { describe, expect, it } from "vitest";
import { DuongDanKhongHopLe, resolveUploadPath } from "./resolveUploadPath";

/**
 * Unit test cho `resolveUploadPath()` — nguồn sự thật duy nhất về đường dẫn
 * ảnh dùng chung giữa `app/thuc-don/actions.ts` (write-side) và
 * `app/uploads/[...path]/route.ts` (read-side, AD-4). Đây là code liên quan
 * bảo mật (chặn path traversal ra ngoài `app-data/uploads/`) nên cần test
 * riêng, không chỉ dựa vào test gián tiếp qua actions/route.
 */

const GOC_UPLOADS = path.join(process.cwd(), "app-data", "uploads");

describe("resolveUploadPath", () => {
  it("ghép một đường dẫn tương đối bình thường vào ĐÚNG dưới app-data/uploads/", () => {
    const ketQua = resolveUploadPath("mon-an/uuid-1.jpg");

    expect(ketQua).toBe(path.join(GOC_UPLOADS, "mon-an", "uuid-1.jpg"));
    // Vẫn nằm bên trong thư mục gốc cho phép, không lệch ra ngoài.
    expect(ketQua.startsWith(GOC_UPLOADS + path.sep)).toBe(true);
  });

  it("ghép một đường dẫn tương đối ở thư mục con khác (nguyen-lieu/) cũng đúng", () => {
    const ketQua = resolveUploadPath("nguyen-lieu/uuid-2.png");

    expect(ketQua).toBe(path.join(GOC_UPLOADS, "nguyen-lieu", "uuid-2.png"));
  });

  it("chặn path traversal kiểu ../ ra ngoài app-data/uploads/", () => {
    expect(() => resolveUploadPath("../../package.json")).toThrow(
      DuongDanKhongHopLe,
    );
    expect(() => resolveUploadPath("mon-an/../../../etc/passwd")).toThrow(
      DuongDanKhongHopLe,
    );
    expect(() => resolveUploadPath("..")).toThrow(DuongDanKhongHopLe);
  });

  it("chặn đường dẫn chứa ký tự NUL", () => {
    expect(() => resolveUploadPath("mon-an/uuid\0.jpg")).toThrow(
      DuongDanKhongHopLe,
    );
  });

  it("chặn một đường dẫn TUYỆT ĐỐI lẫn vào giá trị lẽ ra phải tương đối", () => {
    expect(() =>
      resolveUploadPath(path.join(process.cwd(), "app-data", "db.sqlite")),
    ).toThrow(DuongDanKhongHopLe);
    expect(() => resolveUploadPath("/etc/passwd")).toThrow(
      DuongDanKhongHopLe,
    );
  });

  it("chặn chuỗi rỗng", () => {
    expect(() => resolveUploadPath("")).toThrow(DuongDanKhongHopLe);
  });
});
