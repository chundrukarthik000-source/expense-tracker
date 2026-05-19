/**
 * Firebase Configuration Module
 * =============================
 * Central hub for Firebase initialization.
 * Replace the config values below with your own Firebase project credentials.
 * 
 * How to get these values:
 *   1. Go to https://console.firebase.google.com
 *   2. Create a new project (or select existing)
 *   3. Click the gear icon → Project Settings
 *   4. Scroll to "Your apps" → Click the web icon (</>)
 *   5. Register the app and copy the firebaseConfig object
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔑 Firebase project credentials
const firebaseConfig = {
    apiKey: "AIzaSyAPrHF7d28EnLMvH1EdshM8LIQ3pTImE1c",
    authDomain: "expenses-tracker-c4f43.firebaseapp.com",
    projectId: "expenses-tracker-c4f43",
    storageBucket: "expenses-tracker-c4f43.firebasestorage.app",
    messagingSenderId: "238837369148",
    appId: "1:238837369148:web:1e9cc0706ed52557c57639",
    measurementId: "G-MSNW0W0LGK"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
