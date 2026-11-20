const KEY = "quorum_v1";
function load() {
  try { 
    let data = JSON.parse(localStorage.getItem(KEY));
    if (!data) data = { students: [], teams: [], scores: {}, picked: null, badges: {} };
    if (!data.badges) data.badges = {};
    // Поддержка старого формата (если были просто строки)
    data.students = data.students.map(s => typeof s === 'string' ? { name: s, login: s, pass: "123", present: true } : s);
    return data;
  } catch { 
    return { students: [], teams: [], scores: {}, picked: null, badges: {} }; 
  }
}
function save() { localStorage.setItem(KEY, JSON.stringify(S)); }
let S = load();

const $ = (id) => document.getElementById(id);
const BADGE_NAMES = { active: "★", exact: "✓", team: "♡" };

// ВХОД УЧИТЕЛЯ
$("login-btn").addEventListener("click", () => {
  if ($("login-password").value === "История") {
    $("login-screen").style.display = "none";
    $("app-screen").style.display = "block";
    renderAll();
  } else {
    $("login-error").textContent = "Неверный пароль";
  }
});

$("logout").addEventListener("click", () => {
  $("app-screen").style.display = "none";
  $("login-screen").style.display = "flex";
  $("login-password").value = "";
});

// ВХОД УЧЕНИКА
$("show-student-login").addEventListener("click", (e) => {
  e.preventDefault();
  $("teacher-login-card").classList.add("hidden");
  $("student-login-card").classList.remove("hidden");
});

$("back-to-teacher").addEventListener("click", (e) => {
  e.preventDefault();
  $("student-login-card").classList.add("hidden");
  $("teacher-login-card").classList.remove("hidden");
});

$("student-login-btn").addEventListener("click", () => {
  const login = $("student-login-input").value.trim();
  const pass = $("student-password-input").value.trim();
  
  const student = S.students.find(s => s.login === login && s.pass === pass);
  
  if (student) {
    $("student-login-error").textContent = "";
    $("student-login-input").value = "";
    $("student-password-input").value = "";
    showProfile(student.name);
  } else {
    $("student-login-error").textContent = "Неверный логин или пароль";
  }
});

$("student-logout").addEventListener("click", () => {
  $("student-profile-card").classList.add("hidden");
  $("student-login-card").classList.remove("hidden");
});

// ОТОБРАЖЕНИЕ ПРОФИЛЯ
window.showProfile = (name) => {
  $("student-login-card").classList.add("hidden");
  $("student-profile-card").classList.remove("hidden");
  $("sp-name").textContent = name;

  let teamName = "Без команды", score = 0;
  S.teams.forEach((t, i) => { 
    if (t.members.includes(name)) { 
      teamName = t.name; 
      score = S.scores[i] || 0; 
    } 
  });
  $("sp-team").textContent = teamName;
  $("sp-score").textContent = score + " б.";

  const counts = S.badges[name] || {};
  $("sp-badges").innerHTML = Object.entries(counts)
    .map(([t, c]) => `<span class="badge-chip">${BADGE_NAMES[t]} ${c}</span>`)
    .join("") || "Пока нет значков";
};

// ДОБАВЛЕНИЕ УЧЕНИКОВ
$("add-names").addEventListener("click", () => {
  const lines = $("names-input").value.split("\n").map(x => x.trim()).filter(Boolean);
  lines.forEach(line => {
    const parts = line.split(",").map(x => x.trim());
    if (parts.length >= 1) {
      const name = parts[0];
      const login = parts[1] || name.toLowerCase().replace(/\s+/g, '');
      const pass = parts[2] || "123";
      S.students.push({ name, login, pass, present: true });
    }
  });
  $("names-input").value = "";
  save(); renderAll();
});

$("clear-all").addEventListener("click", () => {
  if (confirm("Удалить всё?")) { 
    S = { students: [], teams: [], scores: {}, picked: null, badges: {} }; 
    save(); renderAll(); 
  }
});

// РЕНДЕР СПИСКА УЧЕНИКОВ
function renderStudents() {
  $("students-list").innerHTML = S.students.map((s, i) => `
    <li><label><input type="checkbox" ${s.present ? "checked" : ""} onchange="togglePresent(${i}, this.checked)"> ${s.name} <span style="color:var(--muted);font-size:12px">(${s.login})</span></label></li>
  `).join("");
}
window.togglePresent = (i, val) => { S.students[i].present = val; save(); };

// КОМАНДЫ
$("split").addEventListener("click", () => {
  const present = S.students.filter(s => s.present).map(s => s.name);
  if (!present.length) return alert("Нет учеников!");
  const n = Number($("n-groups").value);
  present.sort(() => Math.random() - 0.5);
  const teams = Array.from({ length: n }, () => []);
  present.forEach((name, i) => teams[i % n].push(name));
  
  S.teams = teams.map((m, i) => ({ name: `Команда ${i + 1}`, members: m }));
  S.scores = {}; teams.forEach((_, i) => S.scores[i] = 0);
  save(); renderAll();
});

function renderTeams() {
  $("teams").innerHTML = S.teams.map(t => `
    <div class="team"><h3>${t.name}</h3><ul>${t.members.map(m => `<li>${m}</li>`).join("")}</ul></div>
  `).join("");
}

// ЗНАЧКИ
$("give-badge").addEventListener("click", () => {
  const name = $("badge-student").value;
  const type = $("badge-type").value;
  if (!name) return;
  if (!S.badges[name]) S.badges[name] = {};
  S.badges[name][type] = (S.badges[name][type] || 0) + 1;
  save(); renderAll();
});

function renderBadges() {
  const present = S.students.filter(s => s.present).map(s => s.name);
  $("badge-student").innerHTML = present.map(n => `<option value="${n}">${n}</option>`).join("");
  $("badges-total").innerHTML = Object.entries(S.badges).map(([name, counts]) => `
    <div class="badge-row"><span>${name}</span><span>${Object.entries(counts).map(([t, c]) => `${BADGE_NAMES[t]} ${c}`).join(" ")}</span></div>
  `).join("");
}

// СЧЁТ
function renderScores() {
  $("scores").innerHTML = S.teams.map((t, i) => `
    <div><span>${t.name}</span><span>${S.scores[i] || 0}</span></div>
  `).join("");
}

// ВЫБОР
$("pick").addEventListener("click", () => {
  const present = S.students.filter(s => s.present).map(s => s.name);
  if (!present.length) return;
  S.picked = present[Math.floor(Math.random() * present.length)];
  save(); $("picked").textContent = S.picked;
});

// ОБЩИЙ РЕНДЕР
function renderAll() {
  renderStudents(); renderTeams(); renderBadges(); renderScores();
  $("picked").textContent = S.picked || "—";
}
renderAll();
