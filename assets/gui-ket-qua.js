/* ═══════════════════════════════════════════════════════════════════
   GỬI KẾT QUẢ VỀ BẢNG TÍNH CỦA CÔ — dùng chung cho cả 15 bài
   Dán địa chỉ web app Apps Script (kết thúc bằng /exec) vào giữa hai dấu ' '.
   Đổi ở đây là cả 15 bài đổi theo. Để trống '' thì không gửi được.
   ═══════════════════════════════════════════════════════════════════ */
window.HSK2_WEBAPP = 'https://script.google.com/macros/s/AKfycbyrIzZZKGKypZA0_jHSXcYhsDNbuPfgvtNE_iEcCZ0J8m7PJ1QREYNxLMJ-uTfXN7ijvg/exec';

/* Gửi một gói kết quả. Gói gồm:
   dang (1 = bài 1–5, 2 = bài 6–10, 3 = bài 11–15), ma (mã lượt làm),
   ten, lop, bai, dung, sai, chualam, tong, phan, causai, baiviet, (amTen, amLoai, amThanh).
   Dùng no-cors nên trình duyệt không đọc được trả lời của Google — cô kiểm lại bằng bảng tính. */
window.HSK2_GUI = function (goi) {
  if (!window.HSK2_WEBAPP) return Promise.resolve(false);
  return fetch(window.HSK2_WEBAPP, {
    method: 'POST', mode: 'no-cors', cache: 'no-store',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(goi)
  }).then(function () { return true; }, function () { return false; });
};

/* Bỏ thẻ HTML để chữ gửi về bảng tính gọn sạch */
window.HSK2_TRON = function (s) {
  return String(s == null ? '' : s).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
};
