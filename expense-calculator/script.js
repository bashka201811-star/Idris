const STORAGE_KEY = 'expense-calculator/v1/transactions';

const CATEGORIES = {
  expense: [
    'Продукты',
    'Кафе и рестораны',
    'Транспорт',
    'Жильё',
    'Связь и интернет',
    'Здоровье',
    'Одежда',
    'Развлечения',
    'Образование',
    'Подписки',
    'Подарки',
    'Прочее',
  ],
  income: [
    'Зарплата',
    'Подработка',
    'Инвестиции',
    'Подарок',
    'Возврат',
    'Прочее',
  ],
};

const state = {
  transactions: [],
  formType: 'expense',
  filterType: 'all',
  filterPeriod: 'all',
};

const $ = (sel) => document.querySelector(sel);
const els = {
  form: $('#txForm'),
  amount: $('#amount'),
  category: $('#category'),
  date: $('#date'),
  description: $('#description'),
  toggleBtns: document.querySelectorAll('.toggle__btn'),
  totalIncome: $('#totalIncome'),
  totalExpense: $('#totalExpense'),
  balance: $('#balance'),
  balanceCard: document.querySelector('.card--balance'),
  txList: $('#txList'),
  emptyState: $('#emptyState'),
  filterType: $('#filterType'),
  filterPeriod: $('#filterPeriod'),
  clearAll: $('#clearAll'),
  chartSection: $('#chartSection'),
  chart: $('#chart'),
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.transactions = raw ? JSON.parse(raw) : [];
  } catch {
    state.transactions = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
}

function formatMoney(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayIso() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fillCategories() {
  const list = CATEGORIES[state.formType];
  els.category.innerHTML = list.map((c) => `<option value="${c}">${c}</option>`).join('');
}

function setFormType(type) {
  state.formType = type;
  els.toggleBtns.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.type === type);
  });
  fillCategories();
}

function addTransaction(tx) {
  state.transactions.unshift(tx);
  save();
  render();
}

function deleteTransaction(id) {
  state.transactions = state.transactions.filter((t) => t.id !== id);
  save();
  render();
}

function clearAll() {
  if (state.transactions.length === 0) return;
  const ok = confirm('Удалить все операции? Это действие нельзя отменить.');
  if (!ok) return;
  state.transactions = [];
  save();
  render();
}

function periodMatches(tx, period) {
  if (period === 'all') return true;
  const txDate = new Date(tx.date);
  const now = new Date();
  if (period === 'today') {
    return tx.date === todayIso();
  }
  if (period === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return txDate >= weekAgo;
  }
  if (period === 'month') {
    return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
  }
  return true;
}

function getFiltered() {
  return state.transactions.filter((tx) => {
    if (state.filterType !== 'all' && tx.type !== state.filterType) return false;
    if (!periodMatches(tx, state.filterPeriod)) return false;
    return true;
  });
}

function renderSummary() {
  const filtered = getFiltered();
  const income = filtered
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const expense = filtered
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  els.totalIncome.textContent = formatMoney(income);
  els.totalExpense.textContent = formatMoney(expense);
  els.balance.textContent = formatMoney(balance);

  els.balanceCard.classList.remove('is-positive', 'is-negative');
  if (balance > 0) els.balanceCard.classList.add('is-positive');
  else if (balance < 0) els.balanceCard.classList.add('is-negative');
}

function renderList() {
  const filtered = getFiltered();
  els.txList.innerHTML = '';
  if (filtered.length === 0) {
    els.emptyState.hidden = false;
    return;
  }
  els.emptyState.hidden = true;

  const sorted = [...filtered].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.createdAt - a.createdAt;
  });

  const frag = document.createDocumentFragment();
  for (const tx of sorted) {
    const li = document.createElement('li');
    li.className = 'tx';
    const sign = tx.type === 'income' ? '+' : '−';
    li.innerHTML = `
      <div class="tx__info">
        <div class="tx__title">${tx.description ? escapeHtml(tx.description) : escapeHtml(tx.category)}</div>
        <div class="tx__meta">${escapeHtml(tx.category)} · ${formatDate(tx.date)}</div>
      </div>
      <div class="tx__amount tx__amount--${tx.type}">${sign}${formatMoney(tx.amount)}</div>
      <button class="tx__delete" title="Удалить" aria-label="Удалить">×</button>
    `;
    li.querySelector('.tx__delete').addEventListener('click', () => deleteTransaction(tx.id));
    frag.appendChild(li);
  }
  els.txList.appendChild(frag);
}

function renderChart() {
  const filtered = getFiltered().filter((t) => t.type === 'expense');
  if (filtered.length === 0) {
    els.chartSection.hidden = true;
    return;
  }
  const totals = {};
  for (const t of filtered) {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  }
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const max = entries[0][1];

  els.chart.innerHTML = entries
    .map(([cat, sum]) => {
      const pct = Math.max(4, Math.round((sum / max) * 100));
      return `
        <div class="chart__row">
          <div>${escapeHtml(cat)}</div>
          <div class="chart__bar"><div class="chart__fill" style="width:${pct}%"></div></div>
          <div class="chart__amount">${formatMoney(sum)}</div>
        </div>
      `;
    })
    .join('');
  els.chartSection.hidden = false;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function render() {
  renderSummary();
  renderList();
  renderChart();
}

function onSubmit(e) {
  e.preventDefault();
  const amount = parseFloat(els.amount.value);
  if (!Number.isFinite(amount) || amount <= 0) return;
  const tx = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    type: state.formType,
    amount,
    category: els.category.value,
    date: els.date.value,
    description: els.description.value.trim(),
    createdAt: Date.now(),
  };
  addTransaction(tx);
  els.form.reset();
  els.date.value = todayIso();
  fillCategories();
  els.amount.focus();
}

function init() {
  load();
  els.date.value = todayIso();
  fillCategories();

  els.toggleBtns.forEach((btn) => {
    btn.addEventListener('click', () => setFormType(btn.dataset.type));
  });
  els.form.addEventListener('submit', onSubmit);
  els.filterType.addEventListener('change', (e) => {
    state.filterType = e.target.value;
    render();
  });
  els.filterPeriod.addEventListener('change', (e) => {
    state.filterPeriod = e.target.value;
    render();
  });
  els.clearAll.addEventListener('click', clearAll);

  render();
}

init();
