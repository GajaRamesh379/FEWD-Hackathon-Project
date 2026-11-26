// ===== ADMIN: dashboard, orders, inventory, coupons, customers, staff, returns, ratings, backup =====

// Change an order status and notify the customer
function setStatus(id, s) {
  const o = db.orders.find((x) => x.id == id);
  if (o.status == s) return;
  if (me.role == 'customer' && (s != 'Cancelled' || o.status != 'Placed')) return;
  if (s == 'Cancelled')
    o.items.forEach((i) => {
      const p = pid(i.id);
      if (p) p.s += i.q;
    });
  o.status = s;
  if (s == 'Cancelled' && o.spid) {
    const r = (db.spins || []).find((x) => x.id == o.spid);
    if (r && new Date(r.exp) > new Date()) r.used = 0;
  }
  if (o.pay) {
    if (s == 'Delivered' && o.pay.m == 'cod') {
      o.pay.st = 'Paid';
      note('r:admin', 'Cash ' + inr(o.total) + ' collected for order #' + id);
    }
    if (s == 'Cancelled') o.pay.st = o.pay.m == 'cod' ? 'Cancelled' : 'Refund due';
  }
  (o.hist = o.hist || []).push({ s, t: new Date().toISOString() });
  const m = {
    Packed: 'is packed and ready',
    'Out for delivery': 'is out for delivery 🛵',
    Delivered: 'was delivered. Enjoy! 🎉 Please rate your delivery and products in My Orders.',
    Cancelled: 'was cancelled',
  };
  if (m[s]) note(o.uid, 'Order #' + id + ' ' + m[s]);
  if (o.driver && s == 'Packed') note(o.driver, 'Order #' + id + ' is packed – ready for pickup');
  if (s == 'Delivered') note('r:admin', 'Order #' + id + ' delivered');
  save();
  R();
}

// Assign a delivery person to an order
function assign(id, v) {
  if (!adm()) return;
  const o = db.orders.find((x) => x.id == id);
  o.driver = v ? +v : null;
  if (v) {
    note(+v, 'New delivery assigned: Order #' + id + ' (' + o.slot + ')');
    note(o.uid, 'Order #' + id + ' will be delivered by ' + du(+v).name);
  }
  save();
  toast('Delivery person assigned');
  R();
}

// Update a customer return request (Approved, Refunded, Rejected)
function setReturnStatus(id, st) {
  if (!adm()) return;
  const o = db.orders.find((x) => x.id == id);
  if (!o || !o.ret) return;
  o.ret.status = st;
  o.ret.updatedAt = new Date().toISOString();
  if (st == 'Refunded' && o.pay) {
    o.pay.st = 'Refunded';
  }
  note(o.uid, `↩ Return request for Order #${id} is now ${st}`);
  save();
  toast('Return status: ' + st);
  R();
}

// Admin dashboard: sales, orders, discounts, low stock, pending returns, average rating
function dash() {
  const ok = db.orders.filter((o) => o.status != 'Cancelled'),
    rev = ok.reduce((a, o) => a + o.total, 0),
    ds = ok.reduce((a, o) => a + o.disc, 0),
    low = db.products.filter((p) => p.s < 10).length,
    cod = ok.filter((o) => o.pay && o.pay.m == 'cod' && o.pay.st != 'Paid').reduce((a, o) => a + o.total, 0),
    onl = ok.filter((o) => o.pay && o.pay.m != 'cod').reduce((a, o) => a + o.total, 0),
    rets = db.orders.filter((o) => o.ret && o.ret.status == 'Requested').length;
  const bycat = {};
  ok.forEach((o) => o.items.forEach((i) => (bycat[i.c] = (bycat[i.c] || 0) + i.p * i.q)));
  const mx = Math.max(1, ...Object.values(bycat));
  return `<div class="stats"><div class="stat"><small>Total sales</small><h2>${inr(rev)}</h2></div><div class="stat"><small>Orders</small><h2>${ok.length}</h2></div><div class="stat"><small>Discounts given</small><h2>${inr(ds)}</h2></div><div class="stat"><small>Pending orders</small><h2>${db.orders.filter((o) => o.status == 'Placed').length}</h2></div><div class="stat"><small>Low stock items</small><h2>${low}</h2></div><div class="stat"><small>COD to collect</small><h2>${inr(cod)}</h2></div><div class="stat"><small>Online payments</small><h2>${inr(onl)}</h2></div><div class="stat"><small>Return requests</small><h2>${rets}</h2></div></div>
<div class="card"><h3 style="margin-block-start:0">Sales by category</h3>${
    Object.keys(bycat)
      .map(
        (c) =>
          `<div class="row"><span style="inline-size:100px">${c}</span><div style="flex:1"><div class="bar" style="inline-size:${(bycat[c] / mx) * 100}%"></div></div><b>${inr(bycat[c])}</b></div>`,
      )
      .join('') || '<p class="mu">No sales yet.</p>'
  }</div>`;
}

