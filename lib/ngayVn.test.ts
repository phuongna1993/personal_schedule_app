import { describe, expect, it } from "vitest";
import {
  formatNgayVN,
  layMocNgayVN,
  thamSoNgayVN,
  themNgay,
  tuThamSoNgay,
} from "./ngayVn";

/**
 * Kỳ vọng ở đây được tính TAY, độc lập với hàm đang test — không gọi lại
 * `layMocNgayVN`/`tuThamSoNgay` để suy ra "giá trị đúng", vì làm vậy sẽ không
 * bao giờ bắt được một lỗi hồi quy trong chính phép toán UTC+7.
 *
 * VN là UTC+7 cố định, không DST: 00:00 giờ VN của một ngày == 17:00 UTC của
 * ngày lịch trước đó. Ví dụ 04/09/2026 00:00 VN == 2026-09-03T17:00:00.000Z.
 */
describe("layMocNgayVN", () => {
  it("một thời điểm UTC ngay TRƯỚC 17:00 UTC vẫn thuộc ngày VN trước đó", () => {
    // 2026-09-03T16:59:59.999Z = 03/09/2026 23:59:59.999 giờ VN.
    const truoc = new Date("2026-09-03T16:59:59.999Z");
    const ketQua = layMocNgayVN(truoc);
    expect(ketQua.getTime()).toBe(
      new Date("2026-09-02T17:00:00.000Z").getTime(),
    );
  });

  it("một thời điểm UTC ngay TẠI/SAU 17:00 UTC đã sang ngày VN kế tiếp", () => {
    // 2026-09-03T17:00:00.000Z = 04/09/2026 00:00:00.000 giờ VN — đầu ngày mới.
    const dung = new Date("2026-09-03T17:00:00.000Z");
    const ketQua = layMocNgayVN(dung);
    expect(ketQua.getTime()).toBe(
      new Date("2026-09-03T17:00:00.000Z").getTime(),
    );
  });

  it("chuẩn hoá một thời điểm giữa trưa VN về đúng mốc 00:00 VN của ngày đó", () => {
    // 2026-01-15T05:30:00.000Z = 15/01/2026 12:30 giờ VN.
    const giuaTrua = new Date("2026-01-15T05:30:00.000Z");
    const ketQua = layMocNgayVN(giuaTrua);
    expect(ketQua.getTime()).toBe(
      new Date("2026-01-14T17:00:00.000Z").getTime(),
    );
  });

  it("mốc đã chuẩn hoá là idempotent (gọi lại trên chính mốc không đổi)", () => {
    const moc = new Date("2026-09-03T17:00:00.000Z");
    expect(layMocNgayVN(moc).getTime()).toBe(moc.getTime());
  });
});

describe("themNgay", () => {
  it("cộng đúng 1 ngày lịch VN (24h) vào một mốc đã chuẩn hoá", () => {
    const moc = new Date("2026-09-03T17:00:00.000Z");
    const ketQua = themNgay(moc, 1);
    expect(ketQua.getTime()).toBe(new Date("2026-09-04T17:00:00.000Z").getTime());
  });

  it("trừ đúng 1 ngày (số âm)", () => {
    const moc = new Date("2026-09-03T17:00:00.000Z");
    const ketQua = themNgay(moc, -1);
    expect(ketQua.getTime()).toBe(new Date("2026-09-02T17:00:00.000Z").getTime());
  });

  it("cộng nhiều ngày, băng qua ranh giới tháng", () => {
    // 31/08/2026 00:00 VN == 2026-08-30T17:00:00.000Z; +2 ngày -> 02/09/2026.
    const moc = new Date("2026-08-30T17:00:00.000Z");
    const ketQua = themNgay(moc, 2);
    expect(ketQua.getTime()).toBe(new Date("2026-09-01T17:00:00.000Z").getTime());
  });

  it("themNgay(moc, 0) trả về đúng mốc ban đầu", () => {
    const moc = new Date("2026-09-03T17:00:00.000Z");
    expect(themNgay(moc, 0).getTime()).toBe(moc.getTime());
  });
});

describe("formatNgayVN", () => {
  it("hiển thị dd/mm/yyyy, có zero-pad ngày/tháng một chữ số", () => {
    // 2026-01-04T17:00:00.000Z = 05/01/2026 00:00 giờ VN.
    const moc = new Date("2026-01-04T17:00:00.000Z");
    expect(formatNgayVN(moc)).toBe("05/01/2026");
  });

  it("hiển thị đúng cho ngày/tháng hai chữ số", () => {
    const moc = new Date("2026-09-03T17:00:00.000Z"); // 04/09/2026 VN
    expect(formatNgayVN(moc)).toBe("04/09/2026");
  });
});

describe("thamSoNgayVN", () => {
  it("hiển thị dạng yyyy-mm-dd dùng cho query string", () => {
    const moc = new Date("2026-01-04T17:00:00.000Z"); // 05/01/2026 VN
    expect(thamSoNgayVN(moc)).toBe("2026-01-05");
  });
});

describe("tuThamSoNgay", () => {
  it("parse một chuỗi yyyy-mm-dd hợp lệ về đúng mốc 00:00 giờ VN", () => {
    const ketQua = tuThamSoNgay("2026-09-04");
    expect(ketQua?.getTime()).toBe(new Date("2026-09-03T17:00:00.000Z").getTime());
  });

  it("round-trip: thamSoNgayVN(tuThamSoNgay(s)) === s", () => {
    expect(thamSoNgayVN(tuThamSoNgay("2026-12-31")!)).toBe("2026-12-31");
  });

  it("trả null cho chuỗi sai dạng hoàn toàn", () => {
    expect(tuThamSoNgay("không phải ngày")).toBeNull();
    expect(tuThamSoNgay("2026/09/04")).toBeNull();
    expect(tuThamSoNgay("2026-9-4")).toBeNull();
    expect(tuThamSoNgay("")).toBeNull();
  });

  it("trả null cho một ngày lịch không tồn tại (JS Date tự cuộn sang tháng sau)", () => {
    // "2026-02-30" không tồn tại; JS Date sẽ tự cuộn thành 2026-03-02 nếu
    // không có bước roundtrip-kiểm-tra — phải bị chặn ở đây, không lặng lẽ
    // trả về một ngày khác.
    expect(tuThamSoNgay("2026-02-30")).toBeNull();
  });

  it("trả null cho ngày 31 của một tháng chỉ có 30 ngày", () => {
    expect(tuThamSoNgay("2026-04-31")).toBeNull();
  });

  it("chấp nhận 29/02 của năm nhuận, chặn 29/02 của năm không nhuận", () => {
    expect(tuThamSoNgay("2028-02-29")).not.toBeNull(); // 2028 là năm nhuận.
    expect(tuThamSoNgay("2026-02-29")).toBeNull(); // 2026 không phải năm nhuận.
  });
});
