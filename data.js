// ===== DATA & HELPERS: settings, demo data, saving to localStorage, small helper functions =====

// Short for document.querySelector
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );

// Settings: storage key, order stages, money format
const K = 'freshcart_v1',
  ST = ['Placed', 'Packed', 'Out for delivery', 'Delivered'],
  inr = (n) => '₹' + Number(n).toFixed(0);

// Return Policy details (shown to customers & on receipts/orders)
const RETURN_POLICY = {
  windowHours: 24,
  summary: 'Easy 24-hour doorstep return & instant refund/replacement on fresh groceries.',
  rules: [
    'Perishable items (fruits, vegetables, dairy, bakery) can be returned within 24 hours of delivery if damaged, spoiled, or incorrect.',
    'Packaged staples, snacks, and beverages are eligible within 7 days if unopened and in original packaging.',
    'Once approved by the store admin, refunds are credited back to your original payment method (or UPI/store wallet for COD) within 24–48 hours.',
    'Partial item returns are supported — select the exact item(s) and reason from My Orders.',
  ],
  reasons: [
    'Damaged or crushed item',
    'Not fresh / quality issue',
    'Wrong item delivered',
    'Missing quantity / expired',
    'Other',
  ],
};

// Realistic studio-illustrated product photography generator (crisp SVG data URIs that work 100% offline & online)
function prodPhoto(bg1, bg2, art, badge = '') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" width="240" height="180">
    <defs>
      <radialGradient id="g" cx="50%" cy="42%" r="65%">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </radialGradient>
      <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000" flood-opacity="0.22"/>
      </filter>
    </defs>
    <rect width="240" height="180" rx="16" fill="url(#g)"/>
    <ellipse cx="120" cy="148" rx="68" ry="12" fill="rgba(0,0,0,0.14)"/>
    <g filter="url(#sh)">${art}</g>
    ${badge ? `<rect x="12" y="12" rx="8" width="${badge.length * 7 + 16}" height="22" fill="rgba(255,255,255,0.88)"/><text x="20" y="27" font-family="system-ui,sans-serif" font-size="11" font-weight="700" fill="#1b2a1f">${badge}</text>` : ''}
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const PHOTOS = {
  tomato: prodPhoto('#fff1ee', '#f8c9c0', `
    <circle cx="96" cy="98" r="36" fill="#e53935"/><circle cx="84" cy="84" r="10" fill="#ff7961" opacity="0.55"/>
    <path d="M96 62c-6-10-18-8-22-2 10 2 16 6 22 10 6-4 12-8 22-10-4-6-16-8-22 2z" fill="#2e7d32"/>
    <circle cx="144" cy="106" r="32" fill="#c62828"/><circle cx="134" cy="94" r="8" fill="#ff7961" opacity="0.5"/>
    <path d="M144 74c-5-8-14-6-18-1 8 1 13 5 18 8 5-3 10-7 18-8-4-5-13-7-18 1z" fill="#1b5e20"/>
  `, 'Farm Fresh'),
  potato: prodPhoto('#fdf6e9', '#ead6b3', `
    <ellipse cx="95" cy="104" rx="40" ry="28" transform="rotate(-14 95 104)" fill="#c89d66"/>
    <ellipse cx="145" cy="96" rx="36" ry="25" transform="rotate(18 145 96)" fill="#b8894e"/>
    <circle cx="84" cy="98" r="2.2" fill="#8d6230"/><circle cx="106" cy="110" r="2" fill="#8d6230"/>
    <circle cx="138" cy="90" r="2.2" fill="#7a5122"/><circle cx="155" cy="102" r="2" fill="#7a5122"/>
  `, 'Organic'),
  onion: prodPhoto('#fbf0f6', '#e6c3d8', `
    <path d="M98 54c4 14 28 24 28 50 0 20-14 34-28 34s-28-14-28-34c0-26 24-36 28-50z" fill="#9c2766"/>
    <path d="M98 58c2 15 16 25 16 46 0 17-7 29-16 29" fill="none" stroke="#ce6ba0" stroke-width="2" opacity="0.6"/>
    <path d="M142 64c3 12 22 20 22 42 0 17-11 28-22 28s-22-11-22-28c0-22 19-30 22-42z" fill="#7b1fa2"/>
  `, 'Nashik Red'),
  spinach: prodPhoto('#eef9f0', '#bfe6c6', `
    <path d="M118 138c-2-24-4-44-2-64" stroke="#2e7d32" stroke-width="5" stroke-linecap="round"/>
    <path d="M116 116c-34 4-52-18-40-44 12-24 44-16 42 18z" fill="#43a047"/>
    <path d="M118 104c34 4 50-20 38-44-12-22-42-14-40 18z" fill="#2e7d32"/>
    <path d="M117 86c-22-24-10-48 8-48 18 0 24 26 2 48z" fill="#66bb6a"/>
  `, 'Washed'),
  banana: prodPhoto('#fffbe6', '#f7e49c', `
    <path d="M68 72c18 46 68 68 108 42-14 26-66 36-102 4-14-12-16-32-6-46z" fill="#fdd835"/>
    <path d="M76 62c20 42 66 60 102 36-12 22-60 32-94 4-12-10-14-28-8-40z" fill="#ffee58"/>
    <rect x="64" y="60" width="10" height="8" rx="3" fill="#6d4c41"/>
  `, 'Ripe Bunch'),
  apple: prodPhoto('#fff0f0', '#f6c2c2', `
    <path d="M120 74c-16-10-38-2-38 24 0 26 18 44 32 44 5 0 6-3 6-3s1 3 6 3c14 0 32-18 32-44 0-26-22-34-38-24z" fill="#d32f2f"/>
    <ellipse cx="102" cy="94" rx="8" ry="16" transform="rotate(-18 102 94)" fill="#ff8a80" opacity="0.5"/>
    <path d="M120 74c0-12 4-20 10-24" stroke="#5d4037" stroke-width="4" stroke-linecap="round"/>
    <path d="M122 60c12-8 24-4 26 4-10 6-20 4-26-4z" fill="#43a047"/>
  `, 'Kashmiri'),
  mango: prodPhoto('#fff7e2', '#fbd38d', `
    <path d="M126 58c24 0 42 20 38 48-4 28-28 40-52 36-22-4-34-20-26-42 8-22 18-42 40-42z" fill="#ffa000"/>
    <path d="M126 58c16 2 28 16 26 38-2 22-20 32-38 28" fill="#ffca28" opacity="0.65"/>
    <path d="M124 58c-2-10 4-16 10-18" stroke="#4e342e" stroke-width="4" stroke-linecap="round"/>
    <path d="M124 48c-16-6-26 2-26 10 10 4 20 0 26-10z" fill="#2e7d32"/>
  `, 'Alphonso'),
  milk: prodPhoto('#eef6ff', '#c7e0ff', `
    <path d="M92 64h56l8 16v62a8 8 0 0 1-8 8H92a8 8 0 0 1-8-8V80l8-16z" fill="#ffffff" stroke="#90caf9" stroke-width="2"/>
    <rect x="92" y="52" width="56" height="12" rx="3" fill="#1e88e5"/>
    <rect x="85" y="92" width="70" height="34" fill="#1e88e5"/>
    <text x="120" y="114" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="800" fill="#fff">MILK 1L</text>
  `, 'Farm Pure'),
  paneer: prodPhoto('#f5f7fa', '#dce3ec', `
    <polygon points="76,94 120,72 164,94 120,116" fill="#fffdf7"/>
    <polygon points="76,94 120,116 120,144 76,122" fill="#f3efe2"/>
    <polygon points="164,94 120,116 120,144 164,122" fill="#e6dec8"/>
    <text x="120" y="98" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="700" fill="#7c6f55">FRESH PANEER</text>
  `, 'Malai 200g'),
  eggs: prodPhoto('#fdf5eb', '#ebd6bc', `
    <rect x="66" y="92" width="108" height="44" rx="10" fill="#d7ccc8"/>
    <ellipse cx="90" cy="88" rx="15" ry="20" fill="#fff8ee" stroke="#e0c9a6" stroke-width="1.5"/>
    <ellipse cx="120" cy="88" rx="15" ry="20" fill="#fff8ee" stroke="#e0c9a6" stroke-width="1.5"/>
    <ellipse cx="150" cy="88" rx="15" ry="20" fill="#fff8ee" stroke="#e0c9a6" stroke-width="1.5"/>
  `, 'Farm Pack 12'),
  rice: prodPhoto('#f4f8ee', '#d6e5c3', `
    <rect x="82" y="48" width="76" height="98" rx="12" fill="#ffffff" stroke="#8bc34a" stroke-width="2.5"/>
    <rect x="82" y="48" width="76" height="24" rx="10" fill="#558b2f"/>
    <text x="120" y="64" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="800" fill="#fff">BASMATI</text>
    <circle cx="120" cy="106" r="24" fill="#f1f8e9"/>
    <text x="120" y="110" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="800" fill="#33691e">5 KG</text>
  `, 'Aged Grain'),
  flour: prodPhoto('#fbf4e8', '#ebd5b0', `
    <rect x="82" y="48" width="76" height="98" rx="12" fill="#fff8e7" stroke="#d4a359" stroke-width="2.5"/>
    <rect x="82" y="48" width="76" height="24" rx="10" fill="#b87b28"/>
    <text x="120" y="64" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="800" fill="#fff">CHAKKI ATTA</text>
    <text x="120" y="110" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="800" fill="#7c4d12">100% WHEAT</text>
  `, 'Whole Grain'),
  dal: prodPhoto('#fff8e6', '#f5dca4', `
    <path d="M74 96h92c0 28-18 46-46 46s-46-18-46-46z" fill="#5d4037"/>
    <ellipse cx="120" cy="96" rx="46" ry="14" fill="#fbc02d"/>
    <circle cx="106" cy="94" r="3" fill="#f57f17"/><circle cx="122" cy="98" r="3" fill="#f57f17"/><circle cx="136" cy="93" r="3" fill="#f57f17"/>
  `, 'Unpolished'),
  bread: prodPhoto('#fdf3e7', '#eccda6', `
    <path d="M76 92c0-20 18-32 44-32s44 12 44 32v40a8 8 0 0 1-8 8H84a8 8 0 0 1-8-8V92z" fill="#d98a3c"/>
    <path d="M84 94c0-14 14-24 36-24s36 10 36 24v38H84V94z" fill="#f7dcb4"/>
    <path d="M76 92c0-20 18-32 44-32s44 12 44 32" fill="none" stroke="#a85d1a" stroke-width="7" stroke-linecap="round"/>
  `, 'Baked Today'),
  biscuits: prodPhoto('#fff4ea', '#f4d0b2', `
    <circle cx="104" cy="102" r="28" fill="#d48c46" stroke="#b36b27" stroke-width="2"/>
    <circle cx="138" cy="96" r="28" fill="#e09a52" stroke="#b36b27" stroke-width="2"/>
    <circle cx="130" cy="88" r="2.2" fill="#8d4e14"/><circle cx="146" cy="92" r="2.2" fill="#8d4e14"/>
    <circle cx="134" cy="104" r="2.2" fill="#8d4e14"/><circle cx="148" cy="106" r="2.2" fill="#8d4e14"/>
  `, 'Butter Crunch'),
  juice: prodPhoto('#fff5e4', '#ffd599', `
    <rect x="92" y="54" width="56" height="92" rx="8" fill="#ff9800"/>
    <rect x="112" y="44" width="16" height="10" rx="2" fill="#fff"/>
    <circle cx="120" cy="98" r="20" fill="#ffe082"/>
    <text x="120" y="134" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="800" fill="#fff">100% ORANGE</text>
  `, 'No Added Sugar'),
  sugar: prodPhoto('#f0f7ff', '#d0e4fa', `
    <rect x="84" y="54" width="72" height="90" rx="10" fill="#ffffff" stroke="#42a5f5" stroke-width="2.5"/>
    <rect x="84" y="54" width="72" height="24" rx="8" fill="#1976d2"/>
    <text x="120" y="70" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="800" fill="#fff">PURE SUGAR</text>
    <text x="120" y="112" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="800" fill="#1565c0">1 KG</text>
  `, 'Fine Crystal'),
  tea: prodPhoto('#f1f8e9', '#cfe3b8', `
    <rect x="84" y="54" width="72" height="90" rx="10" fill="#2e7d32"/>
    <circle cx="120" cy="96" r="22" fill="#a5d6a7"/>
    <text x="120" y="100" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="800" fill="#1b5e20">ASSAM TEA</text>
  `, 'Aromatic'),
  butter: prodPhoto('#fffbe6', '#f9e38c', `
    <rect x="74" y="78" width="92" height="52" rx="8" fill="#fdd835" stroke="#f9a825" stroke-width="2"/>
    <text x="120" y="108" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="800" fill="#5d4037">TABLE BUTTER</text>
  `, 'Creamy 100g'),
  curd: prodPhoto('#f2f8ff', '#d4e6fc', `
    <path d="M86 72h68l-8 68H94l-8-68z" fill="#ffffff" stroke="#64b5f6" stroke-width="2.5"/>
    <rect x="82" y="64" width="76" height="10" rx="4" fill="#1e88e5"/>
    <text x="120" y="110" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="800" fill="#1565c0">FRESH CURD</text>
  `, 'Probiotic'),
};

