// ===== CUSTOMER: shop, cart, checkout, order tracking, ratings & returns =====

// Add one item to the cart (checks stock)
function add(id) {
  const p = pid(id),
    q = ui.cart[id] || 0;
  if (!p) return;
  if (q >= p.s) return toast('Only ' + p.s + ' in stock');
  ui.cart[id] = q + 1;
  toast(p.n + ' added');
  R();
}

// Change cart quantity by +1 / -1
function chg(id, d) {
  const q = (ui.cart[id] || 0) + d;
  if (q <= 0) delete ui.cart[id];
  else if (q <= pid(id).s) ui.cart[id] = q;
  R();
}

// Calculate subtotal, coupon + daily-spin discount, delivery fee and total
function tot() {
  let sub = 0;
  for (const id in ui.cart) sub += pid(id).p * ui.cart[id];
  const c = ui.cp && db.coupons.find((x) => x.code == ui.cp && x.on);
  const cdisc = c && sub >= c.min ? Math.round((sub * c.pct) / 100) : 0;
  const sp = activeSpin(),
    sdisc = sp && sp.pct ? Math.round((sub * sp.pct) / 100) : 0;
  const disc = Math.min(sub, cdisc + sdisc);
  const fee = !sub || sub - disc >= 500 || (sp && sp.fd) ? 0 : 40;
  return { sub, cdisc, sdisc, disc, fee, total: sub - disc + fee, spid: sp && sub && (sdisc || sp.fd) ? sp.id : 0 };
}

// Apply a coupon code to the cart
function applyCp() {
  const ad = $('#addr');
  if (ad) me.addr = ad.value;
  const v = $('#cp').value.trim().toUpperCase(),
    c = db.coupons.find((x) => x.code == v && x.on);
  if (!c) return toast('Invalid coupon');
  if (tot().sub < c.min) return toast('Minimum order ' + inr(c.min));
  ui.cp = v;
  toast(c.pct + '% discount applied');
  R();
}

// Place the order: reduce stock, save order, send notifications
function place() {
  const t = tot(),
    a = $('#addr').value.trim(),
    sl = $('#slot').value;
  if (!t.sub) return;
  if (!a) return toast('Enter delivery address');
  const pay = readPay(t);
  if (!pay) return;
  const id = db.nid++,
    items = Object.keys(ui.cart).map((k) => {
      const p = pid(k);
      p.s -= ui.cart[k];
      if (p.s < 10) note('r:admin', 'Low stock: ' + p.n + ' (' + p.s + ' left)');
      return { id: p.id, n: p.n, e: p.e, c: p.c, p: p.p, q: ui.cart[k] };
    });
  me.addr = a;
  db.orders.unshift({
    id,
    uid: me.id,
    cn: me.name,
    ph: me.phone || '',
    items,
    ...t,
    code: t.cdisc ? ui.cp : '',
    slot: sl,
    addr: a,
    status: 'Placed',
    pay,
    driver: null,
    date: new Date().toISOString(),
    hist: [{ s: 'Placed', t: new Date().toISOString() }],
  });
  if (t.spid) {
    const s = db.spins.find((x) => x.id == t.spid);
    if (s) s.used = id;
  }
  note(me.id, 'Order #' + id + ' placed successfully – total ' + inr(t.total) + ' · ' + pay.label);
  note('r:admin', 'New order #' + id + ' from ' + me.name + ' (' + inr(t.total) + ')');
  save();
  ui.cart = {};
  ui.cp = null;
  toast('Order placed!');
  go('orders');
}

// Customer cancels an order that is still "Placed"
function cancelMine(id) {
  if (confirm('Cancel this order?')) {
    note('r:admin', 'Customer cancelled order #' + id);
    setStatus(id, 'Cancelled');
  }
}

const tagc = (s) => (s == 'Out for delivery' ? 'Out' : s);

