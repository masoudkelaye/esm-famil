// ============ CONFIG ============
const SERVER_URL = 'https://YOUR-SERVER.onrender.com'; // ← بعداً عوض کن
const COLORS = ['#667eea','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
const PLACEHOLDERS = {
  name: 'مثلاً: علی، مریم',
  family: 'مثلاً: احمدی، رضایی',
  city: 'مثلاً: اصفهان، شیراز',
  country: 'مثلاً: ژاپن، آلمان',
  food: 'مثلاً: قورمه‌سبزی، کباب',
  animal: 'مثلاً: گربه، سگ',
  car: 'مثلاً: پراید، سمند',
  flower: 'مثلاً: رز، لاله',
  color: 'مثلاً: قرمز، آبی',
  fruit: 'مثلاً: سیب، پرتقال',
  object: 'مثلاً: کیف، کتاب',
};

// ============ STATE ============
let socket = null;
let myId = null;
let roomCode = '';
let myName = '';
let isHost = false;
let categories = [];
let currentLetter = '';
let currentRound = 1;
let maxRounds = 5;
let timePerRound = 60;
let timeLeft = 60;
let timerInterval = null;
let players = {};
let allResults = [];
let totalScores = {};
let answersSubmitted = false;

// ============ HELPERS ============
const pn = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const $ = id => document.getElementById(id);
const showScreen = id => {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
};
const toast = msg => {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show';
  setTimeout(() => t.className = 'toast hidden', 3000);
};

// ============ INIT ============
function init() {
  const savedName = localStorage.getItem('esm_name');
  if (savedName) $('input-name').value = savedName;
  
  // Connect to server
  connectSocket();
}

function connectSocket() {
  socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    myId = socket.id;
    console.log('Connected:', myId);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected');
    toast('اتصال قطع شد! در حال اتصال مجدد...');
  });

  socket.on('room_created', data => {
    roomCode = data.code;
    isHost = true;
    showScreen('screen-room');
    updateRoomUI();
  });

  socket.on('room_joined', data => {
    roomCode = data.code;
    isHost = false;
    showScreen('screen-room');
    updateRoomUI();
  });

  socket.on('room_update', data => {
    players = data.players || {};
    updateRoomUI();
  });

  socket.on('error', data => {
    toast(data.message);
    goHome();
  });

  socket.on('game_started', data => {
    currentLetter = data.letter;
    currentRound = data.round;
    maxRounds = data.maxRounds;
    timePerRound = data.timePerRound;
    categories = data.categories;
    players = data.players || {};
    answersSubmitted = false;
    timeLeft = timePerRound;
    showGameScreen();
  });

  socket.on('new_round', data => {
    currentLetter = data.letter;
    currentRound = data.round;
    maxRounds = data.maxRounds;
    timePerRound = data.timePerRound;
    categories = data.categories;
    answersSubmitted = false;
    timeLeft = timePerRound;
    showGameScreen();
  });

  socket.on('answers_received', () => {
    // Answers submitted successfully
  });

  socket.on('answers_progress', data => {
    $('wait-progress-fill').style.width = ((data.submitted / data.total) * 100) + '%';
    $('wait-count').textContent = `${pn(data.submitted)} از ${pn(data.total)} بازیکن جواب دادن`;
  });

  socket.on('round_results', data => {
    clearInterval(timerInterval);
    allResults.push(data.results);
    totalScores = data.totalScores;
    currentRound = data.round;
    currentLetter = data.letter;
    showResultsScreen(data.results, data.totalScores);
  });

  socket.on('game_finished', data => {
    clearInterval(timerInterval);
    totalScores = data.totalScores;
    players = data.players;
    showFinalScreen();
  });
}

// ============ HOME ============
function createRoom() {
  myName = $('input-name').value.trim();
  if (!myName) { toast('لطفاً اسمت رو بنویس!'); return; }
  localStorage.setItem('esm_name', myName);
  
  showScreen('screen-loading');
  $('loading-text').textContent = 'در حال ساخت اتاق...';
  
  socket.emit('create_room', { playerName: myName });
}

function joinRoom() {
  myName = $('input-name').value.trim();
  const code = $('input-code').value.trim().toUpperCase();
  if (!myName) { toast('لطفاً اسمت رو بنویس!'); return; }
  if (!code || code.length < 4) { toast('لطفاً کد اتاق رو وارد کن!'); return; }
  
  localStorage.setItem('esm_name', myName);
  roomCode = code;
  
  showScreen('screen-loading');
  $('loading-text').textContent = 'در حال ورود به اتاق...';
  
  socket.emit('join_room', { roomCode: code, playerName: myName });
}