// Delivery time slots shown at checkout
const PAY = { cod: 'Cash on Delivery', upi: 'UPI', card: 'Credit / Debit Card' };

// Admin-only guard for every management action
const adm = () => (me && me.role == 'admin') || (toast('Admin only'), false);

const SLOTS = ['Today 6–8 PM', 'Tomorrow 8–10 AM', 'Tomorrow 12–2 PM', 'Tomorrow 6–8 PM'];

// db = ALL app data (users, products, orders, coupons, notifications, ratings, returns)
let db = null;

try {
  db = JSON.parse(localStorage.getItem(K));
} catch (e) {}

// Starting demo data: 3 demo users, 20 products with realistic photos, 2 coupons
function seed() {
  const P = [
    ['Tomatoes 1kg', '🍅', 'Vegetables', 40, PHOTOS.tomato, 'Farm Fresh', '1 kg', 'Juicy vine-ripened red tomatoes'],
    ['Potatoes 1kg', '🥔', 'Vegetables', 35, PHOTOS.potato, 'Organic Harvest', '1 kg', 'Clean, earthy table potatoes'],
    ['Onions 1kg', '🧅', 'Vegetables', 38, PHOTOS.onion, 'Nashik Farms', '1 kg', 'Crisp red onions for daily cooking'],
    ['Spinach bunch', '🥬', 'Vegetables', 20, PHOTOS.spinach, 'GreenLeaf', '250 g', 'Tender leafy green palak'],
    ['Bananas 1 doz', '🍌', 'Fruits', 60, PHOTOS.banana, 'Tropical Gold', '12 pcs', 'Naturally ripened sweet Yelakki/Robusta'],
    ['Apples 1kg', '🍎', 'Fruits', 150, PHOTOS.apple, 'Himalayan Orchards', '1 kg', 'Crunchy sweet red apples'],
    ['Mangoes 1kg', '🥭', 'Fruits', 120, PHOTOS.mango, 'Ratnagiri Select', '1 kg', 'Sweet aromatic Alphonso mangoes'],
    ['Milk 1L', '🥛', 'Dairy', 58, PHOTOS.milk, 'DairyPure', '1 L', 'Pasteurised toned fresh cow milk'],
    ['Paneer 200g', '🧀', 'Dairy', 90, PHOTOS.paneer, 'DairyPure', '200 g', 'Soft, fresh malai cottage cheese'],
    ['Eggs 12', '🥚', 'Dairy', 84, PHOTOS.eggs, 'HappyHens', '12 pcs', 'Protein-rich farm fresh white eggs'],
    ['Basmati Rice 5kg', '🍚', 'Staples', 520, PHOTOS.rice, 'Royal Grain', '5 kg', 'Long-grain aromatic aged basmati'],
    ['Wheat Flour 5kg', '🌾', 'Staples', 260, PHOTOS.flour, 'Golden Mill', '5 kg', '100% whole wheat chakki fresh atta'],
    ['Toor Dal 1kg', '🫘', 'Staples', 165, PHOTOS.dal, 'Desi Harvest', '1 kg', 'Unpolished protein-rich arhar dal'],
    ['Bread loaf', '🍞', 'Bakery', 45, PHOTOS.bread, 'OvenFresh', '400 g', 'Soft freshly baked sandwich bread'],
    ['Biscuits pack', '🍪', 'Snacks', 30, PHOTOS.biscuits, 'BakeHouse', '150 g', 'Crispy golden butter cookies'],
    ['Orange Juice 1L', '🧃', 'Beverages', 110, PHOTOS.juice, 'SunSip', '1 L', '100% squeezed Valencia orange juice'],
    ['Sugar 1kg', '🧂', 'Staples', 48, PHOTOS.sugar, 'SweetCane', '1 kg', 'Fine white crystal sulphurless sugar'],
    ['Assam Tea 250g', '🍵', 'Beverages', 135, PHOTOS.tea, 'ValleyBrew', '250 g', 'Strong aromatic CTC Assam tea leaves'],
    ['Butter 100g', '🧈', 'Dairy', 56, PHOTOS.butter, 'DairyPure', '100 g', 'Pasteurised salted creamy table butter'],
    ['Fresh Curd 400g', '🥣', 'Dairy', 42, PHOTOS.curd, 'DairyPure', '400 g', 'Thick, creamy probiotic dahi'],
  ];
  return {
    users: [
      { id: 1, role: 'admin', name: 'Store Admin', user: 'admin', pass: 'admin123' },
      { id: 2, role: 'delivery', name: 'Ravi Kumar', user: 'delivery', pass: 'deliver123', phone: '9876543210', veh: 'AP 07 FC 1024' },
      { id: 3, role: 'customer', name: 'Demo Customer', user: 'customer', pass: 'cust123', phone: '9123456780', addr: 'Flat 302, Green Valley Apartments, Guntur' },
    ],
    products: P.map((p, i) => ({
      id: i + 1,
      n: p[0],
      e: p[1],
      c: p[2],
      p: p[3],
      s: 25 + (i % 7) * 5,
      img: p[4],
      brand: p[5],
      unit: p[6],
      desc: p[7],
      ratings: [],
    })),
    orders: [],
    coupons: [
      { code: 'FRESH10', pct: 10, min: 200, on: true },
      { code: 'WELCOME20', pct: 20, min: 500, on: true },
    ],
    nid: 1001,
    nu: 4,
    np: 21,
  };
}

