const $ = (s, e = document) => e.querySelector(s);
const $$ = (s, e = document) => [...e.querySelectorAll(s)];
const KEY = 'saffron-table-v1';
const STATUS = ['Pending', 'Preparing', 'Ready', 'Served', 'Paid'];
const NEXT = { Pending: 'Start cooking', Preparing: 'Mark ready', Ready: 'Mark served', Served: 'Take payment' };
const money = n => '₹' + Math.round(n).toLocaleString('en-IN');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const seed = () => ({
  nextId: 1, nextMenu: 11,
  tables: [2, 2, 4, 4, 4, 6, 6, 8].map((seats, i) => ({ id: i + 1, seats })),
  menu: [
    [1, 'Paneer Tikka', 'Starters', 240, '🧀'], [2, 'Chicken 65', 'Starters', 280, '🍗'],
    [3, 'Butter Chicken', 'Mains', 360, '🍛'], [4, 'Dal Makhani', 'Mains', 260, '🥘'],
    [5, 'Veg Biryani', 'Mains', 300, '🍚'], [6, 'Butter Naan', 'Breads', 60, '🫓'],
    [7, 'Gulab Jamun', 'Desserts', 120, '🍮'], [8, 'Masala Chai', 'Drinks', 50, '🍵'],
    [9, 'Sweet Lassi', 'Drinks', 110, '🥛'], [10, 'Fresh Lime Soda', 'Drinks', 90, '🍋']
  ].map(([id, name, cat, price, emoji]) => ({ id, name, cat, price, emoji })),
  orders: []
});