function goHome() {
  clearInterval(timerInterval);
  roomCode = '';
  myName = '';
  isHost = false;
  players = {};
  showScreen('screen-home');
}

// ============ ROOM ============
function updateRoomUI() {
  $('display-code').textContent = roomCode;
  
  const playerArr = Object.values(players);
  $('player-count-text').textContent = `${pn(playerArr.length)} بازیکن`;
  
  // Players list
  let html = '';
  playerArr.forEach((p, i) => {
    const color = COLORS[i % COLORS.length];
    const isMe = p.id === myId;
    const isHostPlayer = p.id === Object.keys(players).find(pid => players[pid]?.isHost) || 
                          (isHost && i === 0);
    
    html += `
      <div class="player-item">
        <div class="player-item-avatar" style="background:${color}">${p.name.charAt(0)}</div>
        <div class="player-item-info">
          <div class="player-item-name">${p.name}${isMe ? ' (شما)' : ''}</div>
          <div>
            ${isHostPlayer ? '<span class="player-item-badge badge-host">میزبان</span>' : ''}
            <span class="player-item-badge badge-ready">آماده ✓</span>
          </div>
        </div>
      </div>
    `;
  });
  $('players-list').innerHTML = html;
  
  // Show start button only for host
  if (isHost) {
    $('btn-start').style.display = playerArr.length >= 2 ? 'block' : 'none';
    $('waiting-text').textContent = playerArr.length >= 2 ? 'بازیکن‌ها آماده‌ن! شروع کن' : 'منتظر بازیکن‌های بیشتر...';
  } else {
    $('btn-start').style.display = 'none';
    $('waiting-text').textContent = 'منتظر شروع بازی توسط میزبان...';
  }
}

function copyCode() {
  navigator.clipboard.writeText(roomCode).then(() => {
    toast('کد اتاق کپی شد: ' + roomCode);
  }).catch(() => {
    toast('کد: ' + roomCode);
  });
}

function startGame() {
  socket.emit('start_game', { roomCode });
}

function leaveRoom() {
  if (roomCode) socket.emit('leave_room', { roomCode });
  goHome();
}

// ============ GAME ============
function showGameScreen() {
  $('game-round').textContent = `دور ${pn(currentRound)} از ${pn(maxRounds)}`;
  $('game-letter').textContent = currentLetter;
  $('timer-text').textContent = pn(timeLeft);
  $('game-timer').classList.remove('warning');
  $('btn-submit').disabled = false;
  $('btn-submit').textContent = 'ثبت جواب‌ها ✓';
  
  const container = $('answers-container');
  container.innerHTML = '';
  
  categories.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'answer-card';
    card.innerHTML = `
      <div class="answer-card-header">
        <div class="answer-card-icon">${cat.icon}</div>
        <div class="answer-card-label">${cat.name}</div>
      </div>
      <input type="text" class="answer-input" id="ans_${cat.id}"
             placeholder="${PLACEHOLDERS[cat.id] || ''}"
             data-cat="${cat.id}" autocomplete="off" autocapitalize="off">
    `;
    container.appendChild(card);
  });
  
  // Input listener
  document.querySelectorAll('.answer-input').forEach(input => {
    input.addEventListener('input', e => {
      const card = e.target.closest('.answer-card');
      if (card) card.classList.toggle('filled', !!e.target.value.trim());
    });
  });
  
  showScreen('screen-game');
  startTimer();
  
  // Focus first input
  setTimeout(() => {
    const first = $('ans_' + categories[0].id);
    if (first) first.focus();
  }, 200);
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    $('timer-text').textContent = pn(timeLeft);
    
    if (timeLeft <= 10) {
      $('game-timer').classList.add('warning');
    }
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      submitAnswers();
    }
  }, 1000);
}

function submitAnswers() {
  if (answersSubmitted) return;
  answersSubmitted = true;
  clearInterval(timerInterval);
  
  const answers = {};
  categories.forEach(cat => {
    const input = $('ans_' + cat.id);
    answers[cat.id] = input ? input.value.trim() : '';
  });
  
  $('btn-submit').disabled = true;
  $('btn-submit').textContent = '✓ ثبت شد';
  
  // Disable inputs
  document.querySelectorAll('.answer-input').forEach(inp => inp.disabled = true);
  
  socket.emit('submit_answers', { roomCode, answers });
  
  // Show waiting screen after brief delay
  setTimeout(() => {
    showScreen('screen-waiting');
    $('wait-progress-fill').style.width = '0%';
    $('wait-count').textContent = 'در حال انتظار...';
  }, 500);
}

