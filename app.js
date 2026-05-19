/**
 * App Module – Dashboard Logic
 * ============================
 * Handles all Firestore CRUD operations for expenses.
 * Each user's expenses are stored under: users/{uid}/expenses/{docId}
 * Uses real-time onSnapshot listener for live updates.
 */

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    collection, addDoc, deleteDoc, doc, query, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ===== Category Definitions =====
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

// ===== DOM References =====
const $ = id => document.getElementById(id);
const form = $('expenseForm');
const expenseList = $('expenseList');
const categoriesList = $('categoriesList');
const filterCat = $('filterCategory');
const sortBy = $('sortBy');

let expenses = [];       // Current user's expenses from Firestore
let currentUser = null;  // Firebase Auth user object
let unsubscribe = null;  // Firestore listener cleanup function

// ===== Toast Notification =====
function showToast(msg, isError = false) {
    const t = $('toast');
    const m = $('toastMessage');
    if (!t || !m) return;
    t.className = `toast ${isError ? 'toast-error' : ''} show`;
    m.textContent = msg;
    setTimeout(() => t.classList.remove('show'), 2800);
}

// ===== Auth State Observer =====
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Not logged in → redirect to login
        window.location.href = 'login.html';
        return;
    }
    currentUser = user;
    setupDashboard(user);
    subscribeToExpenses(user.uid);
});

// ===== Setup Dashboard with User Info =====
function setupDashboard(user) {
    const name = user.displayName || user.email.split('@')[0];
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    // Update greeting
    const h1 = document.querySelector('.dashboard-header h1');
    if (h1) h1.textContent = `${greeting}, ${name} 👋`;

    // Update sidebar user info
    const avatar = document.querySelector('.user-avatar');
    const userName = document.querySelector('.user-name');
    const userRole = document.querySelector('.user-role');
    if (avatar) avatar.textContent = name.charAt(0).toUpperCase();
    if (userName) userName.textContent = name;
    if (userRole) userRole.textContent = user.email;

    // Set current month in header
    const monthEl = $('currentMonth');
    if (monthEl) monthEl.textContent = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Set default date on form
    const dateInput = $('expenseDate');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
}

// ===== Real-time Firestore Listener =====
function subscribeToExpenses(uid) {
    // Clean up any previous listener
    if (unsubscribe) unsubscribe();

    // Path: users/{uid}/expenses, ordered by timestamp descending
    const expRef = collection(db, 'users', uid, 'expenses');
    const q = query(expRef, orderBy('timestamp', 'desc'));

    unsubscribe = onSnapshot(q, (snapshot) => {
        expenses = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            // Convert Firestore Timestamp to JS Date string
            date: d.data().timestamp?.toDate?.()
                ? d.data().timestamp.toDate().toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0]
        }));
        render();
    }, (err) => {
        console.error('Firestore listen error:', err);
        showToast('Error loading expenses', true);
    });
}

// ===== Add Expense =====
form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const title = $('expenseName').value.trim();
    const amount = parseFloat($('expenseAmount').value);
    const category = $('expenseCategory').value;
    const date = $('expenseDate').value;
    const note = $('expenseNote').value.trim();

    if (!title || isNaN(amount) || !category) {
        showToast('Please fill in all required fields', true);
        return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Adding...`;

    try {
        const expRef = collection(db, 'users', currentUser.uid, 'expenses');
        await addDoc(expRef, {
            title,
            amount,
            category,
            note,
            timestamp: serverTimestamp(),
            dateString: date  // Keep the user-selected date for display
        });
        form.reset();
        $('expenseDate').value = new Date().toISOString().split('T')[0];
        showToast('Expense added successfully!');
    } catch (err) {
        console.error('Add expense error:', err);
        showToast('Failed to add expense', true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Add Expense`;
    }
});

// ===== Delete Expense =====
window.deleteExpense = async function(id) {
    if (!currentUser) return;
    try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'expenses', id));
        showToast('Expense deleted');
    } catch (err) {
        console.error('Delete error:', err);
        showToast('Failed to delete expense', true);
    }
};