let S;
try { S = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { S = seed(); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

let cart = {}, cat = 'All', q = '', editId = null, view = 'dashboard';

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}
const isBusy = id => S.orders.some(o => o.table === id && o.status !== 'Paid');
const orderTotal = o => o.items.reduce((s, i) => s + i.price * i.qty, 0) * 1.05;

/* ---------- navigation ---------- */
function show(v) {
  view = v;
  $$('.view').forEach(s => s.classList.toggle('on', s.id === v));
  $$('nav button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  render();
}
$$('nav button').forEach(b => b.onclick = () => show(b.dataset.view));

/* ---------- dashboard ---------- */
function renderDashboard() {
  const paid = S.orders.filter(o => o.status === 'Paid');
  const active = S.orders.filter(o => o.status !== 'Paid');
  const busy = S.tables.filter(t => isBusy(t.id)).length;
  $('#stats').innerHTML = [
    [money(paid.reduce((s, o) => s + o.total, 0)), 'Revenue collected'],
    [active.length, 'Orders in progress'],
    [`${busy} / ${S.tables.length}`, 'Tables occupied'],
    [paid.length ? money(paid.reduce((s, o) => s + o.total, 0) / paid.length) : '₹0', 'Average bill']
  ].map(([b, l]) => `<div class="stat"><b>${b}</b><span>${l}</span></div>`).join('');

  const count = {};
  S.orders.forEach(o => o.items.forEach(i => count[i.name] = (count[i.name] || 0) + i.qty));
  const top = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 5);
  $('#top').innerHTML = top.length ? top.map(([n, c]) => `<li>${esc(n)} <b>×${c}</b></li>`).join('') : '<p class="empty">No sales yet. Place your first order.</p>';
  const rec = [...S.orders].reverse().slice(0, 6);
  $('#recent').innerHTML = rec.length ? rec.map(o => `<div class="line"><span>#${o.id} · Table ${o.table}</span><span class="tag ${o.status}">${o.status}</span><b>${money(o.total)}</b></div>`).join('') : '<p class="empty">Orders will appear here.</p>';
}

/* ---------- orders / POS ---------- */
function renderPOS() {
  const cats = ['All', ...new Set(S.menu.map(m => m.cat))];
  $('#chips').innerHTML = cats.map(c => `<button class="chip ${c === cat ? 'on' : ''}" data-c="${c}">${c}</button>`).join('');
  $$('.chip').forEach(b => b.onclick = () => { cat = b.dataset.c; renderPOS(); });

  const items = S.menu.filter(m => (cat === 'All' || m.cat === cat) && m.name.toLowerCase().includes(q));
  $('#pick').innerHTML = items.map(m => `<button class="dish" data-id="${m.id}"><div class="e">${esc(m.emoji)}</div><b>${esc(m.name)}</b><span>${money(m.price)}</span></button>`).join('') || '<p class="empty">No dishes match.</p>';
  $$('.dish').forEach(b => b.onclick = () => { cart[b.dataset.id] = (cart[b.dataset.id] || 0) + 1; renderCart(); });

  const sel = $('#tableSel'), cur = sel.value;
  sel.innerHTML = S.tables.map(t => `<option value="${t.id}" ${isBusy(t.id) ? 'disabled' : ''}>Table ${t.id} (${t.seats} seats)${isBusy(t.id) ? ' - occupied' : ''}</option>`).join('');
  if (cur) sel.value = cur;
  renderCart(); renderActive();
}
function renderCart() {
  const rows = Object.entries(cart).map(([id, n]) => ({ m: S.menu.find(x => x.id == id), n })).filter(r => r.m);
  $('#cart').innerHTML = rows.length ? rows.map(({ m, n }) => `<div class="line"><span>${esc(m.name)}</span><span class="qty"><button data-d="-1" data-id="${m.id}" aria-label="Remove one">−</button>${n}<button data-d="1" data-id="${m.id}" aria-label="Add one">+</button></span></div>`).join('') : '<p class="empty">Tap a dish to add it.</p>';
  $$('.qty button').forEach(b => b.onclick = () => {
    cart[b.dataset.id] += +b.dataset.d;
    if (cart[b.dataset.id] <= 0) delete cart[b.dataset.id];
    renderCart();
  });
  $('#total').textContent = money(rows.reduce((s, r) => s + r.m.price * r.n, 0) * 1.05);
}
$('#search').oninput = e => { q = e.target.value.toLowerCase(); renderPOS(); };
$('#place').onclick = () => {
  const rows = Object.entries(cart).map(([id, qty]) => ({ ...S.menu.find(x => x.id == id), qty }));
  const table = +$('#tableSel').value;
  if (!rows.length) return toast('Add at least one dish first.');
  if (!table || isBusy(table)) return toast('Choose a free table.');
  const o = { id: S.nextId++, table, status: 'Pending', time: Date.now(), items: rows.map(({ name, price, qty }) => ({ name, price, qty })) };
  o.total = orderTotal(o);
  S.orders.push(o); cart = {}; save(); toast(`Order #${o.id} placed for table ${table}.`); render();
};
function renderActive() {
  const act = S.orders.filter(o => o.status !== 'Paid');
  $('#active').innerHTML = act.length ? act.map(o => `
    <article class="ord"><header><b>#${o.id} · Table ${o.table}</b><span class="tag ${o.status}">${o.status}</span></header>
    <div>${o.items.map(i => `<div class="line"><span>${i.qty}× ${esc(i.name)}</span><span>${money(i.price * i.qty)}</span></div>`).join('')}</div>
    <div class="line"><b>Total</b><b>${money(o.total)}</b></div>
    <div class="acts"><button data-cancel="${o.id}">Cancel</button><button class="go" data-adv="${o.id}">${NEXT[o.status]}</button></div></article>`).join('') : '<p class="empty">No active orders.</p>';
  $$('[data-adv]').forEach(b => b.onclick = () => {
    const o = S.orders.find(x => x.id == b.dataset.adv);
    o.status = STATUS[STATUS.indexOf(o.status) + 1]; save(); toast(`Order #${o.id} is now ${o.status}.`); render();
  });
  $$('[data-cancel]').forEach(b => b.onclick = () => {
    if (!confirm('Cancel this order?')) return;
    S.orders = S.orders.filter(x => x.id != b.dataset.cancel); save(); render();
  });
}

/* ---------- tables ---------- */
function renderTables() {
  $('#tableGrid').innerHTML = S.tables.map(t => {
    const o = S.orders.find(x => x.table === t.id && x.status !== 'Paid');
    return `<button class="tbl ${o ? 'busy' : ''}" data-t="${t.id}" ${o ? 'disabled' : ''}><b>${t.id}</b><small>${t.seats} seats</small><br><small>${o ? `Order #${o.id} · ${o.status}` : 'Free'}</small></button>`;
  }).join('');
  $$('.tbl:not(.busy)').forEach(b => b.onclick = () => { show('orders'); $('#tableSel').value = b.dataset.t; });
}

/* ---------- menu CRUD ---------- */
function renderMenu() {
  $('#menuTable').innerHTML = '<tr><th></th><th>Dish</th><th>Category</th><th>Price</th><th></th></tr>' + S.menu.map(m =>
    `<tr><td>${esc(m.emoji)}</td><td>${esc(m.name)}</td><td>${m.cat}</td><td>${money(m.price)}</td><td><button data-e="${m.id}">Edit</button><button data-x="${m.id}">Delete</button></td></tr>`).join('');
  $$('[data-e]').forEach(b => b.onclick = () => openDlg(+b.dataset.e));
  $$('[data-x]').forEach(b => b.onclick = () => {
    if (!confirm('Delete this dish?')) return;
    S.menu = S.menu.filter(m => m.id != b.dataset.x); delete cart[b.dataset.x]; save(); render(); toast('Dish deleted.');
  });
}
function openDlg(id = null) {
  editId = id; const f = $('#form'), m = S.menu.find(x => x.id === id);
  $('#dlgTitle').textContent = m ? 'Edit dish' : 'Add dish';
  f.name.value = m?.name || ''; f.cat.value = m?.cat || 'Starters'; f.price.value = m?.price || ''; f.emoji.value = m?.emoji || '🍽️';
  $('#dlg').showModal();
}
$('#addItem').onclick = () => openDlg();
$('#form').onsubmit = e => {
  if (e.submitter?.value !== 'ok') return;
  const f = e.target, d = { name: f.name.value.trim(), cat: f.cat.value, price: +f.price.value, emoji: f.emoji.value || '🍽️' };
  if (editId) Object.assign(S.menu.find(x => x.id === editId), d); else S.menu.push({ id: S.nextMenu++, ...d });
  save(); render(); toast('Dish saved.');
};

$('#reset').onclick = () => { if (confirm('Erase all data and restore the demo menu?')) { S = seed(); cart = {}; save(); render(); } };

function render() {
  ({ dashboard: renderDashboard, orders: renderPOS, tables: renderTables, menu: renderMenu })[view]();
}
render();
