// ============================================
//  اسم فامیل آنلاین - سرور کامل
//  برای دیپلوی روی Glitch.com
// ============================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ============ دیتا ============
const rooms = new Map();
const LETTERS = 'آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی';
const COLORS = ['#667eea','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];

function genCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += c[Math.floor(Math.random() * c.length)];
  return code;
}

function randLetter() {
  return LETTERS[Math.floor(Math.random() * LETTERS.length)];
}

const DEFAULT_CATS = [
  { id: 'name',    name: 'اسم',     icon: '👤',    ph: 'مثلاً: علی، مریم' },
  { id: 'family',  name: 'فامیل',   icon: '👨‍👩‍👧‍👦', ph: 'مثلاً: احمدی' },
  { id: 'city',    name: 'شهر',     icon: '🏙️',   ph: 'مثلاً: اصفهان' },
  { id: 'country', name: 'کشور',    icon: '🌍',   ph: 'مثلاً: ژاپن' },
  { id: 'food',    name: 'غذا',     icon: '🍲',   ph: 'مثلاً: قورمه‌سبزی' },
  { id: 'animal',  name: 'حیوان',   icon: '🐾',   ph: 'مثلاً: گربه' },
];

// ============ صفحه اصلی ============
app.get('/', (req, res) => {
  res.send(HTML_PAGE);
});

// ============ سوکت ============
io.on('connection', (socket) => {
  console.log('[+] متصل شد:', socket.id);

  socket.on('create_room', ({ playerName }) => {
    let code;
    do { code = genCode(); } while (rooms.has(code));

    const room = {
      code,
      hostId: socket.id,
      players: { [socket.id]: { id: socket.id, name: playerName || 'بازیکن', score: 0 } },
      state: 'waiting',
      round: 1,
      maxRounds: 5,
      timePerRound: 60,
      currentLetter: '',
      answers: {},
      categories: DEFAULT_CATS,
    };
    rooms.set(code, room);
    socket.join(code);
    socket.emit('room_created', { code });
    broadcastRoom(code);
  });

  socket.on('join_room', ({ roomCode, playerName }) => {
    const code = roomCode.toUpperCase();
    const room = rooms.get(code);
    if (!room) { socket.emit('error', { message: 'اتاق پیدا نشد!' }); return; }
    if (room.state !== 'waiting') { socket.emit('error', { message: 'بازی شروع شده!' }); return; }
    if (Object.keys(room.players).length >= 8) { socket.emit('error', { message: 'اتاق پر شده!' }); return; }

    room.players[socket.id] = { id: socket.id, name: playerName || 'بازیکن', score: 0 };
    socket.join(code);
    socket.emit('room_joined', { code });
    broadcastRoom(code);
  });

  socket.on('start_game', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || room.hostId !== socket.id) return;
    if (Object.keys(room.players).length < 2) {
      socket.emit('error', { message: 'حداقل ۲ بازیکن لازمه!' });
      return;
    }
    room.state = 'playing';
    room.round = 1;
    room.currentLetter = randLetter();
    room.answers = {};

    io.to(roomCode).emit('game_started', {
      letter: room.currentLetter, round: room.round, maxRounds: room.maxRounds,
      timePerRound: room.timePerRound, categories: room.categories,
      players: room.players,
    });
    broadcastRoom(roomCode);
  });

  socket.on('submit_answers', ({ roomCode, answers }) => {
    const room = rooms.get(roomCode);
    if (!room || room.state !== 'playing') return;
    room.answers[socket.id] = answers;
    socket.emit('answers_received');

    const total = Object.keys(room.players).length;
    const done = Object.keys(room.answers).length;
    io.to(roomCode).emit('answers_progress', { submitted: done, total });

    if (done >= total) calcAndShowResults(room);
  });

  socket.on('next_round', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || room.hostId !== socket.id) return;
    room.round++;
    room.currentLetter = randLetter();
    room.answers = {};
    room.state = 'playing';

    io.to(roomCode).emit('new_round', {
      letter: room.currentLetter, round: room.round, maxRounds: room.maxRounds,
      timePerRound: room.timePerRound, categories: room.categories,
    });
    broadcastRoom(roomCode);
  });

  socket.on('finish_game', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    room.state = 'finished';
    const totalScores = {};
    Object.keys(room.players).forEach(pid => { totalScores[pid] = room.players[pid].score || 0; });
    io.to(roomCode).emit('game_finished', { totalScores, players: room.players });
  });

  socket.on('play_again', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || room.hostId !== socket.id) return;
    room.round = 1;
    room.currentLetter = randLetter();
    room.answers = {};
    room.state = 'playing';
    Object.keys(room.players).forEach(pid => { room.players[pid].score = 0; });

    io.to(roomCode).emit('new_round', {
      letter: room.currentLetter, round: room.round, maxRounds: room.maxRounds,
      timePerRound: room.timePerRound, categories: room.categories,
    });
    broadcastRoom(roomCode);
  });

  socket.on('disconnect', () => {
    console.log('[-] قطع شد:', socket.id);
    for (const [code, room] of rooms.entries()) {
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        if (Object.keys(room.players).length === 0) { rooms.delete(code); return; }
        if (room.hostId === socket.id) room.hostId = Object.keys(room.players)[0];
        broadcastRoom(code);
        return;
      }
    }
  });
});

