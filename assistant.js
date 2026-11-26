// ===== ASSISTANTS: separate chat helper for customer, admin and delivery =====

// Names of the three assistants
const AIN = { customer: 'Shopping Assistant', admin: 'Store Analyst', delivery: 'Delivery Helper' };

// Quick-question buttons for each assistant
const AIS = {
  customer: ['Make mango shake', 'Ingredients for paneer curry', 'Track my order', 'Active coupons'],
  admin: ['Sales summary', 'Low stock items', 'Pending orders', 'Top selling product'],
  delivery: ['My next delivery', 'How many deliveries today?', 'How to update status?'],
};

// True if an order is still active
const act = (o) => !['Delivered', 'Cancelled'].includes(o.status);

// Comprehensive recipe & dish knowledge base (supports any Indian & international food/drink item + dynamic matching)
const RECIPES = [
  {
    keys: ['mango shake', 'mango smoothie', 'mango milkshake', 'aam ras'],
    title: 'Mango Shake',
    items: [
      { label: 'Fresh Mangoes', match: ['mango'], qty: 1 },
      { label: 'Chilled Milk', match: ['milk'], qty: 1 },
      { label: 'Sugar', match: ['sugar'], qty: 1 },
      { label: 'Fresh Curd / Yogurt (optional)', match: ['curd'], qty: 1 },
    ],
  },
  {
    keys: ['banana shake', 'banana smoothie', 'banana milkshake'],
    title: 'Banana Shake',
    items: [
      { label: 'Ripe Bananas', match: ['banana'], qty: 1 },
      { label: 'Chilled Milk', match: ['milk'], qty: 1 },
      { label: 'Sugar', match: ['sugar'], qty: 1 },
    ],
  },
  {
    keys: ['paneer', 'paneer butter masala', 'matar paneer', 'palak paneer', 'kadai paneer', 'paneer curry', 'paneer bhurji', 'shahi paneer'],
    title: 'Paneer Curry / Masala',
    items: [
      { label: 'Fresh Paneer', match: ['paneer'], qty: 1 },
      { label: 'Tomatoes', match: ['tomato'], qty: 1 },
      { label: 'Onions', match: ['onion'], qty: 1 },
      { label: 'Butter', match: ['butter'], qty: 1 },
      { label: 'Fresh Spinach (for Palak Paneer)', match: ['spinach'], qty: 1 },
      { label: 'Fresh Curd', match: ['curd'], qty: 1 },
    ],
  },
  {
    keys: ['biryani', 'pulao', 'fried rice', 'jeera rice', 'veg biryani', 'egg biryani'],
    title: 'Biryani / Pulao',
    items: [
      { label: 'Basmati Rice', match: ['rice', 'basmati'], qty: 1 },
      { label: 'Onions', match: ['onion'], qty: 1 },
      { label: 'Tomatoes', match: ['tomato'], qty: 1 },
      { label: 'Fresh Curd', match: ['curd'], qty: 1 },
      { label: 'Butter / Ghee', match: ['butter'], qty: 1 },
      { label: 'Eggs (optional)', match: ['egg'], qty: 1 },
    ],
  },
  {
    keys: ['roti', 'chapati', 'paratha', 'aloo paratha', 'puri', 'phulka'],
    title: 'Roti / Aloo Paratha',
    items: [
      { label: 'Whole Wheat Flour (Atta)', match: ['flour', 'wheat'], qty: 1 },
      { label: 'Potatoes (for Aloo Paratha)', match: ['potato'], qty: 1 },
      { label: 'Onions', match: ['onion'], qty: 1 },
      { label: 'Butter', match: ['butter'], qty: 1 },
      { label: 'Fresh Curd', match: ['curd'], qty: 1 },
    ],
  },
  {
    keys: ['dal', 'dal tadka', 'dal fry', 'sambar', 'khichdi'],
    title: 'Dal Tadka / Dal Fry',
    items: [
      { label: 'Toor Dal', match: ['dal'], qty: 1 },
      { label: 'Tomatoes', match: ['tomato'], qty: 1 },
      { label: 'Onions', match: ['onion'], qty: 1 },
      { label: 'Butter', match: ['butter'], qty: 1 },
      { label: 'Basmati Rice (to serve)', match: ['rice'], qty: 1 },
    ],
  },
  {
    keys: ['omelette', 'omelet', 'scrambled egg', 'egg curry', 'boiled egg', 'egg bhurji', 'french toast'],
    title: 'Egg Breakfast / Omelette',
    items: [
      { label: 'Farm Eggs', match: ['egg'], qty: 1 },
      { label: 'Onions', match: ['onion'], qty: 1 },
      { label: 'Tomatoes', match: ['tomato'], qty: 1 },
      { label: 'Bread Loaf', match: ['bread'], qty: 1 },
      { label: 'Butter', match: ['butter'], qty: 1 },
    ],
  },
  {
    keys: ['sandwich', 'toast', 'breakfast', 'bread butter', 'veg sandwich'],
    title: 'Veg Butter Sandwich',
    items: [
      { label: 'Bread Loaf', match: ['bread'], qty: 1 },
      { label: 'Butter', match: ['butter'], qty: 1 },
      { label: 'Tomatoes', match: ['tomato'], qty: 1 },
      { label: 'Onions', match: ['onion'], qty: 1 },
      { label: 'Potatoes', match: ['potato'], qty: 1 },
      { label: 'Paneer', match: ['paneer'], qty: 1 },
    ],
  },
  {
    keys: ['tea', 'chai', 'masala chai', 'milk tea'],
    title: 'Masala / Assam Milk Tea',
    items: [
      { label: 'Assam Tea Leaves', match: ['tea'], qty: 1 },
      { label: 'Fresh Milk', match: ['milk'], qty: 1 },
      { label: 'Sugar', match: ['sugar'], qty: 1 },
      { label: 'Butter Biscuits', match: ['biscuit'], qty: 1 },
    ],
  },
  {
    keys: ['lassi', 'sweet lassi', 'mango lassi', 'buttermilk', 'chaas', 'raita'],
    title: 'Sweet / Mango Lassi',
    items: [
      { label: 'Fresh Curd (Dahi)', match: ['curd'], qty: 1 },
      { label: 'Sugar', match: ['sugar'], qty: 1 },
      { label: 'Fresh Mangoes (for Mango Lassi)', match: ['mango'], qty: 1 },
      { label: 'Milk', match: ['milk'], qty: 1 },
    ],
  },
  {
    keys: ['fruit salad', 'fruit bowl', 'smoothie bowl', 'custard', 'fruit custard'],
    title: 'Fresh Fruit Bowl / Custard',
    items: [
      { label: 'Apples', match: ['apple'], qty: 1 },
      { label: 'Bananas', match: ['banana'], qty: 1 },
      { label: 'Mangoes', match: ['mango'], qty: 1 },
      { label: 'Milk', match: ['milk'], qty: 1 },
      { label: 'Sugar', match: ['sugar'], qty: 1 },
    ],
  },
  {
    keys: ['aloo sabzi', 'aloo curry', 'french fries', 'potato fry', 'mashed potato', 'aloo tikki'],
    title: 'Aloo Sabzi / Potato Dish',
    items: [
      { label: 'Potatoes', match: ['potato'], qty: 1 },
      { label: 'Onions', match: ['onion'], qty: 1 },
      { label: 'Tomatoes', match: ['tomato'], qty: 1 },
      { label: 'Butter', match: ['butter'], qty: 1 },
    ],
  },
  {
    keys: ['palak', 'spinach', 'saag', 'green smoothie'],
    title: 'Palak / Spinach Dish',
    items: [
      { label: 'Fresh Spinach', match: ['spinach'], qty: 1 },
      { label: 'Paneer', match: ['paneer'], qty: 1 },
      { label: 'Onions', match: ['onion'], qty: 1 },
      { label: 'Tomatoes', match: ['tomato'], qty: 1 },
      { label: 'Butter', match: ['butter'], qty: 1 },
    ],
  },
  {
    keys: ['kheer', 'payasam', 'rice pudding', 'sweet rice'],
    title: 'Rice Kheer',
    items: [
      { label: 'Basmati Rice', match: ['rice'], qty: 1 },
      { label: 'Full Cream / Fresh Milk', match: ['milk'], qty: 1 },
      { label: 'Sugar', match: ['sugar'], qty: 1 },
    ],
  },
];

