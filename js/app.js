// ===== MathEnglish app logic (redesigned, gamified) =====
const VOCAB = window.VOCAB || [];
const READINGS = window.READINGS || [];
const G = () => window.Game; // gamification engine

// ---------- Progress store (localStorage) ----------
const STORE_KEY = "mathenglish_progress_v1";
const store = {
  data: Object.assign({ learned: [], quizzes: [], speaking: {}, exams: [] },
        JSON.parse(localStorage.getItem(STORE_KEY) || "{}")),
  save() { localStorage.setItem(STORE_KEY, JSON.stringify(this.data)); },
  markLearned(word) {
    if (!this.data.learned.includes(word)) { this.data.learned.push(word); this.save(); return true; }
    return false;
  },
  isLearned(word) { return this.data.learned.includes(word); },
  addQuiz(score, total) { this.data.quizzes.push({ score, total, date: Date.now() }); this.save(); },
  recordSpeak(word, score) {
    const cur = this.data.speaking[word];
    if (!cur || score > cur) this.data.speaking[word] = score;
    this.save();
  },
  addExam(examId, title, score, total) {
    if (!this.data.exams) this.data.exams = [];
    this.data.exams.push({ examId, title, score, total, date: Date.now() });
    this.save();
  },
  reset() { this.data = { learned: [], quizzes: [], speaking: {}, exams: [] }; this.save(); }
};

// ---------- Audio / pronunciation ----------
const audioCache = {};   // word -> URL (đã tải)  | null = đã thử nhưng không có
let currentAudio = null; // <audio> đang phát, để dừng khi bấm từ khác

// Dừng mọi âm thanh đang phát (audio + giọng đọc) — gọi trước mỗi lần phát mới
function stopSpeak() {
  if (currentAudio) { try { currentAudio.pause(); currentAudio.currentTime = 0; } catch (e) {} currentAudio = null; }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}

function speak(word) {
  const key = word.toLowerCase().trim();
  stopSpeak(); // bấm liên tục không bị chồng tiếng / lag dồn
  const cached = audioCache[key];
  if (cached) {
    playAudio(cached, word);          // có sẵn audio đẹp → phát ngay
  } else {
    ttsSpeak(word);                   // chưa có → đọc bằng giọng trình duyệt (tức thì, offline)
    if (cached === undefined) prefetchAudio(key); // tải audio đẹp cho lần sau
  }
}
function playAudio(src, word) {
  try {
    const a = new Audio(src);
    a.preload = "auto";
    currentAudio = a;
    const p = a.play();
    if (p && p.catch) p.catch(() => { if (currentAudio === a) { currentAudio = null; ttsSpeak(word); } });
  } catch (e) { ttsSpeak(word); }
}
async function prefetchAudio(word) {
  const key = word.toLowerCase().trim();
  if (audioCache[key] !== undefined) return;
  const u = await fetchAudioUrl(key);
  audioCache[key] = u || null; // ghi null để không gọi API lại
}
async function fetchAudioUrl(word) {
  const lookup = word.includes(" ") ? word.split(" ").pop() : word;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(lookup), { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json();
    for (const entry of json) for (const ph of (entry.phonetics || [])) if (ph.audio) return ph.audio.startsWith("http") ? ph.audio : "https:" + ph.audio;
  } catch (e) {}
  return null;
}
let enVoice = null;
function pickVoice() {
  const voices = speechSynthesis.getVoices();
  enVoice = voices.find(v => /en[-_]US/i.test(v.lang)) || voices.find(v => /en[-_]GB/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang)) || null;
}
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; speechSynthesis.getVoices(); }
let ttsRef = null;
function ttsSpeak(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  if (!enVoice) pickVoice();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9;
  if (enVoice) { u.voice = enVoice; u.lang = enVoice.lang; } else u.lang = "en-US";
  ttsRef = u;
  // Chrome đôi khi "nuốt" lệnh nếu speak() gọi ngay sau cancel() — đẩy sang
  // microtask kế tiếp để đảm bảo phát ra tiếng (sửa lỗi "ấn không đọc").
  setTimeout(() => {
    try { speechSynthesis.speak(u); if (speechSynthesis.paused) speechSynthesis.resume(); } catch (e) {}
  }, 0);
}

// ---------- Mascot intros per screen ----------
const MASCOT_MSG = {
  dictionary: "Tra cứu từ vựng Toán nào! Bấm 🔊 để nghe phát âm nhé.",
  study: "Học từng từ một nhé! Mình ưu tiên các từ bạn chưa thuộc. 📒",
  flashcard: "Lật thẻ để học nghĩa. Thuộc rồi thì bấm \"Đã thuộc\" để nhận XP! ✨",
  quiz: "Sẵn sàng kiểm tra chưa? Trả lời đúng được cộng điểm! 💪",
  speaking: "Đọc to và rõ ràng nhé, mình sẽ chấm điểm phát âm cho bạn! 🎤",
  reading: "Đọc hiểu giúp bạn nhớ từ lâu hơn. Bấm vào từ tô màu để nghe.",
  exam: "Thử sức với đề thi quốc tế nào! Mình tin bạn làm được! 🏆",
  progress: "Xem bạn đã tiến bộ thế nào nhé. Cố gắng mở khóa hết huy hiệu! 🌟"
};

