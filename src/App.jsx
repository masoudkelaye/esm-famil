import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { CATS, CLRS, SERVER_URL, loadHistory, pn, saveHistoryEntry } from './lib/constants';

const SCREENS = {
  LANDING: 'landing',
  HOME: 'home',
  ROOM: 'room',
  GAME: 'game',
  WAIT: 'wait',
  RESULTS: 'results',
  FINAL: 'final',
  HISTORY: 'history',
};

function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2500);
}

export default function App() {
  const [screen, setScreen] = useState(SCREENS.LANDING);
  const [name, setName] = useState(() => localStorage.getItem('esm_name') || '');
  const [guestName, setGuestName] = useState(() => {
    const s = localStorage.getItem('esm_name') || '';
    return s.startsWith('مهمان_') ? '' : s;
  });
  const [conn, setConn] = useState('connecting');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [token, setToken] = useState(() => localStorage.getItem('esm_token') || '');
  const [myId, setMyId] = useState('');
  const [hostId, setHostId] = useState('');
  const [players, setPlayers] = useState({});
  const [selectedCats, setSelectedCats] = useState(() => new Set(CATS.map((c) => c.id)));
  const [timePerRound, setTimePerRound] = useState(90);
  const [maxRounds, setMaxRounds] = useState(5);
  const [categories, setCategories] = useState([]);
  const [letter, setLetter] = useState('');
  const [round, setRound] = useState(1);
  const [tLeft, setTLeft] = useState(90);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState({});
  const [totalScores, setTotalScores] = useState({});
  const [readyPlayers, setReadyPlayers] = useState({});
  const [history, setHistory] = useState(() => loadHistory());
  const [progress, setProgress] = useState({ submitted: 0, total: 0 });
  const [showInstall, setShowInstall] = useState(false);
  const [shareLink, setShareLink] = useState('');

  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const finFallbackRef = useRef(null);
  const deferredPromptRef = useRef(null);
  const answersRef = useRef({});
  const nameRef = useRef(name);
  const myIdRef = useRef(myId);
  const roomRef = useRef(roomCode);
  const roundRef = useRef(round);
  const maxRoundsRef = useRef(maxRounds);
  const letterRef = useRef(letter);
  const playersRef = useRef(players);
  const totalScoresRef = useRef(totalScores);
  const screenRef = useRef(screen);

  useEffect(() => { nameRef.current = name; }, [name]);
  useEffect(() => { myIdRef.current = myId; }, [myId]);
  useEffect(() => { roomRef.current = roomCode; }, [roomCode]);
  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { maxRoundsRef.current = maxRounds; }, [maxRounds]);
  useEffect(() => { letterRef.current = letter; }, [letter]);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { totalScoresRef.current = totalScores; }, [totalScores]);
  useEffect(() => { screenRef.current = screen; }, [screen]);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const isHost = hostId && myId && hostId === myId;

  const persistSession = useCallback((code, tok) => {
    if (code) localStorage.setItem('esm_room', code);
    if (tok) localStorage.setItem('esm_token', tok);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem('esm_room');
    localStorage.removeItem('esm_token');
  }, []);

  const goFinal = useCallback((payload = {}) => {
    clearTimeout(finFallbackRef.current);
    const ts = payload.totalScores || totalScoresRef.current || {};
    const pls = payload.players || playersRef.current || {};
    setTotalScores(ts);
    if (payload.players) setPlayers(payload.players);
    if (payload.lastResults) setResults(payload.lastResults);

    // Save history immediately
    const ids = [...new Set([...Object.keys(pls), ...Object.keys(ts)])];
    ids.sort((a, b) => (ts[b] || 0) - (ts[a] || 0));
    const winner = ids[0] && pls[ids[0]] ? pls[ids[0]].name : '';
    const entry = {
      date: new Date().toLocaleDateString('fa-IR'),
      time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      letter: letterRef.current || '',
      round: maxRoundsRef.current || 0,
      playerNames: ids.map((id) => (pls[id] && pls[id].name) || '').filter(Boolean).join('، '),
      myScore: ts[myIdRef.current] || 0,
      myName: nameRef.current || '',
      winner,
    };
    const h = saveHistoryEntry(entry);
    setHistory(h);

    setScreen(SCREENS.FINAL);
  }, []);

  // Socket setup — once
  useEffect(() => {
    const sk = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 50,
      reconnectionDelay: 1000,
    });
    socketRef.current = sk;

    sk.on('connect', () => {
      setMyId(sk.id);
      setConn('ok');
      const savedRoom = localStorage.getItem('esm_room');
      const savedTok = localStorage.getItem('esm_token');
      const urlRoom = new URLSearchParams(window.location.search).get('room');
      if (savedRoom && savedTok && !urlRoom) {
        sk.emit('rejoin_room', { roomCode: savedRoom, token: savedTok });
      }
    });
    sk.on('disconnect', () => setConn('bad'));
    sk.on('connect_error', () => setConn('bad'));

    sk.on('error', (d) => toast(d.message || 'خطا'));

    sk.on('room_created', (d) => {
      setRoomCode(d.code);
      setToken(d.token);
      setHostId(d.hostId || sk.id);
      persistSession(d.code, d.token);
      setShareLink(`${location.origin}${location.pathname}?room=${d.code}`);
      setScreen(SCREENS.ROOM);
    });
    sk.on('room_joined', (d) => {
      setRoomCode(d.code);
      setToken(d.token);
      setHostId(d.hostId || '');
      persistSession(d.code, d.token);
      setShareLink(`${location.origin}${location.pathname}?room=${d.code}`);
      setScreen(SCREENS.ROOM);
    });
    sk.on('rejoin_success', (d) => {
      setRoomCode(d.code);
      setHostId(d.hostId || '');
      setPlayers(d.players || {});
      setCategories(d.categories || []);
      setTotalScores(d.totalScores || {});
      setResults(d.lastResults || {});
      setRound(d.round || 1);
      setMaxRounds(d.maxRounds || 5);
      setTimePerRound(d.timePerRound || 90);
      setLetter(d.currentLetter || '');
      if (d.state === 'playing') {
        // restore mid-round
        setSubmitted(false);
        setAnswers({});
        setScreen(SCREENS.GAME);
        startTimer(d.timePerRound || 90);
      } else if (d.state === 'waiting_next') {
        setScreen(SCREENS.RESULTS);
      } else if (d.state === 'finished') {
        goFinal({ totalScores: d.totalScores, players: d.players, lastResults: d.lastResults });
      } else {
        setScreen(SCREENS.ROOM);
      }
    });
    sk.on('rejoin_failed', () => {
      clearSession();
      toast('ورود مجدد ناموفق');
    });

    sk.on('room_update', (d) => {
      setPlayers(d.players || {});
      if (d.hostId) setHostId(d.hostId);
      if (d.code) setRoomCode(d.code);
    });

    sk.on('game_started', (d) => onNewRound(d, true));
    sk.on('new_round', (d) => onNewRound(d, false));

    sk.on('first_submit', (d) => {
      toast(`${d.playerName} ثبت کرد — در حال ارسال...`);
      // auto-submit current answers if still on game
      if (screenRef.current === SCREENS.GAME && !answersRef.current.__done) {
        doSubmit(true);
      }
    });
    sk.on('submit_ack', () => {
      setScreen(SCREENS.WAIT);
    });
    sk.on('answers_progress', (d) => setProgress(d));

    sk.on('round_results', (d) => {
      clearInterval(timerRef.current);
      setResults(d.results || {});
      setTotalScores(d.totalScores || {});
      if (d.players) setPlayers(d.players);
      setRound(d.round || roundRef.current);
      setLetter(d.letter || letterRef.current);
      setMaxRounds(d.maxRounds || maxRoundsRef.current);
      setReadyPlayers(d.readyPlayers || {});
      setSubmitted(false);
      setScreen(SCREENS.RESULTS);
    });

    sk.on('ready_update', (d) => setReadyPlayers(d.readyPlayers || {}));
    sk.on('scores_updated', (d) => {
      setTotalScores(d.totalScores || {});
      toast('امتیازها به‌روز شد');
    });

    sk.on('game_finished', (d) => {
      clearInterval(timerRef.current);
      goFinal(d || {});
    });

    sk.on('chat_message', () => {});
    sk.on('reaction_received', () => {});

    function onNewRound(d, isFirst) {
      clearInterval(timerRef.current);
      setLetter(d.letter);
      setRound(d.round);
      setMaxRounds(d.maxRounds);
      setTimePerRound(d.timePerRound);
      setCategories(d.categories || []);
      setAnswers({});
      answersRef.current = {};
      setSubmitted(false);
      setProgress({ submitted: 0, total: 0 });
      setScreen(SCREENS.GAME);
      startTimer(d.timePerRound);
    }

    function startTimer(sec) {
      clearInterval(timerRef.current);
      setTLeft(sec);
      let left = sec;
      timerRef.current = setInterval(() => {
        left -= 1;
        setTLeft(left);
        if (left <= 0) {
          clearInterval(timerRef.current);
          doSubmit(true);
        }
      }, 1000);
    }

    function doSubmit(auto) {
      if (answersRef.current.__done) return;
      answersRef.current.__done = true;
      setSubmitted(true);
      clearInterval(timerRef.current);
      const ans = { ...answersRef.current };
      delete ans.__done;
      // stash for display recovery
      try {
        localStorage.setItem(
          'esm_last_answers',
          JSON.stringify({
            name: nameRef.current,
            answers: ans,
            letter: letterRef.current,
            round: roundRef.current,
          })
        );
      } catch (e) {}
      sk.emit('submit_answers', { roomCode: roomRef.current, answers: ans });
      setScreen(SCREENS.WAIT);
    }

    // expose submit for UI
    socketRef.current._doSubmit = () => doSubmit(false);
    socketRef.current._startTimer = startTimer;

    // PWA install
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        try {
          if (sessionStorage.getItem('esm_install_dismissed') === '1') return;
        } catch (e) {}
        setTimeout(() => setShowInstall(true), 1500);
      }
    });
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      if (!window.navigator.standalone) {
        try {
          if (sessionStorage.getItem('esm_install_dismissed') !== '1') {
            setTimeout(() => setShowInstall(true), 2000);
          }
        } catch (e) {}
      }
    }

    // URL room invite
    const urlRoom = new URLSearchParams(window.location.search).get('room');
    if (urlRoom) setJoinCode(urlRoom.toUpperCase());

    return () => {
      clearInterval(timerRef.current);
      sk.disconnect();
    };
  }, [clearSession, goFinal, persistSession]);

  const loginGuest = () => {
    const n = (guestName || '').trim();
    if (!n) {
      toast('لطفاً اسمت را بنویس!');
      return;
    }
    setName(n);
    localStorage.setItem('esm_name', n);
    setScreen(SCREENS.HOME);
  };

  const createRoom = () => {
    const n = name.trim() || guestName.trim();
    if (!n) {
      toast('اسم لازم است');
      return;
    }
    setName(n);
    localStorage.setItem('esm_name', n);
    const cats = CATS.filter((c) => selectedCats.has(c.id)).map((c) => ({
      id: c.id,
      name: c.n,
      icon: c.i,
    }));
    socketRef.current.emit('create_room', {
      playerName: n,
      categories: cats,
      maxRounds,
      timePerRound,
    });
  };

  const joinRoom = () => {
    const n = name.trim() || guestName.trim();
    const code = (joinCode || '').trim().toUpperCase();
    if (!n) {
      toast('اسم لازم است');
      return;
    }
    if (code.length < 4) {
      toast('کد اتاق را وارد کن');
      return;
    }
    setName(n);
    localStorage.setItem('esm_name', n);
    socketRef.current.emit('join_room', { roomCode: code, playerName: n });
  };

  const startGame = () => {
    if (!isHost) return;
    const cats = CATS.filter((c) => selectedCats.has(c.id)).map((c) => ({
      id: c.id,
      name: c.n,
      icon: c.i,
    }));
    socketRef.current.emit('start_game', {
      roomCode,
      categories: cats,
      maxRounds,
      timePerRound,
    });
  };

  const onAnswerChange = (catId, val) => {
    setAnswers((prev) => {
      const next = { ...prev, [catId]: val };
      answersRef.current = next;
      return next;
    });
  };

  const submitAnswers = () => {
    if (socketRef.current._doSubmit) socketRef.current._doSubmit();
  };

  const forceNext = () => {
    if (!isHost) return;
    const last = round >= maxRounds;
    socketRef.current.emit('next_round', { roomCode });
    if (last) {
      clearTimeout(finFallbackRef.current);
      finFallbackRef.current = setTimeout(() => {
        if (screenRef.current !== SCREENS.FINAL) {
          toast('نمایش نتیجه نهایی...');
          goFinal({ totalScores: totalScoresRef.current, players: playersRef.current, lastResults: results });
        }
      }, 2500);
    }
  };

  const sendReady = () => {
    socketRef.current.emit('player_ready', { roomCode });
    setReadyPlayers((p) => ({ ...p, [myId]: true }));
  };

  const leaveRoom = () => {
    if (roomCode && socketRef.current) {
      socketRef.current.emit('leave_room', { roomCode });
    }
    clearSession();
    setRoomCode('');
    setToken('');
    setPlayers({});
    setScreen(SCREENS.HOME);
  };

  const filledCount = useMemo(() => {
    return categories.filter((c) => (answers[c.id] || '').trim()).length;
  }, [answers, categories]);

  // Merge local stash into results for display (host answer recovery)
  const displayResults = useMemo(() => {
    const r = { ...results };
    try {
      const stash = JSON.parse(localStorage.getItem('esm_last_answers') || 'null');
      if (stash && stash.answers && stash.round === round) {
        const myPid =
          Object.keys(players).find((pid) => players[pid]?.name === name) || myId;
        if (myPid) {
          if (!r[myPid]) r[myPid] = { total: 0, details: {} };
          if (!r[myPid].details) r[myPid].details = {};
          categories.forEach((cat) => {
            const cur = r[myPid].details[cat.id];
            if ((!cur || !cur.answer) && stash.answers[cat.id]) {
              r[myPid].details[cat.id] = {
                answer: stash.answers[cat.id],
                score: (cur && cur.score) || 0,
                invalid: (cur && cur.invalid) || false,
              };
            }
          });
        }
      }
    } catch (e) {}
    return r;
  }, [results, players, name, myId, categories, round]);

  const sortedIds = useMemo(() => {
    const ids = [...new Set([...Object.keys(players), ...Object.keys(totalScores)])];
    return ids.sort((a, b) => (totalScores[b] || 0) - (totalScores[a] || 0));
  }, [players, totalScores]);

  /* ---------- RENDER ---------- */
  return (
    <>
      <div className={`conn-bar ${conn === 'bad' ? 'show bad' : ''}`}>
        ⚠️ اتصال قطع — در حال تلاش مجدد...
      </div>
      <div id="toast" className="toast" />

      {/* LANDING */}
      <div className={`screen ${screen === SCREENS.LANDING ? 'on' : ''}`}>
        <div className="center-wrap">
          <div className="logo">🎮</div>
          <div className="h1">اسم فامیل</div>
          <div className="sub">ONLINE MULTIPLAYER</div>
          <div className="card glass">
            <label>👤 اسمت را بنویس</label>
            <input
              className="input"
              value={guestName}
              maxLength={20}
              placeholder="مثلاً: سارا"
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loginGuest()}
            />
            <div style={{ height: 12 }} />
            <button className="btn btn-primary" onClick={loginGuest}>
              ورود به بازی
            </button>
            {joinCode && (
              <>
                <div className="div">📩 دعوت‌نامه: {joinCode}</div>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    loginGuest();
                    setTimeout(joinRoom, 100);
                  }}
                >
                  ورود به اتاق {joinCode}
                </button>
              </>
            )}
          </div>
          <div className="ver">v5.0 · React</div>
        </div>
      </div>

      {/* HOME */}
      <div className={`screen ${screen === SCREENS.HOME ? 'on' : ''}`}>
        <div className="scroll">
          <div className="center-wrap" style={{ minHeight: 'auto', paddingTop: 40 }}>
            <div className="h1">سلام {name} 👋</div>
            <div className="sub">آماده بازی؟</div>
            <div className="card glass" style={{ marginBottom: 16 }}>
              <button className="btn btn-primary" onClick={createRoom}>
                🏠 ساخت اتاق جدید
              </button>
              <div className="div">یا</div>
              <label>کد اتاق</label>
              <input
                className="input"
                value={joinCode}
                placeholder="مثلاً ABC123"
                maxLength={8}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              />
              <div style={{ height: 10 }} />
              <button className="btn btn-ghost" onClick={joinRoom}>
                🚪 ورود به اتاق
              </button>
            </div>
            <button className="btn btn-ghost" style={{ maxWidth: 400 }} onClick={() => { setHistory(loadHistory()); setScreen(SCREENS.HISTORY); }}>
              📊 تاریخچه بازی‌ها
            </button>
            <button
              className="btn btn-danger"
              style={{ maxWidth: 400, marginTop: 8 }}
              onClick={() => {
                setName('');
                localStorage.removeItem('esm_name');
                setScreen(SCREENS.LANDING);
              }}
            >
              خروج
            </button>
          </div>
        </div>
      </div>

      {/* ROOM */}
      <div className={`screen ${screen === SCREENS.ROOM ? 'on' : ''}`}>
        <div className="room-header">
          <div className="g-meta">کد اتاق</div>
          <div className="room-code">{roomCode}</div>
          <div className="g-meta">{pn(Object.keys(players).length)} بازیکن</div>
        </div>
        <div className="scroll">
          {Object.values(players).map((p, i) => (
            <div className="player-row" key={p.id}>
              <div className="avatar" style={{ background: CLRS[i % CLRS.length] }}>
                {(p.name || '?')[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>
                  {p.name}
                  {p.id === myId ? ' (شما)' : ''}
                  {p.id === hostId ? ' 👑' : ''}
                </div>
              </div>
            </div>
          ))}

          {isHost && (
            <div className="glass" style={{ padding: 14, marginTop: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>دسته‌بندی‌ها</div>
              <div className="chip-grid">
                {CATS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`chip ${selectedCats.has(c.id) ? 'sel' : ''}`}
                    onClick={() => {
                      setSelectedCats((prev) => {
                        const n = new Set(prev);
                        if (n.has(c.id)) n.delete(c.id);
                        else n.add(c.id);
                        return n;
                      });
                    }}
                  >
                    {c.i} {c.n}
                  </button>
                ))}
              </div>
              <div style={{ fontWeight: 800, margin: '14px 0 8px' }}>زمان هر دور (ثانیه)</div>
              <div className="t-opts">
                {[30, 60, 90, 120].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`t-opt ${timePerRound === t ? 'sel' : ''}`}
                    onClick={() => setTimePerRound(t)}
                  >
                    {pn(t)}
                  </button>
                ))}
              </div>
              <div style={{ fontWeight: 800, margin: '14px 0 8px' }}>تعداد دور</div>
              <div className="t-opts">
                {[3, 5, 7, 10].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`t-opt ${maxRounds === r ? 'sel' : ''}`}
                    onClick={() => setMaxRounds(r)}
                  >
                    {pn(r)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {shareLink && (
            <div className="glass" style={{ padding: 14, marginTop: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--tl)', marginBottom: 6 }}>لینک دعوت</div>
              <input className="input" readOnly value={shareLink} onFocus={(e) => e.target.select()} />
              <button
                className="btn btn-ghost"
                style={{ marginTop: 8 }}
                onClick={() => {
                  navigator.clipboard?.writeText(shareLink);
                  toast('کپی شد!');
                }}
              >
                کپی لینک
              </button>
            </div>
          )}
        </div>
        <div className="footer-bar">
          {isHost ? (
            <button className="btn btn-primary" onClick={startGame} disabled={Object.keys(players).length < 2}>
              شروع بازی ▶
            </button>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--tl)', fontSize: 13 }}>منتظر شروع توسط میزبان...</div>
          )}
          <button className="btn btn-ghost" onClick={leaveRoom}>
            ترک اتاق
          </button>
        </div>
      </div>

      {/* GAME — fixed header layout */}
      <div className={`screen ${screen === SCREENS.GAME ? 'on' : ''}`}>
        <div className="game-screen">
          <header className="game-header">
            <div className="game-header-row">
              <div>
                <div className="g-meta">دور</div>
                <div className="g-round">
                  {pn(round)} از {pn(maxRounds)}
                </div>
              </div>
              <div className="g-letter">{letter}</div>
              <div className={`g-timer ${tLeft <= 10 ? 'warn' : ''}`}>
                <span>⏱</span>
                <span>{pn(tLeft)}</span>
              </div>
            </div>
          </header>
          <div className="game-progress">
            <div style={{ width: `${categories.length ? (filledCount / categories.length) * 100 : 0}%` }} />
          </div>
          <div className="game-body">
            {categories.map((cat) => (
              <div className="ans-card" key={cat.id}>
                <div className="label">
                  <span>{cat.icon || '📝'}</span>
                  <span>{cat.name}</span>
                </div>
                <input
                  className="input"
                  value={answers[cat.id] || ''}
                  disabled={submitted}
                  placeholder={`${letter}...`}
                  onChange={(e) => onAnswerChange(cat.id, e.target.value)}
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
          <footer className="game-footer">
            <button
              className="btn btn-primary"
              disabled={submitted || filledCount < categories.length}
              onClick={submitAnswers}
            >
              {submitted ? '✓ ثبت شد' : filledCount >= categories.length ? 'ثبت جواب‌ها ✓' : `${pn(filledCount)} از ${pn(categories.length)}`}
            </button>
          </footer>
        </div>
      </div>

      {/* WAIT */}
      <div className={`screen ${screen === SCREENS.WAIT ? 'on' : ''}`}>
        <div className="center-wrap">
          <div style={{ fontSize: 48 }}>⏳</div>
          <div className="h1" style={{ fontSize: 20, marginTop: 12 }}>
            جواب‌هات ثبت شد!
          </div>
          <div className="sub">
            {progress.total
              ? `${pn(progress.submitted)} از ${pn(progress.total)} نفر`
              : 'منتظر بقیه بازیکن‌ها...'}
          </div>
        </div>
      </div>

      {/* RESULTS */}
      <div className={`screen ${screen === SCREENS.RESULTS ? 'on' : ''}`}>
        <div className="room-header">
          <div className="h1" style={{ fontSize: 20 }}>
            نتایج دور {pn(round)}
          </div>
          <div className="sub">حرف: {letter}</div>
        </div>
        <div className="scroll">
          {sortedIds.map((pid, i) => {
            const p = players[pid] || { name: 'بازیکن' };
            const rs = (displayResults[pid] && displayResults[pid].total) || 0;
            return (
              <div className="rank-row" key={pid}>
                <div className="rank-left">
                  <div className={`rank-num ${i < 3 ? 'r' + (i + 1) : ''}`}>{pn(i + 1)}</div>
                  <div className="avatar" style={{ background: CLRS[i % CLRS.length] }}>
                    {(p.name || '?')[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{p.name}{pid === myId ? ' (شما)' : ''}</div>
                    <div style={{ fontSize: 11, color: 'var(--tl)' }}>مجموع: {pn(totalScores[pid] || 0)}</div>
                  </div>
                </div>
                <div className="score">+{pn(rs)}</div>
              </div>
            );
          })}

          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table className="detail-table">
              <thead>
                <tr>
                  <th>دسته</th>
                  {sortedIds.map((pid) => (
                    <th key={pid}>{(players[pid] && players[pid].name) || '—'}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td>
                      {cat.icon} {cat.name}
                    </td>
                    {sortedIds.map((pid) => {
                      const d =
                        (displayResults[pid] &&
                          displayResults[pid].details &&
                          displayResults[pid].details[cat.id]) ||
                        { answer: '', score: 0 };
                      return (
                        <td key={pid}>
                          <span className="ans-text">{d.answer || '—'}</span>
                          <span className={`ans-score ${d.invalid ? 'bad' : ''}`}>
                            {d.invalid ? 'نامعتبر' : `+${pn(d.score || 0)}`}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="footer-bar">
          {round < maxRounds ? (
            <>
              <button className="btn btn-ghost" onClick={sendReady} disabled={!!readyPlayers[myId]}>
                {readyPlayers[myId] ? '✅ آماده‌ای' : 'آماده‌ام برای دور بعد'}
              </button>
              {isHost && (
                <button className="btn btn-primary" onClick={forceNext}>
                  ⏩ شروع دور بعد
                </button>
              )}
            </>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={sendReady} disabled={!!readyPlayers[myId]}>
                {readyPlayers[myId] ? '✅ آماده‌ای' : 'آماده‌ام برای نتیجه نهایی'}
              </button>
              {isHost && (
                <button className="btn btn-primary" onClick={forceNext}>
                  🏁 پایان بازی و مشاهده نتیجه
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* FINAL */}
      <div className={`screen ${screen === SCREENS.FINAL ? 'on' : ''}`}>
        <div className="center-wrap" style={{ justifyContent: 'flex-start', paddingTop: 48 }}>
          <div style={{ fontSize: 48 }}>🏆</div>
          <div className="h1" style={{ fontSize: 22, marginTop: 8 }}>
            {sortedIds[0] && players[sortedIds[0]]
              ? `${players[sortedIds[0]].name} برنده شد!`
              : 'پایان بازی'}
          </div>
          <div className="sub">
            {sortedIds[0] ? `با ${pn(totalScores[sortedIds[0]] || 0)} امتیاز` : ''}
          </div>
          <div style={{ width: 'min(400px, 100%)', marginTop: 16 }}>
            {sortedIds.map((pid, i) => {
              const p = players[pid] || { name: 'بازیکن' };
              return (
                <div className="rank-row" key={pid}>
                  <div className="rank-left">
                    <div className={`rank-num ${i < 3 ? 'r' + (i + 1) : ''}`}>{pn(i + 1)}</div>
                    <div className="avatar" style={{ background: CLRS[i % CLRS.length] }}>
                      {(p.name || '?')[0]}
                    </div>
                    <div style={{ fontWeight: 700 }}>
                      {p.name}
                      {pid === myId ? ' (شما)' : ''}
                    </div>
                  </div>
                  <div className="score">{pn(totalScores[pid] || 0)}</div>
                </div>
              );
            })}
          </div>
          <button
            className="btn btn-primary"
            style={{ maxWidth: 400, marginTop: 20 }}
            onClick={() => {
              clearSession();
              setScreen(SCREENS.HOME);
            }}
          >
            بازگشت به خانه
          </button>
        </div>
      </div>

      {/* HISTORY */}
      <div className={`screen ${screen === SCREENS.HISTORY ? 'on' : ''}`}>
        <div className="room-header">
          <div className="h1" style={{ fontSize: 20 }}>تاریخچه</div>
        </div>
        <div className="scroll">
          {history.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--tl)', padding: 40 }}>
              هنوز بازی‌ای ثبت نشده!
              <br />
              <span style={{ fontSize: 12 }}>بعد از اتمام یک بازی اینجا می‌آید</span>
            </p>
          ) : (
            history.map((g, idx) => (
              <div className="glass" key={idx} style={{ padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--tl)' }}>
                    {g.date || '-'}
                    {g.time ? ` · ${g.time}` : ''}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--p2)' }}>🌐 آنلاین</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--tl)' }}>
                  حرف: {g.letter || '-'} | دور: {pn(g.round || 0)}
                </div>
                {g.winner && (
                  <div style={{ fontSize: 13, color: 'var(--a)', marginTop: 4 }}>🏆 {g.winner}</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--tl)' }}>{g.playerNames || '-'}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--p2)' }}>{pn(g.myScore || 0)}</span>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="footer-bar">
          <button className="btn btn-ghost" onClick={() => setScreen(SCREENS.HOME)}>
            بازگشت
          </button>
        </div>
      </div>

      {/* Install banner */}
      {showInstall && (
        <div className="install-banner">
          <span style={{ fontSize: 22 }}>📲</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>نصب اسم فامیل</div>
            <div style={{ fontSize: 10, color: 'var(--tl)' }}>دسترسی سریع مثل اپلیکیشن</div>
          </div>
          <button
            type="button"
            className="inst"
            onClick={async () => {
              if (deferredPromptRef.current) {
                deferredPromptRef.current.prompt();
                try {
                  await deferredPromptRef.current.userChoice;
                } catch (e) {}
                deferredPromptRef.current = null;
                setShowInstall(false);
              } else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
                toast('در Safari: Share → Add to Home Screen');
              } else {
                toast('از منوی مرورگر گزینه Install را بزن');
              }
            }}
          >
            نصب
          </button>
          <button
            type="button"
            className="x"
            onClick={() => {
              setShowInstall(false);
              try {
                sessionStorage.setItem('esm_install_dismissed', '1');
              } catch (e) {}
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
