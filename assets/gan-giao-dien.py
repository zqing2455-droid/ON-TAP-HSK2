#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gắn giao diện "Mầm xanh" vào mọi trang của web Ôn tập HSK 2.

    python3 assets/gan-giao-dien.py            # chạy ở gốc repo

Chèn phông chữ + assets/giao-dien.css NGAY SAU khối </style> cuối cùng của trang —
nhờ vậy giao diện chung luôn đứng sau CSS riêng của trang và đè lên được.
(Bài 1–5 là khuôn cũ: CSS chính nằm trong <body>, bài 2–5 còn không có <head>,
nên không thể chèn theo </head> được.)
File trò chơi từng bài (có thẻ meta tc-han) đã mang sẵn giao diện riêng → bỏ qua.
Chạy lại bao nhiêu lần cũng không gắn trùng (có dấu mốc MAM-XANH).

Trang mới thêm sau này (bài mới, flashcard mới, trò chơi mới) chỉ cần chạy lại
script này một lần là có giao diện.
"""
import io, os, re, sys

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOC_DAU, MOC_CUOI = '<!-- MAM-XANH:dau -->', '<!-- MAM-XANH:cuoi -->'
FONT = ('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700'
        '&family=Nunito:wght@500;600;700;800&family=Patrick+Hand&display=swap')

def khoi(rel):
    return (MOC_DAU + '\n'
            '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
            '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
            '<link href="%s" rel="stylesheet">\n'
            '<link rel="stylesheet" href="%sassets/giao-dien.css">\n' % (FONT, rel)
            + MOC_CUOI + '\n')

def gan(duong):
    t = io.open(duong, encoding='utf-8').read()
    rel = '../' * (os.path.relpath(duong, GOC).count(os.sep))
    t = re.sub(re.escape(MOC_DAU) + r'.*?' + re.escape(MOC_CUOI) + r'\n?', '', t, flags=re.S)
    if 'name="tc-han"' in t:
        return 'bỏ qua (trò chơi — có giao diện riêng)'
    i = t.rfind('</style>')
    if i >= 0:
        i += len('</style>')
        t = t[:i] + '\n' + khoi(rel) + t[i:]
    elif '</head>' in t:
        t = t.replace('</head>', khoi(rel) + '</head>', 1)
    else:
        t = khoi(rel) + t
    io.open(duong, 'w', encoding='utf-8').write(t)
    return rel or './'

if __name__ == '__main__':
    trang = []
    for thu_muc, _, tep in os.walk(GOC):
        if '/.git' in thu_muc or '/assets' in thu_muc:
            continue
        trang += [os.path.join(thu_muc, f) for f in tep if f.endswith('.html')]
    for d in sorted(trang):
        print('  %-28s %s' % (os.path.relpath(d, GOC), gan(d)))
    print('✓ đã gắn giao diện cho %d trang' % len(trang))