// Admin orders table (includes ratings, comments, and return management)
function aOrders() {
  const dv = db.users.filter((u) => u.role == 'delivery');
  return `<div class="card tw"><table><tr><th>#</th><th>Customer & Feedback</th><th>Total</th><th>Slot</th><th>Payment</th><th>Status</th><th>Delivery person</th></tr>${
    db.orders
      .map(
        (
          o,
        ) => `<tr><td>${o.id}</td><td>${esc(o.cn)}<br><small class="mu">${esc(o.ph || '')} · ${esc(o.addr)}</small><br><small>${o.items.map((i) => esc(i.n) + ' ×' + i.q).join(', ')}</small>
        ${o.rating ? `<div class="mu" style="font-size:12px;margin-top:4px">⭐ Delivery: <b>${o.rating.driver || '—'}/5</b>${o.rating.comment ? ' · “' + esc(o.rating.comment) + '”' : ''}</div>` : ''}
        ${
          o.ret
            ? `<div style="margin-top:4px;font-size:12px;background:#fff3d6;padding:4px 8px;border-radius:6px">
                ↩ <b>Return (${esc(o.ret.status)}):</b> ${esc((o.ret.itemNames || []).join(', '))} — <i>${esc(o.ret.reason)}</i>
                <select onchange="setReturnStatus(${o.id},this.value)" style="margin-left:6px;padding:2px 6px;font-size:12px">
                  ${['Requested', 'Approved', 'Refunded', 'Rejected'].map((rs) => `<option ${rs == o.ret.status ? 'selected' : ''}>${rs}</option>`).join('')}
                </select>
              </div>`
            : ''
        }
        <div style="margin-top:4px"><button class="b o s" onclick="receipt(${o.id})">🧾 Receipt</button></div></td><td>${inr(o.total)}</td><td>${o.slot}</td><td>${payTxt(o)}</td>
<td><select onchange="setStatus(${o.id},this.value)">${[...ST, 'Cancelled'].map((s) => `<option ${s == o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
<td><select onchange="assign(${o.id},this.value)"><option value="">Unassigned</option>${dv.map((d) => `<option value="${d.id}" ${o.driver == d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></td></tr>`,
      )
      .join('') || '<tr><td colspan=7 class="mu">No orders yet.</td></tr>'
  }</table></div>`;
}

// Quick edit of price/stock in the inventory table
function upd(id, k, v) {
  if (!adm()) return;
  const p = pid(id);
  p[k] = Math.max(0, +v);
  save();
  toast('Updated');
}

// Add a new product or update an existing one
function saveProd(e) {
  if (!adm()) return;
  e.preventDefault();
  const f = e.target,
    fi = f.img.files[0];
  const fin = (img) => {
    const d = {
      n: f.n.value.trim(),
      e: f.e.value || '🛍️',
      c: f.c.value.trim(),
      brand: f.brand.value.trim(),
      unit: f.unit.value.trim(),
      p: +f.p.value,
      s: +f.s.value,
      desc: f.desc.value.trim(),
    };
    if (img) d.img = img;
    if (ui.ep) Object.assign(pid(ui.ep), d);
    else db.products.push({ id: db.np++, ratings: [], ...d });
    save();
    toast(ui.ep ? 'Product updated' : 'Product added');
    ui.ep = 0;
    R();
  };
  if (!fi) return fin();
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas'),
        k = Math.min(1, 240 / Math.max(im.width, im.height));
      c.width = im.width * k;
      c.height = im.height * k;
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      fin(c.toDataURL('image/jpeg', 0.8));
    };
    im.src = r.result;
  };
  r.readAsDataURL(fi);
}

// Delete a product
function delProd(id) {
  if (!adm()) return;
  if (confirm('Delete product?')) {
    db.products = db.products.filter((p) => p.id != id);
    delete ui.cart[id];
    save();
    R();
  }
}

// Admin inventory page (form + table with photos & ratings)
function aProds() {
  const ep = pid(ui.ep) || {};
  return `<div class="card"><h3 style="margin-block-start:0">${ep.id ? 'Edit product #' + ep.id : 'Add new product'}</h3><form class="row" onsubmit="saveProd(event)" style="margin:0" id="pf"><input name="n" placeholder="Product name" required value="${esc(ep.n || '')}"><input name="e" placeholder="Emoji" style="inline-size:70px" value="${esc(ep.e || '')}"><input name="c" placeholder="Category" required list="cl" value="${esc(ep.c || '')}"><datalist id="cl">${[...new Set(db.products.map((p) => p.c))].map((c) => `<option>${c}</option>`).join('')}</datalist><input name="brand" placeholder="Brand" value="${esc(ep.brand || '')}"><input name="unit" placeholder="Unit (1 kg, 500 ml)" value="${esc(ep.unit || '')}"><input name="p" type="number" min="1" placeholder="Price ₹" required style="inline-size:100px" value="${ep.p || ''}"><input name="s" type="number" min="0" placeholder="Stock" required style="inline-size:90px" value="${ep.s ?? ''}"><input name="desc" placeholder="Description" style="flex:1;min-inline-size:200px" value="${esc(ep.desc || '')}"><label class="mu">Photo <input type="file" name="img" accept="image/*"></label><button class="b">${ep.id ? 'Update product' : 'Add product'}</button>${ep.id ? '<button type="button" class="b o" onclick="ui.ep=0;R()">Cancel</button>' : ''}</form></div>
<div class="card tw"><table><tr><th>Product</th><th>Category</th><th>Rating</th><th>Price ₹</th><th>Stock</th><th></th></tr>${db.products
    .map((p) => {
      const rt = avgRating(p.ratings);
      return `<tr><td>${p.img ? `<img src="${p.img}" width="36" height="27" style="border-radius:6px;vertical-align:middle;object-fit:cover;margin-right:6px">` : p.e + ' '} ${esc(p.n)}<br><small class="mu">${esc(p.brand || '')} ${esc(p.unit || '')}</small></td><td>${esc(p.c)}</td><td>${rt ? `★ ${rt.avg} (${rt.count})` : '<span class="mu">—</span>'}</td><td><input type="number" value="${p.p}" style="inline-size:90px" onchange="upd(${p.id},'p',this.value)"></td><td><input type="number" value="${p.s}" style="inline-size:80px" onchange="upd(${p.id},'s',this.value)"></td><td><button class="b o s" onclick="ui.ep=${p.id};R();scrollTo(0,0)">Edit</button> <button class="b d s" onclick="delProd(${p.id})">Delete</button></td></tr>`;
    })
    .join('')}</table></div>`;
}

// Create a coupon
function addCp(e) {
  if (!adm()) return;
  e.preventDefault();
  const f = e.target,
    c = f.code.value.trim().toUpperCase();
  if (db.coupons.some((x) => x.code == c)) return toast('Code exists');
  db.coupons.push({ code: c, pct: +f.pct.value, min: +f.min.value, on: true });
  save();
  R();
}

// Enable / disable a coupon
function tglCp(c) {
  if (!adm()) return;
  const x = db.coupons.find((y) => y.code == c);
  x.on = !x.on;
  save();
  R();
}

// Delete a coupon
function delCp(c) {
  if (!adm()) return;
  db.coupons = db.coupons.filter((y) => y.code != c);
  save();
  R();
}

// Admin discounts page
function aCoupons() {
  return `<div class="card"><form class="row" onsubmit="addCp(event)" style="margin:0"><input name="code" placeholder="CODE" required><input name="pct" type="number" min="1" max="90" placeholder="Discount %" required><input name="min" type="number" min="0" placeholder="Min order ₹" required><button class="b">Create coupon</button></form></div>
<div class="card tw"><table><tr><th>Code</th><th>Discount</th><th>Min order</th><th>Used</th><th>Status</th><th></th></tr>${db.coupons.map((c) => `<tr><td><b>${esc(c.code)}</b></td><td>${c.pct}%</td><td>${inr(c.min)}</td><td>${db.orders.filter((o) => o.code == c.code && o.status != 'Cancelled').length}×</td><td><span class="tag ${c.on ? '' : 'Cancelled'}">${c.on ? 'Active' : 'Off'}</span></td><td><button class="b o s" onclick="tglCp('${c.code}')">${c.on ? 'Disable' : 'Enable'}</button> <button class="b d s" onclick="delCp('${c.code}')">Delete</button></td></tr>`).join('')}</table></div>`;
}

// Admin customers page
function aCust() {
  const cs = db.users.filter((u) => u.role == 'customer');
  return `<div class="card tw"><table><tr><th>Name</th><th>Username</th><th>Phone</th><th>Address</th><th>Orders</th><th>Spent</th><th></th></tr>${cs
    .map((u) => {
      const o = db.orders.filter((x) => x.uid == u.id && x.status != 'Cancelled');
      return `<tr><td>${esc(u.name)}</td><td>${esc(u.user)}</td><td>${esc(u.phone || '-')}</td><td>${esc(u.addr || '-')}</td><td>${o.length}</td><td>${inr(o.reduce((a, x) => a + x.total, 0))}</td><td><button class="b d s" onclick="delUser(${u.id})">Remove</button></td></tr>`;
    })
    .join('')}</table></div>`;
}

// Remove a user
function delUser(id) {
  if (!adm()) return;
  if (confirm('Remove this user?')) {
    db.users = db.users.filter((u) => u.id != id);
    save();
    R();
  }
}

// Add or edit a delivery person (including login username / password)
function saveStaff(e) {
  e.preventDefault();
  if (!adm()) return;
  const f = e.target,
    u = f.user.value.trim(),
    x = ui.es && db.users.find((a) => a.id == ui.es);
  if (db.users.some((a) => a.user == u && a.id != (x ? x.id : 0))) return toast('Username taken');
  if (f.pass.value.length < 4) return toast('Password needs 4+ characters');
  const d = { name: f.name.value.trim(), phone: f.phone.value.trim(), veh: f.veh.value.trim(), user: u, pass: f.pass.value };
  if (x) Object.assign(x, d);
  else db.users.push({ id: db.nu++, role: 'delivery', ...d });
  toast(x ? 'Delivery person updated' : 'Delivery person added');
  ui.es = 0;
  save();
  R();
}

// Admin delivery staff page (includes average customer rating per delivery partner)
function aStaff() {
  const e = (ui.es && db.users.find((u) => u.id == ui.es)) || {};
  return `<div class="card"><h3 style="margin-block-start:0">${e.id ? 'Edit delivery person' : 'Add delivery person'}</h3><form class="row" onsubmit="saveStaff(event)" style="margin:0"><input name="name" placeholder="Name" required value="${esc(e.name || '')}"><input name="phone" placeholder="Phone" required value="${esc(e.phone || '')}"><input name="veh" placeholder="Vehicle no." value="${esc(e.veh || '')}"><input name="user" placeholder="Login username" required value="${esc(e.user || '')}"><input name="pass" placeholder="Login password" required value="${esc(e.pass || '')}"><button class="b">${e.id ? 'Save changes' : 'Add delivery person'}</button>${e.id ? '<button type="button" class="b o" onclick="ui.es=0;R()">Cancel</button>' : ''}</form></div>
<div class="card tw"><table><tr><th>Name</th><th>Phone</th><th>Vehicle</th><th>Username</th><th>Rating</th><th>Assigned</th><th>Delivered</th><th></th></tr>${db.users
    .filter((u) => u.role == 'delivery')
    .map((u) => {
      const rt = driverRating(u.id);
      return `<tr><td>${esc(u.name)}</td><td>${esc(u.phone || '-')}</td><td>${esc(u.veh || '-')}</td><td>${esc(u.user)}</td><td>${rt ? `★ ${rt.avg} (${rt.count})` : '<span class="mu">New</span>'}</td><td>${db.orders.filter((o) => o.driver == u.id).length}</td><td>${db.orders.filter((o) => o.driver == u.id && o.status == 'Delivered').length}</td><td><button class="b o s" onclick="ui.es=${u.id};R();scrollTo(0,0)">Edit</button> <button class="b d s" onclick="delUser(${u.id})">Remove</button></td></tr>`;
    })
    .join('')}</table></div>`;
}

// Download all data as a JSON backup
function expo() {
  if (!adm()) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' }),
  );
  a.download = 'freshcart-data.json';
  a.click();
}

// Restore data from a JSON backup
function impo(i) {
  if (!adm()) return;
  const f = i.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!d.users || !d.products) throw 0;
      db = d;
      db.notes = db.notes || [];
      db.spins = db.spins || [];
      save();
      me = db.users.find((u) => u.id == me.id) || null;
      toast('Data imported');
      R();
    } catch (x) {
      toast('Invalid backup file');
    }
  };
  r.readAsText(f);
}