// ===== Logout =====
$('logoutBtn')?.addEventListener('click', async () => {
    try {
        if (unsubscribe) unsubscribe();
        await signOut(auth);
        // Auth observer will redirect to login
    } catch (err) {
        showToast('Logout failed', true);
    }
});

// ===== Filter & Sort =====
filterCat?.addEventListener('change', render);
sortBy?.addEventListener('change', render);

function getFiltered() {
    let list = [...expenses];
    const cat = filterCat?.value;
    if (cat && cat !== 'all') list = list.filter(e => e.category === cat);

    const sort = sortBy?.value || 'date-desc';
    list.sort((a, b) => {
        if (sort === 'date-desc') return (b.dateString || b.date).localeCompare(a.dateString || a.date);
        if (sort === 'date-asc') return (a.dateString || a.date).localeCompare(b.dateString || b.date);
        if (sort === 'amount-desc') return b.amount - a.amount;
        return a.amount - b.amount;
    });
    return list;
}

// ===== Render All Sections =====
function render() {
    renderSummary();
    renderExpenses();
    renderCategories();
}

function renderSummary() {
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const today = new Date().toISOString().split('T')[0];
    const todayTotal = expenses.filter(e => (e.dateString || e.date) === today).reduce((s, e) => s + e.amount, 0);
    const days = new Set(expenses.map(e => e.dateString || e.date)).size || 1;

    $('totalExpenses').textContent = fmt(total);
    $('todayExpenses').textContent = fmt(todayTotal);
    $('transactionCount').textContent = expenses.length;
    $('dailyAverage').textContent = fmt(total / days);
}

function renderExpenses() {
    const filtered = getFiltered();
    const emptyState = $('emptyState');

    if (!filtered.length) {
        expenseList.innerHTML = '';
        if (emptyState) { expenseList.appendChild(emptyState); emptyState.style.display = 'flex'; }
        return;
    }
    if (emptyState) emptyState.style.display = 'none';

    expenseList.innerHTML = filtered.map(e => {
        const cat = CATEGORIES[e.category] || CATEGORIES.other;
        const dateStr = new Date(((e.dateString || e.date)) + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `
        <div class="expense-item">
            <div class="expense-icon" style="background:var(--${getCatBg(e.category)})">${cat.emoji}</div>
            <div class="expense-details">
                <div class="expense-name">${esc(e.title || e.name || '')}</div>
                <div class="expense-meta">
                    <span>${cat.label}</span><span class="dot"></span><span>${dateStr}</span>
                    ${e.note ? `<span class="dot"></span><span>${esc(e.note)}</span>` : ''}
                </div>
            </div>
            <div class="expense-amount">-${fmt(e.amount)}</div>
            <button class="btn-danger-ghost" onclick="deleteExpense('${e.id}')" title="Delete">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6"/><path d="M14 11v6"/>
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
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
                <p>No category data yet</p><span>Add expenses to see breakdown</span>
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
function getCatBg(cat) {
    const map = { food:'warning-light', transport:'info-light', shopping:'pink-light', bills:'purple-light', entertainment:'danger-light', health:'success-light', education:'teal-light', other:'bg' };
    return map[cat] || 'bg';
}

// ===== Export CSV =====
$('exportBtn')?.addEventListener('click', () => {
    if (!expenses.length) { showToast('No expenses to export'); return; }
    const header = 'Title,Amount,Date,Category,Note\n';
    const rows = expenses.map(e =>
        `"${e.title || ''}",${e.amount},${e.dateString || e.date},"${CATEGORIES[e.category]?.label || 'Other'}","${e.note || ''}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast('Expenses exported as CSV');
});

// ===== Mobile Sidebar Toggle =====
$('menuToggle')?.addEventListener('click', () => {
    $('sidebar')?.classList.toggle('open');
    $('sidebarOverlay')?.classList.toggle('show');
});
$('sidebarOverlay')?.addEventListener('click', () => {
    $('sidebar')?.classList.remove('open');
    $('sidebarOverlay')?.classList.remove('show');
});

// ===== Add Expense button scrolls to form =====
$('addExpenseToggle')?.addEventListener('click', () => {
    $('expenseFormCard')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => $('expenseName')?.focus(), 400);
});