if (!db) db = seed();

db.notes = db.notes || [];
db.spins = db.spins || [];
// Backfill realistic photos & rating arrays on existing saved databases
const PHOTO_MAP = {
  tomato: PHOTOS.tomato, potato: PHOTOS.potato, onion: PHOTOS.onion, spinach: PHOTOS.spinach,
  banana: PHOTOS.banana, apple: PHOTOS.apple, mango: PHOTOS.mango, milk: PHOTOS.milk,
  paneer: PHOTOS.paneer, egg: PHOTOS.eggs, rice: PHOTOS.rice, flour: PHOTOS.flour,
  dal: PHOTOS.dal, bread: PHOTOS.bread, biscuit: PHOTOS.biscuits, juice: PHOTOS.juice,
  sugar: PHOTOS.sugar, tea: PHOTOS.tea, butter: PHOTOS.butter, curd: PHOTOS.curd,
};
(db.products || []).forEach((p) => {
  p.ratings = p.ratings || [];
  if (!p.img) {
    const k = Object.keys(PHOTO_MAP).find((x) => p.n.toLowerCase().includes(x));
    if (k) p.img = PHOTO_MAP[k];
  }
});

// Save all data to the browser (localStorage)
const save = () => {
  try {
    localStorage.setItem(K, JSON.stringify(db));
  } catch (e) {
    toast('⚠ Could not save data in this browser');
  }
};

