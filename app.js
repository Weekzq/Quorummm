const KEY = "quorum_v1";
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || { students: [], teams: [], scores: {}, picked: null, badges: {} }; }
  catch { return { students: [], teams: [], scores: {}, picked: null, badges: {} }; }
}
function save() { localStorage.setItem(KEY, JSON.stringify(S)); }
let S = load();
if (!S.badges) S.badges = {};

const $ = (id) => document.getElementById(id);
const BADGE_NAMES = { active: "★", exact: "✓", team: "♡" };

// ВХОД
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

// УЧЕНИКИ
$("add-names").addEventListener("click", () => {
  const names = $("names-input").value.split("\n").map(x => x.trim()).filter(Boolean);
  names.forEach(n => S.students.push({ name: n, present: true }));
  $("names-input").value = "";
  save(); renderAll();
});
$("clear-all").addEventListener("click", () => {
  if (confirm("Удалить всё?")) { S = { students: [], teams: [], scores: {}, picked: null, badges: {} }; save(); renderAll(); }
});

function renderStudents() {
  $("students-list").innerHTML = S.students.map((s, i) => `
    <li><label><input type="checkbox" ${s.present ? "checked" : ""} onchange="togglePresent(${i}, this.checked)"> ${s.name}</label></li>
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

// ЛИЧНЫЙ КАБИНЕТ (ВХОД УЧЕНИКА)
$("show-student-login").addEventListener("click", (e) => {
  e.preventDefault();
  $("teacher-login-card").classList.add("hidden");
  $("student-login-card").classList.remove("hidden");
  const present = S.students.filter(s => s.present).map(s => s.name);
  $("student-login-grid").innerHTML = present.map(n => `<button class="student-login-btn" onclick="showProfile('${n}')">${n}</button>`).join("");
});
$("back-to-teacher").addEventListener("click", () => {
  $("student-login-card").classList.add("hidden");
  $("teacher-login-card").classList.remove("hidden");
});
$("student-logout").addEventListener("click", () => {
  $("student-profile-card").classList.add("hidden");
  $("student-login-card").classList.remove("hidden");
});

window.showProfile = (name) => {
  $("student-login-card").classList.add("hidden");
  $("student-profile-card").classList.remove("hidden");
  $("sp-name").textContent = name;

  let teamName = "Без команды", score = 0;
  S.teams.forEach((t, i) => { if (t.members.includes(name)) { teamName = t.name; score = S.scores[i] || 0; } });
  $("sp-team").textContent = teamName;
  $("sp-score").textContent = score + " б.";

  const counts = S.badges[name] || {};
  $("sp-badges").innerHTML = Object.entries(counts).map(([t, c]) => `<span class="badge-chip">${BADGE_NAMES[t]} ${c}</span>`).join("") || "Нет значков";
};

function renderAll() {
  renderStudents(); renderTeams(); renderBadges(); renderScores();
  $("picked").textContent = S.picked || "—";
}
renderAll();
