import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { auth, db } from "./firebase.js";

export async function loginUser(email, password) {
    const result = await signInWithEmailAndPassword(
        auth,
        email,
        password
    );

    return result.user;
}

export async function logoutUser() {
    await signOut(auth);
}

export function watchAuth(callback) {
    return onAuthStateChanged(auth, callback);
}

export async function getUserProfile(uid) {
    const userRef = doc(db, "users", uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
        return null;
    }

    return {
        id: snapshot.id,
        ...snapshot.data()
    };
}