function broadcastRoom(code) {
  const room = rooms.get(code);
  if (!room) return;
  io.to(code).emit('room_update', {
    code: room.code, hostId: room.hostId, players: room.players,
    state: room.state, round: room.round,
  });
}

function calcAndShowResults(room) {
  const results = {};
  Object.keys(room.players).forEach(pid => {
    results[pid] = { total: 0, details: {} };
  });

  room.categories.forEach(cat => {
    const groups = {};
    Object.keys(room.players).forEach(pid => {
      const ans = (room.answers[pid] || {})[cat.id] || '';
      if (ans.trim()) {
        const key = ans.trim();
        if (!groups[key]) groups[key] = [];
        groups[key].push(pid);
      }
    });

    Object.keys(room.players).forEach(pid => {
      const ans = (room.answers[pid] || {})[cat.id] || '';
      if (!ans.trim()) { results[pid].details[cat.id] = { answer: '', score: 0 }; return; }
      const group = groups[ans.trim()];
      const score = group.length === 1 ? 20 : 10;
      results[pid].details[cat.id] = { answer: ans.trim(), score };
      results[pid].total += score;
    });
  });

  Object.keys(room.players).forEach(pid => {
    room.players[pid].score = (room.players[pid].score || 0) + results[pid].total;
  });

  const totalScores = {};
  Object.keys(room.players).forEach(pid => { totalScores[pid] = room.players[pid].score; });

  room.state = 'waiting_next';
  io.to(room.code).emit('round_results', { results, totalScores, round: room.round, letter: room.currentLetter });
  broadcastRoom(room.code);
}

