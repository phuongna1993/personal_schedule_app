import { describe, expect, it } from "vitest";
import {
  formatNgayVN,
  formatThangVN,
  layMocDauThangKeTiepVN,
  layMocDauThangVN,
  layMocNgayVN,
  thamSoNgayVN,
  thamSoThangVN,
  themNgay,
  tuThamSoNgay,
  tuThamSoThang,
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

/**
 * Kỳ vọng TÍNH TAY, độc lập với hàm đang test — cùng nguyên tắc đầu file.
 * 00:00 giờ VN của một ngày == 17:00 UTC của ngày lịch trước đó.
 */
describe("layMocDauThangVN", () => {
  it("giữa tháng: quy về đúng 00:00 giờ VN của ngày 1 CÙNG tháng đó", () => {
    // 2026-09-15T05:30:00.000Z = 15/09/2026 12:30 giờ VN.
    const giuaThang = new Date("2026-09-15T05:30:00.000Z");
    const ketQua = layMocDauThangVN(giuaThang);
    // 01/09/2026 00:00 giờ VN == 2026-08-31T17:00:00.000Z.
    expect(ketQua.getTime()).toBe(
      new Date("2026-08-31T17:00:00.000Z").getTime(),
    );
  });

  it("tháng 12: quy về đúng 00:00 giờ VN của ngày 1/12, KHÔNG cuộn sang năm sau", () => {
    // 2026-12-20T10:00:00.000Z = 20/12/2026 17:00 giờ VN.
    const thangMuoiHai = new Date("2026-12-20T10:00:00.000Z");
    const ketQua = layMocDauThangVN(thangMuoiHai);
    // 01/12/2026 00:00 giờ VN == 2026-11-30T17:00:00.000Z.
    expect(ketQua.getTime()).toBe(
      new Date("2026-11-30T17:00:00.000Z").getTime(),
    );
  });

  it("đầu tháng (đúng mốc 00:00 VN ngày 1) trả về chính nó", () => {
    // 01/01/2026 00:00 giờ VN == 2025-12-31T17:00:00.000Z.
    const dauThang = new Date("2025-12-31T17:00:00.000Z");
    expect(layMocDauThangVN(dauThang).getTime()).toBe(dauThang.getTime());
  });
});

describe("layMocDauThangKeTiepVN", () => {
  it("giữa tháng: quy về đúng 00:00 giờ VN của ngày 1 THÁNG SAU", () => {
    // 2026-09-15T05:30:00.000Z = 15/09/2026 12:30 giờ VN.
    const giuaThang = new Date("2026-09-15T05:30:00.000Z");
    const ketQua = layMocDauThangKeTiepVN(giuaThang);
    // 01/10/2026 00:00 giờ VN == 2026-09-30T17:00:00.000Z.
    expect(ketQua.getTime()).toBe(
      new Date("2026-09-30T17:00:00.000Z").getTime(),
    );
  });

  it("tháng 12: cuộn ĐÚNG sang 01/01 năm SAU (không phải 01/13 hay giữ nguyên năm)", () => {
    // 2026-12-20T10:00:00.000Z = 20/12/2026 17:00 giờ VN.
    const thangMuoiHai = new Date("2026-12-20T10:00:00.000Z");
    const ketQua = layMocDauThangKeTiepVN(thangMuoiHai);
    // 01/01/2027 00:00 giờ VN == 2026-12-31T17:00:00.000Z.
    expect(ketQua.getTime()).toBe(
      new Date("2026-12-31T17:00:00.000Z").getTime(),
    );
  });

  it("cận trên loại trừ: đúng bằng layMocDauThangVN() của tháng kế tiếp, cách layMocDauThangVN() tháng này > 27 ngày", () => {
    const thoiDiem = new Date("2026-02-10T00:00:00.000Z"); // giữa tháng 2/2026
    const dauThang = layMocDauThangVN(thoiDiem);
    const dauThangKeTiep = layMocDauThangKeTiepVN(thoiDiem);
    const soNgayCachNhau =
      (dauThangKeTiep.getTime() - dauThang.getTime()) / (24 * 60 * 60 * 1000);
    // Tháng 2/2026 (không nhuận) có 28 ngày.
    expect(soNgayCachNhau).toBe(28);
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

describe("thamSoThangVN", () => {
  it("hiển thị dạng yyyy-mm dùng cho query string", () => {
    // 2026-08-31T17:00:00.000Z = 01/09/2026 00:00 giờ VN.
    const moc = new Date("2026-08-31T17:00:00.000Z");
    expect(thamSoThangVN(moc)).toBe("2026-09");
  });

  it("zero-pad tháng một chữ số", () => {
    // 2026-01-31T17:00:00.000Z = 01/02/2026 00:00 giờ VN.
    const moc = new Date("2026-01-31T17:00:00.000Z");
    expect(thamSoThangVN(moc)).toBe("2026-02");
  });
});

describe("tuThamSoThang", () => {
  it("parse một chuỗi yyyy-mm hợp lệ về đúng mốc đầu tháng 00:00 giờ VN", () => {
    const ketQua = tuThamSoThang("2026-09");
    // 01/09/2026 00:00 giờ VN == 2026-08-31T17:00:00.000Z.
    expect(ketQua?.getTime()).toBe(new Date("2026-08-31T17:00:00.000Z").getTime());
  });

  it("round-trip: thamSoThangVN(tuThamSoThang(s)) === s", () => {
    expect(thamSoThangVN(tuThamSoThang("2026-12")!)).toBe("2026-12");
  });

  it("trả null cho chuỗi sai dạng hoàn toàn", () => {
    expect(tuThamSoThang("không phải tháng")).toBeNull();
    expect(tuThamSoThang("2026/09")).toBeNull();
    expect(tuThamSoThang("2026-9")).toBeNull();
    expect(tuThamSoThang("2026-09-01")).toBeNull();
    expect(tuThamSoThang("")).toBeNull();
  });

  it("trả null cho tháng ngoài 01-12 thay vì tự cuộn sang năm sau/trước", () => {
    // JS Date sẽ tự cuộn "2026-13" thành 01/2027 và "2026-00" thành 12/2025
    // nếu không có bước roundtrip-kiểm-tra — phải bị chặn ở đây.
    expect(tuThamSoThang("2026-13")).toBeNull();
    expect(tuThamSoThang("2026-00")).toBeNull();
  });

  it("băng qua ranh giới năm: tháng 12 và tháng 01 năm sau đều parse đúng, không lẫn năm", () => {
    const thang12 = tuThamSoThang("2026-12");
    const thang01NamSau = tuThamSoThang("2027-01");
    // 01/12/2026 00:00 VN == 2026-11-30T17:00:00.000Z.
    expect(thang12?.getTime()).toBe(new Date("2026-11-30T17:00:00.000Z").getTime());
    // 01/01/2027 00:00 VN == 2026-12-31T17:00:00.000Z.
    expect(thang01NamSau?.getTime()).toBe(
      new Date("2026-12-31T17:00:00.000Z").getTime(),
    );
  });
});

describe("formatThangVN", () => {
  it('hiển thị dạng "Tháng M/yyyy", không zero-pad tháng', () => {
    // 2026-08-31T17:00:00.000Z = 01/09/2026 00:00 giờ VN.
    const moc = new Date("2026-08-31T17:00:00.000Z");
    expect(formatThangVN(moc)).toBe("Tháng 9/2026");
  });

  it("hiển thị đúng cho tháng hai chữ số", () => {
    // 2026-11-30T17:00:00.000Z = 01/12/2026 00:00 giờ VN.
    const moc = new Date("2026-11-30T17:00:00.000Z");
    expect(formatThangVN(moc)).toBe("Tháng 12/2026");
  });
});
