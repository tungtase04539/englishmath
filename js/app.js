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
const audioCache = {};
function speak(word) {
  const key = word.toLowerCase().trim();
  const cached = audioCache[key];
  if (cached) playAudio(cached, word);
  else ttsSpeak(word);
  prefetchAudio(word);
}
function playAudio(src, word) {
  try { const a = new Audio(src); const p = a.play(); if (p && p.catch) p.catch(() => ttsSpeak(word)); }
  catch (e) { ttsSpeak(word); }
}
async function prefetchAudio(word) {
  const key = word.toLowerCase().trim();
  if (!audioCache[key]) { const u = await fetchAudioUrl(key); if (u) audioCache[key] = u; }
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
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
let ttsRef = null;
function ttsSpeak(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  if (!enVoice) pickVoice();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9;
  if (enVoice) { u.voice = enVoice; u.lang = enVoice.lang; } else u.lang = "en-US";
  ttsRef = u; speechSynthesis.speak(u);
  if (speechSynthesis.paused) speechSynthesis.resume();
}

// ---------- Mascot intros per screen ----------
const MASCOT_MSG = {
  dictionary: "Tra cứu từ vựng Toán nào! Bấm 🔊 để nghe phát âm nhé.",
  flashcard: "Lật thẻ để học nghĩa. Thuộc rồi thì bấm \"Đã thuộc\" để nhận XP! ✨",
  quiz: "Sẵn sàng kiểm tra chưa? Trả lời đúng được cộng điểm! 💪",
  speaking: "Đọc to và rõ ràng nhé, mình sẽ chấm điểm phát âm cho bạn! 🎤",
  reading: "Đọc hiểu giúp bạn nhớ từ lâu hơn. Bấm vào từ tô màu để nghe.",
  exam: "Thử sức với đề thi quốc tế nào! Mình tin bạn làm được! 🏆",
  progress: "Xem bạn đã tiến bộ thế nào nhé. Cố gắng mở khóa hết huy hiệu! 🌟"
};

// ---------- Mode switching ----------
const ENGLISH_TABS = ["dictionary", "flashcard", "quiz", "speaking", "reading"];
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
  ENGLISH_TABS.forEach(id => document.getElementById(id).classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(btn.dataset.tab).classList.add("active");
  G() && G().sound.click();
  G() && G().mascotSay(MASCOT_MSG[btn.dataset.tab]);
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
const wordList = document.getElementById("wordList");
fillTopicSelect(topicFilter, "Tất cả chủ đề");
function renderDictionary() {
  const q = searchBox.value.toLowerCase().trim();
  const tp = topicFilter.value;
  const items = VOCAB.filter(v => (!tp || v.topic === tp) && (!q || v.word.toLowerCase().includes(q) || v.vi.toLowerCase().includes(q)));
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
wordList.addEventListener("click", e => { const b = e.target.closest(".speak-btn"); if (b) speak(b.dataset.word); });
renderDictionary();

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
function buildSpeakDeck() { const tp = speakTopic.value; speakDeck = VOCAB.filter(v => !tp || v.topic === tp); speakIdx = 0; showSpeak(); }
function showSpeak() {
  const v = speakDeck[speakIdx]; if (!v) return;
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

// ---------- Sound toggle + init ----------
document.getElementById("soundToggle").addEventListener("click", function () {
  const on = !G().soundOn(); G().toggleSound(on);
  this.textContent = on ? "🔊" : "🔇";
  this.title = on ? "Tắt âm thanh" : "Bật âm thanh";
  if (on) G().sound.click();
});
window.addEventListener("DOMContentLoaded", () => {
  G() && G().init();
  const st = document.getElementById("soundToggle");
  if (st) st.textContent = G().soundOn() ? "🔊" : "🔇";
  G() && G().mascotSay(MASCOT_MSG.dictionary);
});
// init may run after DOMContentLoaded already fired
if (window.Game) { window.Game.init(); const st = document.getElementById("soundToggle"); if (st) st.textContent = window.Game.soundOn() ? "🔊" : "🔇"; }
