// ===== NOTIFICATIONS: bell icon, yellow bar, updates across browser tabs =====

// Add a notification for one user (id) or a whole role ("r:admin")
function note(to, msg) {
  db.notes.unshift({ id: Date.now() + Math.random(), to, msg, t: new Date().toISOString(), r: 0 });
  db.notes = db.notes.slice(0, 200);
}

// Notifications that belong to the logged-in user
const mine = () => db.notes.filter((n) => n.to === me.id || n.to === 'r:' + me.role);

// Turn a time into "5 min ago"
const ago = (t) => {
  const m = Math.round((Date.now() - new Date(t)) / 6e4);
  return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : new Date(t).toLocaleString();
};

// Mark all notifications as read
function readAll() {
  mine().forEach((n) => (n.r = 1));
  save();
  ui.nb = 0;
  R();
}

// Yellow notification bar + notification list
function bar() {
  const l = mine(),
    u = l.filter((n) => !n.r);
  let h = permBar();
  if (u.length)
    h += `<div class="nbar">🔔 <span>${esc(u[0].msg)} <small>· ${ago(u[0].t)}</small></span><button onclick="readAll()">${u.length > 1 ? 'Mark all read (' + u.length + ')' : 'Dismiss'}</button></div>`;
  if (ui.nb)
    h += `<div class="card"><b>Notifications</b>${
      l
        .slice(0, 15)
        .map(
          (n) => `<div class="ni ${n.r ? '' : 'un'}">${esc(n.msg)}<small>${ago(n.t)}</small></div>`,
        )
        .join('') || '<p class="mu">No notifications yet.</p>'
    }</div>`;
  return h;
}

window.addEventListener('storage', (e) => {
  if (e.key != K || !me) return;
  try {
    db = JSON.parse(e.newValue) || db;
    db.notes = db.notes || [];
    db.spins = db.spins || [];
  } catch (x) {
    return;
  }
  me = db.users.find((u) => u.id == me.id);
  if (!me) return logout();
  R(1);
});

// ---- Popup alerts (in-app popup + system notification + tab title badge) ----
let seen = new Set(),
  seenFor = null;

function askPerm() {
  try {
    if (window.Notification && Notification.permission == 'default') Notification.requestPermission().then(() => R());
  } catch (e) {}
}

function permBar() {
  return window.Notification && Notification.permission == 'default'
    ? '<div class="nbar">🔔 <span>Turn on popup alerts to get order updates even when this tab is in the background.</span><button onclick="askPerm()">Enable</button></div>'
    : '';
}

function popup(n) {
  let box = $('#pop');
  if (!box) {
    document.body.insertAdjacentHTML('beforeend', '<div id="pop"></div>');
    box = $('#pop');
  }
  const d = document.createElement('div');
  d.className = 'pn';
  d.innerHTML = '<b>🔔 FreshCart</b><br>' + esc(n.msg);
  d.onclick = () => d.remove();
  box.appendChild(d);
  setTimeout(() => d.remove(), 6000);
  if (window.Notification && Notification.permission == 'granted' && (document.hidden || !document.hasFocus())) {
    try {
      const x = new Notification('FreshCart', { body: n.msg, tag: String(n.id) });
      x.onclick = () => { window.focus(); x.close(); };
    } catch (e) {}
  }
  try { navigator.vibrate && navigator.vibrate(120); } catch (e) {}
}

// Called after every render: pop up each new unread notification exactly once
function checkNew() {
  if (!me) { seenFor = null; return; }
  const l = mine(), u = l.filter((n) => !n.r);
  if (seenFor !== me.id) {
    l.forEach((n) => seen.add(n.id));
    seenFor = me.id;
  } else {
    u.filter((n) => !seen.has(n.id)).reverse().forEach((n) => { seen.add(n.id); popup(n); });
  }
  document.title = (u.length ? '(' + u.length + ') ' : '') + 'FreshCart – Online Grocery Store';
}
