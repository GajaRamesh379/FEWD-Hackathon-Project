// ===== DELIVERY PERSON: assigned orders, status updates & customer ratings =====

// Delivery person moves an order to its next stage
function nextSt(id) {
  const o = db.orders.find((x) => x.id == id),
    i = ST.indexOf(o.status);
  if (i == 2 && o.pay && o.pay.m == 'cod' && o.pay.st != 'Paid' && !confirm('Collected ' + inr(o.total) + ' cash from the customer?')) return;
  if (i < 3) setStatus(id, ST[i + 1]);
}

// Delivery person home: assigned orders + average rating stat
function tasks() {
  const l = db.orders.filter((o) => o.driver == me.id),
    act = l.filter((o) => !['Delivered', 'Cancelled'].includes(o.status)),
    rt = driverRating(me.id);
  return `<div class="stats"><div class="stat"><small>Active deliveries</small><h2>${act.length}</h2></div><div class="stat"><small>Completed</small><h2>${l.filter((o) => o.status == 'Delivered').length}</h2></div><div class="stat"><small>My rating</small><h2>${rt ? '★ ' + rt.avg + ' <small style="font-size:13px">(' + rt.count + ')</small>' : 'New'}</h2></div></div>
${
  l
    .map(
      (
        o,
      ) => `<div class="card"><b>Order #${o.id}</b> · ${esc(o.cn)}${o.ph ? ' · 📞 ' + esc(o.ph) : ''} · ${inr(o.total)} · <b>${payTag(o)}</b><br><span class="mu">📍 ${esc(o.addr)} · 🕒 ${o.slot}</span>${trk(o)}
${o.rating && o.rating.driver ? `<div class="cph" style="margin-top:8px"><span>⭐ Customer rated your delivery: <b>${'★'.repeat(o.rating.driver)} (${o.rating.driver}/5)</b>${o.rating.comment ? ' — “' + esc(o.rating.comment) + '”' : ''}</span></div>` : ''}
${o.status == 'Packed' ? `<button class="b" style="margin-top:8px" onclick="nextSt(${o.id})">Pick up – Out for delivery</button>` : o.status == 'Out for delivery' ? `<div style="margin-top:8px">${(o.hist || []).some((y) => y.s == 'Nearby') ? '' : `<button class="b o" onclick="nearby(${o.id})">📍 I'm nearby</button> `}<button class="b" onclick="nextSt(${o.id})">Mark delivered</button></div>` : o.status == 'Placed' ? '<span class="mu">Waiting for store to pack this order</span>' : ''}</div>`,
    )
    .join('') || '<div class="card">No deliveries assigned yet.</div>'
}`;
}

// Tell the customer the rider is close
function nearby(id) {
  const o = db.orders.find((x) => x.id == id);
  if (!o || o.driver != me.id || o.status != 'Out for delivery' || (o.hist || []).some((y) => y.s == 'Nearby')) return;
  o.hist.push({ s: 'Nearby', t: new Date().toISOString() });
  note(o.uid, 'Your delivery partner is near your address – Order #' + id);
  save();
  toast('Customer notified');
  R();
}
