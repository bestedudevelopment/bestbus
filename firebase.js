import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCvpd7HxpLq4IJ22cMTldV3sanz35tt3H8",
  authDomain: "best----bus-application.firebaseapp.com",
  projectId: "best----bus-application",
  storageBucket: "best----bus-application.firebasestorage.app",
  messagingSenderId: "428353631166",
  appId: "1:428353631166:web:e58e03cb28a52a790e3fef",
  measurementId: "G-5XP2LE6FH1"
};

const app =
    initializeApp(
        firebaseConfig
    );


const auth =
    getAuth(app);


/*
 * Keep the user logged in.
 *
 * This is what allows:
 *
 * Login
 *   ↓
 * Admin
 *   ↓
 * Buses/sections
 *
 * without asking for the password again.
 */

setPersistence(
    auth,
    browserLocalPersistence
);


const db =
    getFirestore(app);


export {
    app,
    auth,
    db
};
