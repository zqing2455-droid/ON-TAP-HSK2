"use strict";
/* ÔN TẬP HSK 2 — ba trò chơi ôn từ vựng, dùng chung cho mọi bài.
   Trang chạy:  tro-choi/choi.html?tro=cau-ca|duong-dua|bui-truc&bai=3
   Dữ liệu:     tro-choi/du-lieu/bai-03.json  (dựng bằng assets/dung-tro-choi.py từ bộ flashcard)
     pool  : [{h,p,v,hv,loai}]        các từ của bài
     cloze : [{q,a,o,p,v}]            câu điền từ, q có một chỗ trống ＿＿
   Kết quả tốt nhất lưu ở localStorage, khoá  hsk2-tc-<trò>-bai<NN>. */
(function(){
const TRONG="＿＿", IMG="../assets/tro-choi-img/";
const TRO={
 "cau-ca":   {t:"Gấu trúc câu cá",       zh:"钓鱼",   sub:"Nghe từ (hoặc xem nghĩa), rồi bấm đúng con cá mang chữ đó để câu lên."},
 "duong-dua":{t:"Đường đua rừng trúc",   zh:"赛跑",   sub:"Điền từ còn thiếu, chọn chữ theo nghĩa. Đúng thì tiến một bước về rừng trúc."},
 "bui-truc": {t:"Ai trốn sau bụi trúc?", zh:"捉迷藏", sub:"Nhớ sáu thẻ từ. Một thẻ trốn mất — nói to từ đó bằng tiếng Trung rồi chọn chữ đúng."}
};
const qs=new URLSearchParams(location.search);
const tro=TRO[qs.get("tro")]?qs.get("tro"):"cau-ca";
const bai=Math.max(1,parseInt(qs.get("bai")||"1",10)||1);
const pad=n=>String(n).padStart(2,"0");
const KEY="hsk2-tc-"+tro+"-bai"+pad(bai);

const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const other=(pool,right,n)=>shuffle(pool.filter(x=>x!==right)).slice(0,n);
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const KHEN=["Chính xác! 对了！","Giỏi lắm! 真棒！","Tuyệt vời! 太好了！","Em nhớ bài rồi đó!"];

let DATA=null, G=null;            // G = ván đang chơi; đổi G là mọi vòng lặp, hẹn giờ cũ tự dừng
const later=(g,fn,ms)=>setTimeout(()=>{if(G===g)fn();},ms);
const pool=()=>DATA.pool;
const wordLine=w=>w.h+" · "+w.p+" · "+w.v;
function shell(html){$("app").innerHTML=html;}
function feedback(ok,msg){const f=$("fb");if(!f)return;f.className="fb "+(ok?"ok":"bad");f.textContent=msg;}
function clearFb(){const f=$("fb");if(f){f.className="fb";f.textContent="";}}

/* ---------- đọc tiếng Trung: giọng của máy, không có thì nhờ Google ---------- */
let zhVoice=null;
function pickVoice(){
 const vs=window.speechSynthesis?speechSynthesis.getVoices():[];
 const zh=vs.filter(v=>/^zh/i.test(v.lang));
 zhVoice=zh.find(v=>/CN|Hans|Chinese \(China\)|普通话|Mandarin/i.test(v.lang+v.name))||zh[0]||null;
}
if(window.speechSynthesis){pickVoice();speechSynthesis.onvoiceschanged=pickVoice;}
function speak(text,rate){
 if(!text)return;
 if(window.speechSynthesis&&zhVoice){
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);u.voice=zhVoice;u.lang=zhVoice.lang;u.rate=rate||0.8;
  speechSynthesis.speak(u);return;
 }
 try{new Audio("https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=zh-CN&q="+encodeURIComponent(text)).play().catch(()=>{});}catch(e){}
}

/* ---------- tiếng động nhỏ ---------- */
let AC=null;
function sfx(ok){
 try{
  AC=AC||new (window.AudioContext||window.webkitAudioContext)();
  const t=AC.currentTime;
  (ok?[660,880]:[220]).forEach((f,k)=>{
   const o=AC.createOscillator(),v=AC.createGain();
   o.type=ok?"sine":"triangle";o.frequency.value=f;
   v.gain.setValueAtTime(.0001,t+k*.1);v.gain.exponentialRampToValueAtTime(.09,t+k*.1+.02);
   v.gain.exponentialRampToValueAtTime(.0001,t+k*.1+.22);
   o.connect(v);v.connect(AC.destination);o.start(t+k*.1);o.stop(t+k*.1+.25);});
 }catch(e){}
}

/* ---------- hình (assets/tro-choi-img — gói hình CC0 của Kenney, xem NGUON-HINH.txt) ---------- */
const pic=(name,cls)=>'<img class="'+(cls||"")+'" src="'+IMG+name+'" alt="" draggable="false">';
const FISHES=[["fish_orange.svg",1.72],["fish_pink.svg",1.48],["fish_green.svg",1.34],["fish_red.svg",1.26],["fish_blue.svg",1.68]];  // [file, rộng/cao]
const ANGLER='<div class="angler"><svg viewBox="0 0 96 104" aria-hidden="true">'+
 '<ellipse cx="30" cy="97" rx="12" ry="7" fill="#4A4A4A"/><ellipse cx="60" cy="97" rx="12" ry="7" fill="#4A4A4A"/>'+
 '<ellipse cx="45" cy="82" rx="27" ry="20" fill="#fff" stroke="#8C8C8C" stroke-width="2.5"/>'+
 '<path d="M22 70 Q14 80 24 88" stroke="#4A4A4A" stroke-width="11" fill="none" stroke-linecap="round"/>'+
 '<path d="M62 70 Q74 72 78 82" stroke="#4A4A4A" stroke-width="11" fill="none" stroke-linecap="round"/></svg>'+
 pic("panda.png","angler-head")+'</div>';
const POND_BG='<div class="deco">'+
 [["bg_seaweed_a.svg",7,96,"far"],["bg_seaweed_g.svg",38,110,"far"],["bg_seaweed_a.svg",70,84,"far"],["bg_seaweed_g.svg",90,100,"far"],
  ["rock_a.svg",20,40,""],["rock_b.svg",78,36,""],
  ["seaweed_green_a.svg",3,92,"sway"],["seaweed_pink_c.svg",14,56,"sway"],["coral_orange.svg",31,40,""],
  ["seaweed_green_c.svg",47,62,"sway"],["seaweed_pink_a.svg",61,88,"sway"],["coral_orange.svg",72,34,""],
  ["seaweed_green_a.svg",88,78,"sway"]].map(([f,x,h,c],k)=>
   '<img class="weed '+c+'" src="'+IMG+f+'" alt="" style="left:'+x+'%;height:'+h+'px;animation-delay:-'+(k*.7)+'s">').join("")+
 '<svg class="sand" viewBox="0 0 600 40" preserveAspectRatio="none" aria-hidden="true">'+
 '<path d="M0 14 Q70 0 150 10 T300 9 T450 13 T600 6 V40 H0Z" fill="#F6EDCB"/>'+
 '<path d="M0 19 Q70 5 150 15 T300 14 T450 18 T600 11 V40 H0Z" fill="#EBDDAE"/></svg>'+
 [12,27,44,58,73,91].map((x,k)=>'<i class="bub" style="left:'+x+'%;width:'+(8+k%3*5)+'px;height:'+(8+k%3*5)+
   'px;animation-duration:'+(6+k%4*1.7)+'s;animation-delay:-'+(k*1.9)+'s"></i>').join("")+'</div>';
const GOAL='<svg class="goal" viewBox="0 0 40 52" aria-hidden="true">'+
 [[9,6],[20,0],[31,9]].map(([x,y])=>'<rect x="'+(x-4)+'" y="'+y+'" width="8" height="'+(52-y)+'" rx="3.5" fill="#7FA98B"/>'+
   [16,32].map(d=>'<rect x="'+(x-5)+'" y="'+(y+d)+'" width="10" height="3" rx="1.5" fill="#3F5B4C"/>').join("")).join("")+
 '<path d="M24 10 q12 -9 15 2 q-9 2 -15 -2z M16 18 q-12 -8 -15 3 q9 1 15 -3z" fill="#9DB4A2"/></svg>';
const BUSH='<svg viewBox="0 0 220 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+
 [28,54,170,196].map((x,k)=>'<rect x="'+(x-6)+'" y="'+(k%2?6:-6)+'" width="12" height="160" rx="5" fill="#7FA98B"/>'+
   [34,74,114].map(y=>'<rect x="'+(x-7)+'" y="'+(y+(k%2?8:0))+'" width="14" height="4" rx="2" fill="#3F5B4C"/>').join("")+
   '<path d="M'+(x+6)+' '+(40+k*9)+' q22 -14 30 2 q-18 2 -30 -2z" fill="#9DB4A2"/>').join("")+
 '<image href="'+IMG+'panda.png" x="66" y="38" width="88" height="66"/>'+
 '<path d="M40 150 q10 -62 70 -58 q62 -4 70 58z" fill="#7FA98B"/>'+
 '<path d="M62 150 q4 -40 28 -46 M110 150 v-52 M158 150 q-4 -40 -28 -46" stroke="#3F5B4C" stroke-width="4" fill="none" stroke-linecap="round"/>'+
 '<text x="166" y="50" font-size="40" font-weight="800" fill="#DDA640" font-family="system-ui,sans-serif">?</text></svg>';

/* ---------- khung chung ---------- */
function head(tools){
 return '<div class="g-head"><span class="g-pill" id="gPill"></span><div class="g-tools">'+(tools||"")+'</div></div>';}
function chip(txt,on,mode){return '<button type="button" class="chip'+(on?" on":"")+'" data-mode="'+mode+'">'+txt+'</button>';}
function wireModes(start){document.querySelectorAll(".g-tools .chip").forEach(b=>b.onclick=()=>start(b.dataset.mode));}
function btn(cls,txt,fn){const b=document.createElement("button");b.type="button";b.className=cls;b.textContent=txt;b.onclick=fn;return b;}
function save(right,total,won){
 let o={};try{o=JSON.parse(localStorage.getItem(KEY)||"{}")||{};}catch(e){}
 const pct=total?right/total:0, old=o.total?o.best/o.total:-1;
 if(pct>old){o.best=right;o.total=total;}
 o.plays=(o.plays||0)+1;
 if(won||(total&&right===total))o.done=1;
 try{localStorage.setItem(KEY,JSON.stringify(o));}catch(e){}
}
function done(g,title,note,won){
 save(g.right,g.right+g.wrong,won);G=null;
 const others=Object.keys(TRO).filter(k=>k!==tro);
 shell('<div class="card g-card score"><div class="big">'+g.right+'<small>/'+(g.right+g.wrong)+'</small></div>'+
  '<h2 class="g-end">'+esc(title)+'</h2><p class="g-lead">'+esc(note)+'</p>'+
  '<div class="g-row" id="ctrl"></div>'+
  '<p class="g-more">Chơi tiếp với từ của bài này: '+others.map(k=>'<a href="choi.html?tro='+k+'&bai='+bai+'">'+TRO[k].t+'</a>').join(" · ")+'</p></div>');
 $("ctrl").appendChild(btn("btn","Chơi lại",()=>start(g.mode)));
 const a=document.createElement("a");a.className="btn ghost";a.href="./#"+tro;a.textContent="Chọn bài khác";$("ctrl").appendChild(a);
}

/* =====================================================================
   1. GẤU TRÚC CÂU CÁ — nghe (hoặc xem nghĩa) rồi bấm đúng con cá mang chữ
   ===================================================================== */
const WATER=100;
function fish(mode){
 const P=pool(),R=Math.min(10,P.length);
 const g=G={mode:mode==="mean"?"mean":"listen",items:shuffle(P).slice(0,R),r:0,right:0,wrong:0,fish:[],busy:false,t:0};
 shell('<div class="card g-card">'+head(chip("Nghe → chữ",g.mode==="listen","listen")+chip("Nghĩa → chữ",g.mode==="mean","mean"))+
  '<div class="g-prompt"><div class="what" id="gWhat"></div><div id="gBtns" class="g-pbtn"></div><div class="dots" id="gDots"></div></div>'+
  '<div class="pond" id="pond">'+POND_BG+'<div class="bank"></div>'+ANGLER+
   '<svg class="pond-svg" aria-hidden="true"><line class="rod" id="rod"/><line class="fline" id="fline"/><circle id="bob" r="5"/></svg></div>'+
  '<div class="fb" id="fb"></div></div>');
 wireModes(fish);
 fishRound(g);
 requestAnimationFrame(ts=>fishLoop(g,ts));
}
function fishRound(g){
 const pond=$("pond");if(!pond)return;
 pond.querySelectorAll(".fish").forEach(e=>e.remove());
 g.busy=false;g.miss=0;
 const it=g.cur=g.items[g.r],P=pool();
 const opts=shuffle([it].concat(other(P,it,3)));
 const W=pond.clientWidth,H=pond.clientHeight,sm=W<430;
 pond.classList.toggle("sm",sm);
 g.tip=sm?{x:108,y:14}:{x:146,y:16};
 const rod=$("rod");rod.setAttribute("x1",sm?66:88);rod.setAttribute("y1",sm?68:90);
 rod.setAttribute("x2",g.tip.x);rod.setAttribute("y2",g.tip.y);
 $("fline").setAttribute("x1",g.tip.x);$("fline").setAttribute("y1",g.tip.y);
 g.fh=sm?44:56;
 const kinds=shuffle(FISHES);
 const top=WATER+36,gap=opts.length>1?(H-top-g.fh-12)/(opts.length-1):0;
 const lanes=shuffle(opts.map((_,k)=>k));
 g.fish=opts.map((o,k)=>{
  const el=document.createElement("button");el.className="fish";el.type="button";
  const kind=kinds[k%kinds.length];el.style.height=g.fh+"px";
  el.setAttribute("aria-label",o.h);
  // con cá kéo theo tấm biển chữ; đầu cá ở phía bơi tới
  el.innerHTML='<span class="flabel zh" style="font-size:'+(sm?20:26)+'px">'+esc(o.h)+'</span>'+
    '<img class="fimg" src="'+IMG+kind[0]+'" alt="" draggable="false" width="'+Math.round(g.fh*kind[1])+'" height="'+g.fh+'">';
  pond.appendChild(el);const w=el.offsetWidth;
  const f={el:el,it:o,w:w,x:rnd(6,Math.max(8,W-w-6)),y:top+gap*lanes[k],dir:Math.random()<.5?-1:1,sp:rnd(24,44),ph:rnd(0,6.28),state:"swim"};
  el.onclick=()=>fishClick(g,f);return f;});
 $("gPill").textContent="Lượt "+(g.r+1)+"/"+g.items.length;
 $("gDots").innerHTML=g.items.map((_,k)=>'<i class="'+(k<g.r?"done":k===g.r?"cur":"")+'"></i>').join("");
 const what=$("gWhat"),btns=$("gBtns");btns.innerHTML="";
 if(g.mode==="listen"){
  what.textContent="Nghe rồi câu đúng con cá";
  btns.appendChild(btn("btn","🔊 Nghe lại",()=>speak(g.cur.h)));
  btns.appendChild(btn("btn ghost","Chậm",()=>speak(g.cur.h,.55)));
  later(g,()=>speak(it.h),450);
 }else what.textContent=it.v;
 clearFb();
}
function fishLoop(g,ts){
 const pond=$("pond");if(G!==g||!pond)return;
 const dt=Math.min(.05,(ts-(g.last||ts))/1000);g.last=ts;g.t+=dt;
 const W=pond.clientWidth;let hook=null;
 g.fish.forEach(f=>{
  if(f.state==="swim"){
   f.x+=f.dir*f.sp*dt;
   if(f.x<4){f.x=4;f.dir=1;}
   if(f.x>W-f.w-4){f.x=W-f.w-4;f.dir=-1;}
  }else if(f.state==="pull"){
   f.k=Math.min(1,f.k+dt/.9);const e=1-Math.pow(1-f.k,3);
   f.x=f.x0+(f.tx-f.x0)*e;f.y=f.y0+(f.ty-f.y0)*e;
   if(f.k>=1){f.state="held";fishCaught(g,f);}
  }
  const bob=f.state==="swim"?Math.sin(g.t*2+f.ph)*4:0;
  f.el.style.left=f.x+"px";f.el.style.top=(f.y+bob)+"px";
  f.el.classList.toggle("left",f.dir<0);
  if(f.state!=="swim")hook={x:f.x+(f.dir<0?8:f.w-8),y:f.y+g.fh/2};
 });
 const ln=$("fline"),b=$("bob");
 const ex=hook?hook.x:g.tip.x,ey=hook?hook.y:WATER+20+Math.sin(g.t*2.4)*3;
 ln.setAttribute("x2",ex);ln.setAttribute("y2",ey);
 b.setAttribute("cx",ex);b.setAttribute("cy",ey);b.style.display=hook?"none":"";
 requestAnimationFrame(t=>fishLoop(g,t));
}
function fishClick(g,f){
 if(g.busy||f.dead||f.state!=="swim")return;
 if(f.it===g.cur){
  g.busy=true;sfx(true);
  f.state="pull";f.k=0;f.x0=f.x;f.y0=f.y;f.dir=-1;       // quay đầu về phía cần câu
  f.tx=g.tip.x-8;f.ty=WATER-18-g.fh/2;
  f.el.classList.add("got");
 }else{
  f.dead=true;f.el.classList.add("no");f.el.disabled=true;sfx(false);
  if(++g.miss===1)g.wrong++;
  feedback(false,"Chưa đúng, em "+(g.mode==="listen"?"nghe lại":"xem lại")+" nhé!");
  if(g.mode==="listen")later(g,()=>speak(g.cur.h),500);
 }
}
function fishCaught(g,f){
 if(!g.miss)g.right++;
 feedback(true,wordLine(g.cur));
 speak(g.cur.h);
 later(g,()=>{g.r++;
  if(g.r>=g.items.length){const tot=g.items.length,ok=g.right>=tot*.8;
   done(g,ok?"Em câu cá giỏi quá!":"Em câu thêm lần nữa nhé!",
     "Câu trúng ngay lần đầu "+g.right+"/"+tot+" từ."+(ok?"":" Những từ còn vấp em mở flashcard xem lại nhé."));}
  else fishRound(g);},1700);
}

/* =====================================================================
   2. ĐƯỜNG ĐUA RỪNG TRÚC — trả lời đúng thì tiến 1 bước
   ===================================================================== */
function raceQs(){
 const P=pool(),hs=P.map(x=>x.h);
 const a=shuffle(DATA.cloze||[]).map(c=>({
   type:"Điền từ còn thiếu",
   html:'<div class="qtext zh">'+esc(c.q).replace(TRONG,'<span class="blank" id="gBlank">?</span>')+'</div>',
   sub:c.v,py:c.p,right:c.a,opts:shuffle([c.a].concat(c.o)),say:c.q.replace(TRONG,c.a)}));
 const b=shuffle(P).map(w=>({type:"Từ nào có nghĩa là…",html:'<div class="qmean">'+esc(w.v)+'</div>',
   sub:"",right:w.h,opts:shuffle([w.h].concat(other(hs,w.h,3))),say:w.h,line:wordLine(w)}));
 const out=[];while(a.length||b.length){if(a.length)out.push(a.shift());if(b.length)out.push(b.shift());}
 return out;
}
function race(mode){
 const two=mode===2||mode==="2";
 const g=G={mode:two?2:1,N:two?6:8,pos:[0,0],turn:0,right:0,wrong:0,q:[],busy:false};
 g.names=two?["Đội Gấu Trúc","Đội Thỏ"]:["Em","Bạn Thỏ"];
 shell('<div class="card g-card">'+head(chip("1 người",!two,"1")+chip("2 đội",two,"2"))+
  '<p class="g-lead">'+(two?"Hai đội lần lượt trả lời. Đúng thì tiến 1 bước. Đội nào về rừng trúc trước?":
     "Đúng thì em tiến 1 bước. Sai thì bạn Thỏ nhảy 2 bước. Ai về rừng trúc trước?")+'</p>'+
  '<div class="track">'+[0,1].map(k=>'<div class="lane" id="lane'+k+'"><div class="who">'+g.names[k]+
    ' <span id="step'+k+'"></span></div><div class="road"><i class="runner" id="run'+k+'">'+pic(k?"rabbit.png":"panda.png")+
    '</i>'+GOAL+'</div></div>').join("")+'</div>'+
  '<div class="qbox" id="qbox"></div><div class="g-opts" id="opts"></div>'+
  '<div class="fb" id="fb"></div><div class="g-row" id="ctrl"></div></div>');
 wireModes(race);
 raceDraw(g);raceQ(g);
}
function raceDraw(g){
 [0,1].forEach(k=>{const p=Math.min(g.N,g.pos[k]);
  $("run"+k).style.left="calc((100% - 100px) * "+(p/g.N)+")";
  $("step"+k).textContent=p+"/"+g.N;
  $("lane"+k).classList.toggle("on",g.mode===2&&g.turn===k);});
}
function raceQ(g){
 if(!$("qbox"))return;
 if(!g.q.length)g.q=raceQs();
 const q=g.cur=g.q.shift();g.busy=false;
 $("gPill").textContent=g.mode===2?"Lượt của "+g.names[g.turn]:"Câu "+(g.right+g.wrong+1);
 $("qbox").innerHTML='<div class="qtype">'+esc(q.type)+'</div>'+q.html+
   (q.py?'<div class="qpy" id="gPy" hidden>'+esc(q.py)+'</div>':"")+(q.sub?'<div class="qsub">'+esc(q.sub)+'</div>':"");
 const o=$("opts");o.innerHTML="";
 q.opts.forEach(v=>{const b=document.createElement("button");b.type="button";b.className="opt zh";b.dataset.v=v;b.textContent=v;
  b.onclick=()=>raceAnswer(g,b,v);o.appendChild(b);});
 clearFb();$("ctrl").innerHTML="";
 raceDraw(g);
}
function raceAnswer(g,b,v){
 if(g.busy)return;g.busy=true;
 const q=g.cur,ok=v===q.right;
 document.querySelectorAll("#opts .opt").forEach(x=>{x.disabled=true;if(x.dataset.v===q.right)x.classList.add("good");});
 const bl=$("gBlank");if(bl){bl.textContent=q.right;bl.classList.add("fill");}
 const py=$("gPy");if(py)py.hidden=false;
 if(ok){g.right++;sfx(true);g.pos[g.turn]++;feedback(true,pick(KHEN)+(q.line?" "+q.line:""));}
 else{g.wrong++;sfx(false);b.classList.add("bad");
  if(g.mode===1)g.pos[1]=Math.min(g.N,g.pos[1]+2);
  feedback(false,"Đáp án đúng: "+(q.line||q.right)+(g.mode===1?" — bạn Thỏ nhảy 2 bước!":""));}
 speak(q.say);raceDraw(g);
 const win=g.pos[0]>=g.N?0:g.pos[1]>=g.N?1:-1;
 if(win>=0){later(g,()=>raceEnd(g,win),1900);return;}
 if(g.mode===2)g.turn=1-g.turn;
 if(ok)later(g,()=>raceQ(g),1700);
 else $("ctrl").appendChild(btn("btn","Câu tiếp theo ▶",()=>raceQ(g)));
}
function raceEnd(g,win){
 if(g.mode===2)done(g,g.names[win]+" về đích trước!","Hai đội trả lời đúng tổng cộng "+g.right+" câu.",false);
 else if(win===0)done(g,"Em về rừng trúc trước rồi!","Em trả lời đúng "+g.right+" câu, sai "+g.wrong+" câu.",true);
 else done(g,"Bạn Thỏ về đích trước. Em đua lại nhé!","Em trả lời đúng "+g.right+" câu, sai "+g.wrong+" câu.",false);
}

/* =====================================================================
   3. AI TRỐN SAU BỤI TRÚC? — nhớ các thẻ từ, đoán thẻ vừa trốn mất
   ===================================================================== */
function hide(){
 const g=G={r:0,R:6,right:0,wrong:0,phase:"look",set:[],used:[]};
 hideSet(g);
 shell('<div class="card g-card">'+head()+
  '<p class="g-lead" id="gLead"></p><div class="hgrid" id="hgrid"></div>'+
  '<div class="g-opts three" id="opts"></div><div class="fb" id="fb"></div><div class="g-row" id="ctrl"></div></div>');
 hideDraw(g);
}
function hideSet(g){const P=pool();g.set=shuffle(P).slice(0,Math.min(6,P.length));g.used=[];}
function card(w){
 const b=document.createElement("button");b.className="hcard";b.type="button";
 b.innerHTML='<span class="hp">'+esc(w.p)+'</span><span class="hh zh">'+esc(w.h)+'</span><span class="hv">'+esc(w.v)+'</span>';
 b.onclick=()=>speak(w.h);return b;}
function hideDraw(g){
 const grid=$("hgrid");if(!grid)return;
 grid.innerHTML="";$("opts").innerHTML="";const ctrl=$("ctrl");ctrl.innerHTML="";
 $("gPill").textContent="Lượt "+(g.r+1)+"/"+g.R;
 g.set.forEach(w=>{
  if(g.phase==="hide"&&w===g.gone){const d=document.createElement("div");d.className="hcard bush";d.innerHTML=BUSH;grid.appendChild(d);}
  else{const c=card(w);if(g.phase==="show"&&w===g.gone)c.classList.add("found");grid.appendChild(c);}});
 if(g.phase==="look"){
  clearFb();
  $("gLead").textContent="Em nhớ kỹ "+g.set.length+" từ này (bấm vào thẻ để nghe), rồi bấm “Trốn đi!”.";
  ctrl.appendChild(btn("btn","Trốn đi!",()=>hideGo(g)));
  if(pool().length>g.set.length)ctrl.appendChild(btn("btn ghost","Đổi bộ từ khác",()=>{hideSet(g);hideDraw(g);}));
 }else if(g.phase==="hide"){
  $("gLead").textContent="Ai trốn sau bụi trúc? Em nói to bằng tiếng Trung, rồi chọn chữ đúng nhé!";
  const o=$("opts");
  g.opts.forEach(w=>{const b=document.createElement("button");b.type="button";b.className="opt zh";b.textContent=w.h;
   b.onclick=()=>hideAnswer(g,w);o.appendChild(b);});
  ctrl.appendChild(btn("btn ghost","Gợi ý",()=>{const f=$("fb");f.className="fb";f.textContent="Gợi ý: "+g.gone.v;}));
 }else{
  $("gLead").textContent="Em đọc to từ vừa tìm được nhé!";
  ctrl.appendChild(btn("btn ghost","🔊 Nghe lại",()=>speak(g.gone.h)));
  ctrl.appendChild(btn("btn",g.r+1>=g.R?"Xem kết quả ▶":"Chơi tiếp ▶",()=>hideNext(g)));
 }
}
function hideGo(g){
 if(g.phase!=="look")return;
 let left=g.set.filter(w=>g.used.indexOf(w)<0);if(!left.length){g.used=[];left=g.set;}
 g.gone=pick(left);g.used.push(g.gone);
 const P=pool(),outside=shuffle(P.filter(w=>g.set.indexOf(w)<0)),inside=shuffle(g.set.filter(w=>w!==g.gone));
 g.opts=shuffle([g.gone].concat(outside.concat(inside).slice(0,2)));
 $("hgrid").classList.add("out");g.phase="wait";
 later(g,()=>{g.set=shuffle(g.set);g.phase="hide";hideDraw(g);
  later(g,()=>{const gr=$("hgrid");if(gr)gr.classList.remove("out");},40);},320);
}
function hideAnswer(g,w){
 if(g.phase!=="hide")return;
 const ok=w===g.gone;
 if(ok){g.right++;sfx(true);}else{g.wrong++;sfx(false);}
 g.phase="show";hideDraw(g);
 feedback(ok,(ok?"Đúng rồi! ":"Từ trốn là ")+wordLine(g.gone));
 speak(g.gone.h);
}
function hideNext(g){
 g.r++;
 if(g.r>=g.R){const ok=g.right>=g.R*.8;
  done(g,ok?"Em nhớ từ rất giỏi!":"Em chơi thêm lần nữa nhé!","Em tìm đúng "+g.right+"/"+g.R+" từ trốn.");return;}
 if(g.r%3===0&&pool().length>g.set.length)hideSet(g);
 g.phase="look";hideDraw(g);
}

/* ---------- khởi động ---------- */
function start(mode){window.scrollTo(0,0);
 if(tro==="cau-ca")fish(mode);else if(tro==="duong-dua")race(mode);else hide();}
(async function(){
 const T=TRO[tro];
 document.title=T.t+" · HSK2 Bài "+bai;
 $("hEye").textContent="HSK 2 · Bài "+bai;
 $("hTitle").innerHTML=esc(T.t)+' <span class="zh">'+T.zh+'</span>';
 $("hSub").textContent=T.sub;
 $("back").href="./#"+tro;
 $("gSwitch").innerHTML=Object.keys(TRO).map(k=>'<a class="chip'+(k===tro?" on":"")+'" href="choi.html?tro='+k+'&bai='+bai+'">'+TRO[k].t+'</a>').join("");
 try{
  const r=await fetch("du-lieu/bai-"+pad(bai)+".json",{cache:"no-cache"});
  if(!r.ok)throw new Error(r.status);
  DATA=await r.json();
 }catch(e){
  shell('<div class="card g-card"><h2 class="g-end">Chưa mở được bài này</h2><p class="g-lead">Không tìm thấy dữ liệu trò chơi của bài '+bai+
   '. Em quay lại danh sách và chọn bài khác nhé. (Nếu đang mở file trực tiếp trên máy thì trang cần được mở qua đường link web.)</p></div>');
  return;
 }
 if(DATA.han)$("hEye").innerHTML="HSK 2 · Bài "+bai+' · <span class="zh">'+esc(DATA.han)+'</span>';
 if(!DATA.pool||DATA.pool.length<4){shell('<div class="card g-card"><p class="g-lead">Bài này chưa đủ từ để chơi.</p></div>');return;}
 start();
})();
})();