// Delivery tracking line with time of each stage
function trk(o) {
  if (o.status == 'Cancelled') return '<span class="tag Cancelled">Cancelled</span>';
  const i = ST.indexOf(o.status),
    h = o.hist || [],
    nb = o.status == 'Out for delivery' && h.some((y) => y.s == 'Nearby'),
    pc = nb ? 85 : (i / 3) * 100;
  return `${where(o)}<div class="road"><div class="fill" style="width:${pc}%"></div><span class="rider" style="left:${pc}%">${i == 3 ? '🏠' : '🛵'}</span></div><div class="trk">${ST.map(
    (s, k) => {
      const x = h.find((y) => y.s == s);
      return `<i class="${k <= i ? 'on' : ''}">${s}<br><small>${x ? new Date(x.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</small></i>`;
    },
  ).join('')}</div>`;
}

// Star rating badge HTML for products
function starBadge(p) {
  const r = avgRating(p.ratings);
  if (!r) return '<small class="mu" style="font-size:11px">★ New</small>';
  return `<small class="rbadge">★ ${r.avg} <span class="mu">(${r.count})</span></small>`;
}

// One product card in the shop (with realistic product photo & rating)
function pcard(p) {
  return `<div class="card prod">
    <div class="pimg">${p.img ? `<img src="${p.img}" alt="${esc(p.n)}">` : `<div class="e">${p.e}</div>`}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:4px;margin-top:6px">
      <small class="mu" style="font-size:11px">${esc(p.brand || p.c)}</small>
      ${starBadge(p)}
    </div>
    <h4>${esc(p.n)}</h4>
    ${p.unit ? `<small class="mu">${esc(p.unit)}</small>` : ''}
    ${p.desc ? `<div class="mu" style="font-size:12px;margin-top:2px">${esc(p.desc)}</div>` : ''}
    <small class="mu" style="display:block;margin-top:4px">${p.s > 0 ? (p.s < 10 ? '⚠ Only ' + p.s + ' left' : p.s + ' available') : 'Out of stock'}</small>
    <div class="pr">${inr(p.p)}</div>
    <button class="b s" style="width:100%" ${p.s < 1 ? 'disabled' : ''} onclick="add(${p.id})">${p.s < 1 ? 'Out of stock' : '+ Add to cart'}</button>
  </div>`;
}

// Shop page: search, categories, recommendations, products, return policy footer link
function shop() {
  const cats = ['All', ...new Set(db.products.map((p) => p.c))],
    q = ui.q.toLowerCase();
  const list = db.products.filter(
    (p) => (ui.cat == 'All' || p.c == ui.cat) && (p.n.toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q) || (p.desc || '').toLowerCase().includes(q)),
  );
  const mine = db.orders.filter((o) => o.uid == me.id && o.status != 'Cancelled'),
    bc = new Set(mine.flatMap((o) => o.items.map((i) => i.c)));
  const rec = (bc.size ? db.products.filter((p) => bc.has(p.c) && p.s > 0) : db.products).slice(
    0,
    4,
  );
  return `${promo()}<div class="row"><input id="q" placeholder="🔍 Search groceries, brands, ingredients…" value="${esc(ui.q)}" oninput="ui.q=this.value;R(1)" style="flex:1;min-width:200px"><button class="b o s" onclick="openPolicy()">🛡️ Return Policy</button></div>
<div class="row">${cats.map((c) => `<button class="chip ${ui.cat == c ? 'on' : ''}" onclick="ui.cat='${c}';R()">${c}</button>`).join('')}</div>
${!q && ui.cat == 'All' ? `<h3>${bc.size ? 'Recommended for you' : 'Popular picks'}</h3><div class="grid">${rec.map(pcard).join('')}</div><h3>All products</h3>` : ''}
<div class="grid">${list.map(pcard).join('') || '<p class="mu">No products found.</p>'}</div>`;
}

// Cart + checkout page
function cart() {
  const ids = Object.keys(ui.cart),
    t = tot();
  if (!ids.length)
    return '<div class="card">Your cart is empty. <a href="#" onclick="go(\'shop\');return false">Start shopping</a></div>';
  const c = ui.cp && db.coupons.find((x) => x.code == ui.cp);
  return `<div class="two"><div class="card tw"><table><tr><th>Item</th><th>Price</th><th>Qty</th><th>Total</th></tr>${ids
    .map((id) => {
      const p = pid(id);
      return `<tr><td>${p.img ? `<img src="${p.img}" width="32" height="24" style="border-radius:6px;vertical-align:middle;margin-right:6px;object-fit:cover">` : p.e + ' '}${esc(p.n)}<br><small class="mu">${p.s} in stock</small></td><td>${inr(p.p)}</td><td><button class="b s o" onclick="chg(${id},-1)">−</button> ${ui.cart[id]} <button class="b s o" onclick="chg(${id},1)">+</button></td><td>${inr(p.p * ui.cart[id])}</td></tr>`;
    })
    .join('')}</table></div>
<div class="card"><h3 style="margin-top:0">Checkout</h3><div class="row"><input id="cp" placeholder="Coupon code" value="${ui.cp || ''}" style="flex:1;min-width:0"><button class="b o" onclick="applyCp()">Apply</button></div>
${cpHint(t)}
<div class="row" style="display:block"><label class="mu">Delivery slot</label><br><select id="slot" style="width:100%">${SLOTS.map((s) => `<option>${s}</option>`).join('')}</select></div>
<textarea id="addr" rows="3" placeholder="Delivery address" style="width:100%;margin-bottom:10px">${esc(me.addr || '')}</textarea>
${payForm()}
<p>Subtotal: <b>${inr(t.sub)}</b><br>Coupon discount${c && t.cdisc ? ' (' + c.code + ')' : ''}: <b>−${inr(t.cdisc)}</b><br>${t.sdisc ? 'Daily spin reward: <b>−' + inr(t.sdisc) + '</b><br>' : ''}Delivery: <b>${t.fee ? inr(t.fee) : 'FREE'}</b><br><span style="font-size:18px">Total: <b>${inr(t.total)}</b></span></p>
<p class="mu" style="font-size:12px">Free delivery above ₹500. Covered by our <a href="#" onclick="openPolicy();return false">24-hour Return Policy</a>.</p>
<button class="b" style="width:100%" onclick="place()">Place order</button></div></div>`;
}

// Interactive star picker helper
function setStar(key, val) {
  ui.rateStars[key] = val;
  R(1);
}

function starPicker(key, cur) {
  const v = ui.rateStars[key] ?? cur ?? 5;
  return `<span class="stars">${[1, 2, 3, 4, 5]
    .map(
      (n) =>
        `<button type="button" class="sb ${n <= v ? 'on' : ''}" onclick="setStar('${key}',${n})" title="${n} star${n > 1 ? 's' : ''}">★</button>`,
    )
    .join('')}</span>`;
}

// Save delivery person rating + individual product ratings + comment when order is Delivered
function submitRating(e, oid) {
  e.preventDefault();
  const o = db.orders.find((x) => x.id == oid && x.uid == me.id);
  if (!o || o.status != 'Delivered') return;
  const f = e.target;
  const dStar = o.driver ? (ui.rateStars['d_' + oid] ?? 5) : 0;
  const prodRatings = {};
  o.items.forEach((it) => {
    const st = ui.rateStars['p_' + oid + '_' + it.id] ?? 5;
    prodRatings[it.id] = st;
    const p = pid(it.id);
    if (p) {
      p.ratings = (p.ratings || []).filter((r) => r.oid != oid);
      p.ratings.push({
        oid,
        uid: me.id,
        un: me.name,
        stars: st,
        comment: f.comment.value.trim(),
        t: new Date().toISOString(),
      });
    }
  });
  o.rating = {
    driver: dStar,
    products: prodRatings,
    comment: f.comment.value.trim(),
    t: new Date().toISOString(),
  };
  if (o.driver && dStar) {
    note(o.driver, `⭐ ${me.name} rated your delivery ${dStar}/5 on Order #${oid}`);
  }
  note('r:admin', `⭐ Customer ${me.name} rated Order #${oid}${dStar ? ' (Delivery: ' + dStar + '/5)' : ''}`);
  save();
  toast('Thank you for your ratings & feedback!');
  R();
}

// Return request form toggle & submission
function tglReturn(oid) {
  ui.retOpen[oid] = !ui.retOpen[oid];
  R(1);
}

function submitReturn(e, oid) {
  e.preventDefault();
  const o = db.orders.find((x) => x.id == oid && x.uid == me.id);
  if (!o || o.status != 'Delivered') return;
  const f = e.target;
  const picked = [...f.querySelectorAll('input[name=ritem]:checked')].map((x) => Number(x.value));
  if (!picked.length) return toast('Select at least one item to return');
  const itemNames = o.items.filter((i) => picked.includes(i.id)).map((i) => i.n);
  o.ret = {
    status: 'Requested',
    items: picked,
    itemNames,
    reason: f.reason.value,
    note: f.rnote.value.trim(),
    at: new Date().toISOString(),
  };
  ui.retOpen[oid] = false;
  note('r:admin', `↩ Return requested for Order #${oid} (${itemNames.join(', ')}) – ${f.reason.value}`);
  note(me.id, `Return request submitted for Order #${oid}. Store admin will review shortly.`);
  save();
  toast('Return request submitted');
  R();
}

// Rating box rendered automatically when order status is Delivered
function ratingBox(o) {
  if (o.status != 'Delivered') return '';
  const d = o.driver && du(o.driver);
  if (o.rating) {
    return `<div class="rateBox done">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
        <b>⭐ Your Feedback</b>
        <small class="mu">${new Date(o.rating.t).toLocaleDateString()}</small>
      </div>
      ${d && o.rating.driver ? `<div style="margin-top:4px;font-size:13px">🛵 Delivery partner (${esc(d.name)}): <b>${'★'.repeat(o.rating.driver)}${'☆'.repeat(5 - o.rating.driver)}</b> (${o.rating.driver}/5)</div>` : ''}
      <div style="margin-top:4px;font-size:13px">🛒 Products: ${o.items
        .map((it) => {
          const s = (o.rating.products && o.rating.products[it.id]) || 5;
          return `${esc(it.n)} <b>(${s}★)</b>`;
        })
        .join(' · ')}</div>
      ${o.rating.comment ? `<div class="mu" style="font-size:13px;margin-top:4px;font-style:italic">“${esc(o.rating.comment)}”</div>` : ''}
    </div>`;
  }
  return `<form class="rateBox" onsubmit="submitRating(event,${o.id})">
    <div style="font-weight:700;margin-bottom:6px">🎉 Delivered! Rate your experience</div>
    ${
      d
        ? `<div class="il" style="align-items:center"><span>🛵 Delivery partner: <b>${esc(d.name)}</b></span>${starPicker('d_' + o.id, 5)}</div>`
        : ''
    }
    <div style="margin-top:6px;font-size:13px;font-weight:600">Rate ordered products:</div>
    ${o.items
      .map(
        (it) =>
          `<div class="il" style="align-items:center"><span>${it.e} ${esc(it.n)}</span>${starPicker('p_' + o.id + '_' + it.id, 5)}</div>`,
      )
      .join('')}
    <textarea name="comment" rows="2" placeholder="Share any comment about delivery or product quality (optional)…" style="width:100%;margin-top:8px"></textarea>
    <div style="text-align:right;margin-top:8px"><button class="b s">Submit Ratings</button></div>
  </form>`;
}

// Return status / request box on Delivered orders
function returnBox(o) {
  if (o.status != 'Delivered') return '';
  if (o.ret) {
    const col = o.ret.status == 'Approved' || o.ret.status == 'Refunded' ? '' : o.ret.status == 'Rejected' ? 'Cancelled' : 'Placed';
    return `<div class="retBox">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <span>↩ <b>Return ${esc(o.ret.status)}</b> · ${esc((o.ret.itemNames || []).join(', '))}</span>
        <span class="tag ${col}">${esc(o.ret.status)}</span>
      </div>
      <div class="mu" style="font-size:12px;margin-top:4px">Reason: ${esc(o.ret.reason)}${o.ret.note ? ' — “' + esc(o.ret.note) + '”' : ''}</div>
    </div>`;
  }
  if (!ui.retOpen[o.id]) return '';
  return `<form class="retBox" onsubmit="submitReturn(event,${o.id})">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <b>↩ Request Return / Refund</b>
      <a href="#" onclick="openPolicy();return false" style="font-size:12px">View Return Policy</a>
    </div>
    <div class="mu" style="font-size:12px;margin-bottom:6px">Select item(s) to return:</div>
    ${o.items
      .map(
        (it) =>
          `<label style="display:block;font-size:13px;margin:3px 0;cursor:pointer"><input type="checkbox" name="ritem" value="${it.id}" checked> ${it.e} ${esc(it.n)} ×${it.q} (${inr(it.p * it.q)})</label>`,
      )
      .join('')}
    <select name="reason" style="width:100%;margin-top:8px">${RETURN_POLICY.reasons.map((r) => `<option>${esc(r)}</option>`).join('')}</select>
    <textarea name="rnote" rows="2" placeholder="Describe the issue (e.g., damaged pack, spoiled fruit)…" style="width:100%;margin-top:8px"></textarea>
    <div class="row" style="justify-content:flex-end;margin:8px 0 0">
      <button type="button" class="b o s" onclick="tglReturn(${o.id})">Cancel</button>
      <button class="b s">Submit Return</button>
    </div>
  </form>`;
}

// One order in the history list (card style like other delivery apps)
function ordCard(o) {
  const a = act(o),
    open = a || o.status == 'Delivered' || ui.ox[o.id],
    d = o.driver && du(o.driver),
    dr = o.driver && driverRating(o.driver),
    n = o.items.length;
  const cd = o.cdisc != null ? o.cdisc : o.disc || 0;
  return `<div class="card oc"><div class="row ocH"><div class="ocI">${o.items.slice(0, 3).map((i) => i.e).join(' ')}${n > 3 ? '<small>+' + (n - 3) + ' more</small>' : ''}</div>
<div style="flex:1;min-width:160px"><b>Order #${o.id}</b> <span class="tag ${tagc(o.status)}">${o.status}</span>${o.ret ? ` <span class="tag Placed">Return: ${esc(o.ret.status)}</span>` : ''}<div class="mu" style="font-size:13px">${new Date(o.date).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div><div class="mu" style="font-size:13px">${o.items.map((i) => esc(i.n) + ' ×' + i.q).join(', ')}</div></div>
<div style="text-align:right"><b style="font-size:17px">${inr(o.total)}</b><div class="mu" style="font-size:12px">${o.pay ? esc(o.pay.label) + ' · ' + o.pay.st : ''}</div></div></div>
${open ? `<div class="ocD">${o.items.map((i) => `<div class="il"><span>${i.e} ${esc(i.n)} ×${i.q}</span><span>${inr(i.p * i.q)}</span></div>`).join('')}${cd ? `<div class="il mu"><span>Coupon ${esc(o.code || '')}</span><span>−${inr(cd)}</span></div>` : ''}${o.sdisc ? `<div class="il mu"><span>Daily spin reward</span><span>−${inr(o.sdisc)}</span></div>` : ''}<div class="il mu"><span>Delivery</span><span>${o.fee ? inr(o.fee) : 'FREE'}</span></div>
<div class="mu" style="font-size:13px;margin-top:6px">📍 ${esc(o.addr)} · 🕒 ${o.slot}</div>${d ? `<div class="mu" style="font-size:13px">🛵 ${esc(d.name)}${dr ? ` (★ ${dr.avg})` : ''}${d.phone ? ' · 📞 ' + esc(d.phone) : ''}${d.veh ? ' · ' + esc(d.veh) : ''}</div>` : ''}${trk(o)}${ratingBox(o)}${returnBox(o)}</div>` : ''}
<div class="row ocB">${a || o.status == 'Delivered' ? '' : `<button class="b o s" onclick="tglO(${o.id})">${open ? 'Hide details' : 'View details'}</button>`}<button class="b o s" onclick="receipt(${o.id})">🧾 Receipt</button><button class="b s" onclick="reorder(${o.id})">🔁 Reorder</button>${o.status == 'Delivered' && !o.ret ? `<button class="b o s" onclick="tglReturn(${o.id})">↩ Return</button>` : ''}<button class="b o s" onclick="openPolicy()">🛡️ Return Policy</button>${o.status == 'Placed' ? `<button class="b d s" onclick="cancelMine(${o.id})">Cancel</button>` : ''}</div></div>`;
}

const tglO = (id) => {
  ui.ox[id] = !ui.ox[id];
  R(1);
};

// Customer order history page: summary, filters, order cards, return policy banner
function myOrders() {
  const all = db.orders.filter((o) => o.uid == me.id),
    ok = all.filter((o) => o.status != 'Cancelled'),
    F = { All: () => true, Active: act, Delivered: (o) => o.status == 'Delivered', Cancelled: (o) => o.status == 'Cancelled' },
    l = all.filter(F[ui.of] || F.All);
  if (!all.length) return '<div class="card">No orders yet. <a href="#" onclick="go(\'shop\');return false">Start shopping</a> · <a href="#" onclick="openPolicy();return false">Read Return Policy</a></div>';
  return `<div class="stats"><div class="stat"><small>Total orders</small><h2>${all.length}</h2></div><div class="stat"><small>Delivered</small><h2>${all.filter(F.Delivered).length}</h2></div><div class="stat"><small>Total spent</small><h2>${inr(ok.reduce((a, o) => a + o.total, 0))}</h2></div><div class="stat"><small>You saved</small><h2>${inr(ok.reduce((a, o) => a + (o.disc || 0), 0))}</h2></div></div>
<div class="row" style="justify-content:space-between"><div class="row" style="margin:0">${Object.keys(F).map((k) => `<button class="chip ${ui.of == k ? 'on' : ''}" onclick="ui.of='${k}';R(1)">${k} (${all.filter(F[k]).length})</button>`).join('')}</div><button class="b o s" onclick="openPolicy()">🛡️ Return Policy</button></div>${l.map(ordCard).join('') || '<div class="card mu">No orders in this filter.</div>'}`;
}

// Put every item of an old order back in the cart (skips out-of-stock items)
function reorder(id) {
  const o = db.orders.find((x) => x.id == id);
  if (!o || o.uid != me.id) return;
  let n = 0, skip = 0;
  o.items.forEach((i) => {
    const p = pid(i.id),
      q = p ? Math.min(i.q, p.s - (ui.cart[p.id] || 0)) : 0;
    if (q > 0) { ui.cart[p.id] = (ui.cart[p.id] || 0) + q; n++; } else skip++;
  });
  if (!n) return toast('Items are out of stock');
  toast(n + ' item(s) added to cart' + (skip ? ' · ' + skip + ' unavailable' : ''));
  go('cart');
}

// Return Policy Modal
function openPolicy() {
  let el = $('#rp');
  if (!el) {
    document.body.insertAdjacentHTML('beforeend', '<div id="rp" onclick="if(event.target==this)closeRp()"></div>');
    el = $('#rp');
  }
  el.innerHTML = `<div class="card rpb">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h3 style="margin:0">🛡️ FreshCart Return & Refund Policy</h3>
      <button class="b o s" onclick="closeRp()">✕</button>
    </div>
    <p style="margin:10px 0;font-weight:600;color:var(--pd)">${esc(RETURN_POLICY.summary)}</p>
    <ul style="padding-left:18px;margin:8px 0;line-height:1.6">
      ${RETURN_POLICY.rules.map((r) => `<li style="margin-bottom:6px">${esc(r)}</li>`).join('')}
    </ul>
    <div class="cph" style="margin-top:12px"><span>💡 How to return: Go to <b>My Orders</b> → open any delivered order → tap <b>↩ Return</b>.</span></div>
    <div style="text-align:right;margin-top:12px"><button class="b" onclick="closeRp()">Got it</button></div>
  </div>`;
  el.style.display = 'flex';
}
function closeRp() {
  const el = $('#rp');
  if (el) el.style.display = 'none';
}

// Order receipt / invoice (customer, admin; print or save as PDF)
function receipt(id) {
  const o = db.orders.find((x) => x.id == id);
  if (!o || !(me.role == 'admin' || o.uid == me.id || o.driver == me.id)) return;
  const cd = o.cdisc != null ? o.cdisc : o.disc || 0,
    dt = (t) => new Date(t).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  let el = $('#rc');
  if (!el) {
    document.body.insertAdjacentHTML('beforeend', '<div id="rc" onclick="if(event.target==this)closeRc()"></div>');
    el = $('#rc');
  }
  el.innerHTML = `<div class="rcb"><div class="rcp"><div style="text-align:center"><h2 style="margin:0">🛒 FreshCart</h2><div class="mu">Order receipt</div></div><hr>
<div class="row" style="justify-content:space-between;align-items:flex-start"><div><b>Receipt INV-${o.id}</b><br>Order #${o.id}<br>${dt(o.date)}<br>Status: <b>${o.status}</b></div><div style="text-align:right">${esc(o.cn)}<br>${esc(o.ph || '')}<br><span style="font-size:13px">${esc(o.addr)}</span><br><span style="font-size:13px">Slot: ${o.slot}</span></div></div>
<table><tr><th>Item</th><th>Qty</th><th>Price</th><th style="text-align:right">Amount</th></tr>${o.items.map((i) => `<tr><td>${i.e} ${esc(i.n)}</td><td>${i.q}</td><td>${inr(i.p)}</td><td style="text-align:right">${inr(i.p * i.q)}</td></tr>`).join('')}</table>
<hr><div class="il"><span>Subtotal</span><span>${inr(o.sub)}</span></div>${cd ? `<div class="il"><span>Coupon ${esc(o.code || '')}</span><span>−${inr(cd)}</span></div>` : ''}${o.sdisc ? `<div class="il"><span>Daily spin reward</span><span>−${inr(o.sdisc)}</span></div>` : ''}<div class="il"><span>Delivery</span><span>${o.fee ? inr(o.fee) : 'FREE'}</span></div>
<div class="il" style="font-size:18px;font-weight:700;border-top:1px dashed #999;margin-top:6px;padding-top:6px"><span>Total</span><span>${inr(o.total)}</span></div>
<hr><div style="font-size:14px">💳 ${payTxt(o)}${o.pay && o.pay.ref ? '<br>Ref: ' + esc(o.pay.ref) : ''}</div>
<hr><div style="font-size:13px"><b>Order timeline</b>${(o.hist || []).map((h) => `<div class="il"><span>${h.s == 'Nearby' ? 'Delivery partner nearby' : h.s}</span><span>${dt(h.t)}</span></div>`).join('')}</div>
<p style="text-align:center;margin:14px 0 0;font-size:12px" class="mu">24-Hour Freshness Return Policy applies. Thank you for shopping with FreshCart!</p></div>
<div class="row noprint" style="justify-content:center;margin:12px 0 0"><button class="b" onclick="window.print()">🖨 Print / Save as PDF</button><button class="b o" style="background:#fff" onclick="closeRc()">Close</button></div></div>`;
  el.style.display = 'flex';
}
function closeRc() {
  const el = $('#rc');
  if (el) el.style.display = 'none';
}
document.addEventListener('keydown', (e) => {
  if (e.key == 'Escape') {
    closeRc();
    closeRp();
  }
});

// ---- Coupon hints in the cart ----
function useCp(c) {
  $('#cp').value = c;
  applyCp();
}
function cpHint(t) {
  const cs = db.coupons.filter((c) => c.on).sort((a, b) => a.min - b.min),
    nx = cs.find((c) => t.sub < c.min),
    sp = activeSpin();
  return (
    (sp ? `<div class="cph">🎡 Spin reward: ${sp.fd ? 'free delivery' : sp.pct + '% off all items'} (applied)</div>` : '') +
    cs.filter((c) => t.sub >= c.min).map((c) => `<div class="cph ${ui.cp == c.code ? 'on' : ''}"><span>🎟 <b>${esc(c.code)}</b> – ${c.pct}% off unlocked</span>${ui.cp == c.code ? '<b>Applied ✓</b>' : `<button class="b s" onclick="useCp('${esc(c.code)}')">Apply</button>`}</div>`).join('') +
    (nx ? `<div class="cph mu">Add ${inr(nx.min - t.sub)} more to unlock <b>${esc(nx.code)}</b> (${nx.pct}% off)</div>` : '')
  );
}

// ---- Daily spin ----
const WH = [
  { l: '5%', p: 5, w: 18, c: '#2e9e5b' },
  { l: '10%', p: 10, w: 10, c: '#e8a317' },
  { l: 'Free 🛵', p: 0, fd: 1, w: 12, c: '#2a8fd7' },
  { l: '3%', p: 3, w: 20, c: '#d64545' },
  { l: '15%', p: 15, w: 4, c: '#7a3ad1' },
  { l: '7%', p: 7, w: 14, c: '#12a8a0' },
  { l: '12%', p: 12, w: 6, c: '#e8743a' },
  { l: '8%', p: 8, w: 16, c: '#1f7a43' },
];
const today = (s) => new Date(s.t).toDateString() == new Date().toDateString();
const spunToday = () => !!me && (db.spins || []).some((s) => s.uid == me.id && today(s));
const activeSpin = () => me && (db.spins || []).filter((s) => s.uid == me.id && !s.used && new Date(s.exp) > new Date()).pop();

// Home-page banners: spin ready / reward active
function promo() {
  const sp = activeSpin();
  return (
    (spunToday() ? '' : '<div class="nbar">🎡 <span>Your daily spin is ready – win a discount on all items!</span><button onclick="go(\'spin\')">Spin now</button></div>') +
    (sp ? `<div class="nbar" style="background:#e3f4ea;border-color:#b6e0c6;color:#1f5a35">🎉 <span>${sp.fd ? 'Free delivery' : sp.pct + '% off all items'} reward active – applied at checkout. Expires ${new Date(sp.exp).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span></div>` : '')
  );
}

// Spin the wheel (one spin per day; result is saved first, then animated)
function doSpin() {
  if (!me || me.role != 'customer' || spunToday() || ui.spinning) return;
  let r = Math.random() * WH.reduce((a, x) => a + x.w, 0),
    k = 0;
  while (k < WH.length - 1 && (r -= WH[k].w) >= 0) k++;
  const x = WH[k],
    now = new Date(),
    rot = 360 * 6 - (k * 45 + 22.5) + (Math.random() * 20 - 10);
  db.spins.push({ id: Date.now(), uid: me.id, t: now.toISOString(), exp: new Date(+now + 864e5).toISOString(), k, rot, label: x.l, pct: x.p, fd: x.fd ? 1 : 0, used: 0 });
  save();
  ui.spinning = 1;
  $('#wheel').style.transform = 'rotate(' + rot + 'deg)';
  $('#spb').disabled = true;
  setTimeout(() => {
    ui.spinning = 0;
    if (!me) return;
    note(me.id, '🎉 Daily spin: you won ' + (x.fd ? 'free delivery' : x.p + '% off all items') + '! Valid for 24 hours.');
    save();
    R();
  }, 4400);
}

// Daily spin page: wheel, active reward, history
function spinPage() {
  const td = (db.spins || []).filter((s) => s.uid == me.id && today(s)).pop(),
    sp = activeSpin(),
    hs = (db.spins || []).filter((s) => s.uid == me.id).reverse();
  const st = (s) => (s.used ? 'Used in order #' + s.used : new Date(s.exp) > new Date() ? '<b>Active</b>' : 'Expired');
  return `<div class="card" style="text-align:center"><h3 style="margin-top:0">🎡 Daily Spin</h3><p class="mu">Spin once every day to win a discount on all items. Your reward is applied automatically at checkout and is valid for 24 hours.</p>
<div class="wrap"><div class="ptr">▼</div><div class="wheel" id="wheel" style="background:conic-gradient(${WH.map((x, i) => `${x.c} ${i * 45}deg ${(i + 1) * 45}deg`).join(',')});transform:rotate(${td ? td.rot : 0}deg)">${WH.map((x, i) => `<span class="wl" style="transform:rotate(${i * 45 + 22.5}deg) translateY(-92px)">${x.l}</span>`).join('')}</div><div class="hub">SPIN</div></div>
<button class="b" id="spb" onclick="doSpin()" ${td ? 'disabled' : ''}>${td ? 'Come back tomorrow' : 'Spin now'}</button>
${sp ? `<p class="cph" style="justify-content:center;margin-top:14px">🎉 Active reward: <b>${sp.fd ? 'Free delivery' : sp.pct + '% off all items'}</b> · valid until ${new Date(sp.exp).toLocaleString()} <button class="b s" onclick="go('shop')">Shop now</button></p>` : ''}</div>
<div class="card tw"><h3 style="margin-top:0">Spin history</h3><table><tr><th>Date</th><th>Reward</th><th>Valid until</th><th>Status</th></tr>${hs.map((s) => `<tr><td>${new Date(s.t).toLocaleDateString()}</td><td>${s.fd ? 'Free delivery' : s.pct + '% off'}</td><td>${new Date(s.exp).toLocaleString()}</td><td>${st(s)}</td></tr>`).join('') || '<tr><td colspan=4 class="mu">No spins yet.</td></tr>'}</table></div>`;
}

// ---- Payment ----
function payForm() {
  const m = ui.pay,
    i = 'style="width:100%;margin-bottom:10px"';
  return `<label class="mu">Payment method</label><div class="row" style="margin:6px 0 10px">${Object.keys(PAY).map((k) => `<label class="chip ${m == k ? 'on' : ''}" style="cursor:pointer"><input type="radio" name="pm" value="${k}" ${m == k ? 'checked' : ''} onchange="payUI(this.value)" style="display:none">${PAY[k]}</label>`).join('')}</div>
<div id="pu" style="display:${m == 'upi' ? 'block' : 'none'}"><input id="upi" placeholder="UPI ID (name@bank)" ${i}></div>
<div id="pc" style="display:${m == 'card' ? 'block' : 'none'}"><input id="cname" placeholder="Name on card" ${i}><input id="cnum" placeholder="Card number" inputmode="numeric" maxlength="23" ${i}><div class="row"><input id="cexp" placeholder="MM/YY" maxlength="5" style="width:90px"><input id="ccvv" type="password" placeholder="CVV" inputmode="numeric" maxlength="4" style="width:80px"></div></div>
<p class="mu" id="pn" style="font-size:13px;display:${m == 'cod' ? 'block' : 'none'}">Pay cash to the delivery person when your order arrives.</p>`;
}

// Show the right payment fields without redrawing (keeps typed address)
function payUI(v) {
  ui.pay = v;
  $('#pu').style.display = v == 'upi' ? 'block' : 'none';
  $('#pc').style.display = v == 'card' ? 'block' : 'none';
  $('#pn').style.display = v == 'cod' ? 'block' : 'none';
  document.querySelectorAll('input[name=pm]').forEach((r) => r.parentElement.classList.toggle('on', r.value == v));
}

const luhn = (n) => {
  if (n.length < 13 || n.length > 19) return false;
  let s = 0;
  for (let i = 0; i < n.length; i++) {
    let d = +n[n.length - 1 - i];
    if (i % 2) { d *= 2; if (d > 9) d -= 9; }
    s += d;
  }
  return s % 10 == 0;
};

// Validate payment details. Only a masked reference is stored (never full card number or CVV).
function readPay(t) {
  const m = (document.querySelector('input[name=pm]:checked') || {}).value || 'cod';
  ui.pay = m;
  const ok = (info, st) => ({ m, label: PAY[m], info, st, amt: t.total, ref: m == 'cod' ? '' : 'TXN' + Date.now().toString().slice(-8), at: new Date().toISOString() });
  if (m == 'cod') return ok('Pay on delivery', 'Pending');
  if (m == 'upi') {
    const u = $('#upi').value.trim();
    if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(u)) return toast('Enter a valid UPI ID'), null;
    return ok(u, 'Paid');
  }
  const no = $('#cnum').value.replace(/\D/g, ''),
    ex = $('#cexp').value.trim().match(/^(\d{2})\/(\d{2})$/),
    now = new Date();
  if (!$('#cname').value.trim()) return toast('Enter name on card'), null;
  if (!luhn(no)) return toast('Enter a valid card number'), null;
  if (!ex || +ex[1] < 1 || +ex[1] > 12 || new Date(2000 + +ex[2], +ex[1], 1) <= now) return toast('Card expired or invalid expiry'), null;
  if (!/^\d{3,4}$/.test($('#ccvv').value.trim())) return toast('Enter a valid CVV'), null;
  return ok('Card •••• ' + no.slice(-4), 'Paid');
}

const payTxt = (o) => (o.pay ? `${esc(o.pay.label)} · ${esc(o.pay.info)} · <b>${o.pay.st}</b>` : 'Not recorded');
const payTag = (o) => (o.pay ? (o.pay.m == 'cod' && o.pay.st != 'Paid' ? '💵 Collect ' + inr(o.total) + ' cash' : '✅ ' + o.pay.st + ' (' + esc(o.pay.label) + ')') : '');

// Live "where is my order" headline
function where(o) {
  const h = o.hist || [],
    d = o.driver ? du(o.driver).name : '',
    x = h.filter((y) => y.s == 'Delivered').pop(),
    tm = x ? new Date(x.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const m = {
    Placed: '📝 Order received – the store will pack it soon',
    Packed: '📦 Packed' + (d ? ' · ' + esc(d) + ' will pick it up' : ' · waiting for a delivery partner'),
    'Out for delivery': h.some((y) => y.s == 'Nearby') ? '📍 ' + esc(d || 'Your delivery partner') + ' is near your address' : '🛵 On the way with ' + esc(d || 'your delivery partner'),
    Delivered: '🏠 Delivered at ' + tm,
  }[o.status];
  return m ? `<div class="where">${m}</div>` : '';
}
