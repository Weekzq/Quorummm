document.body.style.display = "block"; // Показываем страницу, если скрипт загрузился

const KEY = "quorum_v2"; // НОВЫЙ КЛЮЧ (игнорирует старые данные)
let S = { students: [], teams: [], scores: {}, picked: null, badges: {} };

try {
  const saved = localStorage.getItem(KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed && Array.isArray(parsed.students)) S = parsed;
  }
} catch(e) {}

function save() { localStorage.setItem(KEY, JSON.stringify(S)); }
function $(id) { return document.getElementById(id); }

// ВХОД УЧИТЕЛЯ
$("login-btn").onclick = function() {
  if ($("login-password").value === "История") {
    $("login-screen").style.display = "none";
    $("app-screen").style.display = "block";
    renderAll();
  } else {
    $("login-error").textContent = "Неверный пароль";
  }
};

$("logout").onclick = function() {
  $("app-screen").style.display = "none";
  $("login-screen").style.display = "flex";
  $("login-password").value = "";
};

// ВХОД УЧЕНИКА
$("show-student-login").onclick = function(e) {
  e.preventDefault();
  $("teacher-login-card").classList.add("hidden");
  $("student-login-card").classList.remove("hidden");
};

$("back-to-teacher").onclick = function(e) {
  e.preventDefault();
  $("student-login-card").classList.add("hidden");
  $("teacher-login-card").classList.remove("hidden");
};

$("student-login-btn").onclick = function() {
  const login = $("student-login-input").value.trim().toLowerCase();
  const pass = $("student-password-input").value.trim();
  
  const student = S.students.find(s => s.login && s.login.toLowerCase() === login && s.pass === pass);
  
  if (student) {
    $("student-login-error").textContent = "";
    $("student-login-input").value = "";
    $("student-password-input").value = "";
    showProfile(student.name);
  } else {
    $("student-login-error").textContent = "Неверный логин или пароль";
  }
};

$("student-logout").onclick = function() {
  $("student-profile-card").classList.add("hidden");
  $("student-login-card").classList.remove("hidden");
};

function showProfile(name) {
  $("student-login-card").classList.add("hidden");
  $("student-profile-card").classList.remove("hidden");
  $("sp-name").textContent = name;

  let teamName = "Без команды", score = 0;
  S.teams.forEach((t, i) => { 
    if (t.members.includes(name)) { teamName = t.name; score = S.scores[i] || 0; } 
  });
  
  $("sp-team").textContent = teamName;
  $("sp-score").textContent = score + " б.";

  const counts = S.badges[name] || {};
  const icons = { active: "★", exact: "✓", team: "♡" };
  $("sp-badges").innerHTML = Object.keys(counts)
    .map(k => `<span class="badge-chip">${icons[k] || k} ${counts[k]}</span>`)
    .join("") || "Пока нет значков";
}

// УЧИТЕЛЬ: ДОБАВЛЕНИЕ
$("add-names").onclick = function() {
  const lines = $("names-input").value.split("\n");
  lines.forEach(line => {
    const parts = line.split(",").map(x => x.trim());
    if (parts[0]) {
      S.students.push({ 
        name: parts[0], 
        login: parts[1] || parts[0].toLowerCase().replace(/\s+/g, ''), 
        pass: parts[2] || "123", 
        present: true 
      });
    }
  });
  $("names-input").value = "";
  save(); renderAll();
};

$("clear-all").onclick = function() {
  if (confirm("Удалить всё?")) {
    S = { students: [], teams: [], scores: {}, picked: null, badges: {} };
    save(); renderAll();
  }
};

function renderStudents() {
  $("students-list").innerHTML = S.students.map((s, i) => `
    <li><label style="display:flex; align-items:center; cursor:pointer; width:100%;">
      <input type="checkbox" ${s.present ? "checked" : ""} onchange="toggle(${i})" style="width:18px;height:18px;margin-right:10px;"> 
      ${s.name} <span style="color:#79736a;font-size:12px; margin-left:6px;">(${s.login})</span>
    </label></li>
  `).join("");
}

window.toggle = function(i) {
  S.students[i].present = !S.students[i].present;
  save();
};

$("save-presence").onclick = function() {
  save();
  alert("Присутствие сохранено!");
};

// КОМАНДЫ
$("split").onclick = function() {
  const present = S.students.filter(s => s.present).map(s => s.name);
  if (!present.length) return alert("Нет учеников!");
  const n = Number($("n-groups").value);
  present.sort(() => Math.random() - 0.5);
  const teams = Array.from({ length: n }, () => []);
  present.forEach((name, i) => teams[i % n].push(name));
  
  S.teams = teams.map((m, i) => ({ name: `Команда ${i + 1}`, members: m }));
  S.scores = {}; teams.forEach((_, i) => S.scores[i] = 0);
  save(); renderAll();
};

function renderTeams() {
  $("teams").innerHTML = S.teams.map(t => `
    <div class="team"><h3>${t.name}</h3><ul>${t.members.map(m => `<li>${m}</li>`).join("")}</ul></div>
  `).join("");
}

// ЗНАЧКИ
$("give-badge").onclick = function() {
  const name = $("badge-student").value;
  const type = $("badge-type").value;
  if (!name) return;
  if (!S.badges[name]) S.badges[name] = {};
  S.badges[name][type] = (S.badges[name][type] || 0) + 1;
  save(); renderAll();
};

function renderBadges() {
  const present = S.students.filter(s => s.present).map(s => s.name);
  $("badge-student").innerHTML = present.map(n => `<option value="${n}">${n}</option>`).join("");
  
  const icons = { active: "★", exact: "✓", team: "♡" };
  $("badges-total").innerHTML = Object.keys(S.badges).map(name => `
    <div class="badge-row"><span>${name}</span><span class="chips">${Object.keys(S.badges[name]).map(t => `<span class="badge-chip">${icons[t]} ${S.badges[name][t]}</span>`).join(" ")}</span></div>
  `).join("");
}

// СЧЁТ
function renderScores() {
  $("scores").innerHTML = S.teams.map((t, i) => `
    <div>
      <span>${t.name}</span>
      <span class="pts">${S.scores[i] || 0}</span>
      <span class="ctl">
        <button onclick="addScore(${i}, 1)" class="plus">+</button> 
        <button onclick="addScore(${i}, -1)" class="minus">−</button>
      </span>
    </div>
  `).join("");
}

window.addScore = function(i, d) {
  S.scores[i] = (S.scores[i] || 0) + d;
  save(); renderScores();
};

// ВЫБОР
$("pick").onclick = function() {
  const present = S.students.filter(s => s.present).map(s => s.name);
  if (!present.length) return alert("Нет учеников!");
  S.picked = present[Math.floor(Math.random() * present.length)];
  save(); $("picked").textContent = S.picked;
};

function renderAll() {
  renderStudents(); renderTeams(); renderBadges(); renderScores();
  $("picked").textContent = S.picked || "—";
}

renderAll();