function nextRound() {
  if (isHost) {
    socket.emit('next_round', { roomCode });
  }
}

// ============ RESULTS ============
function showResultsScreen(results, scores) {
  $('results-title').textContent = `نتایج دور ${pn(currentRound)}`;
  $('results-letter').textContent = `حرف: ${currentLetter}`;
  
  const sorted = Object.keys(players).sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
  
  let html = '';
  sorted.forEach((pid, i) => {
    const p = players[pid];
    if (!p) return;
    const rc = i < 3 ? `rank-${i+1}` : 'rank-other';
    const color = COLORS[sorted.indexOf(pid) % COLORS.length];
    const roundScore = results[pid]?.total || 0;
    
    html += `
      <div class="result-player">
        <div class="result-player-info">
          <div class="result-rank ${rc}">${pn(i+1)}</div>
          <div class="result-avatar" style="background:${color}">${p.name.charAt(0)}</div>
          <div>
            <div class="result-name">${p.name}</div>
            <div class="result-total">مجموع: ${pn(scores[pid] || 0)}</div>
          </div>
        </div>
        <div class="result-score">${pn(roundScore)}</div>
      </div>
    `;
  });
  $('result-players').innerHTML = html;
  
  // Details table
  let thtml = '<tr><th>دسته‌بندی</th>';
  sorted.forEach(pid => {
    if (players[pid]) thtml += `<th>${players[pid].name}</th>`;
  });
  thtml += '</tr>';
  
  if (categories.length > 0 && results[sorted[0]]) {
    categories.forEach(cat => {
      thtml += `<tr><td>${cat.icon} ${cat.name}</td>`;
      sorted.forEach(pid => {
        const detail = results[pid]?.details?.[cat.id] || { answer: '', score: 0 };
        thtml += `<td><span class="answer-text">${detail.answer || '—'}</span><span class="score-text">+${pn(detail.score)}</span></td>`;
      });
      thtml += '</tr>';
    });
  }
  $('details-table').innerHTML = thtml;
  
  // Next round or finish
  if (currentRound < maxRounds) {
    $('btn-next-round').textContent = 'دور بعدی ▶';
    $('btn-next-round').className = 'btn btn-amber';
    $('btn-next-round').onclick = () => {
      if (isHost) socket.emit('next_round', { roomCode });
    };
  } else {
    $('btn-next-round').textContent = '🏆 نتایج نهایی';
    $('btn-next-round').className = 'btn btn-green';
    $('btn-next-round').onclick = () => {
      if (isHost) socket.emit('finish_game', { roomCode });
      else showFinalScreen();
    };
  }
  
  showScreen('screen-results');
}

function toggleDetails() {
  $('details-table').classList.toggle('show');
}

// ============ FINAL ============
function showFinalScreen() {
  const sorted = Object.keys(players).sort((a, b) => (totalScores[b] || 0) - (totalScores[a] || 0));
  const winner = players[sorted[0]];
  
  $('final-winner').textContent = `🎉 ${winner?.name || 'برنده'} برنده شد!`;
  $('final-sub').textContent = `${pn(totalScores[sorted[0]] || 0)} امتیاز`;
  
  let html = '';
  const medals = ['🥇','🥈','🥉',' ',' ',' ',' ',' '];
  sorted.forEach((pid, i) => {
    const p = players[pid];
    if (!p) return;
    const color = COLORS[i % COLORS.length];
    html += `
      <div class="final-player">
        <span class="final-medal">${medals[i]}</span>
        <div class="result-avatar" style="background:${color};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px;">${p.name.charAt(0)}</div>
        <span class="final-name">${p.name}</span>
        <span class="final-score">${pn(totalScores[pid] || 0)}</span>
      </div>
    `;
  });
  $('final-players').innerHTML = html;
  
  if (isHost) {
    $('btn-next-round')?.remove();
  }
  
  showScreen('screen-final');
  launchConfetti();
}

function playAgain() {
  if (isHost) {
    socket.emit('play_again', { roomCode });
  }
}

// ============ CONFETTI ============
function launchConfetti() {
  const emojis = ['🎉','🎊','⭐','🌟','✨','🏆','🥇'];
  for (let i = 0; i < 30; i++) {
    setTimeout(() => {
      const conf = document.createElement('div');
      conf.className = 'confetti';
      conf.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      conf.style.left = Math.random() * 100 + 'vw';
      conf.style.animationDuration = (2 + Math.random() * 3) + 's';
      document.body.appendChild(conf);
      setTimeout(() => conf.remove(), 5000);
    }, i * 100);
  }
}

// ============ START ============
document.addEventListener('DOMContentLoaded', init);
