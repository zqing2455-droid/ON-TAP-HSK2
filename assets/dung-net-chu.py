#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Chuẩn bị "chữ Hán chạy bút thuận" cho các bộ flashcard.

    python3 assets/dung-net-chu.py --nguon <thư mục hanzi-writer-data>   # chạy ở gốc repo

Việc script làm (chạy lại bao nhiêu lần cũng được):
  1. Đọc mọi flashcard/bai-*.html, lấy chữ Hán của từ vựng (trường hz).
  2. Với mỗi chữ chưa có assets/net-chu/<mã Unicode>.json thì dựng từ dữ liệu nét
     (hanzi-writer-data 2.0.1: https://github.com/chanind/hanzi-writer-data — nguồn
     Make Me a Hanzi, giấy phép Arphic PL). Lấy dữ liệu: npm install hanzi-writer-data@2.0.1
  3. Chèn dòng nạp assets/chay-net.js vào cuối mỗi bộ thẻ (có dấu mốc CHAY-NET,
     không bao giờ chèn trùng).

Bộ thẻ mới thêm sau này: chỉ cần chạy lại script này một lần.
Chữ nào chưa có file nét thì trang tự lấy tạm từ jsDelivr; không lấy được thì hiện chữ tĩnh như cũ.
"""
import argparse, glob, io, json, os, re, shutil, sys

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DICH = os.path.join(GOC, 'assets', 'net-chu')
MOC_DAU, MOC_CUOI = '<!-- CHAY-NET:dau -->', '<!-- CHAY-NET:cuoi -->'
KHOI = (MOC_DAU + '\n<script src="../assets/chay-net.js" defer></script>\n' + MOC_CUOI + '\n')


def chu_han_cua(duong):
    t = io.open(duong, encoding='utf-8').read()
    return [h for h in re.findall(r'\bhz\s*:\s*"([^"]+)"', t)]


def gan(duong):
    t = io.open(duong, encoding='utf-8').read()
    t = re.sub(re.escape(MOC_DAU) + r'.*?' + re.escape(MOC_CUOI) + r'\n?', '', t, flags=re.S)
    i = t.rfind('</body>')
    t = (t[:i] + KHOI + t[i:]) if i >= 0 else (t.rstrip('\n') + '\n' + KHOI)
    io.open(duong, 'w', encoding='utf-8').write(t)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--nguon', default=os.path.join(GOC, 'node_modules', 'hanzi-writer-data'),
                    help='thư mục chứa <chữ>.json của hanzi-writer-data')
    a = ap.parse_args()
    bo = sorted(glob.glob(os.path.join(GOC, 'flashcard', 'bai-*.html')))
    chu = {}
    for f in bo:
        for h in chu_han_cua(f):
            for c in h:
                chu.setdefault(c, set()).add(os.path.basename(f))
    os.makedirs(DICH, exist_ok=True)
    moi, thieu = 0, []
    for c in sorted(chu):
        ra = os.path.join(DICH, '%x.json' % ord(c))
        if os.path.exists(ra):
            continue
        nguon = os.path.join(a.nguon, c + '.json')
        if not os.path.exists(nguon):
            thieu.append(c)
            continue
        d = json.load(io.open(nguon, encoding='utf-8'))
        io.open(ra, 'w', encoding='utf-8').write(
            json.dumps({'s': d['strokes'], 'm': d['medians']}, ensure_ascii=False, separators=(',', ':')))
        moi += 1
    # giữ kèm giấy phép của dữ liệu nét
    lic = os.path.join(a.nguon, 'ARPHICPL.TXT')
    if os.path.exists(lic):
        shutil.copyfile(lic, os.path.join(DICH, 'ARPHICPL.TXT'))
    io.open(os.path.join(DICH, 'NGUON.txt'), 'w', encoding='utf-8').write(
        'Dữ liệu thứ tự nét (strokes, medians) lấy từ hanzi-writer-data 2.0.1\n'
        'https://github.com/chanind/hanzi-writer-data\n'
        'Nguồn gốc: Make Me a Hanzi (https://github.com/skishore/makemeahanzi), '
        'giấy phép Arphic Public License (xem ARPHICPL.TXT).\n'
        'Mỗi file <mã Unicode>.json: {"s": các nét (đường viền SVG), "m": đường giữa từng nét}.\n')
    for f in bo:
        gan(f)
    print('Đã có dữ liệu nét cho %d/%d chữ (dựng mới %d) · gắn script vào %d bộ thẻ'
          % (len(chu) - len(thieu), len(chu), moi, len(bo)))
    if thieu:
        print('CHƯA CÓ dữ liệu nét (sẽ hiện chữ tĩnh hoặc lấy từ CDN):', ' '.join(thieu))
        sys.exit(1)


if __name__ == '__main__':
    main()
