// ===== APP START: menu bar, main render function R() and start-up =====

// Top menu bar with tabs, bell and logout
function nav(tabs, badge) {
  const u = mine().filter((n) => !n.r).length;
  return `<header><b>🛒 FreshCart</b><nav>${tabs.map((t) => `<button class="${ui.tab == t[0] ? 'on' : ''}" onclick="go('${t[0]}')">${t[1]}${t[0] == 'cart' && badge ? ` (${badge})` : ''}</button>`).join('')}</nav><button onclick="ui.nb=!ui.nb;R()" title="Notifications">🔔${u ? `<sup>${u}</sup>` : ''}</button><span>${esc(me.name)} · ${me.role}</span><button onclick="logout()">Logout</button></header>`;
}

document.body.insertAdjacentHTML('beforeend', '<div id="ai"></div>');

// Animated background (floating groceries on a moving gradient) for every screen
document.body.insertAdjacentHTML(
  'afterbegin',
  '<div id="bg">' +
    [...'🍅🥕🍎🥛🍞🧀🍌🥦🍇🥑🍋🥚🍓🥬🍊🌽']
      .map((e, i) => `<span style="--x:${(i * 6.3 + 3) % 96}%;--s:${24 + ((i * 7) % 26)}px;--d:${16 + ((i * 5) % 14)}s;--l:-${(i * 2.7) % 20}s">${e}</span>`)
      .join('') +
    '</div>',
);

// RENDER: redraws the whole screen for the logged-in role
function R(keep) {
  document.body.classList.toggle('lg', !me);
  for (const id in ui.cart) if (!pid(id)) delete ui.cart[id];
  if (!me) {
    $('#app').innerHTML = authView();
    if ($('#ai').dataset.r) aiR();
    return;
  }
  const n = Object.values(ui.cart).reduce((a, b) => a + b, 0),
    pf = ['prof', '👤 Profile'];
  let h, body;
  if (me.role == 'customer') {
    h = nav([['shop', 'Shop'], ['spin', '🎡 Daily Spin' + (spunToday() ? '' : ' •')], ['cart', 'Cart'], ['orders', 'My Orders'], pf], n);
    body = { shop, spin: spinPage, cart, orders: myOrders, prof }[ui.tab]();
  } else if (me.role == 'admin') {
    h = nav([
      ['dash', 'Dashboard'],
      ['orders', 'Orders'],
      ['products', 'Inventory'],
      ['coupons', 'Discounts'],
      ['cust', 'Customers'],
      ['staff', 'Delivery Staff'],
      pf,
    ]);
    body = {
      dash,
      orders: aOrders,
      products: aProds,
      coupons: aCoupons,
      cust: aCust,
      staff: aStaff,
      prof,
    }[ui.tab]();
  } else {
    h = nav([['tasks', 'My Deliveries'], pf]);
    body = (ui.tab == 'prof' ? prof : tasks)();
  }
  const y = window.scrollY;
  $('#app').innerHTML = h + '<main>' + bar() + body + '</main>';
  if (keep) {
    const q = $('#q');
    if (q) {
      q.focus();
      q.setSelectionRange(q.value.length, q.value.length);
    }
    window.scrollTo(0, y);
  }
  if ($('#ai').dataset.r != me.role) aiR();
  checkNew();
}

R();
