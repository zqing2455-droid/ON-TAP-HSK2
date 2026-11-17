#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dựng dữ liệu cho ba trò chơi ôn từ vựng (câu cá · đường đua · bụi trúc).

    python3 assets/dung-tro-choi.py            # chạy ở gốc repo — chỉ dựng bài CHƯA có dữ liệu
    python3 assets/dung-tro-choi.py --ghi-de   # dựng lại tất cả (mất các chỗ đã sửa tay)

Nguồn duy nhất là bộ thẻ flashcard/bai-NN.html (khối `const DATA`), nên trò chơi
luôn khớp với từ vựng học viên đã học trên flashcard. Mỗi bài sinh một file
tro-choi/du-lieu/bai-NN.json:

    pool  : mọi từ của bài  {h: chữ Hán, p: phiên âm, v: nghĩa, hv: Hán Việt, loai: từ loại}
    cloze : câu điền từ     {q: câu có một chỗ trống ＿＿, a: đáp án, o: 3 lựa chọn sai,
                             p: phiên âm cả câu, v: nghĩa cả câu}

Câu điền từ lấy từ câu ví dụ của chính từ đó trên flashcard; ba lựa chọn sai là
từ KHÁC TỪ LOẠI trong cùng bài (để không có hai đáp án cùng đúng). Sau khi dựng
nên đọc lại file JSON một lượt; câu nào chưa ưng thì sửa thẳng trong file đó.

Thêm bài mới: đặt flashcard/bai-16.html vào rồi chạy lại script — trang
tro-choi/ tự thấy bài mới, không phải sửa gì khác.
"""
import hashlib, io, json, os, re, sys

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRONG = '＿＿'


def js_sang_json(js):
    """Đổi object literal của JS (khoá không có ngoặc kép) sang JSON, không đụng vào chuỗi."""
    ra, i, n = [], 0, len(js)
    while i < n:
        c = js[i]
        if c in '"\'':
            j, buf = i + 1, []
            while js[j] != c:
                if js[j] == '\\':
                    buf.append(js[j:j + 2]); j += 2
                else:
                    buf.append(js[j]); j += 1
            s = ''.join(buf)
            if c == "'":
                s = s.replace("\\'", "'").replace('"', '\\"')
            ra.append('"' + s + '"'); i = j + 1
        elif js.startswith('//', i):
            j = js.find('\n', i); i = n if j < 0 else j
        elif js.startswith('/*', i):
            i = js.find('*/', i) + 2
        else:
            m = re.match(r'[A-Za-z_]\w*(?=\s*:)', js[i:])
            if m and (not ra or not re.search(r'[\w"]$', ra[-1])):
                ra.append('"' + m.group(0) + '"'); i += len(m.group(0))
            else:
                ra.append(c); i += 1
    return re.sub(r',(\s*[}\]])', r'\1', ''.join(ra))


def doc_flashcard(duong):
    t = io.open(duong, encoding='utf-8').read()
    the = dict(re.findall(r'<meta name="fc-(\w+)" content="([^"]*)"', t))
    m = re.search(r'const DATA\s*=\s*(\{.*?\n\});', t, flags=re.S)
    return the, json.loads(js_sang_json(m.group(1)))


def nhom_loai(pos):
    """'động từ / danh từ · v.' → 'động từ' (lấy từ loại đứng đầu; danh từ riêng tính là danh từ)."""
    loai = pos.split('·')[0].split('/')[0].strip()
    return 'danh từ' if loai.startswith('danh từ') else loai


def thu_tu(*khoa):
    """Số giả ngẫu nhiên nhưng cố định theo nội dung — chạy lại script cho ra đúng kết quả cũ."""
    return hashlib.md5('|'.join(khoa).encode('utf-8')).hexdigest()


def dung_bai(so):
    the, d = doc_flashcard(os.path.join(GOC, 'flashcard', 'bai-%02d.html' % so))
    tu = d['words']
    pool = [dict(h=w['hz'], p=w['py'], v=w['vn'], hv=w.get('hv', ''), loai=nhom_loai(w['pos'])) for w in tu]
    cloze = []
    for w in tu:
        for cau in w.get('se', []):
            han, py, viet = cau[0], cau[1], cau[2]
            if han.count(w['hz']) != 1:        # từ ly hợp bị tách (帮个忙) hoặc lặp hai lần → bỏ câu này
                continue
            ung = [x for x in tu if x is not w and x['hz'] not in han and w['hz'] not in x['hz'] and x['hz'] not in w['hz']]
            khac = [x for x in ung if nhom_loai(x['pos']) != nhom_loai(w['pos'])]
            chon = sorted(khac, key=lambda x: thu_tu(han, x['hz']))[:3]
            if len(chon) < 3:                  # bài quá ít từ khác loại → bù bằng từ cùng loại
                chon += sorted([x for x in ung if x not in chon], key=lambda x: thu_tu(han, x['hz']))[:3 - len(chon)]
            if len(chon) < 3:
                continue
            cloze.append(dict(q=han.replace(w['hz'], TRONG), a=w['hz'], o=[x['hz'] for x in chon], p=py, v=viet))
            break                              # mỗi từ một câu
    return dict(so=so, han=the.get('han', ''), sub=the.get('sub', ''), pool=pool, cloze=cloze)


if __name__ == '__main__':
    ghi_de = '--ghi-de' in sys.argv
    thu_muc = os.path.join(GOC, 'tro-choi', 'du-lieu')
    os.makedirs(thu_muc, exist_ok=True)
    so = 1
    while os.path.exists(os.path.join(GOC, 'flashcard', 'bai-%02d.html' % so)):
        dich = os.path.join(thu_muc, 'bai-%02d.json' % so)
        if os.path.exists(dich) and not ghi_de:
            print('  bai-%02d.json  đã có — giữ nguyên' % so)
        else:
            b = dung_bai(so)
            io.open(dich, 'w', encoding='utf-8').write(json.dumps(b, ensure_ascii=False, indent=1) + '\n')
            print('  bai-%02d.json  %d từ · %d câu điền từ' % (so, len(b['pool']), len(b['cloze'])))
        so += 1
    print('✓ xong %d bài' % (so - 1))
