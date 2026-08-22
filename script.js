import {
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./core/firebase.js";


/* =========================
   ELEMENTS
========================= */

const loginForm =
    document.getElementById("loginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const loginButton =
    document.getElementById("loginButton");

const errorMessage =
    document.getElementById("errorMessage");


/* =========================
   CHECK EXISTING LOGIN
========================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {
            return;
        }

        /*
         * User is already logged in.
         * Find their role and send them
         * directly to the correct panel.
         */

        try {

            await redirectByRole(user);

        } catch (error) {

            console.error(error);

            showError(
                "Unable to verify your account."
            );

        }

    }
);


/* =========================
   LOGIN
========================= */

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
                "Enter your email and password."
            );

            return;

        }


        loginButton.disabled = true;

        loginButton.textContent =
            "SIGNING IN...";


        try {

            const credential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            await redirectByRole(
                credential.user
            );


        } catch (error) {

            console.error(
                "LOGIN ERROR:",
                error
            );


            showError(
                getLoginError(
                    error
                )
            );


            loginButton.disabled =
                false;

            loginButton.textContent =
                "LOGIN";

        }

    }
);


/* =========================
   ROLE REDIRECTION
========================= */

async function redirectByRole(
    user
) {

    const userReference =
        doc(
            db,
            "users",
            user.uid
        );


    const userSnapshot =
        await getDoc(
            userReference
        );


    if (!userSnapshot.exists()) {

        throw new Error(
            "User profile not found in Firestore."
        );

    }


    const userData =
        userSnapshot.data();


    const role =
        userData.role;


    if (role === "admin") {

        window.location.replace(
            "./admin/"
        );

        return;

    }


    if (role === "driver") {

        window.location.replace(
            "./driver/"
        );

        return;

    }


    throw new Error(
        "This account does not have a valid role."
    );

}


/* =========================
   ERROR MESSAGE
========================= */

function showError(
    text
) {

    errorMessage.textContent =
        text;

    errorMessage.classList.remove(
        "hidden"
    );

}


function hideError() {

    errorMessage.textContent =
        "";

    errorMessage.classList.add(
        "hidden"
    );

}


/* =========================
   FIREBASE LOGIN ERRORS
========================= */

function getLoginError(
    error
) {

    switch (error.code) {

        case "auth/invalid-credential":
            return "Incorrect email or password.";

        case "auth/invalid-email":
            return "Enter a valid email address.";

        case "auth/user-disabled":
            return "This account has been disabled.";

        case "auth/too-many-requests":
            return "Too many attempts. Try again later.";

        default:
            return "Unable to sign in. Please try again.";

    }

}
