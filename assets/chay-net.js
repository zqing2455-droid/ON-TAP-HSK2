/* ═══════════════════════════════════════════════════════════════════════
   CHỮ HÁN CHẠY BÚT THUẬN (笔顺) CHO THẺ FLASHCARD

   Nạp bằng:  <script src="../assets/chay-net.js" defer></script>
   (assets/dung-net-chu.py tự chèn dòng này vào mọi bộ thẻ flashcard/bai-*.html)

   - Mặt trước (chiều 汉字 → Việt): chữ Hán của từ vựng tự viết từng nét, lặp lại liên tục.
   - Mặt sau: chữ Hán ở đầu thẻ viết một lần khi lật sang; chạm vào chữ để xem lại.
   - Từ nhiều chữ thì viết lần lượt từng chữ. Chế độ "Xem tất cả" giữ chữ tĩnh.
   - Máy bật "giảm chuyển động", hoặc chữ chưa có dữ liệu nét → giữ nguyên chữ tĩnh cũ.

   Cách vẽ và nhịp bám theo GIF bút thuận trong file PPT (hanzi_gif.py):
   nét chưa viết xám nhạt, nét đang viết đỏ son, nét đã viết màu mực, có ô米字.
   Dữ liệu nét: assets/net-chu/<mã Unicode>.json (xem NGUON.txt trong thư mục đó).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__chayNet) return;
  window.__chayNet = true;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var SRC = (document.currentScript && document.currentScript.src) || '';
  var DIR = SRC.replace(/chay-net\.js(\?.*)?$/, 'net-chu/');
  var CDN = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/';
  var NS = 'http://www.w3.org/2000/svg';
  var CJK = /^[一-鿿]$/;

  /* ---------- kiểu dáng ---------- */
  var st = document.createElement('style');
  st.textContent =
    '.cn-box{display:flex;justify-content:center;align-items:center;gap:6px;max-width:100%}' +
    '.cn-box svg{flex:0 1 auto;width:var(--cn-cell,110px);min-width:0;height:auto;aspect-ratio:1;display:block;' +
    'background:#fff;border-radius:10px}' +
    '.cn-box.cn-tap{cursor:pointer}' +
    '.cn-grid{fill:none;stroke:#EBD3CD;stroke-width:7}' +
    '.cn-dash{stroke:#EBD3CD;stroke-width:5;stroke-dasharray:28 22}' +
    '.cn-gh{fill:#E3DED2}' +
    '.cn-ink{fill:var(--m-la-dam,#2C4236)}' +
    '.cn-cur{fill:none;stroke:#B33A2B;stroke-width:200;stroke-linecap:round;stroke-linejoin:round}' +
    '.cn-txt{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
    '.hz.cn-on{position:relative;width:100%;max-width:100%}';
  document.head.appendChild(st);

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------- dữ liệu nét: file cùng repo, thiếu thì thử CDN ---------- */
  var cache = {};
  function fetchJSON(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function loadChar(ch) {
    if (cache[ch]) return cache[ch];
    var hex = ch.codePointAt(0).toString(16);
    cache[ch] = fetchJSON(DIR + hex + '.json').catch(function () {
      return fetchJSON(CDN + encodeURIComponent(ch) + '.json')
        .then(function (d) { return { s: d.strokes, m: d.medians }; });
    }).then(function (d) { return d && d.s && d.m ? d : null; }, function () { return null; });
    return cache[ch];
  }

  /* ---------- dựng SVG cho một chữ ---------- */
  var uid = 0;
  function polyLen(m) {
    var L = 0;
    for (var i = 0; i < m.length - 1; i++) L += Math.hypot(m[i + 1][0] - m[i][0], m[i + 1][1] - m[i][1]);
    return L || 60;
  }
  function buildChar(d) {
    var id = 'cn' + (++uid);
    var svg = el('svg', { viewBox: '0 0 1024 1024', 'aria-hidden': 'true', focusable: 'false' });
    el('rect', { x: 10, y: 10, width: 1004, height: 1004, 'class': 'cn-grid' }, svg);
    el('line', { x1: 512, y1: 10, x2: 512, y2: 1014, 'class': 'cn-dash' }, svg);
    el('line', { x1: 10, y1: 512, x2: 1014, y2: 512, 'class': 'cn-dash' }, svg);
    var defs = el('defs', {}, svg);
    var g = el('g', { transform: 'scale(1,-1) translate(0,-900)' }, svg);
    var ghost = el('g', {}, g), ink = el('g', {}, g), cur = el('g', {}, g);
    var strokes = d.s.map(function (path, i) {
      el('path', { d: path, 'class': 'cn-gh' }, ghost);
      var p = el('path', { d: path, 'class': 'cn-ink' }, ink);
      p.style.display = 'none';
      var cp = el('clipPath', { id: id + '-' + i }, defs);
      el('path', { d: path }, cp);
      var cg = el('g', { 'clip-path': 'url(#' + id + '-' + i + ')' }, cur);
      cg.style.display = 'none';
      var pts = d.m[i];
      var med = el('path', { d: 'M ' + pts.map(function (q) { return q[0] + ' ' + q[1]; }).join(' L '), 'class': 'cn-cur' }, cg);
      var L = polyLen(pts);
      return { ink: p, cg: cg, med: med, len: L,
               dur: Math.max(6, Math.min(16, Math.floor(L / 55))) * 45 };   // như GIF: 6–16 khung × 45 ms
    });
    return {
      svg: svg, strokes: strokes,
      full: function () { ghost.style.display = 'none'; strokes.forEach(function (s) { s.ink.style.display = ''; s.cg.style.display = 'none'; }); },
      blank: function () { ghost.style.display = ''; strokes.forEach(function (s) { s.ink.style.display = 'none'; s.cg.style.display = 'none'; }); }
    };
  }

  /* ---------- bộ chạy nét cho cả một từ ---------- */
  function Writer(box, chars, loop) {
    var token = 0;
    function alive(my) { return my === token && box.isConnected; }
    function wait(ms, my) {
      return new Promise(function (res) { setTimeout(res, ms); }).then(function () { return alive(my); });
    }
    function grow(s, my) {
      return new Promise(function (res) {
        var t0 = performance.now(), gap = s.len * 2 + 4000;
        (function tick(now) {
          if (!alive(my)) return res(false);
          var k = Math.min(1, ((now || performance.now()) - t0) / s.dur);
          s.med.style.strokeDasharray = Math.max(s.len * k, 1) + ' ' + gap;
          if (k < 1) requestAnimationFrame(tick); else res(true);
        })();
      });
    }
    function allFull() { chars.forEach(function (c) { c.full(); }); }
    function allBlank() { chars.forEach(function (c) { c.blank(); }); }
    var self = {
      stop: function () { token++; allFull(); },
      /* opts: preview = ms giữ nguyên chữ hoàn chỉnh trước khi xoá để viết; delay = ms chờ khi đã xoá */
      play: function (opts) {
        opts = opts || {};
        var my = ++token;
        (async function () {
          do {
            if (opts.preview) { allFull(); if (!(await wait(opts.preview, my))) return; }
            allBlank();
            if (!(await wait(opts.delay || 350, my))) return;
            for (var c = 0; c < chars.length; c++) {
              for (var i = 0; i < chars[c].strokes.length; i++) {
                var s = chars[c].strokes[i];
                s.cg.style.display = '';
                if (!(await grow(s, my))) return;
                s.cg.style.display = 'none';
                s.ink.style.display = '';
                if (!(await wait(260, my))) return;     // chốt nét rồi nghỉ một nhịp
              }
            }
            allFull();
            if (!loop) return;
            if (!(await wait(2000, my))) return;        // giữ chữ hoàn chỉnh rồi lặp lại
          } while (alive(my));
        })();
      }
    };
    return self;
  }

  /* ---------- gắn vào từng thẻ ---------- */
  var CELL = { front: [124, 112, 98, 84, 72], back: [62, 62, 54, 46, 42] };
  var cards = new WeakMap();      // .flip -> { front: Writer|null, back: Writer|null }

  function mount(host, kind, tap) {
    if (!host || host.getAttribute('data-cn')) return Promise.resolve(null);
    var word = host.textContent.trim();
    var letters = Array.from(word);
    if (!letters.length || !letters.every(function (c) { return CJK.test(c); })) return Promise.resolve(null);
    host.setAttribute('data-cn', '1');
    var cell = CELL[kind][Math.min(letters.length, 5) - 1];
    host.style.minHeight = cell + 'px';                  // giữ chỗ trước, thẻ không bị giật khi nét tải xong
    return Promise.all(letters.map(loadChar)).then(function (list) {
      if (!host.isConnected) return null;
      if (list.some(function (d) { return !d; })) { host.removeAttribute('data-cn'); host.style.minHeight = ''; return null; }
      var box = document.createElement('div');
      box.className = 'cn-box' + (tap ? ' cn-tap' : '');
      box.style.setProperty('--cn-cell', cell + 'px');
      var chars = list.map(buildChar);
      chars.forEach(function (c) { box.appendChild(c.svg); c.full(); });
      host.classList.add('cn-on');
      host.setAttribute('role', 'img');
      host.setAttribute('aria-label', word);
      host.textContent = '';
      var txt = document.createElement('span'); txt.className = 'cn-txt'; txt.textContent = word;
      host.appendChild(txt); host.appendChild(box);
      host.style.minHeight = '';                       // đã dựng xong: để chiều cao tự theo ô (ô co lại trên màn hẹp)
      var w = Writer(box, chars, kind === 'front');
      if (tap) {
        box.title = 'Chạm để xem lại nét';
        box.addEventListener('click', function (e) { e.stopPropagation(); w.play({ delay: 200 }); });
      }
      if (window.fitAll) { fitAll(); requestAnimationFrame(fitAll); }
      return w;
    });
  }

  function flippedOf(flipEl) { var i = flipEl.querySelector('.inner'); return !!(i && i.classList.contains('flipped')); }

  function enhance(stage) {
    if (stage.classList.contains('grid')) return;          // "Xem tất cả": giữ chữ tĩnh
    stage.querySelectorAll('.flip').forEach(function (flipEl) {
      if (cards.has(flipEl)) return;
      var rec = { front: null, back: null };
      cards.set(flipEl, rec);
      mount(flipEl.querySelector('.front .hz'), 'front', false).then(function (w) {
        rec.front = w;
        if (w && !flippedOf(flipEl)) w.play({ preview: 700 });
      });
      mount(flipEl.querySelector('.back .bhead .hz'), 'back', true).then(function (w) {
        rec.back = w;
        if (w && flippedOf(flipEl)) w.play({ delay: 450 });
      });
    });
  }

  function onFlip(flipEl) {
    var rec = cards.get(flipEl); if (!rec) return;
    if (flippedOf(flipEl)) {
      if (rec.front) rec.front.stop();
      if (rec.back) rec.back.play({ delay: 450 });          // chờ thẻ lật xong rồi mới viết
    } else {
      if (rec.back) rec.back.stop();
      if (rec.front) rec.front.play({ preview: 700 });
    }
  }

  function start() {
    var stage = document.getElementById('stage');
    if (!stage) return;
    new MutationObserver(function (muts) {
      var render = false;
      muts.forEach(function (m) {
        if (m.type === 'childList' && m.target === stage) render = true;
        else if (m.type === 'attributes' && m.target.classList && m.target.classList.contains('inner')) {
          var f = m.target.closest('.flip'); if (f) onFlip(f);
        }
      });
      if (render) enhance(stage);
    }).observe(stage, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    enhance(stage);

    // tải sẵn nét của cả bộ thẻ lúc rảnh, lật sang thẻ khác là có ngay
    var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 600); };
    idle(function () {
      try {
        var seen = {};
        DATA.words.forEach(function (w) { Array.from(w.hz).forEach(function (c) { if (CJK.test(c) && !seen[c]) { seen[c] = 1; loadChar(c); } }); });
      } catch (e) {}
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