// Pending recipe items waiting for customer confirmation ("Add to Cart")
let pendingRecipe = null;

// Find store products matching an ingredient keyword
function findIngProd(keywords) {
  for (const kw of keywords) {
    const p = db.products.find((x) => x.n.toLowerCase().includes(kw) || x.c.toLowerCase().includes(kw));
    if (p) return p;
  }
  return null;
}

// Add all available items from the suggested recipe to cart automatically
function addRecipeToCart(batchId) {
  if (!pendingRecipe || pendingRecipe.id != batchId) {
    toast('Ask for a recipe first to add its items!');
    return;
  }
  let added = 0,
    skipped = 0;
  pendingRecipe.items.forEach((it) => {
    const p = it.prod && pid(it.prod.id);
    if (!p || p.s < 1) {
      skipped++;
      return;
    }
    const cur = ui.cart[p.id] || 0;
    const room = p.s - cur;
    if (room > 0) {
      ui.cart[p.id] = cur + Math.min(it.qty || 1, room);
      added++;
    } else {
      skipped++;
    }
  });
  const title = pendingRecipe.title;
  pendingRecipe = null;
  if (!added) {
    toast('All items are currently out of stock or at max stock in cart');
    return;
  }
  ui.chat.customer.push([
    'b',
    `✅ Added <b>${added}</b> ingredient(s) for <b>${esc(title)}</b> to your cart!${skipped ? ` (${skipped} unavailable/at stock limit)` : ''} <br><button class="b s" style="margin-top:6px" onclick="ui.ai=false;go('cart')">🛒 View Cart & Checkout</button>`,
  ]);
  toast(added + ' item(s) added to cart!');
  R();
  aiR();
}

