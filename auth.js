// ===== LOGIN, SIGN UP, LOGOUT and PROFILE =====

// Log in with username + password for the chosen role
function login(e) {
  e.preventDefault();
  const f = e.target,
    u = f.user.value.trim(),
    p = f.pass.value;
  const x = db.users.find((a) => a.user == u && a.pass == p && a.role == ui.role);
  if (!x) {
    ui.err = 'Invalid username or password for ' + ui.role + ' login.';
    return R();
  }
  me = x;
  ui.err = '';
  ui.tab = { customer: 'shop', admin: 'dash', delivery: 'tasks' }[x.role];
  try {
    localStorage.setItem('fc_me', x.id);
  } catch (e) {}
  askPerm();
  R();
}

// Create a new customer account
function signup(e) {
  e.preventDefault();
  const f = e.target,
    u = f.user.value.trim();
  if (db.users.some((a) => a.user == u)) {
    ui.err = 'Username already taken.';
    return R();
  }
  if (f.pass.value.length < 4) {
    ui.err = 'Password must be at least 4 characters.';
    return R();
  }
  const x = {
    id: db.nu++,
    role: 'customer',
    name: f.name.value.trim(),
    user: u,
    pass: f.pass.value,
    phone: f.phone.value,
  };
  db.users.push(x);
  save();
  me = x;
  ui.err = '';
  ui.tab = 'shop';
  try {
    localStorage.setItem('fc_me', x.id);
  } catch (e) {}
  askPerm();
  R();
}

// Log out and clear the session
function logout() {
  me = null;
  ui.ai = false;
  ui.nb = 0;
  ui.ep = 0;
  ui.cart = {};
  ui.cp = null;
  ui.err = '';
  try {
    localStorage.removeItem('fc_me');
  } catch (e) {}
  R();
}

// Login / sign-up screen
function authView() {
  const sg = ui.mode == 'signup';
  return `<div class="auth"><div class="card"><h2 style="margin-top:0">🛒 FreshCart</h2><p class="mu">Fresh groceries, delivered to your door.</p>
<div class="tabs">${['customer', 'admin', 'delivery'].map((r) => `<button class="chip ${ui.role == r ? 'on' : ''}" onclick="ui.role='${r}';ui.mode='login';ui.err='';R()">${r[0].toUpperCase() + r.slice(1)}</button>`).join('')}</div>
${ui.err ? `<p class="err">${ui.err}</p>` : ''}
<form onsubmit="${sg ? 'signup' : 'login'}(event)">${sg ? '<input name="name" placeholder="Full name" required><input name="phone" placeholder="Phone number" required>' : ''}<input name="user" placeholder="Username" required><input name="pass" type="password" placeholder="Password" required><button class="b" style="width:100%">${sg ? 'Create account' : 'Login as ' + ui.role}</button></form>
${ui.role == 'customer' ? `<p class="mu" style="text-align:center">${sg ? 'Have an account?' : 'New here?'} <a href="#" onclick="ui.mode='${sg ? 'login' : 'signup'}';ui.err='';R();return false">${sg ? 'Login' : 'Sign up'}</a></p>` : ''}</div></div>`;
}

// Profile page (all roles)
function prof() {
  const u = me,
    c = u.role == 'customer',
    d = u.role == 'delivery';
  return (
    `<div class="card" style="max-width:520px"><h3 style="margin-top:0">My profile</h3><form onsubmit="saveProf(event)" class="auth" style="margin:0;max-width:none"><label class="mu">Full name</label><input name="name" value="${esc(u.name)}" required><label class="mu">Phone</label><input name="phone" value="${esc(u.phone || '')}">${c ? `<label class="mu">Saved delivery address</label><textarea name="addr" rows="3" style="width:100%;margin-bottom:10px">${esc(u.addr || '')}</textarea>` : ''}${d ? `<label class="mu">Vehicle number</label><input name="veh" value="${esc(u.veh || '')}">` : ''}<label class="mu">New password (leave blank to keep)</label><input name="pass" type="password"><button class="b">Save profile</button></form><p class="mu" style="font-size:13px;margin-bottom:0">Username: ${esc(u.user)} · Role: ${u.role}</p></div>` +
    (u.role == 'admin'
      ? `<div class="card" style="max-width:520px"><h3 style="margin-top:0">Data backup</h3><p class="mu">Users, products, orders and coupons are saved automatically in this browser. Export a backup file to keep a copy or move the data to another computer.</p><button class="b" onclick="expo()">⬇ Export data</button> <label class="b o" style="display:inline-block">⬆ Import<input type="file" accept=".json" hidden onchange="impo(this)"></label></div>`
      : '')
  );
}

// Save profile changes
function saveProf(e) {
  e.preventDefault();
  const f = e.target;
  me.name = f.name.value.trim();
  me.phone = f.phone.value.trim();
  if (f.addr) me.addr = f.addr.value.trim();
  if (f.veh) me.veh = f.veh.value.trim();
  if (f.pass.value) {
    if (f.pass.value.length < 4) return toast('Password needs 4+ characters');
    me.pass = f.pass.value;
  }
  save();
  toast('Profile saved');
  R();
}