// me = the logged-in user (null when logged out)
let me = null;

try {
  me = db.users.find((u) => u.id == localStorage.getItem('fc_me')) || null;
} catch (e) {}

// ui = what is on screen now: tab, cart, chat, errors
let ui = {
  ai: false,
  nb: 0,
  ep: 0,
  chat: { customer: [], admin: [], delivery: [] },
  tab: '',
  q: '',
  cat: 'All',
  cart: {},
  cp: null,
  role: 'customer',
  pay: 'cod',
  es: 0,
  of: 'All',
  ox: {},
  spinning: 0,
  mode: 'login',
  err: '',
  rateStars: {},
  retOpen: {},
};

if (me) ui.tab = { customer: 'shop', admin: 'dash', delivery: 'tasks' }[me.role];

// Small pop-up message
function toast(m) {
  const t = $('#toast');
  t.textContent = m;
  t.style.display = 'block';
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.style.display = 'none'), 2400);
}

// Switch to another tab
const go = (t) => {
  ui.tab = t;
  R();
};

// Find a product by id
const pid = (id) => db.products.find((p) => p.id == id);

// Find a user by id
const du = (id) => db.users.find((u) => u.id == id) || { name: '(removed)' };

// Rating summary helper for products and delivery persons
function avgRating(arr) {
  if (!arr || !arr.length) return null;
  const sum = arr.reduce((a, x) => a + Number(x.stars || x || 0), 0);
  return { avg: (sum / arr.length).toFixed(1), count: arr.length };
}

function driverRating(driverId) {
  const list = (db.orders || [])
    .filter((o) => o.driver == driverId && o.rating && o.rating.driver > 0)
    .map((o) => o.rating.driver);
  return avgRating(list);
}
