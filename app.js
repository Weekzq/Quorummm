// ===== ВХОД =====
const TEACHER_PASSWORD = "История";
const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");
const loginInput = document.getElementById("login-password");
const loginError = document.getElementById("login-error");

// Проверяем, входил ли уже (сессия)
if (sessionStorage.getItem("quorum_auth") === "yes") {
  loginScreen.style.display = "none";
  appScreen.style.display = "block";
}

document.getElementById("login-btn").addEventListener("click", () => {
  if (loginInput.value === TEACHER_PASSWORD) {
    sessionStorage.setItem("quorum_auth", "yes");
    loginScreen.style.display = "none";
    appScreen.style.display = "block";
    loginError.textContent = "";
  } else {
    loginError.textContent = "Неверный пароль";
    loginInput.value = "";
    loginInput.focus();
  }
});

// Ввод по Enter
loginInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") document.getElementById("login-btn").click();
});

// Кнопка Выйти
document.getElementById("logout").addEventListener("click", () => {
  sessionStorage.removeItem("quorum_auth");
  appScreen.style.display = "none";
  loginScreen.style.display = "flex";
  loginInput.value = "";
  loginInput.focus();
});


// ===== ОСНОВНАЯ ЛОГИКА =====
const KEY = "quorum_v1";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { students: [], teams: [], scores: {}, note: "", picked: null, badges: {} };
    const data = JSON.parse(raw);
    if (!data.badges) data.badges = {};
    return data;
  } catch {
    return { students: [], teams: [], scores: {}, note: "", picked: null, badges: {} };
  }
}

function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

let S = load();

const $ = (id) => document.getElementById(id);
const list = $("students-list");
const teamsBox = $("teams");
const scoresBox = $("scores");

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
      renderBadgeSelect();
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
  renderBadgeSelect();
});

$("clear-all").addEventListener("click", () => {
  if (!confirm("Удалить всех учеников и команды?")) return;
  S = { students: [], teams: [], scores: {}, note: "", picked: null, badges: {} };
  save(S);
  renderAll();
});

$("save-presence").addEventListener("click", () => {
  save(S);
  alert("Присутствие сохранено");
});

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

const BADGE_ICONS = { active: "★", exact: "✓", team: "♡", attention: "◉", idea: "✦" };
const BADGE_NAMES = {
  active: "Активный ответ",
  exact: "Точный ответ",
  team: "Помог команде",
  attention: "Внимание",
  idea: "Смелая гипотеза",
};

function renderBadgeSelect() {
  const sel = $("badge-student");
  const present = S.students.filter(s => s.present).map(s => s.name);
  sel.innerHTML = present.length
    ? present.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("")
    : `<option value="">— нет отмеченных —</option>`;
}

function renderBadgesTotal() {
  const box = $("badges-total");
  const entries = Object.entries(S.badges || {});
  if (!entries.length) { box.innerHTML = ""; return; }
  box.innerHTML = entries.map(([name, counts]) => {
    const chips = Object.entries(counts)
      .filter(([, c]) => c > 0)
      .map(([type, c]) => `<span class="badge-chip" title="${BADGE_NAMES[type] || type}">${BADGE_ICONS[type] || "•"} ${c}</span>`)
      .join("");
    return `<div class="badge-row"><span>${escapeHtml(name)}</span><span class="chips">${chips || "<span class='muted'>—</span>"}</span></div>`;
  }).join("");
}

$("give-badge").addEventListener("click", () => {
  const name = $("badge-student").value;
  const type = $("badge-type").value;
  if (!name) return alert("Сначала отметь присутствующих");
  if (!S.badges[name]) S.badges[name] = {};
  S.badges[name][type] = (S.badges[name][type] || 0) + 1;
  save(S);
  renderBadgesTotal();
});

$("pick").addEventListener("click", () => {
  const present = S.students.filter(s => s.present).map(s => s.name);
  if (!present.length) return alert("Нет отмеченных учеников");
  S.picked = present[Math.floor(Math.random() * present.length)];
  save(S);
  $("picked").textContent = S.picked;
});

$("note").value = S.note || "";
$("save-note").addEventListener("click", () => {
  S.note = $("note").value;
  save(S);
  alert("Заметка сохранена");
});

function renderAll() {
  renderStudents();
  renderTeams();
  renderScores();
  renderBadgeSelect();
  renderBadgesTotal();
  $("picked").textContent = S.picked || "—";
  $("note").value = S.note || "";
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

renderAll();