// Match any food / dish / ingredient query and build the interactive ingredient + stock + Add to Cart card
function matchRecipeQuery(t) {
  const recipeIntent =
    /(make|cook|prepare|recipe|ingredient|ingredients|dish|food|shake|smoothie|curry|masala|biryani|pulao|roti|paratha|dal|omelette|sandwich|tea|chai|lassi|salad|kheer|sabzi|want to eat|how to make|items for|need for)/i.test(
      t,
    );

  // 1. Direct match in RECIPES
  let matched = RECIPES.find((r) => r.keys.some((k) => t.includes(k)));

  // 2. Fallback: match any product names/ingredients mentioned in the query (works for ANY food item or custom combination)
  if (!matched && recipeIntent) {
    const prods = db.products.filter((p) => {
      const words = p.n.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !['1kg', '5kg', '1l', '200g', '100g', '250g', '400g', 'doz', 'pack', 'loaf', 'bunch'].includes(w));
      return words.some((w) => t.includes(w) || t.includes(w.replace(/es$/, '').replace(/s$/, '')));
    });
    const dishName = t
      .replace(/^(i want to make|how to make|ingredients for|i need|make|cook|prepare|recipe for|items for)\s+/i, '')
      .replace(/[?.!]+$/, '')
      .trim();
    if (prods.length) {
      matched = {
        title: dishName ? dishName[0].toUpperCase() + dishName.slice(1) : 'Your Dish',
        items: prods.map((p) => ({ label: p.n, match: [p.n.toLowerCase()], qty: 1, directProd: p })),
      };
    } else if (dishName) {
      // Suggest fresh pantry staples & produce for any custom dish name
      const core = ['tomato', 'onion', 'potato', 'butter', 'milk', 'rice', 'flour', 'paneer'].filter((k) =>
        db.products.some((p) => p.n.toLowerCase().includes(k)),
      );
      matched = {
        title: dishName[0].toUpperCase() + dishName.slice(1),
        items: core.slice(0, 5).map((k) => ({ label: k[0].toUpperCase() + k.slice(1), match: [k], qty: 1 })),
        customNote: true,
      };
    }
  }

  if (!matched) return null;

  const resolved = matched.items.map((it) => {
    const prod = it.directProd || findIngProd(it.match);
    return { ...it, prod };
  });

  const availCount = resolved.filter((x) => x.prod && x.prod.s > 0).length;
  const batchId = Date.now();
  pendingRecipe = { id: batchId, title: matched.title, items: resolved };

  const rows = resolved
    .map((it) => {
      const p = it.prod;
      if (!p) {
        return `<div class="rcRow"><span>• ${esc(it.label)}</span><span class="mu">Not in catalog</span></div>`;
      }
      const stockTxt =
        p.s > 0
          ? `<span style="color:var(--pd);font-weight:600">${p.s} available</span>`
          : `<span style="color:var(--er);font-weight:600">Out of stock</span>`;
      return `<div class="rcRow">
        <span>${p.e} <b>${esc(p.n)}</b> <small class="mu">(${inr(p.p)})</small></span>
        <span>${stockTxt}</span>
      </div>`;
    })
    .join('');

  return `<div class="rcCard">
    <div style="font-weight:700;margin-bottom:4px">🍽️ Ingredients for ${esc(matched.title)}</div>
    ${matched.customNote ? '<div class="mu" style="font-size:12px;margin-bottom:6px">Here are the fresh store ingredients commonly used for this dish:</div>' : ''}
    ${rows}
    <div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--bd)">
      <div style="font-weight:600;margin-bottom:6px">Can I add these ${availCount} available item(s) to your cart?</div>
      ${
        availCount > 0
          ? `<button class="b s" onclick="addRecipeToCart(${batchId})">🛒 Yes, Add to Cart</button>`
          : '<span class="mu">None of these items are currently in stock.</span>'
      }
    </div>
  </div>`;
}

