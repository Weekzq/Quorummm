// ===== Хранилище =====
const KEY = "quorum_v1";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { students: [], teams: [], scores: {}, note: "", picked: null };
    return JSON.parse(raw);
  } catch {
    return { students: [], teams: [], scores: {}, note: "", picked: null };
  }
}

function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

let S = load();

// ===== DOM =====
const $ = (id) => document.getElementById(id);
const list = $("students-list");
const teamsBox = $("teams");
const scoresBox = $("scores");

// ===== Ученики =====
function renderStudents() {
  list.innerHTML = S.students.map((s, i) => `
    <li>
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
        <input type="checkbox" data-id="${i}" ${s.present ? "checked" : ""}>
        <span>${escapeHtml(s.name)}</span>
      </label>
    </li>
  `).join("");

  list.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", (e) => {
      const i = Number(e.target.dataset.id);
      S.students[i].present = e.target.checked;
      save(S);
    });
  });
}

$("add-names").addEventListener("click", () => {
  const raw = $("names-input").value;
  const names = raw.split("\n").map(x => x.trim()).filter(Boolean);
  if (!names.length) return;
  names.forEach(n => S.students.push({ name: n, present: true }));
  $("names-input").value = "";
  save(S);
  renderStudents();
});

$("clear-all").addEventListener("click", () => {
  if (!confirm("Удалить всех учеников и команды?")) return;
  S = { students: [], teams: [], scores: {}, note: "", picked: null };
  save(S);
  renderAll();
});

$("save-presence").addEventListener("click", () => {
  save(S);
  alert("Присутствие сохранено");
});

// ===== Команды =====
function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

$("split").addEventListener("click", () => {
  const n = Math.max(2, Math.min(10, Number($("n-groups").value) || 3));
  const present = S.students.filter(s => s.present).map(s => s.name);
  if (!present.length) return alert("Нет отмеченных учеников");

  const shuffled = shuffle(present);
  const teams = Array.from({ length: n }, () => []);
  shuffled.forEach((name, i) => teams[i % n].push(name));

  S.teams = teams.map((members, i) => ({ name: `Команда ${i + 1}`, members }));
  S.scores = {};
  S.teams.forEach((_, i) => { S.scores[i] = 0; });
  save(S);
  renderTeams();
  renderScores();
});

function renderTeams() {
  if (!S.teams.length) { teamsBox.innerHTML = ""; return; }
  teamsBox.innerHTML = S.teams.map(t => `
    <div class="team">
      <h3>${escapeHtml(t.name)}</h3>
      <ul>${t.members.map(m => `<li>${escapeHtml(m)}</li>`).join("")}</ul>
    </div>
  `).join("");
}

// ===== Счёт =====
function renderScores() {
  if (!S.teams.length) { scoresBox.innerHTML = ""; return; }
  scoresBox.innerHTML = S.teams.map((t, i) => `
    <div>
      <span>${escapeHtml(t.name)}</span>
      <span class="pts">${S.scores[i] ?? 0}</span>
      <span class="ctl">
        <button class="plus" data-team="${i}" data-delta="1">+</button>
        <button class="minus" data-team="${i}" data-delta="-1">−</button>
      </span>
    </div>
  `).join("");

  scoresBox.querySelectorAll("button").forEach(b => {
    b.addEventListener("click", () => {
      const i = Number(b.dataset.team);
      const d = Number(b.dataset.delta);
      S.scores[i] = (S.scores[i] ?? 0) + d;
      save(S);
      renderScores();
    });
  });
}

// ===== Выбор ученика =====
$("pick").addEventListener("click", () => {
  const present = S.students.filter(s => s.present).map(s => s.name);
  if (!present.length) return alert("Нет отмеченных учеников");
  S.picked = present[Math.floor(Math.random() * present.length)];
  save(S);
  $("picked").textContent = S.picked;
});

// ===== Заметка =====
$("note").value = S.note || "";
$("save-note").addEventListener("click", () => {
  S.note = $("note").value;
  save(S);
  alert("Заметка сохранена");
});

// ===== Общий рендер =====
function renderAll() {
  renderStudents();
  renderTeams();
  renderScores();
  $("picked").textContent = S.picked || "—";
  $("note").value = S.note || "";
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

renderAll();