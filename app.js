// ===== ХРАНИЛИЩЕ =====
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

const BADGE_ICONS = { active: "★", exact: "✓", team: "♡", attention: "◉", idea: "✦" };
const BADGE_NAMES = {
  active: "Активный ответ",
  exact: "Точный ответ",
  team: "Помог команде",
  attention: "Внимание",
  idea: "Смелая гипотеза",
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// ===== ВХОД =====
const TEACHER_PASSWORD = "История";
const loginScreen = $("login-screen");
const appScreen = $("app-screen");
const loginInput = $("login-password");
const loginError = $("login-error");

// Карточки на экране входа
const cardTeacher = $("teacher-login-card");
const cardStudentList = $("student-login-card");
const cardStudentProfile = $("student-profile-card");

// Переключение между карточками на экране входа
$("show-student-login").addEventListener("click", (e) => {
  e.preventDefault();
  renderStudentLoginList();
  cardTeacher.classList.add("hidden");
  cardStudentList.classList.remove("hidden");
});

$("back-to-teacher").addEventListener("click", () => {
  cardStudentList.classList.add("hidden");
  cardTeacher.classList.remove("hidden");
});

$("student-logout").addEventListener("click", () => {
  cardStudentProfile.classList.add("hidden");
  cardStudentList.classList.remove("hidden");
});

// Вход учителя
if (sessionStorage.getItem("quorum_auth") === "yes") {
  loginScreen.style.display = "none";
  appScreen.style.display = "block";
}

$("login-btn").addEventListener("click", () => {
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

loginInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") $("login-btn").click();
});

$("logout").addEventListener("click", () => {
  sessionStorage.removeItem("quorum_auth");
  appScreen.style.display = "none";
  loginScreen.style.display = "flex";
  loginInput.value = "";
  loginInput.focus();
});

// Список учеников для входа
function renderStudentLoginList() {
  const grid = $("student-login-grid");
  const present = S.students.filter(s => s.present).map(s => s.name);
  
  if (!present.length) {
    grid.innerHTML = "<p class='muted' style='text-align:center; grid-column:1/-1;'>Нет отмеченных учеников.</p>";
    return;
  }

  grid.innerHTML = present.map(name => `
    <button class="student-login-btn" onclick="showStudentProfile('${escapeHtml(name)}')">
      ${escapeHtml(name)}
    </button>
  `).join("");
}

// Показ профиля ученика на экране входа
window.showStudentProfile = function(name) {
  cardStudentList.classList.add("hidden");
  cardStudentProfile.classList.remove("hidden");

  $("sp-name").textContent = name;

  // Ищем команду и баллы
  let teamName = "Без команды";
  let teamScore = 0;
  S.teams.forEach((t, i) => {
    if (t.members.includes(name)) {
      teamName = t.name;
      teamScore = S.scores[i] || 0;
    }
  });

  $("sp-team").textContent = teamName;
  $("sp-score").textContent = `${teamScore} б.`;

  // Рисуем значки ученика
  const box = $("sp-badges");
  const counts = S.badges[name] || {};
  const chips = Object.entries(counts)
    .filter(([, c]) => c > 0)
    .map(([type, c]) => `<span class="badge-chip" title="${BADGE_NAMES[type] || type}">${BADGE_ICONS[type] || "•"} ${c}</span>`)
    .join("");

  box.innerHTML = chips || "<span class='muted'>Пока нет значков</span>";
};

// ===== УЧЕНИКИ =====
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
      renderStudentLoginList();
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
  renderStudentLoginList();
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

// ===== КОМАНДЫ =====
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
  renderStudentLoginList();
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

// ===== СЧЁТ =====
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

// ===== ЗНАЧКИ =====
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

// ===== ВЫБОР УЧЕНИКА =====
$("pick").addEventListener("click", () => {
  const present = S.students.filter(s => s.present).map(s => s.name);
  if (!present.length) return alert("Нет отмеченных учеников");
  S.picked = present[Math.floor(Math.random() * present.length)];
  save(S);
  $("picked").textContent = S.picked;
});

// ===== ЗАМЕТКА =====
$("note").value = S.note || "";
$("save-note").addEventListener("click", () => {
  S.note = $("note").value;
  save(S);
  alert("Заметка сохранена");
});

// ===== ОБЩИЙ РЕНДЕР =====
function renderAll() {
  renderStudents();
  renderTeams();
  renderScores();
  renderBadgeSelect();
  renderBadgesTotal();
  renderStudentLoginList();
  $("picked").textContent = S.picked || "—";
  $("note").value = S.note || "";
}

renderAll();