// ============ HTML صفحه بازی ============
const HTML_PAGE = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<title>اسم فامیل آنلاین</title>
<script src="/socket.io/socket.io.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
:root{--p:#667eea;--pd:#764ba2;--g:#22c55e;--r:#ef4444;--a:#f59e0b;--bg:#f0f2f5;--card:#fff;--text:#1a1a2e;--tl:#6b7280;--bdr:#e5e7eb}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Tahoma,Arial,sans-serif;background:var(--bg);min-height:100vh;min-height:100dvh;color:var(--text);direction:rtl;overflow-x:hidden;-webkit-user-select:none;user-select:none}
.scr{display:none;flex-direction:column;min-height:100vh;min-height:100dvh}.scr.on{display:flex}
.grad{background:linear-gradient(135deg,var(--p),var(--pd),#4338ca);padding:20px;text-align:center}
.grad-gold{background:linear-gradient(135deg,#f59e0b,#d97706);padding:40px 20px;text-align:center;color:#fff}
.logo{width:90px;height:90px;background:rgba(255,255,255,.15);border-radius:26px;display:flex;align-items:center;justify-content:center;font-size:44px;margin:40px auto 16px;backdrop-filter:blur(12px)}
.h1{font-size:36px;font-weight:900;color:#fff;margin-bottom:4px}
.sub{font-size:14px;color:rgba(255,255,255,.7);margin-bottom:20px;letter-spacing:2px}
.card{background:#fff;border-radius:24px;padding:24px 20px;width:100%;max-width:400px;box-shadow:0 20px 40px rgba(0,0,0,.15);margin:0 auto}
.fl{display:block;font-size:13px;font-weight:600;color:var(--tl);margin-bottom:6px;text-align:right}
.fi{width:100%;padding:14px 16px;border:2px solid var(--bdr);border-radius:14px;font-size:17px;outline:none;direction:rtl;text-align:right;transition:border-color .2s;font-family:inherit}
.fi:focus{border-color:var(--p)}.fi::placeholder{color:#bbb}
.btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;border:none;border-radius:14px;font-size:17px;font-weight:700;cursor:pointer;transition:all .15s;margin-bottom:10px;font-family:inherit}
.btn:active{transform:scale(.97)}
.bp{background:linear-gradient(135deg,var(--p),var(--pd));color:#fff}
.bg{background:var(--g);color:#fff}.ba{background:var(--a);color:#fff}
.bo{background:transparent;border:2px solid var(--bdr);color:var(--tl)}
.bs{padding:8px 16px;border-radius:10px;font-size:14px;width:auto;display:inline-flex}
.btn:disabled{background:#ccc;cursor:not-allowed}
.div{display:flex;align-items:center;gap:12px;margin:14px 0;color:#aaa;font-size:13px}
.div::before,.div::after{content:'';flex:1;height:1px;background:var(--bdr)}
.ver{font-size:12px;color:rgba(255,255,255,.5);margin-top:32px;text-align:center}
.jb{display:flex;gap:10px}.jb .fi{flex:1}.jb .btn{flex:0 0 100px;margin-bottom:0}
.spin{width:48px;height:48px;border:4px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:sp .8s linear infinite;margin:20px auto}
@keyframes sp{to{transform:rotate(360deg)}}
.lt{color:#fff;font-size:16px;margin-top:12px}
.rh{display:flex;align-items:center;justify-content:center;gap:12px;position:relative;padding-top:10px}
.rh h2{color:#fff;font-size:22px;font-weight:800}
.bb{position:absolute;right:0;top:10px;width:36px;height:36px;border:none;background:rgba(255,255,255,.2);color:#fff;border-radius:10px;font-size:16px;cursor:pointer;backdrop-filter:blur(8px)}
.rb{flex:1;padding:20px;background:var(--bg)}
.rcb{background:#fff;border-radius:20px;padding:24px;text-align:center;margin-bottom:16px;box-shadow:0 4px 16px rgba(0,0,0,.06)}
.rcl{font-size:13px;color:var(--tl);margin-bottom:6px}
.rcc{font-size:40px;font-weight:900;color:var(--p);letter-spacing:8px;margin-bottom:14px}
.pcl{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.pi{background:#fff;border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
.pia{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff}
.pii{flex:1}.pin{font-size:15px;font-weight:600}
.badge{font-size:11px;padding:2px 8px;border-radius:8px;display:inline-block;margin-top:2px}
.bh{background:#fef3c7;color:#92400e}.by{background:#ede9fe;color:#5b21b6}.br{background:#d1fae5;color:#065f46}
.wt{text-align:center;color:var(--tl);font-size:14px;padding:20px 0}
.bst{max-width:200px;margin:0 auto;display:block!important}
.gt{background:linear-gradient(135deg,var(--p),var(--pd));padding:50px 16px 14px;color:#fff}
.gtr{display:flex;align-items:center;justify-content:space-between}
.gr{text-align:center}.gr .gl{font-size:12px;opacity:.8}.gr .gn{font-size:16px;font-weight:800}
.glt{width:56px;height:56px;background:rgba(255,255,255,.2);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:900;backdrop-filter:blur(8px)}
.gtm{background:rgba(255,255,255,.2);padding:8px 14px;border-radius:20px;display:flex;align-items:center;gap:6px;font-size:18px;font-weight:700;backdrop-filter:blur(8px);min-width:70px;justify-content:center}
.gtm.w{background:var(--r)}
.gb{flex:1;overflow-y:auto;padding:12px 16px;background:var(--bg)}
.ac{background:#fff;border-radius:16px;padding:14px 16px;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,.06);transition:all .3s}
.ac.f{border-right:4px solid var(--g)}
.ach{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.aci{width:38px;height:38px;background:#ede9fe;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px}
.acl{font-size:15px;font-weight:700}
.ai{width:100%;padding:12px 14px;border:2px solid var(--bdr);border-radius:10px;font-size:16px;outline:none;direction:rtl;text-align:right;transition:border-color .2s;font-family:inherit;background:#fafafa}
.ai:focus{border-color:var(--p);background:#fff}.ai::placeholder{color:#ccc}.ai:disabled{background:#f0f0f0;color:#888}
.gf{padding:12px 16px;padding-bottom:max(16px,env(safe-area-inset-bottom));background:#fff;border-top:1px solid var(--bdr)}
.wcb{background:#fff;border-radius:24px;padding:36px 28px;text-align:center;width:100%;max-width:340px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.we{font-size:56px;margin-bottom:12px;animation:pl 1.5s infinite}
@keyframes pl{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
.wcb h2{font-size:20px;font-weight:700;margin-bottom:8px}.wcb p{font-size:14px;color:var(--tl)}
.pbb{width:100%;height:8px;background:var(--bdr);border-radius:4px;margin-top:16px;overflow:hidden}
.pbf{height:100%;background:linear-gradient(90deg,var(--p),var(--pd));transition:width .3s;border-radius:4px}
.rtt{font-size:24px;font-weight:900;color:#fff;padding-top:10px}.rts{font-size:14px;color:rgba(255,255,255,.8);margin-bottom:16px}
.rb2{flex:1;overflow-y:auto;padding:0 16px}
.rc{background:#fff;border-radius:20px;padding:16px;margin-bottom:12px;box-shadow:0 4px 16px rgba(0,0,0,.08)}
.rp{display:flex;align-items:center;justify-content:space-between;padding:14px 0}
.rp:not(:last-child){border-bottom:1px solid var(--bdr)}
.rpi{display:flex;align-items:center;gap:10px}
.rk{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff}
.r1{background:#fbbf24}.r2{background:#9ca3af}.r3{background:#d97706}.ro{background:#d1d5db}
.ra2{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff}
.rn{font-size:16px;font-weight:600}.rtl2{font-size:12px;color:var(--tl)}
.rsc{font-size:22px;font-weight:800;color:var(--p)}
.db{background:none;border:none;color:var(--p);font-size:14px;font-weight:600;cursor:pointer;padding:8px 0;font-family:inherit;display:block;margin:0 auto}
.dt{width:100%;border-collapse:collapse;margin-top:12px;display:none}
.dt.sh{display:table}
.dt th{padding:8px;text-align:center;font-size:12px;font-weight:600;color:var(--tl);background:#f8f8f8;border-bottom:1px solid var(--bdr)}
.dt td{padding:8px;text-align:center;font-size:13px;border-bottom:1px solid #f0f0f0}
.dt td:first-child{text-align:right;font-weight:600}
.at2{display:block}.st2{display:block;font-weight:700;color:var(--p);font-size:12px}
.rf{padding:16px}
.fc{font-size:80px;margin-bottom:16px}.fw{font-size:28px;font-weight:900;color:#fff;margin-bottom:8px}.fs{font-size:16px;color:rgba(255,255,255,.8);margin-bottom:24px}
.fb{flex:1;padding:20px;display:flex;flex-direction:column;align-items:center}
.fp{display:flex;align-items:center;justify-content:space-between;padding:12px 0}
.fp:not(:last-child){border-bottom:1px solid var(--bdr)}
.fm{font-size:24px;width:32px;text-align:center}.fn{font-size:16px;font-weight:600;text-align:right;flex:1}.fsc{font-size:20px;font-weight:800;color:var(--p)}
.toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:12px 24px;border-radius:12px;font-size:14px;z-index:999;transition:all .3s;white-space:nowrap}
.toast.sh{opacity:1;bottom:80px}.toast.hi{opacity:0;bottom:60px;pointer-events:none}
.cf{position:fixed;top:-10px;font-size:20px;animation:cfall linear forwards;pointer-events:none;z-index:300}
@keyframes cfall{to{top:110vh;transform:rotate(720deg)}}
@media(min-width:480px){.card{max-width:420px}.rb{max-width:480px;margin:0 auto}.rb2{max-width:480px;margin:0 auto}.fb{max-width:420px;margin:0 auto}}
.pc{background:#fff;border-radius:14px;padding:14px 20px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.04);display:flex;align-items:center;justify-content:space-between}
.pc span{font-size:15px;font-weight:600;color:var(--text)}
</style>
</head>
<body>

<!-- HOME -->
<div id="s-home" class="scr on">
<div class="grad">
<div class="logo">🎮</div>
<h1 class="h1">اسم فامیل آنلاین</h1>
<p class="sub">بازی چند نفره از راه دور</p>
</div>
<div class="card" style="margin-top:20px">
<label class="fl">اسم شما</label>
<input type="text" id="i-name" class="fi" placeholder="مثلاً: علی" maxlength="20">
<br><br>
<button class="btn bp" onclick="createRoom()">🏠 ساخت اتاق جدید</button>
<div class="div">یا وارد اتاق شو</div>
<div class="jb">
<input type="text" id="i-code" class="fi" placeholder="کد ۶ رقمی" maxlength="6" style="text-align:center;letter-spacing:4px;font-size:22px">
<button class="btn bg" onclick="joinRoom()" style="margin:0">🚪 ورود</button>
</div>
</div>
<div class="ver">نسخه ۱.۰ | ساخته شده با ❤️</div>
</div>

<!-- LOADING -->
<div id="s-load" class="scr">
<div class="grad" style="justify-content:center;align-items:center;min-height:100vh">
<div class="spin"></div>
<p class="lt" id="l-txt">در حال اتصال...</p>
</div>
</div>

<!-- ROOM -->
<div id="s-room" class="scr">
<div class="grad" style="padding-top:50px">
<div class="rh"><button class="bb" onclick="leaveRoom()">✕</button><h2>اتاق بازی</h2></div>
</div>
<div class="rb">
<div class="rcb">
<div class="rcl">کد اتاق</div>
<div class="rcc" id="d-code">------</div>
<button class="btn bs bp" onclick="copyCode()">📋 کپی</button>
</div>
<div class="pc"><span id="pc-txt">۱ بازیکن</span></div>
<div class="pcl" id="pl-list"></div>
<div class="wt" id="w-txt">منتظر شروع بازی...</div>
<button class="btn bg bst" id="b-start" onclick="startGame()" style="display:none">▶ شروع بازی</button>
</div>
</div>

<!-- GAME -->
<div id="s-game" class="scr">
<div class="gt">
<div class="gtr">
<div class="gr"><div class="gl">دور</div><div class="gn" id="g-round">۱ از ۵</div></div>
<div class="glt" id="g-letter">ب</div>
<div class="gtm" id="g-timer"><span>⏱</span><span id="t-txt">۶۰</span></div>
</div>
</div>
<div class="gb" id="ans-box"></div>
<div class="gf"><button class="btn bp" id="b-sub" onclick="submitAnswers()">ثبت جواب‌ها ✓</button></div>
</div>

<!-- WAITING -->
<div id="s-wait" class="scr">
<div class="grad" style="justify-content:center;align-items:center;min-height:100vh;padding:20px">
<div class="wcb">
<div class="we">📱</div>
<h2>جواب‌هات ثبت شد!</h2>
<p>منتظر بقیه بازیکن‌ها...</p>
<div class="pbb"><div class="pbf" id="w-pf" style="width:0%"></div></div>
<p id="w-ct" style="margin-top:12px">۰ از ۰</p>
</div>
</div>
</div>

<!-- RESULTS -->
<div id="s-res" class="scr">
<div class="grad" style="padding-top:50px">
<h2 class="rtt" id="r-title">نتایج دور ۱</h2>
<p class="rts" id="r-sub">حرف: ب</p>
</div>
<div class="rb2">
<div class="rc" id="r-pl"></div>
<div class="rc">
<button class="db" onclick="togDet()">مشاهده جزئیات ▼</button>
<table class="dt" id="d-tab"></table>
</div>
</div>
<div class="rf">
<button class="btn ba" id="b-nxt" onclick="nextRound()">دور بعدی ▶</button>
</div>
</div>

<!-- FINAL -->
<div id="s-fin" class="scr">
<div class="grad-gold">
<div class="fc">🏆</div>
<h1 class="fw" id="f-win">برنده</h1>
<p class="fs" id="f-sub"></p>
</div>
<div class="fb">
<div class="rc" id="f-pl" style="width:100%;max-width:400px"></div>
<button class="btn bp" onclick="playAgain()" style="width:100%;max-width:400px">🔄 بازی دوباره</button>
<button class="btn bo" onclick="goHome()" style="width:100%;max-width:400px;margin-top:8px">🏠 خانه</button>
</div>
</div>

<div id="toast" class="toast hi"></div>

<script>
// ============ CONFIG ============
const CLRS=['#667eea','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
const PHS={name:'مثلاً: علی، مریم',family:'مثلاً: احمدی',city:'مثلاً: اصفهان',country:'مثلاً: ژاپن',food:'مثلاً: قورمه‌سبزی',animal:'مثلاً: گربه'};

// ============ STATE ============
let sk=null,myId='',rCode='',myName='',isHost=false;
let cats=[],cLetter='',cRound=1,mRounds=5,tPer=60,tLeft=60,tInt=null;
let plrs={},aResults=[],tScores={},aSubmitted=false;

// ============ HELPERS ============
const pn=n=>String(n).replace(/\\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const $=id=>document.getElementById(id);
const show=id=>{document.querySelectorAll('.scr').forEach(s=>s.classList.remove('on'));$(id).classList.add('on')};
const toast=msg=>{const t=$('toast');t.textContent=msg;t.className='toast sh';setTimeout(()=>t.className='toast hi',3000)};

// ============ SOCKET ============
function connect(){
  sk=io({transports:['websocket','polling'],reconnection:true,reconnectionAttempts:10});
  sk.on('connect',()=>{myId=sk.id;console.log('Connected:',myId)});
  sk.on('disconnect',()=>toast('اتصال قطع شد! در حال اتصال مجدد...'));
  sk.on('room_created',d=>{rCode=d.code;isHost=true;show('s-room');updRoom()});
  sk.on('room_joined',d=>{rCode=d.code;isHost=false;show('s-room');updRoom()});
  sk.on('room_update',d=>{plrs=d.players||{};updRoom()});
  sk.on('error',d=>{toast(d.message);goHome()});
  sk.on('game_started',d=>{
    cLetter=d.letter;cRound=d.round;mRounds=d.maxRounds;tPer=d.timePerRound;
    cats=d.categories;plrs=d.players||{};aSubmitted=false;tLeft=tPer;showGame()
  });
  sk.on('new_round',d=>{
    cLetter=d.letter;cRound=d.round;mRounds=d.maxRounds;tPer=d.timePerRound;
    cats=d.categories;aSubmitted=false;tLeft=tPer;showGame()
  });
  sk.on('answers_received',()=>{});
  sk.on('answers_progress',d=>{
    $('w-pf').style.width=((d.submitted/d.total)*100)+'%';
    $('w-ct').textContent=pn(d.submitted)+' از '+pn(d.total)+' بازیکن جواب دادن'
  });
  sk.on('round_results',d=>{
    clearInterval(tInt);aResults.push(d.results);tScores=d.totalScores;cRound=d.round;cLetter=d.letter;
    showRes(d.results,d.totalScores)
  });
  sk.on('game_finished',d=>{clearInterval(tInt);tScores=d.totalScores;plrs=d.players;showFin()});
}

// ============ HOME ============
function createRoom(){
  myName=$('i-name').value.trim();
  if(!myName){toast('لطفاً اسمت رو بنویس!');return}
  localStorage.setItem('esm_name',myName);
  show('s-load');$('l-txt').textContent='در حال ساخت اتاق...';
  sk.emit('create_room',{playerName:myName})
}
function joinRoom(){
  myName=$('i-name').value.trim();const code=$('i-code').value.trim().toUpperCase();
  if(!myName){toast('لطفاً اسمت رو بنویس!');return}
  if(!code||code.length<4){toast('لطفاً کد اتاق رو وارد کن!');return}
  localStorage.setItem('esm_name',myName);rCode=code;
  show('s-load');$('l-txt').textContent='در حال ورود به اتاق...';
  sk.emit('join_room',{roomCode:code,playerName:myName})
}
function goHome(){clearInterval(tInt);rCode='';myName='';isHost=false;plrs={};show('s-home')}

// ============ ROOM ============
function updRoom(){
  $('d-code').textContent=rCode;
  const pArr=Object.values(plrs);
  $('pc-txt').textContent=pn(pArr.length)+' بازیکن';
  let h='';
  pArr.forEach((p,i)=>{
    const cl=CLRS[i%CLRS.length];
    const isMe=p.id===myId;
    const isH=p.id===Object.keys(plrs)[0];
    h+=\`<div class="pi">
      <div class="pia" style="background:\${cl}">\${p.name.charAt(0)}</div>
      <div class="pii">
        <div class="pin">\${p.name}\${isMe?' (شما)':''}</div>
        <div>
          \${isH?'<span class="badge bh">میزبان</span>':''}
          <span class="badge br">آماده ✓</span>
        </div>
      </div>
    </div>\`;
  });
  $('pl-list').innerHTML=h;
  if(isHost){
    $('b-start').style.display=pArr.length>=2?'block':'none';
    $('w-txt').textContent=pArr.length>=2?'بازیکن‌ها آماده‌ن! شروع کن':'منتظر بازیکن‌های بیشتر...'
  }else{
    $('b-start').style.display='none';
    $('w-txt').textContent='منتظر شروع بازی توسط میزبان...'
  }
}
function copyCode(){
  navigator.clipboard.writeText(rCode).then(()=>toast('کد کپی شد: '+rCode)).catch(()=>toast('کد: '+rCode))
}
function startGame(){sk.emit('start_game',{roomCode:rCode})}
function leaveRoom(){if(rCode)sk.emit('leave_room',{roomCode:rCode});goHome()}

// ============ GAME ============
function showGame(){
  $('g-round').textContent='دور '+pn(cRound)+' از '+pn(mRounds);
  $('g-letter').textContent=cLetter;
  $('t-txt').textContent=pn(tLeft);
  $('g-timer').classList.remove('w');
  $('b-sub').disabled=false;$('b-sub').textContent='ثبت جواب‌ها ✓';
  const box=$('ans-box');box.innerHTML='';
  cats.forEach(cat=>{
    box.innerHTML+=\`<div class="ac">
      <div class="ach"><div class="aci">\${cat.icon}</div><div class="acl">\${cat.name}</div></div>
      <input type="text" class="ai" id="a_\${cat.id}" placeholder="\${PHS[cat.id]||''}" data-c="\${cat.id}" autocomplete="off">
    </div>\`;
  });
  document.querySelectorAll('.ai').forEach(inp=>{
    inp.addEventListener('input',e=>{
      const card=e.target.closest('.ac');
      if(card)card.classList.toggle('f',!!e.target.value.trim())
    })
  });
  show('s-game');startTimer();
  setTimeout(()=>{const f=$('a_'+cats[0].id);if(f)f.focus()},200)
}
function startTimer(){
  clearInterval(tInt);
  tInt=setInterval(()=>{
    tLeft--;$('t-txt').textContent=pn(tLeft);
    if(tLeft<=10)$('g-timer').classList.add('w');
    if(tLeft<=0){clearInterval(tInt);submitAnswers()}
  },1000)
}
function submitAnswers(){
  if(aSubmitted)return;aSubmitted=true;clearInterval(tInt);
  const ans={};
  cats.forEach(cat=>{const inp=$('a_'+cat.id);ans[cat.id]=inp?inp.value.trim():''});
  $('b-sub').disabled=true;$('b-sub').textContent='✓ ثبت شد';
  document.querySelectorAll('.ai').forEach(i=>i.disabled=true);
  sk.emit('submit_answers',{roomCode:rCode,answers:ans});
  setTimeout(()=>show('s-wait'),500)
}
function nextRound(){if(isHost)sk.emit('next_round',{roomCode:rCode})}

// ============ RESULTS ============
function showRes(results,scores){
  $('r-title').textContent='نتایج دور '+pn(cRound);
  $('r-sub').textContent='حرف: '+cLetter;
  const sorted=Object.keys(plrs).sort((a,b)=>(scores[b]||0)-(scores[a]||0));
  let h='';
  sorted.forEach((pid,i)=>{
    const p=plrs[pid];if(!p)return;
    const rc=i<3?'r'+(i+1):'ro';
    const cl=CLRS[i%CLRS.length];
    const rs=results[pid]?.total||0;
    h+=\`<div class="rp">
      <div class="rpi">
        <div class="rk \${rc}">\${pn(i+1)}</div>
        <div class="ra2" style="background:\${cl}">\${p.name.charAt(0)}</div>
        <div><div class="rn">\${p.name}</div><div class="rtl2">مجموع: \${pn(scores[pid]||0)}</div></div>
      </div>
      <div class="rsc">\${pn(rs)}</div>
    </div>\`;
  });
  $('r-pl').innerHTML=h;
  let th='<tr><th>دسته‌بندی</th>';
  sorted.forEach(pid=>{if(plrs[pid])th+='<th>'+plrs[pid].name+'</th>'});
  th+='</tr>';
  if(cats.length>0&&results[sorted[0]]){
    cats.forEach(cat=>{
      th+='<tr><td>'+cat.icon+' '+cat.name+'</td>';
      sorted.forEach(pid=>{
        const d=results[pid]?.details?.[cat.id]||{answer:'',score:0};
        th+='<td><span class="at2">'+(d.answer||'—')+'</span><span class="st2">+'+pn(d.score)+'</span></td>'
      });
      th+='</tr>'
    })
  }
  $('d-tab').innerHTML=th;
  if(cRound<mRounds){
    $('b-nxt').textContent='دور بعدی ▶';$('b-nxt').className='btn ba';
    $('b-nxt').onclick=()=>{if(isHost)sk.emit('next_round',{roomCode:rCode})}
  }else{
    $('b-nxt').textContent='🏆 نتایج نهایی';$('b-nxt').className='btn bg';
    $('b-nxt').onclick=()=>{if(isHost)sk.emit('finish_game',{roomCode:rCode});else showFin()}
  }
  show('s-res')
}
function togDet(){$('d-tab').classList.toggle('sh')}

// ============ FINAL ============
function showFin(){
  const sorted=Object.keys(plrs).sort((a,b)=>(tScores[b]||0)-(tScores[a]||0));
  const w=plrs[sorted[0]];
  $('f-win').textContent='🎉 '+(w?.name||'برنده')+' برنده شد!';
  $('f-sub').textContent=pn(tScores[sorted[0]]||0)+' امتیاز';
  const medals=['🥇','🥈','🥉',' ',' ',' ',' ',' '];
  let h='';
  sorted.forEach((pid,i)=>{
    const p=plrs[pid];if(!p)return;
    const cl=CLRS[i%CLRS.length];
    h+=\`<div class="fp">
      <span class="fm">\${medals[i]}</span>
      <div class="ra2" style="background:\${cl};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px">\${p.name.charAt(0)}</div>
      <span class="fn">\${p.name}</span>
      <span class="fsc">\${pn(tScores[pid]||0)}</span>
    </div>\`;
  });
  $('f-pl').innerHTML=h;
  show('s-fin');launchConfetti()
}
function playAgain(){if(isHost)sk.emit('play_again',{roomCode:rCode})}
function launchConfetti(){
  const em=['🎉','🎊','⭐','🌟','✨','🏆','🥇'];
  for(let i=0;i<30;i++){
    setTimeout(()=>{
      const c=document.createElement('div');c.className='cf';
      c.textContent=em[Math.floor(Math.random()*em.length)];
      c.style.left=Math.random()*100+'vw';
      c.style.animationDuration=(2+Math.random()*3)+'s';
      document.body.appendChild(c);setTimeout(()=>c.remove(),5000)
    },i*100)
  }
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded',()=>{
  const s=localStorage.getItem('esm_name');
  if(s)$('i-name').value=s;
  connect()
});
<\/script>
</body>
</html>`;

// ============ START ============
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🎮 Esm-Famil running on port ${PORT}`));
