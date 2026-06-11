/* ============================================================
   Gamification engine: XP/levels, streak, badges, confetti,
   sound, mascot. Exposed as window.Game.
   ============================================================ */
(function () {
  const GKEY = "mathenglish_game_v1";
  const SKEY = "mathenglish_progress_v1"; // main progress store (read for badges)

  const game = {
    data: Object.assign(
      { xp: 0, streak: 0, lastDay: null, badges: [], sound: true, quizPerfect: 0, examPass: 0 },
      JSON.parse(localStorage.getItem(GKEY) || "{}")
    ),
    save() { localStorage.setItem(GKEY, JSON.stringify(this.data)); }
  };

  // ---------- Levels ----------
  // Cumulative XP needed to *reach* level n (n>=1). Level 1 starts at 0 XP.
  function xpForLevel(n) { return n <= 1 ? 0 : 50 * (n - 1) * n; } // 0,100,300,600,1000...
  function levelFromXP(xp) { let n = 1; while (xpForLevel(n + 1) <= xp) n++; return n; }
  function levelInfo() {
    const xp = game.data.xp;
    const lvl = levelFromXP(xp);
    const base = xpForLevel(lvl), next = xpForLevel(lvl + 1);
    const into = xp - base, span = next - base;
    return { lvl, xp, into, span, pct: Math.round(into / span * 100), titleStr: titleFor(lvl) };
  }
  function titleFor(l) {
    if (l >= 12) return "Huyền thoại";
    if (l >= 9) return "Cao thủ";
    if (l >= 6) return "Học giả";
    if (l >= 4) return "Tài năng";
    if (l >= 2) return "Chăm học";
    return "Tân binh";
  }

  // ---------- Sound (WebAudio) ----------
  let actx = null;
  function ac() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return actx; }
  function tone(freq, dur, type, when, gain) {
    const ctx = ac(); if (!ctx || !game.data.sound) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    const t = ctx.currentTime + (when || 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain || .18, t + .02);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + .02);
  }
  const sound = {
    correct() { tone(660, .12, "triangle", 0, .2); tone(880, .18, "triangle", .1, .2); },
    wrong() { tone(220, .18, "square", 0, .12); tone(160, .22, "square", .12, .12); },
    levelup() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, "triangle", i * .1, .2)); },
    badge() { [784, 988, 1319].forEach((f, i) => tone(f, .2, "sine", i * .09, .2)); },
    click() { tone(440, .06, "sine", 0, .08); }
  };

  // ---------- Confetti ----------
  let cv, cx, parts = [], raf = null;
  function ensureCanvas() {
    cv = document.getElementById("confetti");
    if (!cv) return null;
    cx = cv.getContext("2d");
    resize();
    return cx;
  }
  function resize() { if (!cv) return; cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px"; cx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); }
  addEventListener("resize", () => { if (cv) resize(); });
  const COLORS = ["#16c47f", "#2ba8f0", "#ffcb2e", "#8b5cf6", "#ff5d73", "#34e29a"];
  function burst(opts) {
    opts = opts || {};
    if (!cx && !ensureCanvas()) return;
    const n = opts.count || 110;
    const ox = opts.x != null ? opts.x : innerWidth / 2;
    const oy = opts.y != null ? opts.y : innerHeight * .34;
    const spread = opts.spread || 14;
    for (let i = 0; i < n; i++) {
      const a = (Math.random() * Math.PI * 2);
      const sp = Math.random() * spread + 4;
      parts.push({
        x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6,
        g: .28 + Math.random() * .2, size: 6 + Math.random() * 7,
        rot: Math.random() * 6.28, vr: (Math.random() - .5) * .4,
        color: COLORS[(Math.random() * COLORS.length) | 0], life: 0, max: 90 + Math.random() * 50,
        shape: Math.random() < .35 ? "circle" : "rect"
      });
    }
    if (!raf) tick();
  }
  function tick() {
    raf = requestAnimationFrame(tick);
    cx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(p => p.life < p.max);
    if (!parts.length) { cancelAnimationFrame(raf); raf = null; cx.clearRect(0, 0, cv.width, cv.height); return; }
    for (const p of parts) {
      p.life++; p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.rot += p.vr;
      const alpha = p.life > p.max - 24 ? (p.max - p.life) / 24 : 1;
      cx.save(); cx.globalAlpha = Math.max(0, alpha); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillStyle = p.color;
      if (p.shape === "circle") { cx.beginPath(); cx.arc(0, 0, p.size / 2, 0, 6.3); cx.fill(); }
      else cx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * .6);
      cx.restore();
    }
  }

  // ---------- Toasts ----------
  function toast(ic, title, sub, accent) {
    const wrap = document.getElementById("toastWrap");
    if (!wrap) return;
    const el = document.createElement("div");
    el.className = "toast";
    if (accent) el.style.borderColor = accent;
    el.innerHTML = `<span class="t-ic">${ic}</span><div>${title}${sub ? `<small>${sub}</small>` : ""}</div>`;
    wrap.appendChild(el);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 380); }, 2600);
  }

  // ---------- Mascot ----------
  const PRAISE = ["Tuyệt vời! 🎉", "Giỏi quá đi! 👏", "Chính xác rồi! ✨", "Quá đỉnh! 🚀", "Bạn học siêu nhanh! ⭐", "Xuất sắc! 💪"];
  const ENCOURAGE = ["Không sao, thử lại nhé! 💪", "Sai một chút thôi, cố lên! 🌱", "Học từ lỗi sai mà tiến bộ! ✨"];
  function mascotSay(msg) {
    const b = document.getElementById("mascotBubble");
    if (!b) return;
    b.textContent = msg;
    b.style.animation = "none"; void b.offsetWidth; b.style.animation = "bubble-in .4s var(--ease-bounce)";
  }
  function mascotCheer() {
    const m = document.getElementById("mascot");
    if (!m) return;
    m.classList.add("cheer"); setTimeout(() => m.classList.remove("cheer"), 650);
  }

  // ---------- HUD ----------
  function bump(el) { if (!el) return; el.classList.remove("hud-bump"); void el.offsetWidth; el.classList.add("hud-bump"); }
  function updateHUD() {
    const info = levelInfo();
    const sEl = document.getElementById("streakVal");
    const streakChip = document.getElementById("streakChip");
    if (sEl) sEl.textContent = game.data.streak;
    if (streakChip) streakChip.classList.toggle("on", game.data.streak > 0);
    const lvlNum = document.getElementById("lvlNum");
    if (lvlNum) lvlNum.textContent = info.lvl;
    const ring = document.getElementById("lvlRing");
    if (ring) {
      const C = 2 * Math.PI * 20;
      ring.style.strokeDasharray = C;
      ring.style.strokeDashoffset = C * (1 - info.pct / 100);
    }
  }

  // ---------- Streak ----------
  function dayStr(d) { d = d || new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function touchStreak() {
    const today = dayStr();
    if (game.data.lastDay === today) return; // already counted today
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (game.data.lastDay === dayStr(y)) game.data.streak++;
    else game.data.streak = 1;
    game.data.lastDay = today;
    game.save();
    updateHUD();
    bump(document.getElementById("streakChip"));
  }

  // ---------- XP / level ----------
  function award(xp, opts) {
    if (xp <= 0) return;
    const before = levelFromXP(game.data.xp);
    game.data.xp += xp;
    const after = levelFromXP(game.data.xp);
    game.save();
    updateHUD();
    bump(document.getElementById("lvlChip") || document.querySelector(".hud-level"));
    if (after > before) {
      sound.levelup();
      burst({ count: 150, spread: 18 });
      mascotCheer();
      toast("🚀", `Lên cấp ${after}!`, `Bạn giờ là "${titleFor(after)}"`, "#8b5cf6");
      mascotSay(`Lên cấp ${after} rồi! Bạn là ${titleFor(after)}! 🚀`);
    }
    checkBadges();
  }

  // ---------- Badges ----------
  const BADGES = [
    { id: "first", ic: "🌱", name: "Mầm non", desc: "Học từ đầu tiên", test: s => s.learned >= 1 },
    { id: "w10", ic: "📚", name: "Mọt từ vựng", desc: "Thuộc 10 từ", test: s => s.learned >= 10 },
    { id: "w30", ic: "🧠", name: "Kho từ vựng", desc: "Thuộc 30 từ", test: s => s.learned >= 30 },
    { id: "w60", ic: "👑", name: "Bậc thầy từ", desc: "Thuộc 60 từ", test: s => s.learned >= 60 },
    { id: "s3", ic: "🔥", name: "Chăm chỉ", desc: "Chuỗi 3 ngày", test: s => s.streak >= 3 },
    { id: "s7", ic: "⚡", name: "Bền bỉ", desc: "Chuỗi 7 ngày", test: s => s.streak >= 7 },
    { id: "perfect", ic: "💯", name: "Hoàn hảo", desc: "Quiz đúng 100%", test: s => s.quizPerfect >= 1 },
    { id: "speak", ic: "🎤", name: "Phát âm chuẩn", desc: "Nói đạt ≥ 80%", test: s => s.speakGood >= 1 },
    { id: "exam", ic: "🏆", name: "Vượt vũ môn", desc: "Giải đề ≥ 80%", test: s => s.examPass >= 1 },
    { id: "lvl5", ic: "🌟", name: "Ngôi sao", desc: "Đạt cấp 5", test: s => s.lvl >= 5 }
  ];
  function readStats() {
    let prog = {};
    try { prog = JSON.parse(localStorage.getItem(SKEY) || "{}"); } catch (e) {}
    const speaking = prog.speaking || {};
    const speakGood = Object.values(speaking).filter(v => v >= 80).length;
    const quizzes = prog.quizzes || [];
    const quizPerfect = quizzes.filter(q => q.score === q.total).length;
    const exams = prog.exams || [];
    const examPass = exams.filter(e => Math.round(e.score / e.total * 100) >= 80).length;
    return {
      learned: (prog.learned || []).length,
      streak: game.data.streak,
      lvl: levelFromXP(game.data.xp),
      speakGood, quizPerfect, examPass
    };
  }
  function checkBadges() {
    const s = readStats();
    let changed = false;
    for (const b of BADGES) {
      if (!game.data.badges.includes(b.id) && b.test(s)) {
        game.data.badges.push(b.id); changed = true;
        sound.badge();
        burst({ count: 90, spread: 13 });
        mascotCheer();
        toast(b.ic, "Huy hiệu mới!", b.name, "#ffcb2e");
      }
    }
    if (changed) game.save();
  }
  function renderBadges(container) {
    if (!container) return;
    const s = readStats();
    container.innerHTML = BADGES.map(b => {
      const got = game.data.badges.includes(b.id);
      return `<div class="badge ${got ? "unlocked" : "locked"}">
          <span class="b-ic">${got ? b.ic : "🔒"}</span>
          <div class="b-name">${b.name}</div>
          <div class="b-desc">${got ? b.desc : b.desc}</div>
        </div>`;
    }).join("");
  }

  // ---------- Public API ----------
  window.Game = {
    init() { updateHUD(); checkBadges(); ensureCanvas(); },
    award, touchStreak, checkBadges, updateHUD, renderBadges,
    burst, toast, mascotSay, mascotCheer,
    sound,
    levelInfo, titleFor, badgeList: () => BADGES, badgesUnlocked: () => game.data.badges.slice(),
    correct(xp) { sound.correct(); mascotCheer(); touchStreak(); award(xp || 10); mascotSay(PRAISE[(Math.random() * PRAISE.length) | 0]); },
    wrong() { sound.wrong(); mascotSay(ENCOURAGE[(Math.random() * ENCOURAGE.length) | 0]); },
    learn(xp) { touchStreak(); award(xp || 15); },
    toggleSound(on) { game.data.sound = on; game.save(); },
    soundOn() { return game.data.sound; },
    data: game.data
  };
})();
