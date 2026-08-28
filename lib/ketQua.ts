/**
 * AD-3 — Hình dạng trả về ĐỒNG NHẤT của mọi Server Action, ở mọi module.
 *
 * Không action nào được trả `error` dạng chuỗi trần hay bọc khác cấu trúc này,
 * để một component lỗi/toast dùng chung xử lý được mọi nơi.
 */
export type LoiAction = {
  code: string;
  message: string;
  /** Tên trường gây lỗi, để UI gắn thông báo inline đúng chỗ. */
  field?: string;
};

export type KetQua<T> =
  | { ok: true; data: T }
  | { ok: false; error: LoiAction };

export function thanhCong<T>(data: T): KetQua<T> {
  return { ok: true, data };
}

export function thatBai<T>(
  code: string,
  message: string,
  field?: string,
): KetQua<T> {
  return { ok: false, error: field ? { code, message, field } : { code, message } };
}
