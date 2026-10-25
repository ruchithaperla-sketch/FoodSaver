/**
 * firebase.js
 * 
 * This file initializes our connection to Firebase.
 * We are using Firebase version 10 with modular CDN imports directly in the browser.
 * 
 * IMPORTANT: You must replace the "firebaseConfig" object below with your actual
 * project settings from the Firebase Console to make it work!
 */

// 1. Import the core Firebase App initialization function
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

// 2. Import the Firestore database functions (for storing text data like donations)
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 3. Import the Firebase Storage functions (for uploading food images)
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// 4. Import the Firebase Auth functions
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Your web app's Firebase configuration
// Go to your Firebase Console -> Project Settings -> General -> Your apps
// Copy your unique config details and paste them here.
const firebaseConfig = {
    apiKey: "AIzaSyDdTmBYFDa48BCA6ML46hflxdSjVD9ikfM",
    authDomain: "food-waste-management-3559f.firebaseapp.com",
    projectId: "food-waste-management-3559f",
    storageBucket: "food-waste-management-3559f.appspot.com",
    messagingSenderId: "881743664037",
    appId: "1:881743664037:web:d84154780b7dc978bb8e4c",
    measurementId: "G-SQLNHQZ2S5"
};

// Initialize the Firebase app with your specific configuration
const app = initializeApp(firebaseConfig);

// Initialize Firestore (Database) and Firebase Storage
// By initializing them here, we create a single connection that the rest of our app can use.
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Output a helpful message to the browser's console to confirm initialization
console.log("🔥 Firebase App, Firestore, Storage, and Auth successfully initialized!");

// Export the database, storage, and auth instances.
// This allows other files (like donor.js or ngo.js) to import and use them.
export { db, storage, auth };