// ---------- Mode switching ----------
const ENGLISH_TABS = ["dictionary", "study", "flashcard", "quiz", "speaking", "reading"];
function selectMode(mode) {
  document.querySelectorAll(".mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  const tabsBar = document.getElementById("tabs");
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  if (mode === "english") {
    tabsBar.classList.remove("hidden");
    let active = document.querySelector("#tabs .tab.active");
    if (!active) { active = document.querySelector("#tabs .tab"); active.classList.add("active"); }
    document.getElementById(active.dataset.tab).classList.add("active");
    G() && G().mascotSay(MASCOT_MSG[active.dataset.tab]);
  } else if (mode === "exam") {
    tabsBar.classList.add("hidden");
    document.getElementById("exam").classList.add("active");
    showExamList();
    G() && G().mascotSay(MASCOT_MSG.exam);
  } else if (mode === "progress") {
    tabsBar.classList.add("hidden");
    document.getElementById("progress").classList.add("active");
    renderProgress();
    G() && G().mascotSay(MASCOT_MSG.progress);
  }
}
document.getElementById("modeSwitch").addEventListener("click", e => {
  const btn = e.target.closest(".mode-btn"); if (!btn) return;
  G() && G().sound.click();
  selectMode(btn.dataset.mode);
});
document.getElementById("tabs").addEventListener("click", e => {
  const btn = e.target.closest(".tab"); if (!btn) return;
  document.querySelectorAll("#tabs .tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(btn.dataset.tab).classList.add("active");
  G() && G().sound.click();
  if (MASCOT_MSG[btn.dataset.tab]) {
    G() && G().mascotSay(MASCOT_MSG[btn.dataset.tab]);
  } else if (btn.dataset.tab === "classroom") {
    G() && G().mascotSay("Chào thầy/cô! Chúc thầy/cô quản lý lớp học thật hiệu quả! 🏫");
  } else if (btn.dataset.tab === "adminPanel") {
    G() && G().mascotSay("Trang quản trị hệ thống. Hãy cẩn thận khi thay đổi vai trò! 🛠️");
  }

  if (btn.dataset.tab === "classroom" && typeof renderClassroom === "function") {
    renderClassroom();
  } else if (btn.dataset.tab === "adminPanel" && typeof renderAdminPanel === "function") {
    renderAdminPanel();
  } else if (btn.dataset.tab === "study" && typeof buildStudyDeck === "function") {
    buildStudyDeck();
  }
});


// ---------- Utilities ----------
const topics = [...new Set(VOCAB.map(v => v.topic))];
function fillTopicSelect(sel, allLabel) {
  sel.innerHTML = `<option value="">${allLabel}</option>` + topics.map(t => `<option value="${t}">${t}</option>`).join("");
}
function esc(s) { return s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

// ---------- DICTIONARY ----------
const searchBox = document.getElementById("searchBox");
const topicFilter = document.getElementById("topicFilter");
const learnFilter = document.getElementById("learnFilter");
const wordList = document.getElementById("wordList");
fillTopicSelect(topicFilter, "Tất cả chủ đề");
function renderDictionary() {
  const q = searchBox.value.toLowerCase().trim();
  const tp = topicFilter.value;
  const lf = learnFilter.value;
  const items = VOCAB.filter(v =>
    (!tp || v.topic === tp) &&
    (!q || v.word.toLowerCase().includes(q) || v.vi.toLowerCase().includes(q)) &&
    (lf === "" || (lf === "learned" ? store.isLearned(v.word) : !store.isLearned(v.word)))
  );
  wordList.innerHTML = items.map(v => `
    <div class="word-card">
      <div class="top">
        <div>
          <div class="en">${esc(v.word)}</div>
          <div class="ipa">${esc(v.ipa)}</div>
        </div>
        <button class="speak-btn" data-word="${esc(v.word)}" title="Nghe phát âm">🔊</button>
      </div>
      <div class="vi">${esc(v.vi)}</div>
      <div class="ex">"${esc(v.example)}"<br><span>${esc(v.exampleVi)}</span></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:10px">
        <span class="topic-tag">${esc(v.topic)}</span>
        ${store.isLearned(v.word) ? `<span class="learned-pill">✓ Đã thuộc</span>` : ``}
      </div>
    </div>`).join("") || `<p class="empty-note">Không tìm thấy từ nào.</p>`;
}
searchBox.addEventListener("input", renderDictionary);
topicFilter.addEventListener("change", renderDictionary);
learnFilter.addEventListener("change", renderDictionary);
wordList.addEventListener("click", e => { const b = e.target.closest(".speak-btn"); if (b) speak(b.dataset.word); });
renderDictionary();

// ---------- HỌC TỪ VỰNG (chế độ học có hướng dẫn) ----------
const studyTopic = document.getElementById("studyTopic");
const studyScope = document.getElementById("studyScope");
const studyCounter = document.getElementById("studyCounter");
const studyCardEl = document.getElementById("studyCard");
const studyDoneEl = document.getElementById("studyDone");
const studyProgressFill = document.getElementById("studyProgressFill");
fillTopicSelect(studyTopic, "Tất cả chủ đề");
let studyDeck = [], studyIdx = 0, studyTotal = 0, studyLearnedCount = 0, studyRevealed = false;

function buildStudyDeck() {
  const tp = studyTopic.value;
  const scope = studyScope.value;
  studyDeck = VOCAB.filter(v => (!tp || v.topic === tp) && (scope === "all" || !store.isLearned(v.word)));
  studyIdx = 0; studyTotal = studyDeck.length; studyLearnedCount = 0; studyRevealed = false;
  showStudyCard();
}
function updateStudyProgress() {
  const pct = studyTotal ? Math.round((studyIdx / studyTotal) * 100) : 0;
  studyProgressFill.style.width = pct + "%";
  studyCounter.textContent = studyTotal ? `${Math.min(studyIdx + 1, studyTotal)} / ${studyTotal}` : "0 / 0";
}
function showStudyCard() {
  studyDoneEl.classList.add("hidden");
  studyCardEl.classList.remove("hidden");
  updateStudyProgress();
  if (studyIdx >= studyDeck.length) return showStudyDone();
  const v = studyDeck[studyIdx];
  prefetchAudio(v.word);
  studyCardEl.innerHTML = `
    <div class="sd-topic">${esc(v.topic)}</div>
    <div class="sd-word">${esc(v.word)}</div>
    <div class="sd-ipa">${esc(v.ipa)}</div>
    <button class="btn btn-sky" data-action="listen">🔊 Nghe phát âm</button>
    <div class="sd-reveal ${studyRevealed ? "" : "hidden"}">
      <div class="sd-vi">${esc(v.vi)}</div>
      <div class="sd-ex">"${esc(v.example)}"<br><span>${esc(v.exampleVi)}</span></div>
    </div>
    ${studyRevealed
      ? `<div class="sd-actions">
           <button class="btn" data-action="review">🔁 Cần ôn lại</button>
           <button class="btn btn-green" data-action="known">✓ Đã thuộc</button>
         </div>`
      : `<button class="btn btn-primary" data-action="reveal" style="margin-top:14px">👁️ Hiện nghĩa</button>`}
  `;
}
function showStudyDone() {
  studyCardEl.classList.add("hidden");
  studyDoneEl.classList.remove("hidden");
  studyProgressFill.style.width = "100%";
  if (studyTotal === 0) {
    studyCounter.textContent = "0 / 0";
    studyDoneEl.innerHTML = `<div class="result-emoji">🌟</div>
      <h2>Không còn từ cần học</h2>
      <p style="font-weight:800;color:var(--ink-soft);margin-top:4px">Bạn đã thuộc hết từ trong phạm vi này! Hãy đổi chủ đề hoặc chọn "Tất cả từ" để ôn lại.</p>`;
    return;
  }
  studyCounter.textContent = `${studyTotal} / ${studyTotal}`;
  studyDoneEl.innerHTML = `<div class="result-emoji">🎉</div>
    <h2>Hoàn thành phiên học!</h2>
    <p style="font-weight:800;color:var(--ink-soft);margin-top:4px">Bạn đã đánh dấu thuộc ${studyLearnedCount} từ trong phiên này.</p>
    <button class="btn btn-primary" data-action="restart" style="margin-top:16px">📒 Học tiếp các từ chưa thuộc</button>`;
  G() && G().burst({ count: 120 }); G() && G().sound.levelup();
}
document.getElementById("study").addEventListener("click", e => {
  const btn = e.target.closest("[data-action]"); if (!btn) return;
  const act = btn.dataset.action;
  const v = studyDeck[studyIdx];
  if (act === "listen") { if (v) speak(v.word); }
  else if (act === "reveal") { studyRevealed = true; showStudyCard(); }
  else if (act === "known") {
    if (v && !store.isLearned(v.word)) { store.markLearned(v.word); studyLearnedCount++; G() && G().learn(15); }
    studyIdx++; studyRevealed = false; showStudyCard();
  }
  else if (act === "review") { studyIdx++; studyRevealed = false; showStudyCard(); }
  else if (act === "restart") { buildStudyDeck(); }
});
studyTopic.addEventListener("change", buildStudyDeck);
studyScope.addEventListener("change", buildStudyDeck);

// ---------- FLASHCARD ----------
const flashTopic = document.getElementById("flashTopic");
const flashCard = document.getElementById("flashcard-card");
const flashFront = flashCard.querySelector(".flashcard-front");
const flashBack = flashCard.querySelector(".flashcard-back");
const flashCounter = document.getElementById("flashCounter");
fillTopicSelect(flashTopic, "Tất cả chủ đề");
let flashDeck = [], flashIdx = 0;
function buildDeck() { const tp = flashTopic.value; flashDeck = VOCAB.filter(v => !tp || v.topic === tp); flashIdx = 0; showFlash(); }
function showFlash() {
  flashCard.classList.remove("flipped");
  const v = flashDeck[flashIdx];
  if (!v) { flashFront.innerHTML = "Trống"; return; }
  const learned = store.isLearned(v.word);
  flashFront.innerHTML = `${learned ? `<div class="flash-corner">⭐</div>` : ``}
    <div class="big">${esc(v.word)}</div>
    <div class="ipa">${esc(v.ipa)}</div>
    <button class="speak-btn" data-word="${esc(v.word)}" style="margin-top:14px">🔊</button>
    <div class="flash-flip-hint">Bấm để lật thẻ</div>`;
  flashBack.innerHTML = `<div class="vi-big">${esc(v.vi)}</div>
    <div class="ex">"${esc(v.example)}"<br>${esc(v.exampleVi)}</div>
    <div class="flash-flip-hint">Bấm để lật lại</div>`;
  flashCounter.textContent = `${flashIdx + 1} / ${flashDeck.length}`;
  prefetchAudio(v.word);
}
flashCard.addEventListener("click", e => {
  if (e.target.closest(".speak-btn")) { speak(e.target.closest(".speak-btn").dataset.word); return; }
  flashCard.classList.toggle("flipped");
  G() && G().sound.click();
});
document.getElementById("flashNext").onclick = () => { flashIdx = (flashIdx + 1) % flashDeck.length; showFlash(); };
document.getElementById("flashPrev").onclick = () => { flashIdx = (flashIdx - 1 + flashDeck.length) % flashDeck.length; showFlash(); };
document.getElementById("flashKnown").onclick = (e) => {
  const v = flashDeck[flashIdx];
  if (!v) return;
  const added = store.markLearned(v.word);
  if (added) {
    const r = e.target.getBoundingClientRect();
    G() && G().burst({ count: 70, x: r.left + r.width / 2, y: r.top });
    G() && G().sound.correct();
    G() && G().learn(15);
    G() && G().mascotCheer();
  } else { G() && G().touchStreak(); }
  flashIdx = (flashIdx + 1) % flashDeck.length; showFlash();
};
flashTopic.addEventListener("change", buildDeck);
buildDeck();

// ---------- QUIZ ----------
const quizTopic = document.getElementById("quizTopic");
fillTopicSelect(quizTopic, "Tất cả chủ đề");
const quizSetup = document.getElementById("quizSetup");
const quizPlay = document.getElementById("quizPlay");
const quizResult = document.getElementById("quizResult");
let quizQ = [], qi = 0, qScore = 0;
function shuffle(a) { return a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]); }
function startQuiz() {
  const tp = quizTopic.value;
  const pool = VOCAB.filter(v => !tp || v.topic === tp);
  if (pool.length < 4) { alert("Chủ đề này quá ít từ để làm quiz."); return; }
  quizQ = shuffle(pool).slice(0, Math.min(10, pool.length));
  qi = 0; qScore = 0;
  quizSetup.classList.add("hidden"); quizResult.classList.add("hidden"); quizPlay.classList.remove("hidden");
  showQuestion();
}
document.getElementById("quizStart").onclick = startQuiz;
function showQuestion() {
  const v = quizQ[qi];
  const wrong = shuffle(VOCAB.filter(x => x.word !== v.word)).slice(0, 3).map(x => x.vi);
  const opts = shuffle([v.vi, ...wrong]);
  document.getElementById("quizProgress").textContent = `Câu ${qi + 1}/${quizQ.length}`;
  document.getElementById("quizScore").textContent = `⭐ ${qScore}`;
  document.getElementById("quizBarFill").style.width = (qi / quizQ.length * 100) + "%";
  document.getElementById("quizQuestion").innerHTML =
    `<div class="qword">${esc(v.word)}</div><div class="qipa">${esc(v.ipa)}</div>
     <button class="speak-btn" data-word="${esc(v.word)}" style="margin-top:12px">🔊</button>
     <div class="qask">Nghĩa tiếng Việt là gì?</div>`;
  document.getElementById("quizOptions").innerHTML = opts.map(o => `<button class="quiz-opt">${esc(o)}</button>`).join("");
  document.getElementById("quizNext").classList.add("hidden");
}
document.getElementById("quizQuestion").addEventListener("click", e => { const b = e.target.closest(".speak-btn"); if (b) speak(b.dataset.word); });
document.getElementById("quizOptions").addEventListener("click", e => {
  const btn = e.target.closest(".quiz-opt"); if (!btn) return;
  const v = quizQ[qi];
  const all = [...document.querySelectorAll(".quiz-opt")];
  all.forEach(b => b.disabled = true);
  if (btn.textContent === v.vi) {
    btn.classList.add("correct"); qScore++; store.markLearned(v.word);
    G() && G().correct(10);
  } else {
    btn.classList.add("wrong");
    all.find(b => b.textContent === v.vi)?.classList.add("correct");
    G() && G().wrong();
  }
  document.getElementById("quizScore").textContent = `⭐ ${qScore}`;
  document.getElementById("quizNext").classList.remove("hidden");
});
document.getElementById("quizNext").onclick = () => { qi++; if (qi < quizQ.length) showQuestion(); else finishQuiz(); };
function finishQuiz() {
  store.addQuiz(qScore, quizQ.length);
  G() && G().checkBadges();
  quizPlay.classList.add("hidden"); quizResult.classList.remove("hidden");
  const pct = Math.round(qScore / quizQ.length * 100);
  const emoji = pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "💪";
  const msg = pct >= 80 ? "Xuất sắc!" : pct >= 50 ? "Khá tốt!" : "Cố lên!";
  if (pct >= 80) { G() && G().burst({ count: 160, spread: 18 }); G() && G().sound.levelup(); G() && G().mascotCheer(); }
  quizResult.innerHTML = `<div class="result-emoji">${emoji}</div>
    <h2>Hoàn thành!</h2>
    <div class="score-big">${qScore}/${quizQ.length}</div>
    <p style="font-weight:800;color:var(--ink-soft);margin-top:4px">${pct}% chính xác · ${msg}</p>
    <button class="btn btn-primary" id="quizAgain" style="margin-top:18px">🔁 Làm lại</button>`;
  document.getElementById("quizAgain").onclick = () => { quizResult.classList.add("hidden"); quizSetup.classList.remove("hidden"); };
}

// ---------- SPEAKING ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const speakTopic = document.getElementById("speakTopic");
const speakFilter = document.getElementById("speakFilter");
const speakBox = document.getElementById("speakBox");
const speakCounter = document.getElementById("speakCounter");
const spStatus = document.getElementById("spStatus");
const spFeedback = document.getElementById("spFeedback");
const spRecord = document.getElementById("spRecord");
fillTopicSelect(speakTopic, "Tất cả chủ đề");
let speakDeck = [], speakIdx = 0, recognizing = false;
let speechaceOn = false;
fetch("/api/health").then(r => r.ok ? r.json() : null).then(j => { speechaceOn = !!(j && j.speechace); updateSpeakSupport(); }).catch(() => {});
function updateSpeakSupport() {
  const ok = SR || speechaceOn;
  document.getElementById("speakUnsupported").classList.toggle("hidden", !!ok);
  speakBox.classList.toggle("hidden", !ok);
  if (ok && !speakDeck.length) buildSpeakDeck();
}
updateSpeakSupport();
function buildSpeakDeck() {
  const tp = speakTopic.value;
  const fl = speakFilter ? speakFilter.value : "";
  speakDeck = VOCAB.filter(v =>
    (!tp || v.topic === tp) &&
    (fl !== "todo" || (store.data.speaking[v.word] || 0) < 80)
  );
  speakIdx = 0;
  showSpeak();
}
function showSpeak() {
  const v = speakDeck[speakIdx];
  if (!v) {
    speakBox.querySelector(".sp-word").textContent = "🎉";
    speakBox.querySelector(".sp-ipa").textContent = "";
    speakBox.querySelector(".sp-vi").textContent = "Tuyệt vời! Không còn từ nào cần luyện thêm.";
    speakCounter.textContent = "0 / 0";
    spStatus.textContent = ""; spFeedback.innerHTML = "";
    return;
  }
  speakBox.querySelector(".sp-word").textContent = v.word;
  speakBox.querySelector(".sp-ipa").textContent = v.ipa;
  speakBox.querySelector(".sp-vi").textContent = v.vi;
  speakCounter.textContent = `${speakIdx + 1} / ${speakDeck.length}`;
  spStatus.textContent = ""; spFeedback.innerHTML = "";
  prefetchAudio(v.word);
  const best = store.data.speaking[v.word];
  if (best != null) spStatus.textContent = `Điểm tốt nhất của bạn: ${best}%`;
}
function similarity(a, b) {
  a = a.toLowerCase().trim(); b = b.toLowerCase().trim();
  if (!a.length || !b.length) return 0;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return Math.round((1 - dp[m][n] / Math.max(m, n)) * 100);
}
document.getElementById("spListen").onclick = () => { const v = speakDeck[speakIdx]; if (v) speak(v.word); };
document.getElementById("spPrev").onclick = () => { speakIdx = (speakIdx - 1 + speakDeck.length) % speakDeck.length; showSpeak(); };
document.getElementById("spNext").onclick = () => { speakIdx = (speakIdx + 1) % speakDeck.length; showSpeak(); };
function startRecordUI() { recognizing = true; spRecord.classList.add("sp-record-active"); spRecord.textContent = "🔴 Đang nghe..."; spStatus.textContent = "Hãy đọc từ to và rõ ràng..."; spFeedback.innerHTML = ""; }
function endRecordUI() { recognizing = false; spRecord.classList.remove("sp-record-active"); spRecord.textContent = "🎤 Đọc lại"; }
let mediaRec = null, recChunks = [];
spRecord.onclick = () => {
  const target = speakDeck[speakIdx]; if (!target) return;
  if (recognizing && mediaRec && mediaRec.state === "recording") { mediaRec.stop(); return; }
  if (recognizing) return;
  if (speechaceOn) recordWithSpeechace(target);
  else if (SR) recordWithWebSpeech(target);
};
async function recordWithSpeechace(target) {
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { spStatus.textContent = "⚠️ Không truy cập được micro. Hãy cho phép quyền micro."; return; }
  recChunks = []; mediaRec = new MediaRecorder(stream);
  mediaRec.ondataavailable = e => { if (e.data.size) recChunks.push(e.data); };
  mediaRec.onstop = async () => {
    stream.getTracks().forEach(t => t.stop());
    spRecord.classList.remove("sp-record-active"); spRecord.textContent = "🎤 Đọc lại";
    spStatus.textContent = "Đang chấm điểm...";
    const blob = new Blob(recChunks, { type: mediaRec.mimeType || "audio/webm" });
    try {
      const res = await fetch("/api/assess?text=" + encodeURIComponent(target.word), { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
      const json = await res.json(); recognizing = false; handleSpeechaceResult(target, json);
    } catch (e) { recognizing = false; spStatus.textContent = "Lỗi gửi âm thanh: " + e.message; }
  };
  recognizing = true; mediaRec.start();
  spRecord.classList.add("sp-record-active"); spRecord.textContent = "🔴 Đang ghi... (bấm để dừng)";
  spStatus.textContent = "Đọc từ rồi bấm nút để dừng (tự dừng sau 5 giây)."; spFeedback.innerHTML = "";
  setTimeout(() => { if (mediaRec && mediaRec.state === "recording") mediaRec.stop(); }, 5000);
}
function awardSpeak(target, overall) {
  store.recordSpeak(target.word, overall);
  if (overall >= 80) { store.markLearned(target.word); G() && G().correct(20); G() && G().burst({ count: 90 }); }
  else { G() && G().touchStreak(); }
}
function handleSpeechaceResult(target, json) {
  if (!json || json.status !== "success" || !json.text_score) {
    spStatus.textContent = json && json.error ? json.error : "Không chấm được (đọc chưa rõ hoặc hết lượt trial). Hãy thử lại."; return;
  }
  const ts = json.text_score; const words = ts.word_score_list || [];
  const overall = ts.speechace_score && ts.speechace_score.pronunciation != null
    ? Math.round(ts.speechace_score.pronunciation)
    : Math.round((words.reduce((a, w) => a + (w.quality_score || 0), 0) / (words.length || 1)));
  let cls, label;
  if (overall >= 80) { cls = "good"; label = "✓ Phát âm tốt!"; }
  else if (overall >= 55) { cls = "close"; label = "≈ Cần luyện thêm"; }
  else { cls = "bad"; label = "✗ Chưa đạt"; }
  const phHtml = words.map(w => {
    const phs = (w.phone_score_list || []).map(p => `<span class="ph ${phClass(p.quality_score)}">${esc(p.phone)}</span>`).join("");
    return `<div class="ph-word"><b>${esc(w.word)}</b>: ${phs || "—"}</div>`;
  }).join("");
  spStatus.textContent = "";
  spFeedback.innerHTML = `<div class="sp-result ${cls}">${label} — ${overall}/100</div>
    <div class="sp-phonemes">${phHtml}</div>
    <p class="hint" style="margin-top:4px">🟩 đúng · 🟨 tạm · 🟥 cần sửa</p>
    <button class="btn" id="spRetry" style="margin-top:8px">🔁 Thử lại</button>
    <button class="btn btn-sky" id="spHear" style="margin-top:8px">🔊 Nghe mẫu</button>`;
  document.getElementById("spRetry").onclick = () => spRecord.click();
  document.getElementById("spHear").onclick = () => speak(target.word);
  awardSpeak(target, overall);
}
function recordWithWebSpeech(target, retried) {
  const rec = new SR();
  rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 5;
  let gotResult = false; startRecordUI();
  rec.onresult = e => {
    gotResult = true;
    const alts = [...e.results[0]].map(r => r.transcript);
    const score = Math.max(...alts.map(a => similarity(a, target.word)));
    showSpeakFeedback(target, alts[0], score);
    awardSpeak(target, score);
  };
  rec.onerror = e => {
    if (e.error === "network" && !retried) { spStatus.textContent = "Mạng nhận diện chập chờn, đang thử lại..."; setTimeout(() => recordWithWebSpeech(target, true), 600); return; }
    const msgs = { "not-allowed": "⚠️ Bạn chưa cho phép dùng micro. Hãy bật quyền micro cho trang này.", "no-speech": "Không nghe thấy gì, hãy đọc to và thử lại.", "network": "⚠️ Bộ nhận diện miễn phí đang chập chờn (lỗi mạng phía Google). Hãy thử lại sau giây lát.", "audio-capture": "⚠️ Không tìm thấy micro. Kiểm tra micro của bạn." };
    spStatus.textContent = msgs[e.error] || ("Lỗi nhận diện: " + e.error);
  };
  rec.onend = () => { endRecordUI(); if (!gotResult && !spStatus.textContent) spStatus.textContent = ""; };
  try { rec.start(); } catch (err) { endRecordUI(); }
}
function phClass(s) { return s >= 80 ? "g" : s >= 55 ? "m" : "b"; }
function showSpeakFeedback(target, heard, score) {
  let cls, label;
  if (score >= 80) { cls = "good"; label = "✓ Chính xác!"; }
  else if (score >= 55) { cls = "close"; label = "≈ Gần đúng"; }
  else { cls = "bad"; label = "✗ Chưa đúng"; }
  spStatus.textContent = "";
  spFeedback.innerHTML = `<div class="sp-result ${cls}">${label} — ${score}%</div>
    <div class="sp-bar"><div style="width:${score}%"></div></div>
    <div class="heard" style="margin-top:10px;color:var(--muted);font-weight:700">Máy nghe bạn đọc: "<b>${esc(heard)}</b>"</div>
    <div style="margin-top:6px;font-weight:700">Mục tiêu: <b>${esc(target.word)}</b> ${esc(target.ipa)}</div>
    ${score < 80 ? `<button class="btn" id="spRetry" style="margin-top:10px">🔁 Thử lại</button>
      <button class="btn btn-sky" id="spHear" style="margin-top:10px">🔊 Nghe mẫu</button>` : ""}`;
  const retry = document.getElementById("spRetry"); if (retry) retry.onclick = () => spRecord.click();
  const hear = document.getElementById("spHear"); if (hear) hear.onclick = () => speak(target.word);
}
speakTopic.addEventListener("change", buildSpeakDeck);
if (speakFilter) speakFilter.addEventListener("change", buildSpeakDeck);
if (SR || speechaceOn) buildSpeakDeck();

// ---------- READING ----------
const readingList = document.getElementById("readingList");
const readingView = document.getElementById("readingView");
const vocabMap = Object.fromEntries(VOCAB.map(v => [v.word.toLowerCase(), v]));
function renderReadingList() {
  readingView.classList.add("hidden"); readingList.classList.remove("hidden");
  readingList.innerHTML = READINGS.map((r, i) => `
    <div class="reading-item" data-i="${i}">
      <div style="display:flex;align-items:center;gap:12px"><span class="ri-ic">📖</span><strong>${esc(r.title)}</strong></div>
      <span class="level">${esc(r.level)}</span>
    </div>`).join("");
}
readingList.addEventListener("click", e => { const item = e.target.closest(".reading-item"); if (item) openReading(+item.dataset.i); });
function highlight(text, keywords) {
  let html = esc(text);
  keywords.forEach(kw => {
    const re = new RegExp(`\\b(${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`, "gi");
    html = html.replace(re, m => { const v = vocabMap[m.toLowerCase()]; const tip = v ? `${v.ipa} — ${v.vi}` : ""; return `<span class="kw" data-word="${m}" title="${esc(tip)}">${m}</span>`; });
  });
  return html;
}
function openReading(i) {
  const r = READINGS[i];
  readingList.classList.add("hidden"); readingView.classList.remove("hidden");
  readingView.innerHTML = `
    <button class="btn btn-back" id="backReading">← Danh sách</button>
    <h2 style="margin-top:14px">${esc(r.title)} <span class="level">${esc(r.level)}</span></h2>
    ${r.paragraphs.map(p => `
      <div class="reading-para">
        <div class="en-row">
          <button class="speak-btn" data-word="${esc(p.en)}" title="Nghe cả câu">🔊</button>
          <div class="en">${highlight(p.en, r.keywords)}</div>
        </div>
        <div class="vi-trans">${esc(p.vi)}</div>
      </div>`).join("")}
    <p class="hint">Bấm vào từ <span class="kw">được tô màu</span> để nghe phát âm.</p>`;
  document.getElementById("backReading").onclick = renderReadingList;
}
readingView.addEventListener("click", e => {
  const kw = e.target.closest(".kw"); if (kw && kw.dataset.word) { speak(kw.dataset.word); return; }
  const sb = e.target.closest(".speak-btn"); if (sb) speak(sb.dataset.word);
});
renderReadingList();

// ---------- PROGRESS ----------
function ring(pct, size, stroke, color) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="${stroke}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"/>
  </svg>`;
}
function renderProgress() {
  const learned = store.data.learned, quizzes = store.data.quizzes;
  const bestPct = quizzes.length ? Math.max(...quizzes.map(q => Math.round(q.score / q.total * 100))) : 0;
  const spoken = Object.values(store.data.speaking || {}); const spokenCount = spoken.length;
  const spokenAvg = spokenCount ? Math.round(spoken.reduce((a, b) => a + b, 0) / spokenCount) : 0;
  const quizAvg = quizzes.length ? Math.round(quizzes.reduce((a, q) => a + q.score / q.total * 100, 0) / quizzes.length) : 0;

  // Level hero
  const info = G() ? G().levelInfo() : { lvl: 1, into: 0, span: 100, pct: 0, titleStr: "Tân binh" };
  document.getElementById("levelHero").innerHTML = `
    <div class="lh-ring">${ring(info.pct, 92, 9, "#ffcb2e")}<div class="lvl">${info.lvl}</div></div>
    <div class="lh-meta">
      <div class="lh-title">Cấp ${info.lvl} · ${info.titleStr}</div>
      <div class="lh-xp">${info.into} / ${info.span} XP đến cấp tiếp theo · 🔥 chuỗi ${Game.data.streak} ngày</div>
      <div class="lh-xpbar"><div style="width:${info.pct}%"></div></div>
    </div>`;

  document.getElementById("progressStats").innerHTML = `
    <div class="stat-card"><div class="s-ic">📚</div><div class="num">${learned.length}</div><div class="label">Từ đã thuộc</div></div>
    <div class="stat-card c-sky"><div class="s-ic">📈</div><div class="num">${Math.round(learned.length / VOCAB.length * 100)}%</div><div class="label">Hoàn thành (${VOCAB.length} từ)</div></div>
    <div class="stat-card c-grape"><div class="s-ic">✏️</div><div class="num">${quizzes.length}</div><div class="label">Lượt quiz</div></div>
    <div class="stat-card c-sun"><div class="s-ic">🏅</div><div class="num">${bestPct}%</div><div class="label">Quiz tốt nhất</div></div>
    <div class="stat-card c-sky"><div class="s-ic">📊</div><div class="num">${quizAvg}%</div><div class="label">Quiz trung bình</div></div>
    <div class="stat-card c-coral"><div class="s-ic">🎤</div><div class="num">${spokenCount}</div><div class="label">Từ đã luyện nói</div></div>
    <div class="stat-card"><div class="s-ic">🗣️</div><div class="num">${spokenAvg}%</div><div class="label">Phát âm TB</div></div>
    <div class="stat-card c-sun"><div class="s-ic">🔥</div><div class="num">${Game.data.streak}</div><div class="label">Chuỗi ngày học</div></div>`;

  // Badges
  G() && G().renderBadges(document.getElementById("badgeGrid"));

  // Topic progress
  const tps = [...new Set(VOCAB.map(v => v.topic))];
  const learnedSet = new Set(learned);
  document.getElementById("topicProgress").innerHTML = tps.map(tp => {
    const words = VOCAB.filter(v => v.topic === tp);
    const done = words.filter(v => learnedSet.has(v.word)).length;
    const pct = Math.round(done / words.length * 100);
    return `<div class="topic-row ${pct === 100 ? "done" : ""}">
        <div class="topic-head"><span>${esc(tp)} ${pct === 100 ? "🏆" : ""}</span><span class="topic-frac">${done}/${words.length}</span></div>
        <div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>
      </div>`;
  }).join("");

  // Pronunciation scores
  const speakEntries = Object.entries(store.data.speaking || {}).sort((a, b) => b[1] - a[1]);
  document.getElementById("speakScores").innerHTML = speakEntries.length
    ? speakEntries.map(([w, s]) => `<span class="score-chip ${s >= 80 ? "g" : s >= 55 ? "m" : "b"}">${esc(w)} <b>${s}%</b></span>`).join("")
    : `<p class="empty-note">Chưa luyện nói từ nào. Vào tab Luyện nói để bắt đầu!</p>`;

  // Quiz history
  const recent = [...quizzes].reverse().slice(0, 10);
  document.getElementById("quizHistory").innerHTML = recent.length
    ? recent.map(q => {
        const pct = Math.round(q.score / q.total * 100);
        const d = new Date(q.date);
        const dstr = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        return `<div class="quiz-row"><span class="quiz-date">${dstr}</span><span class="score-chip ${pct >= 80 ? "g" : pct >= 55 ? "m" : "b"}">${q.score}/${q.total} · ${pct}%</span></div>`;
      }).join("")
    : `<p class="empty-note">Chưa làm quiz lần nào.</p>`;

  document.getElementById("learnedList").innerHTML = learned.length
    ? learned.map(w => `<span class="chip">${esc(w)}</span>`).join("")
    : `<p class="empty-note">Chưa có từ nào. Hãy học flashcard hoặc làm quiz!</p>`;
}
document.getElementById("resetProgress").onclick = () => {
  if (confirm("Xóa toàn bộ tiến độ học tập?")) { store.reset(); renderProgress(); buildDeck(); renderDictionary(); }
};

// ---------- EXAM ----------
const EXAMS = window.EXAMS || [];
const examListEl = document.getElementById("examList");
const examModeEl = document.getElementById("examMode");
const examPlayEl = document.getElementById("examPlay");
const examResultEl = document.getElementById("examResult");
const examCardsEl = document.getElementById("examCards");
const examFilterEl = document.getElementById("examFilter");
let curExam = null, curMode = "practice", answers = [], timerId = null, timeLeft = 0;
function examPanels(show) { [examListEl, examModeEl, examPlayEl, examResultEl].forEach(el => el.classList.add("hidden")); show.classList.remove("hidden"); }
if (!examFilterEl.dataset.ready) {
  const types = [...new Set(EXAMS.map(e => e.exam))];
  examFilterEl.innerHTML = `<option value="">Tất cả kỳ thi</option>` + types.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
  examFilterEl.dataset.ready = "1";
  examFilterEl.addEventListener("change", renderExamCards);
}
function bestExamScore(id) { const runs = (store.data.exams || []).filter(e => e.examId === id); if (!runs.length) return null; return Math.max(...runs.map(r => Math.round(r.score / r.total * 100))); }
function renderExamCards() {
  const f = examFilterEl.value;
  const list = EXAMS.filter(e => !f || e.exam === f);
  examCardsEl.innerHTML = list.map(e => {
    const best = bestExamScore(e.id);
    const badge = best != null ? `<span class="exam-best">Tốt nhất: ${best}%</span>` : "";
    return `<button class="exam-card" data-id="${esc(e.id)}">
        <div class="exam-card-top"><span class="exam-tag">${esc(e.exam)}</span>${badge}</div>
        <div class="exam-card-title">${esc(e.title)}</div>
        <div class="exam-card-meta">${esc(e.grade)} · ${esc(e.level)} · ${e.questions.length} câu · ${e.timeLimit} phút</div>
      </button>`;
  }).join("") || `<p class="empty-note">Không có đề nào.</p>`;
}
function showExamList() { examPanels(examListEl); renderExamCards(); }
examCardsEl.addEventListener("click", e => { const card = e.target.closest(".exam-card"); if (!card) return; curExam = EXAMS.find(x => x.id === card.dataset.id); if (curExam) showExamMode(); });
function showExamMode() {
  examPanels(examModeEl);
  document.getElementById("examModeTitle").textContent = curExam.title;
  document.getElementById("examModeMeta").textContent = `${curExam.exam} · ${curExam.grade} · ${curExam.level} · ${curExam.questions.length} câu · ${curExam.timeLimit} phút`;
}
document.getElementById("examBack1").onclick = showExamList;
document.querySelectorAll(".exam-mode-card").forEach(b => { b.onclick = () => startExam(b.dataset.mode); });
function startExam(mode) {
  curMode = mode; answers = new Array(curExam.questions.length).fill(null);
  examPanels(examPlayEl);
  document.getElementById("examSubmit").classList.toggle("hidden", mode !== "test");
  const timerEl = document.getElementById("examTimer");
  if (mode === "test") {
    timerEl.classList.remove("hidden"); timeLeft = curExam.timeLimit * 60; updateTimer();
    clearInterval(timerId); timerId = setInterval(() => { timeLeft--; updateTimer(); if (timeLeft <= 0) { clearInterval(timerId); finishExam(); } }, 1000);
  } else { timerEl.classList.add("hidden"); clearInterval(timerId); }
  renderExamAll();
}
function updateTimer() { const m = Math.floor(timeLeft / 60), s = timeLeft % 60; const el = document.getElementById("examTimer"); el.textContent = `⏱️ ${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`; el.classList.toggle("exam-timer-low", timeLeft <= 30); }
function questionBlockHtml(q, i) {
  const sel = answers[i]; const revealed = curMode === "practice" && sel != null;
  const opts = q.choices.map((c, idx) => {
    let cls = "exam-opt";
    if (revealed) { if (idx === q.answer) cls += " correct"; else if (idx === sel) cls += " wrong"; }
    else if (idx === sel) cls += " selected";
    return `<button class="${cls}" data-i="${idx}">${esc(c)}</button>`;
  }).join("");
  let explainHtml = "";
  if (revealed) {
    const ok = sel === q.answer;
    explainHtml = `<div class="exam-explain">
      <div class="ee-verdict ${ok ? "ok" : "no"}">${ok ? "✓ Chính xác!" : "✗ Chưa đúng"} — Đáp án đúng: <b>${esc(q.choices[q.answer])}</b></div>
      <div class="ee-sol"><b>Lời giải:</b> ${esc(q.solution)}</div>
      ${q.vocab && q.vocab.length ? `<div class="ee-vocab"><b>Từ vựng:</b> ${q.vocab.map(w => `<span class="ee-word" data-word="${esc(w)}">${esc(w)} 🔊</span>`).join(" ")}</div>` : ""}
    </div>`;
  }
  return `<div class="exam-q-block" data-qi="${i}">
      <div class="exam-question">
        <div class="eq-en"><span class="eq-num">Câu ${i + 1}.</span> ${esc(q.en)}</div>
        <button class="eq-translate" type="button">🇻🇳 Xem dịch tiếng Việt</button>
        <div class="eq-vi hidden">${esc(q.vi)}</div>
      </div>
      <div class="exam-options">${opts}</div>
      ${explainHtml}
    </div>`;
}
function renderExamAll() {
  const qs = curExam.questions;
  document.getElementById("examAll").innerHTML = qs.map((q, i) => questionBlockHtml(q, i)).join("");
  document.getElementById("examProgress").textContent = `Đã làm ${answers.filter(a => a != null).length} / ${qs.length} câu`;
}
function refreshBlock(i) {
  const block = document.querySelector(`.exam-q-block[data-qi="${i}"]`);
  if (block) block.outerHTML = questionBlockHtml(curExam.questions[i], i);
  document.getElementById("examProgress").textContent = `Đã làm ${answers.filter(a => a != null).length} / ${curExam.questions.length} câu`;
}
document.getElementById("examAll").addEventListener("click", e => {
  const block = e.target.closest(".exam-q-block"); if (!block) return;
  const i = Number(block.dataset.qi);
  if (e.target.closest(".eq-translate")) { block.querySelector(".eq-vi").classList.toggle("hidden"); return; }
  const w = e.target.closest(".ee-word"); if (w) { speak(w.dataset.word); return; }
  const opt = e.target.closest(".exam-opt");
  if (opt) {
    if (curMode === "practice" && answers[i] != null) return;
    answers[i] = Number(opt.dataset.i);
    if (curMode === "practice") { if (answers[i] === curExam.questions[i].answer) { G() && G().correct(8); } else { G() && G().wrong(); } }
    refreshBlock(i);
  }
});
document.getElementById("examQuit").onclick = () => { clearInterval(timerId); if (confirm("Thoát và hủy bài làm hiện tại?")) showExamList(); };
document.getElementById("examSubmit").onclick = () => { const unanswered = answers.filter(a => a == null).length; if (unanswered && !confirm(`Còn ${unanswered} câu chưa làm. Vẫn nộp bài?`)) return; finishExam(); };
function finishExam() {
  clearInterval(timerId);
  const qs = curExam.questions; let score = 0;
  qs.forEach((q, i) => { if (answers[i] === q.answer) score++; });
  const pct = Math.round(score / qs.length * 100);
  store.addExam(curExam.id, curExam.title, score, qs.length);
  G() && G().touchStreak(); G() && G().award(score * 5); G() && G().checkBadges();
  let cls, label;
  if (pct >= 80) { cls = "ok"; label = "Xuất sắc!"; G() && G().burst({ count: 170, spread: 18 }); G() && G().sound.levelup(); G() && G().mascotCheer(); }
  else if (pct >= 50) { cls = "mid"; label = "Khá, cần luyện thêm"; }
  else { cls = "no"; label = "Cần ôn lại nhiều hơn"; }
  const review = qs.map((q, i) => {
    const ok = answers[i] === q.answer;
    const yours = answers[i] != null ? esc(q.choices[answers[i]]) : "<i>(bỏ trống)</i>";
    return `<div class="er-item ${ok ? "ok" : "no"}">
        <div class="er-q"><b>Câu ${i + 1}.</b> ${esc(q.en)}</div>
        <div class="er-line">Bạn chọn: <b>${yours}</b> ${ok ? "✓" : "✗"} · Đáp án: <b>${esc(q.choices[q.answer])}</b></div>
        <div class="er-sol">${esc(q.solution)}</div>
      </div>`;
  }).join("");
  examPanels(examResultEl);
  examResultEl.innerHTML = `
    <div class="exam-score ${cls}"><div class="es-pct">${pct}%</div><div class="es-frac">${score} / ${qs.length} câu đúng</div><div class="es-label">${label}</div></div>
    <h3>Xem lại bài làm</h3>
    <div class="exam-review">${review}</div>
    <div class="exam-result-nav">
      <button class="btn btn-primary" id="examRetry">🔁 Làm lại đề này</button>
      <button class="btn btn-back" id="examToList">← Danh sách đề</button>
    </div>`;
  document.getElementById("examRetry").onclick = showExamMode;
  document.getElementById("examToList").onclick = showExamList;
}

// ---------- Init ----------
window.addEventListener("DOMContentLoaded", () => {
  G() && G().init();
  G() && G().mascotSay(MASCOT_MSG.dictionary);
});
// init may run after DOMContentLoaded already fired
if (window.Game) { window.Game.init(); }

// ============================================================
// SUPABASE ROLE-BASED AUTH & DATABASE SYNCING
// ============================================================
let supabaseClient = null;
let currentUser = null;
let userRole = "student";

// Supabase public credentials (anon key — safe to expose in frontend)
const SUPABASE_URL = "https://dayqsblxlmczwgynmogf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRheXFzYmx4bG1jendneW5tb2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNjE2NjUsImV4cCI6MjA3ODkzNzY2NX0.aO6dXxMookmBqjzbw-FbVmRpJI8e4STK6eO9PTAaXwg";

async function initSupabase() {
  try {
    if (!window.supabase) {
      console.warn("Supabase SDK not loaded. Auth system disabled.");
      return;
    }
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    setupAuthListeners();
    setupAuthUI();
  } catch (e) {
    console.error("Failed to initialize Supabase:", e);
  }
}

// Bind auth buttons and modal views
function setupAuthUI() {
  const modal = document.getElementById("authModal");
  const authChip = document.getElementById("authChip");
  const closeBtn = document.getElementById("closeAuthModal");
  
  const toSignup = document.getElementById("toSignup");
  const toLogin = document.getElementById("toLogin");
  
  const loginView = document.getElementById("loginView");
  const signupView = document.getElementById("signupView");
  const profileView = document.getElementById("userProfileView");
  
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const logoutBtn = document.getElementById("logoutBtn");
  
  // Show / hide modal
  authChip.onclick = () => {
    modal.classList.remove("hidden");
    showAuthView();
  };

  // Landing page CTA buttons → open auth modal
  const openLogin = () => { modal.classList.remove("hidden"); showAuthView(); };
  const openSignup = () => {
    modal.classList.remove("hidden");
    profileView.classList.add("hidden");
    loginView.classList.add("hidden");
    signupView.classList.remove("hidden");
  };
  ["landingLogin", "landingLogin2"].forEach(id => {
    const el = document.getElementById(id); if (el) el.onclick = openLogin;
  });
  const signupBtn = document.getElementById("landingSignup");
  if (signupBtn) signupBtn.onclick = openSignup;
  closeBtn.onclick = () => {
    modal.classList.add("hidden");
  };
  window.onclick = (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  };

  // Switch between views
  toSignup.onclick = (e) => {
    e.preventDefault();
    loginView.classList.add("hidden");
    signupView.classList.remove("hidden");
  };
  toLogin.onclick = (e) => {
    e.preventDefault();
    signupView.classList.add("hidden");
    loginView.classList.remove("hidden");
  };

  function showAuthView() {
    loginView.classList.add("hidden");
    signupView.classList.add("hidden");
    profileView.classList.add("hidden");
    
    if (currentUser) {
      document.getElementById("profileName").textContent = currentUser.raw_user_meta_data?.full_name || currentUser.email.split("@")[0];
      document.getElementById("profileEmail").textContent = currentUser.email;
      const rEl = document.getElementById("profileRole");
      rEl.textContent = userRole === "admin" ? "Quản trị viên" : userRole === "teacher" ? "Giáo viên" : "Học sinh";
      rEl.className = "badge-role " + userRole;
      profileView.classList.remove("hidden");
    } else {
      loginView.classList.remove("hidden");
    }
  }

  // Handle forms
  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const pass = document.getElementById("loginPassword").value;
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    if (error) {
      alert("Đăng nhập thất bại: " + error.message);
    } else {
      modal.classList.add("hidden");
      G() && G().toast("🔑", "Đăng nhập", "Đăng nhập thành công!", "#16c47f");
    }
  };

  signupForm.onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById("signupName").value;
    const email = document.getElementById("signupEmail").value;
    const pass = document.getElementById("signupPassword").value;

    // Đăng ký công khai chỉ tạo tài khoản giáo viên (chờ admin duyệt)
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: name,
          role: "teacher"
        }
      }
    });

    if (error) {
      alert("Đăng ký thất bại: " + error.message);
    } else {
      alert("Đăng ký thành công! Tài khoản giáo viên của bạn đang chờ quản trị viên duyệt. Bạn sẽ vào được app sau khi được duyệt.");
      modal.classList.add("hidden");
      G() && G().toast("📝", "Đăng ký", "Chờ admin duyệt tài khoản", "#ffcb2e");
    }
  };

  logoutBtn.onclick = async () => {
    await supabaseClient.auth.signOut();
    modal.classList.add("hidden");
    G() && G().toast("👋", "Đăng xuất", "Đã đăng xuất tài khoản", "#ff5d73");
  };

  const pendingLogout = document.getElementById("pendingLogout");
  if (pendingLogout) pendingLogout.onclick = async () => {
    await supabaseClient.auth.signOut();
  };
}

// Watch Auth state changes
function setupAuthListeners() {
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    currentUser = session ? session.user : null;
    const authText = document.getElementById("authText");
    const authIcon = document.getElementById("authIcon");
    const tabClassroom = document.getElementById("tabClassroom");
    const tabAdmin = document.getElementById("tabAdmin");

    if (currentUser) {
      // Fetch role + approval status
      const { data: profile, error } = await supabaseClient.from("mathenglish_profiles").select("role, approved").eq("id", currentUser.id).single();
      userRole = (!error && profile) ? profile.role : "student";
      const approved = (!error && profile) ? (profile.approved === true || profile.role === "admin") : false;

      // Cổng duyệt: chưa được duyệt → hiện màn chờ, không cho vào app
      if (!approved) {
        document.body.classList.remove("logged-out", "logged-in");
        document.body.classList.add("pending-approval");
        const pn = document.getElementById("pendingName");
        if (pn) pn.textContent = currentUser.user_metadata?.full_name || currentUser.raw_user_meta_data?.full_name || currentUser.email.split("@")[0];
        return;
      }

      // Đã duyệt → vào app
      document.body.classList.remove("logged-out", "pending-approval");
      document.body.classList.add("logged-in");

      // Update auth chip UI
      authText.textContent = currentUser.raw_user_meta_data?.full_name || currentUser.email.split("@")[0];
      authText.style.maxWidth = "110px";
      authText.style.overflow = "hidden";
      authText.style.textOverflow = "ellipsis";
      authText.style.whiteSpace = "nowrap";
      authIcon.textContent = userRole === "admin" ? "🛠️" : userRole === "teacher" ? "🎓" : "👦";

      // Show role-based tabs
      tabClassroom.classList.toggle("hidden", userRole !== "teacher" && userRole !== "admin");
      tabAdmin.classList.toggle("hidden", userRole !== "admin");

      // Load and apply cloud progress (must not throw — an error here would
      // leave Supabase's auth lock stuck and break logout/login afterwards)
      try { await loadCloudProgress(); } catch (e) { console.error("loadCloudProgress failed:", e); }
    } else {
      // Show landing, hide app
      document.body.classList.add("logged-out");
      document.body.classList.remove("logged-in", "pending-approval");

      // Reset variables
      userRole = "student";
      authText.textContent = "Đăng nhập";
      authIcon.textContent = "👤";

      // Hide tabs
      tabClassroom.classList.add("hidden");
      tabAdmin.classList.add("hidden");

      // Reload local storage progress
      reloadLocalProgress();
    }
  });
}

// Load learning data from Supabase
async function loadCloudProgress() {
  if (!supabaseClient || !currentUser) return;
  const { data: prog, error } = await supabaseClient.from("mathenglish_progress").select("*").eq("user_id", currentUser.id).single();
  if (!error && prog) {
    // Sync store.data (vocabulary, quizzes, speaking, exams)
    store.data.learned = prog.learned || [];
    store.data.quizzes = prog.quizzes || [];
    store.data.speaking = prog.speaking || {};
    store.data.exams = prog.exams || [];
    localStorage.setItem(STORE_KEY, JSON.stringify(store.data));

    // Sync Game.data (XP, level, streak, badges)
    if (window.Game) {
      const gd = window.Game.data;
      gd.xp = prog.xp || 0;
      gd.streak = prog.streak || 0;
      gd.lastDay = prog.last_day;
      gd.badges = prog.badges || [];
      localStorage.setItem("mathenglish_game_v1", JSON.stringify(gd));
      window.Game.updateHUD();
      window.Game.checkBadges();
    }

    // Refresh current UI view
    const activeTab = document.querySelector("#tabs .tab.active")?.dataset.tab;
    const activeMode = document.querySelector(".mode-btn.active")?.dataset.mode;
    if (activeMode === "progress") {
      renderProgress();
    } else if (activeTab === "dictionary") {
      renderDictionary();
    } else if (activeTab === "flashcard") {
      buildDeck();
    } else if (activeTab === "speaking") {
      buildSpeakDeck();
    }
  }
}

// Reload from local storage when logging out
function reloadLocalProgress() {
  store.data = Object.assign(
    { learned: [], quizzes: [], speaking: {}, exams: [] },
    JSON.parse(localStorage.getItem(STORE_KEY) || "{}")
  );
  
  if (window.Game) {
    const GKEY = "mathenglish_game_v1";
    window.Game.data = Object.assign(
      { xp: 0, streak: 0, lastDay: null, badges: [], sound: true, quizPerfect: 0, examPass: 0 },
      JSON.parse(localStorage.getItem(GKEY) || "{}")
    );
    window.Game.updateHUD();
  }

  // Refresh view
  const activeTab = document.querySelector("#tabs .tab.active")?.dataset.tab;
  const activeMode = document.querySelector(".mode-btn.active")?.dataset.mode;
  if (activeMode === "progress") {
    renderProgress();
  } else if (activeTab === "dictionary") {
    renderDictionary();
  } else if (activeTab === "flashcard") {
    buildDeck();
  } else if (activeTab === "speaking") {
    buildSpeakDeck();
  }
}

// Save local changes to Supabase cloud
async function syncToSupabase() {
  if (!supabaseClient || !currentUser) return;
  const data = {
    learned: store.data.learned,
    quizzes: store.data.quizzes,
    speaking: store.data.speaking,
    exams: store.data.exams,
    xp: window.Game?.data.xp || 0,
    streak: window.Game?.data.streak || 0,
    last_day: window.Game?.data.lastDay || null,
    badges: window.Game?.data.badges || [],
    updated_at: new Date().toISOString()
  };
  await supabaseClient.from("mathenglish_progress").update(data).eq("user_id", currentUser.id);
}
window.syncToSupabase = syncToSupabase;

// Redefine store.save to support cloud syncing
const originalStoreSave = store.save;
store.save = function() {
  originalStoreSave.call(store);
  if (window.syncToSupabase) window.syncToSupabase();
};

// Classroom page rendering logic
// Giáo viên/admin tạo tài khoản học sinh (qua server endpoint dùng service role)
const createStudentForm = document.getElementById("createStudentForm");
if (createStudentForm) createStudentForm.onsubmit = async (e) => {
  e.preventDefault();
  const statusEl = document.getElementById("csStatus");
  const submitBtn = document.getElementById("csSubmit");
  const full_name = document.getElementById("csName").value.trim();
  const email = document.getElementById("csEmail").value.trim();
  const password = document.getElementById("csPassword").value;
  if (!supabaseClient) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { statusEl.textContent = "Bạn cần đăng nhập lại."; statusEl.className = "cs-status err"; return; }

  submitBtn.disabled = true; statusEl.textContent = "Đang tạo tài khoản..."; statusEl.className = "cs-status";
  try {
    const res = await fetch("/api/create-student", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + session.access_token },
      body: JSON.stringify({ full_name, email, password })
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      statusEl.textContent = `✓ Đã tạo tài khoản học sinh: ${json.email}`;
      statusEl.className = "cs-status ok";
      createStudentForm.reset();
      G() && G().toast("🎓", "Lớp học", "Đã tạo tài khoản học sinh!", "#16c47f");
      renderClassroom();
    } else {
      statusEl.textContent = "✗ " + (json.error || "Không tạo được tài khoản.");
      statusEl.className = "cs-status err";
    }
  } catch (err) {
    statusEl.textContent = "✗ Lỗi kết nối: " + err.message;
    statusEl.className = "cs-status err";
  } finally {
    submitBtn.disabled = false;
  }
};

async function renderClassroom() {
  const tbody = document.getElementById("studentList");
  tbody.innerHTML = `<tr><td colspan="7" class="empty-note">Đang tải danh sách học sinh...</td></tr>`;
  try {
    const { data: students, error: err1 } = await supabaseClient.from('mathenglish_profiles').select('id, full_name').eq('role', 'student');
    if (err1) throw err1;
    const { data: progress, error: err2 } = await supabaseClient.from('mathenglish_progress').select('*');
    if (err2) throw err2;
    
    const progMap = Object.fromEntries(progress.map(p => [p.user_id, p]));
    if (!students.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-note">Chưa có học sinh nào.</td></tr>`;
      return;
    }
    
    tbody.innerHTML = students.map(s => {
      const p = progMap[s.id] || { xp: 0, learned: [], quizzes: [], speaking: {}, exams: [] };
      let currentLvl = 1;
      while (50 * currentLvl * (currentLvl + 1) <= p.xp) currentLvl++;
      
      const speakVals = Object.values(p.speaking || {});
      const speakGood = speakVals.filter(v => v >= 80).length;
      const speakTotal = speakVals.length;

      return `
        <tr>
          <td><b>${esc(s.full_name)}</b></td>
          <td><span class="badge-role student">Cấp ${currentLvl}</span></td>
          <td>⭐ ${p.xp}</td>
          <td>📚 ${p.learned ? p.learned.length : 0} từ</td>
          <td>✏️ ${p.quizzes ? p.quizzes.length : 0} lượt</td>
          <td>🎤 ${speakGood}/${speakTotal} từ</td>
          <td>🏆 ${p.exams ? p.exams.length : 0} đề</td>
        </tr>
      `;
    }).join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-note" style="color:var(--coral)">Lỗi: ${e.message}</td></tr>`;
  }
}

// Admin Panel rendering logic
async function renderAdminPanel() {
  const tbody = document.getElementById("userList");
  tbody.innerHTML = `<tr><td colspan="5" class="empty-note">Đang tải danh sách người dùng...</td></tr>`;
  try {
    // Chờ duyệt lên đầu, rồi tới vai trò
    const { data: users, error } = await supabaseClient.from('mathenglish_profiles').select('*').order('approved', { ascending: true }).order('role', { ascending: true });
    if (error) throw error;

    tbody.innerHTML = users.map(u => {
      const isMe = u.id === currentUser.id;
      const approved = u.approved === true;
      const apprCell = approved
        ? `<span class="appr-yes">✓ Đã duyệt</span>${isMe ? '' : `<br><button class="btn-approve revoke" data-approve="${u.id}" data-val="false">Huỷ duyệt</button>`}`
        : `<span class="appr-no">⏳ Chờ duyệt</span><br><button class="btn-approve" data-approve="${u.id}" data-val="true">Duyệt</button>`;
      return `
        <tr>
          <td>${esc(u.email || "N/A")}</td>
          <td><b>${esc(u.full_name || "N/A")}</b></td>
          <td><span class="badge-role ${u.role}">${u.role}</span></td>
          <td>${apprCell}</td>
          <td>
            <select class="change-role-select" data-uid="${u.id}" ${isMe ? 'disabled' : ''}>
              <option value="student" ${u.role === 'student' ? 'selected' : ''}>Student</option>
              <option value="teacher" ${u.role === 'teacher' ? 'selected' : ''}>Teacher</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </td>
        </tr>
      `;
    }).join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-note" style="color:var(--coral)">Lỗi: ${e.message}</td></tr>`;
  }
}

// Bind admin panel change role select
document.getElementById("adminPanel").addEventListener("change", async (e) => {
  const sel = e.target.closest(".change-role-select");
  if (!sel) return;
  const uid = sel.dataset.uid;
  const newRole = sel.value;
  
  if (confirm(`Bạn muốn thay đổi vai trò của người dùng này thành ${newRole.toUpperCase()}?`)) {
    const { error } = await supabaseClient.from("mathenglish_profiles").update({ role: newRole }).eq("id", uid);
    if (error) {
      alert("Lỗi: " + error.message);
      renderAdminPanel();
    } else {
      G() && G().toast("⚙️", "Admin", "Đã cập nhật vai trò!", "#16c47f");
      renderAdminPanel();
    }
  } else {
    renderAdminPanel();
  }
});

// Bind admin panel approve / revoke buttons
document.getElementById("adminPanel").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-approve]");
  if (!btn) return;
  const uid = btn.dataset.approve;
  const val = btn.dataset.val === "true";
  const msg = val ? "Duyệt tài khoản này cho phép vào app?" : "Huỷ duyệt tài khoản này? Người dùng sẽ không vào được app.";
  if (!confirm(msg)) return;
  const { error } = await supabaseClient.from("mathenglish_profiles").update({ approved: val }).eq("id", uid);
  if (error) {
    alert("Lỗi: " + error.message);
  } else {
    G() && G().toast(val ? "✅" : "🚫", "Admin", val ? "Đã duyệt tài khoản!" : "Đã huỷ duyệt", val ? "#16c47f" : "#ff5d73");
  }
  renderAdminPanel();
});

// Kick off Supabase setup
initSupabase();

