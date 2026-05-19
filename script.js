// ===== Data & State =====
const CATEGORIES = {
    food:          { emoji: '🍔', label: 'Food & Dining' },
    transport:     { emoji: '🚗', label: 'Transportation' },
    shopping:      { emoji: '🛍️', label: 'Shopping' },
    bills:         { emoji: '📄', label: 'Bills & Utilities' },
    entertainment: { emoji: '🎬', label: 'Entertainment' },
    health:        { emoji: '💊', label: 'Health & Medical' },
    education:     { emoji: '📚', label: 'Education' },
    other:         { emoji: '📦', label: 'Other' }
};

let expenses = JSON.parse(localStorage.getItem('expenses') || '[]');

// ===== DOM Elements =====
const $ = id => document.getElementById(id);
const form          = $('expenseForm');
const expenseList   = $('expenseList');
const emptyState    = $('emptyState');
const categoriesList= $('categoriesList');
const filterCat     = $('filterCategory');
const sortBy        = $('sortBy');
const toast         = $('toast');
const toastMsg      = $('toastMessage');
const sidebar       = $('sidebar');
const overlay       = $('sidebarOverlay');
const menuToggle    = $('menuToggle');

// ===== Initialise =====
document.addEventListener('DOMContentLoaded', () => {
    $('expenseDate').value = new Date().toISOString().split('T')[0];
    $('currentMonth').textContent = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    render();
});

// ===== Sidebar Toggle =====
menuToggle?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
});
overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
});

// ===== Form Submission =====
form.addEventListener('submit', e => {
    e.preventDefault();
    const expense = {
        id: Date.now(),
        name: $('expenseName').value.trim(),
        amount: parseFloat($('expenseAmount').value),
        date: $('expenseDate').value,
        category: $('expenseCategory').value,
        note: $('expenseNote').value.trim()
    };
    expenses.unshift(expense);
    save();
    render();
    form.reset();
    $('expenseDate').value = new Date().toISOString().split('T')[0];
    showToast('Expense added successfully!');
});

// ===== Delete Expense =====
function deleteExpense(id) {
    expenses = expenses.filter(e => e.id !== id);
    save();
    render();
    showToast('Expense deleted');
}

// ===== Filter & Sort =====
filterCat.addEventListener('change', render);
sortBy.addEventListener('change', render);

function getFiltered() {
    let list = [...expenses];
    const cat = filterCat.value;
    if (cat !== 'all') list = list.filter(e => e.category === cat);

    const sort = sortBy.value;
    list.sort((a, b) => {
        if (sort === 'date-desc') return new Date(b.date) - new Date(a.date);
        if (sort === 'date-asc')  return new Date(a.date) - new Date(b.date);
        if (sort === 'amount-desc') return b.amount - a.amount;
        return a.amount - b.amount;
    });
    return list;
}

// ===== Render =====
function render() {
    renderSummary();
    renderExpenses();
    renderCategories();
}

function renderSummary() {
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const today = new Date().toISOString().split('T')[0];
    const todayTotal = expenses.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);
    const days = new Set(expenses.map(e => e.date)).size || 1;

    $('totalExpenses').textContent = fmt(total);
    $('todayExpenses').textContent = fmt(todayTotal);
    $('transactionCount').textContent = expenses.length;
    $('dailyAverage').textContent = fmt(total / days);
}

function renderExpenses() {
    const filtered = getFiltered();
    if (!filtered.length) {
        expenseList.innerHTML = '';
        expenseList.appendChild(emptyState);
        emptyState.style.display = 'flex';
        return;
    }
    emptyState.style.display = 'none';
    expenseList.innerHTML = filtered.map(e => {
        const cat = CATEGORIES[e.category] || CATEGORIES.other;
        const catClass = `cat-${e.category}`;
        const dateStr = new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `
        <div class="expense-item">
            <div class="expense-icon ${catClass}" style="background:var(--${getCatBg(e.category)})">
                ${cat.emoji}
            </div>
            <div class="expense-details">
                <div class="expense-name">${esc(e.name)}</div>
                <div class="expense-meta">
                    <span>${cat.label}</span>
                    <span class="dot"></span>
                    <span>${dateStr}</span>
                    ${e.note ? `<span class="dot"></span><span>${esc(e.note)}</span>` : ''}
                </div>
            </div>
            <div class="expense-amount">-${fmt(e.amount)}</div>
            <button class="btn-danger-ghost" onclick="deleteExpense(${e.id})" title="Delete">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                    <path d="M10 11v6"></path>
                    <path d="M14 11v6"></path>
                </svg>
            </button>
        </div>`;
    }).join('');
}

function renderCategories() {
    const totals = {};
    let max = 0;
    expenses.forEach(e => {
        totals[e.category] = (totals[e.category] || 0) + e.amount;
        if (totals[e.category] > max) max = totals[e.category];
    });

    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    if (!entries.length) {
        categoriesList.innerHTML = `
            <div class="empty-state category-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"></path>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                </svg>
                <p>No category data yet</p>
                <span>Add expenses to see breakdown</span>
            </div>`;
        return;
    }

    const total = expenses.reduce((s, e) => s + e.amount, 0);
    categoriesList.innerHTML = entries.map(([cat, amount]) => {
        const c = CATEGORIES[cat] || CATEGORIES.other;
        const pct = max ? (amount / max * 100) : 0;
        const count = expenses.filter(e => e.category === cat).length;
        return `
        <div class="category-item cat-${cat}">
            <div class="category-emoji">${c.emoji}</div>
            <div class="category-info">
                <div class="category-name">${c.label}</div>
                <div class="category-count">${count} transaction${count !== 1 ? 's' : ''} · ${(amount / total * 100).toFixed(1)}%</div>
                <div class="category-bar"><div class="category-bar-fill" style="width:${pct}%"></div></div>
            </div>
            <div class="category-amount">${fmt(amount)}</div>
        </div>`;
    }).join('');
}

// ===== Helpers =====
function fmt(n) { return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function save() { localStorage.setItem('expenses', JSON.stringify(expenses)); }

function getCatBg(cat) {
    const map = { food: 'warning-light', transport: 'info-light', shopping: 'pink-light', bills: 'purple-light', entertainment: 'danger-light', health: 'success-light', education: 'teal-light', other: 'bg' };
    return map[cat] || 'bg';
}

function showToast(msg) {
    toastMsg.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===== Export CSV =====
$('exportBtn')?.addEventListener('click', () => {
    if (!expenses.length) { showToast('No expenses to export'); return; }
    const header = 'Name,Amount,Date,Category,Note\n';
    const rows = expenses.map(e => `"${e.name}",${e.amount},${e.date},"${CATEGORIES[e.category]?.label || 'Other'}","${e.note || ''}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast('Expenses exported as CSV');
});

// ===== Add Expense toggle (mobile scroll) =====
$('addExpenseToggle')?.addEventListener('click', () => {
    $('expenseFormCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => $('expenseName').focus(), 400);
});
