import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "../core/firebase.js";


const loginForm =
    document.getElementById("loginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const loginButton =
    document.getElementById("loginButton");

const loginButtonText =
    document.getElementById("loginButtonText");

const loginSpinner =
    document.getElementById("loginSpinner");

const errorMessage =
    document.getElementById("errorMessage");

const togglePassword =
    document.getElementById("togglePassword");


/* ================================
   SHOW / HIDE PASSWORD
================================ */

togglePassword.addEventListener(
    "click",
    () => {

        const isPassword =
            passwordInput.type === "password";

        passwordInput.type =
            isPassword
                ? "text"
                : "password";

        togglePassword.textContent =
            isPassword
                ? "🙈"
                : "👁";
    }
);


/* ================================
   ERROR MESSAGE
================================ */

function showError(message) {

    errorMessage.textContent = message;

    errorMessage.classList.remove("hidden");
}

function hideError() {

    errorMessage.textContent = "";

    errorMessage.classList.add("hidden");
}


/* ================================
   LOADING STATE
================================ */

function setLoading(loading) {

    loginButton.disabled = loading;

    loginButtonText.classList.toggle(
        "hidden",
        loading
    );

    loginSpinner.classList.toggle(
        "hidden",
        !loading
    );
}


/* ================================
   FIREBASE ERROR
================================ */

function getFirebaseErrorMessage(error) {

    switch (error.code) {

        case "auth/invalid-credential":
            return "Invalid email or password.";

        case "auth/invalid-email":
            return "Please enter a valid email address.";

        case "auth/user-disabled":
            return "This account has been disabled.";

        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";

        case "auth/network-request-failed":
            return "Network error. Please check your internet connection.";

        default:
            return error.message || "Login failed.";
    }
}


/* ================================
   LOGIN
================================ */

loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        hideError();

        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;

        if (!email || !password) {

            showError(
                "Please enter your email and password."
            );

            return;
        }

        setLoading(true);

        try {

            const credential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            const user =
                credential.user;

            /*
             * Get the user's Firestore profile.
             */

            const userRef =
                doc(
                    db,
                    "users",
                    user.uid
                );

            const userSnapshot =
                await getDoc(userRef);


            /*
             * If profile doesn't exist,
             * create it as admin for
             * our initial development account.
             *
             * We will change this before
             * production.
             */

            if (!userSnapshot.exists()) {

                await setDoc(
                    userRef,
                    {
                        name: "Admin",

                        email:
                            user.email || "",

                        phone: "",

                        role: "admin",

                        assignedBusId: "",

                        active: true,

                        createdAt:
                            serverTimestamp()
                    }
                );
            }


            const profile =
                userSnapshot.exists()
                    ? userSnapshot.data()
                    : {
                        role: "admin"
                    };


            /*
             * Redirect according to role.
             */

            if (profile.role === "admin") {

                window.location.href =
                    "../admin/";

            } else if (profile.role === "driver") {

                window.location.href =
                    "../driver/";

            } else {

                throw new Error(
                    "Your account role is not configured."
                );
            }

        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            showError(
                getFirebaseErrorMessage(error)
            );

            setLoading(false);
        }
    }
);