// The assistant brain: reads the question and answers from store data (rule-based + recipe engine)
function ai(q) {
  const t = q.toLowerCase().trim(),
    has = (...w) => w.some((x) => t.includes(x)),
    r = me.role,
    num = (t.match(/\d{4}/) || [])[0],
    L = (a) => a.join('<br>');

  if (r == 'customer') {
    // Handle affirmative confirmation if the user replies "yes" / "add" after a recipe prompt
    if (pendingRecipe && /^(yes|yeah|yep|sure|ok|okay|add|add them|add to cart|please add)\b/i.test(t)) {
      const batchId = pendingRecipe.id;
      setTimeout(() => addRecipeToCart(batchId), 0);
      return 'Adding the available ingredients to your cart now…';
    }

    // Check recipe / dish / food ingredient queries first
    const recipeHtml = matchRecipeQuery(t);
    if (recipeHtml) return recipeHtml;
  }

  const pm = db.products.filter((p) =>
    p.n
      .toLowerCase()
      .split(' ')
      .some((w) => w.length > 3 && t.includes(w)),
  );
  const pinfo = () =>
    L(
      pm
        .slice(0, 5)
        .map(
          (p) =>
            `${p.e} <b>${esc(p.n)}</b> – ${inr(p.p)} · <b>${p.s > 0 ? p.s + ' available' : 'Out of stock'}</b>`,
        ),
    );
  if (/^(hi|hello|hey|help)\b/.test(t))
    return r == 'customer'
      ? 'Hi! Ask me to make any food item (e.g. <i>"I want to make mango shake"</i> or <i>"paneer curry"</i>) to see all ingredients, available stock, and add them to your cart — or ask about orders and coupons!'
      : 'I can help with: ' + AIS[r].join(', ').toLowerCase() + '.';

  if (r == 'customer') {
    const mo = db.orders.filter((o) => o.uid == me.id);
    if (has('return', 'refund', 'policy', 'exchange')) {
      return `🛡️ <b>Return Policy:</b> ${esc(RETURN_POLICY.summary)}<br>• ${RETURN_POLICY.rules.slice(0, 2).map(esc).join('<br>• ')}<br><button class="b o s" style="margin-top:6px" onclick="openPolicy()">View Full Return Policy</button>`;
    }
    if (has('spin', 'reward', 'lucky')) {
      const s = activeSpin();
      return s
        ? 'Your reward: <b>' + (s.fd ? 'free delivery' : s.pct + '% off all items') + '</b>, applied automatically at checkout until ' + new Date(s.exp).toLocaleString() + '.'
        : spunToday()
          ? 'You already spun today. Come back tomorrow!'
          : 'Your daily spin is ready! Open the 🎡 Daily Spin tab.';
    }
    if (pm.length && has('price', 'cost', 'much', 'stock', 'have', 'available', 'sell', 'qty', 'quantity'))
      return pinfo();
    if (has('track', 'where', 'status', 'order', 'deliver')) {
      let l = num ? mo.filter((o) => o.id == num) : mo.filter(act);
      if (!l.length) l = mo.slice(0, 1);
      if (!l.length) return 'You have no orders yet. Browse the Shop and place your first order!';
      return (
        l
          .map((o) =>
            L([
              `<b>Order #${o.id}</b> – ${o.status}`,
              `${o.items.length} item(s) · ${inr(o.total)} · ${o.slot}`,
              o.driver ? '🛵 ' + esc(du(o.driver).name) : 'Waiting for a delivery partner',
            ]),
          )
          .join('<hr>') + '<br><small>Live tracking is in My Orders.</small>'
      );
    }
    if (has('coupon', 'discount', 'offer', 'promo', 'code'))
      return (
        'Active coupons:<br>' +
        (L(
          db.coupons
            .filter((c) => c.on)
            .map((c) => `<b>${esc(c.code)}</b> – ${c.pct}% off above ${inr(c.min)}`),
        ) || 'None right now.')
      );
    if (has('recommend', 'suggest', 'popular', 'what should')) {
      const bc = new Set(
          mo.filter((o) => o.status != 'Cancelled').flatMap((o) => o.items.map((i) => i.c)),
        ),
        rc = db.products.filter((p) => p.s > 0 && (!bc.size || bc.has(p.c))).slice(0, 4);
      return (
        (bc.size ? 'Based on your past orders you may like:<br>' : 'Popular picks:<br>') +
        L(rc.map((p) => `${p.e} ${esc(p.n)} – ${inr(p.p)} (${p.s} available)`))
      );
    }
    if (has('cart', 'basket')) {
      const k = Object.keys(ui.cart);
      if (!k.length) return 'Your cart is empty.';
      const x = tot();
      return (
        L(k.map((i) => `${pid(i).e} ${esc(pid(i).n)} ×${ui.cart[i]}`)) +
        `<br><b>Total ${inr(x.total)}</b> (discount ${inr(x.disc)}, delivery ${x.fee ? inr(x.fee) : 'free'})`
      );
    }
    if (has('pay', 'upi', 'cod', 'card', 'cash'))
      return 'At checkout you can pay by Cash on Delivery, UPI or Credit/Debit card.';
    if (has('cancel'))
      return 'You can cancel from My Orders while the status is "Placed". After packing it cannot be cancelled.';
    if (has('fee', 'charge', 'free', 'slot', 'time'))
      return 'Delivery is free above ₹500, otherwise ₹40. Slots: ' + SLOTS.join(', ') + '.';
    if (pm.length) return pinfo();
  }
  if (r == 'admin') {
    const ok = db.orders.filter((o) => o.status != 'Cancelled'),
      rev = ok.reduce((a, o) => a + o.total, 0),
      ds = ok.reduce((a, o) => a + o.disc, 0);
    if (has('sale', 'revenue', 'earn', 'income', 'summary'))
      return L([
        `💰 Total sales: <b>${inr(rev)}</b> from ${ok.length} orders`,
        `🏷 Discounts given: ${inr(ds)}`,
        `📈 Average order: ${inr(ok.length ? rev / ok.length : 0)}`,
        `⏳ Pending: ${db.orders.filter((o) => o.status == 'Placed').length} · Cancelled: ${db.orders.length - ok.length}`,
      ]);
    if (has('stock', 'inventory', 'low', 'restock')) {
      const l = db.products.filter((p) => p.s < 10);
      return l.length
        ? 'Low stock:<br>' + L(l.map((p) => `⚠ ${esc(p.n)} – ${p.s} left`))
        : 'All products are well stocked.';
    }
    if (has('pending', 'new order', 'unassigned', 'assign')) {
      const l = db.orders.filter((o) => o.status == 'Placed' || (act(o) && !o.driver));
      return l.length
        ? L(
            l.map(
              (o) =>
                `#${o.id} ${esc(o.cn)} – ${o.status}${o.driver ? '' : ' (no delivery person)'}`,
            ),
          )
        : 'No pending or unassigned orders.';
    }
    if (has('top', 'best', 'popular', 'selling')) {
      const m = {};
      ok.forEach((o) => o.items.forEach((i) => (m[i.n] = (m[i.n] || 0) + i.q)));
      const e = Object.entries(m)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      return e.length
        ? 'Top sellers:<br>' + L(e.map((x) => `${esc(x[0])} – ${x[1]} sold`))
        : 'No sales yet.';
    }
    if (has('coupon', 'discount', 'promo'))
      return L(
        db.coupons.map(
          (c) =>
            `${esc(c.code)} (${c.pct}%) – used ${db.orders.filter((o) => o.code == c.code && o.status != 'Cancelled').length}× · ${c.on ? 'active' : 'off'}`,
        ),
      );
    if (has('customer'))
      return db.users.filter((u) => u.role == 'customer').length + ' registered customers.';
    if (has('deliver', 'staff', 'driver'))
      return L(
        db.users
          .filter((u) => u.role == 'delivery')
          .map(
            (u) =>
              `🛵 ${esc(u.name)} – ${db.orders.filter((o) => o.driver == u.id && act(o)).length} active, ${db.orders.filter((o) => o.driver == u.id && o.status == 'Delivered').length} delivered`,
          ),
      );
  }
  if (r == 'delivery') {
    const l = db.orders.filter((o) => o.driver == me.id),
      a = l.filter(act);
    if (has('update', 'how to', 'how do'))
      return 'Open <b>My Deliveries</b>. Once the store packs an order tap "Pick up – Out for delivery", then "Mark delivered" after handing over the groceries. The customer is notified automatically.';
    if (has('how many', 'count', 'completed', 'done', 'today'))
      return `You have <b>${a.length}</b> active and <b>${l.filter((o) => o.status == 'Delivered').length}</b> completed deliveries.`;
    if (has('next', 'task', 'current', 'pending', 'address', 'where', 'order')) {
      const x = num ? l.find((o) => o.id == num) : a[0];
      if (!x) return 'No active deliveries assigned to you right now.';
      return L([
        `<b>Order #${x.id}</b> – ${x.status}`,
        `👤 ${esc(x.cn)}${x.ph ? ' · 📞 ' + esc(x.ph) : ''}`,
        `📍 ${esc(x.addr)}`,
        `🕒 ${x.slot} · 💵 ${inr(x.total)}`,
      ]);
    }
  }
  return r == 'customer'
    ? 'Try asking: <b>"I want to make mango shake"</b>, <b>"Ingredients for biryani"</b>, or pick a chip below.'
    : 'Sorry, I did not get that. Try: ' + AIS[r].join(' · ');
}

