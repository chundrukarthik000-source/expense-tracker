/**
 * Authentication Module
 * =====================
 * Handles signup, login, logout, and auth state observation.
 * Uses Firebase Auth with email/password provider.
 */

import { auth } from "./firebase-config.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ===== Toast helper (shared across auth pages) =====
function showToast(msg, isError = false) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'toast-error' : ''} show`;
    toast.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${isError
                ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'
                : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'}
        </svg>
        <span>${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3000);
}

// ===== Set loading state on a button =====
function setLoading(btn, loading) {
    if (loading) {
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = `<span class="spinner"></span> Please wait...`;
        btn.disabled = true;
    } else {
        btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
        btn.disabled = false;
    }
}

// ===== SIGNUP =====
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirm = document.getElementById('signupConfirm').value;
        const btn = signupForm.querySelector('button[type="submit"]');

        // Validation
        if (password.length < 6) { showToast('Password must be at least 6 characters', true); return; }
        if (password !== confirm) { showToast('Passwords do not match', true); return; }

        try {
            setLoading(btn, true);
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            // Set display name
            await updateProfile(cred.user, { displayName: name });
            showToast('Account created successfully!');
            setTimeout(() => window.location.href = 'index.html', 1000);
        } catch (err) {
            const messages = {
                'auth/email-already-in-use': 'This email is already registered',
                'auth/invalid-email': 'Please enter a valid email address',
                'auth/weak-password': 'Password is too weak'
            };
            showToast(messages[err.code] || err.message, true);
        } finally {
            setLoading(btn, false);
        }
    });
}

// ===== LOGIN =====
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const btn = loginForm.querySelector('button[type="submit"]');

        try {
            setLoading(btn, true);
            await signInWithEmailAndPassword(auth, email, password);
            showToast('Welcome back!');
            setTimeout(() => window.location.href = 'index.html', 800);
        } catch (err) {
            const messages = {
                'auth/user-not-found': 'No account found with this email',
                'auth/wrong-password': 'Incorrect password',
                'auth/invalid-email': 'Please enter a valid email',
                'auth/invalid-credential': 'Invalid email or password',
                'auth/too-many-requests': 'Too many attempts. Try again later'
            };
            showToast(messages[err.code] || err.message, true);
        } finally {
            setLoading(btn, false);
        }
    });
}

// ===== AUTH STATE GUARD =====
// Redirect unauthenticated users away from dashboard
const isAuthPage = window.location.pathname.includes('login') || window.location.pathname.includes('signup');

onAuthStateChanged(auth, (user) => {
    if (user && isAuthPage) {
        // Already logged in, go to dashboard
        window.location.href = 'index.html';
    } else if (!user && !isAuthPage) {
        // Not logged in, go to login
        window.location.href = 'login.html';
    }
});

// ===== Password visibility toggle =====
document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input');
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.innerHTML = isPassword
            ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    });
});

export { showToast, setLoading };
