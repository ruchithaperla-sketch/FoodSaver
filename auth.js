/**
 * auth.js
 * 
 * Handles all Firebase Authentication operations, Firestore user record management,
 * route protection, role-based redirects, and session monitoring.
 */

import { auth, db } from './firebase.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    getDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Register a new user in Firebase Auth and save their details in Firestore.
 */
export async function registerUser(name, email, password, role) {
    try {
        // 1. Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log("Successfully registered user in Auth:", user.uid);

        // 2. Save user document in Firestore "users" collection using the uid as doc ID
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: name,
            email: email,
            role: role, // 'Donor', 'NGO', or 'Volunteer'
            createdAt: serverTimestamp()
        });

        console.log("Firestore 'users' document created successfully.");
        return user;
    } catch (error) {
        console.error("Error during registration in auth.js:", error);
        throw error;
    }
}

/**
 * Log in an existing user and fetch their role from Firestore for proper redirection.
 */
export async function loginUser(email, password) {
    try {
        // 1. Authenticate with Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log("Successfully logged in user:", user.uid);

        // 2. Fetch their role from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (!userDoc.exists()) {
            throw new Error("User profile not found in database.");
        }

        const userData = userDoc.data();
        const role = userData.role;

        console.log("Fetched user role:", role);
        return { user, role };
    } catch (error) {
        console.error("Error during login in auth.js:", error);
        throw error;
    }
}

/**
 * Redirect user to their role-specific dashboard page.
 */
export function redirectUserByRole(role) {
    const roleNormalized = role.toLowerCase();
    if (roleNormalized === 'donor') {
        window.location.href = 'donor.html';
    } else if (roleNormalized === 'ngo') {
        window.location.href = 'ngo.html';
    } else if (roleNormalized === 'volunteer') {
        window.location.href = 'volunteer.html';
    } else {
        window.location.href = 'index.html';
    }
}

/**
 * Sign out the current authenticated user and redirect to login.html.
 */
export async function logoutUser() {
    try {
        await signOut(auth);
        console.log("User successfully signed out.");
        window.location.href = 'login.html';
    } catch (error) {
        console.error("Error signing out:", error);
        alert("Failed to log out: " + error.message);
    }
}

/**
 * Protect a dashboard page by checking if the user is authenticated and has the correct role.
 * Redirects to login.html if not authenticated.
 * If authorized, calls the callback function with the user's profile data.
 */
export function protectPage(requiredRole, onSuccessCallback) {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            console.log("Access Denied: No active user session. Redirecting to login.html...");
            window.location.href = 'login.html';
            return;
        }

        try {
            // Fetch additional details (like role) from Firestore
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) {
                console.error("User document not found in Firestore.");
                // If they exist in auth but not in firestore, log them out and go to login
                await signOut(auth);
                window.location.href = 'login.html';
                return;
            }

            const userData = userDoc.data();
            const userRole = userData.role;

            // If requiredRole is specified, enforce strict role-based dashboard protection
            if (requiredRole && userRole.toLowerCase() !== requiredRole.toLowerCase()) {
                console.warn(`Role mismatch: Needed ${requiredRole}, got ${userRole}. Redirecting...`);
                alert(`Access Denied: You do not have permission to view the ${requiredRole} Dashboard.`);
                redirectUserByRole(userRole);
                return;
            }

            console.log(`Access Granted: Logged in as ${userData.name} (${userRole})`);

            // Execute success callback if provided (e.g. to prefill form inputs or update UI state)
            if (onSuccessCallback) {
                onSuccessCallback(userData);
            }
        } catch (error) {
            console.error("Error verifying page authorization:", error);
            // Non-breaking fallback: send to index
            window.location.href = 'index.html';
        }
    });
}

/**
 * Setup standard Logout button in the navbar of dashboards.
 * Dynamically binds to any click on elements with ID "logout-btn".
 */
export function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await logoutUser();
        });
    }
}

/**
 * Setup navigation bar dynamically for index.html (landing page).
 * Shows Login/Register when logged out, and dashboard/logout link when logged in.
 */
export function monitorSessionForNavbar() {
    onAuthStateChanged(auth, async (user) => {
        const navList = document.querySelector('.navbar-nav');
        if (!navList) return;

        // Find or create dynamic elements
        let authLi = document.getElementById('navbar-auth-section');
        if (!authLi) {
            authLi = document.createElement('li');
            authLi.id = 'navbar-auth-section';
            authLi.className = 'nav-item d-flex gap-2 align-items-center ms-lg-3 mt-3 mt-lg-0';
            // Insert before theme toggle button
            const themeToggleLi = document.getElementById('theme-toggle')?.closest('li');
            if (themeToggleLi) {
                navList.insertBefore(authLi, themeToggleLi);
            } else {
                navList.appendChild(authLi);
            }
        }

        if (user) {
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const role = userData.role;
                    const dashboardPage = `${role.toLowerCase()}.html`;
                    
                    authLi.innerHTML = `
                        <a href="${dashboardPage}" class="btn btn-sm btn-outline-light rounded-pill px-3 fw-bold me-1">
                            👤 ${userData.name.split(' ')[0]} (${role})
                        </a>
                        <button id="logout-btn" class="btn btn-sm btn-light text-primary rounded-pill px-3 fw-bold">
                            Logout 🚪
                        </button>
                    `;
                    setupLogoutButton();
                }
            } catch (error) {
                console.error("Error monitoring navbar session:", error);
            }
        } else {
            authLi.innerHTML = `
                <a href="login.html" class="btn btn-sm btn-outline-light rounded-pill px-3 fw-bold me-2">Login</a>
                <a href="register.html" class="btn btn-sm btn-light text-primary rounded-pill px-3 fw-bold">Register</a>
            `;
        }
    });
}