// Draw the assistant button and chat window
function aiR() {
  const el = $('#ai');
  el.dataset.r = me ? me.role : '';
  if (!me) {
    el.innerHTML = '';
    return;
  }
  const r = me.role,
    m = ui.chat[r];
  el.innerHTML =
    `<button class="aib" onclick="ui.ai=!ui.ai;aiR()" title="${AIN[r]}">${ui.ai ? '✕' : '🤖'}</button>` +
    (ui.ai
      ? `<div class="aip"><div class="aih">🤖 ${AIN[r]}</div><div class="aim" id="aim">${m.length ? m.map((x) => `<div class="m ${x[0]}">${x[1]}</div>`).join('') : `<div class="m b">Hi ${esc(me.name.split(' ')[0])}! ${r == 'customer' ? 'Tell me any food item you want to make (like <b>mango shake</b> or <b>paneer curry</b>) and I will show all ingredients, stock & add them to your cart!' : 'Pick a question below or type your own.'}</div>`}</div><div class="aic">${AIS[r].map((s) => `<button class="chip" onclick="aiAsk('${s}')">${s}</button>`).join('')}</div><form onsubmit="aiSend(event)" class="row" style="margin:0;padding:8px"><input id="aiq" placeholder="${r == 'customer' ? 'e.g. I want to make mango shake…' : 'Type your question…'}" style="flex:1;min-width:0" autocomplete="off"><button class="b">Send</button></form></div>`
      : '');
  const a = $('#aim');
  if (a) a.scrollTop = a.scrollHeight;
  const i = $('#aiq');
  if (i) i.focus();
}

// Send the typed question
function aiSend(e) {
  e.preventDefault();
  const v = $('#aiq').value.trim();
  if (v) aiAsk(v);
}

// Add question + answer to the chat
function aiAsk(q) {
  ui.chat[me.role].push(['u', esc(q)], ['b', ai(q)]);
  aiR();
}
