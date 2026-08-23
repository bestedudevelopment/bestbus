import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged
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
} from "./core/firebase.js";


/* =================================
   ELEMENTS
================================= */

const loginSection =
    document.getElementById(
        "loginSection"
    );

const registerSection =
    document.getElementById(
        "registerSection"
    );


const loginForm =
    document.getElementById(
        "loginForm"
    );

const registerForm =
    document.getElementById(
        "registerForm"
    );


const showRegister =
    document.getElementById(
        "showRegister"
    );

const showLogin =
    document.getElementById(
        "showLogin"
    );


const loginButton =
    document.getElementById(
        "loginButton"
    );

const registerButton =
    document.getElementById(
        "registerButton"
    );


const loginMessage =
    document.getElementById(
        "loginMessage"
    );

const registerMessage =
    document.getElementById(
        "registerMessage"
    );


/* =================================
   SHOW REGISTER
================================= */

showRegister.addEventListener(
    "click",
    () => {

        loginSection.classList.add(
            "hidden"
        );

        registerSection.classList.remove(
            "hidden"
        );

        hideMessage(
            loginMessage
        );

    }
);


/* =================================
   SHOW LOGIN
================================= */

showLogin.addEventListener(
    "click",
    () => {

        registerSection.classList.add(
            "hidden"
        );

        loginSection.classList.remove(
            "hidden"
        );

        hideMessage(
            registerMessage
        );

    }
);


/* =================================
   LOGIN
================================= */

loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        hideMessage(
            loginMessage
        );


        const email =
            document
                .getElementById(
                    "loginEmail"
                )
                .value
                .trim()
                .toLowerCase();


        const password =
            document
                .getElementById(
                    "loginPassword"
                )
                .value;


        loginButton.disabled =
            true;

        loginButton.textContent =
            "SIGNING IN...";


        try {

            const credential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            await routeUser(
                credential.user
            );


        } catch (error) {

            console.error(
                "LOGIN ERROR:",
                error
            );


            showError(
                loginMessage,
                getAuthError(
                    error
                )
            );


        } finally {

            loginButton.disabled =
                false;

            loginButton.textContent =
                "SIGN IN";

        }

    }
);


/* =================================
   CREATE ACCOUNT
================================= */

registerForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        hideMessage(
            registerMessage
        );


        const name =
            document
                .getElementById(
                    "registerName"
                )
                .value
                .trim();


        const email =
            document
                .getElementById(
                    "registerEmail"
                )
                .value
                .trim()
                .toLowerCase();


        const password =
            document
                .getElementById(
                    "registerPassword"
                )
                .value;


        const confirmPassword =
            document
                .getElementById(
                    "registerConfirm"
                )
                .value;


        if (!name) {

            showError(
                registerMessage,
                "Enter your full name."
            );

            return;

        }


        if (
            password.length < 6
        ) {

            showError(
                registerMessage,
                "Password must contain at least 6 characters."
            );

            return;

        }


        if (
            password !==
            confirmPassword
        ) {

            showError(
                registerMessage,
                "Passwords do not match."
            );

            return;

        }


        registerButton.disabled =
            true;

        registerButton.textContent =
            "CREATING ACCOUNT...";


        try {

            /*
             * Create Firebase Authentication
             * account.
             */

            const credential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            const uid =
                credential.user.uid;


            /*
             * New accounts are NOT admins.
             *
             * They enter the waiting state.
             */

            await setDoc(
                doc(
                    db,
                    "users",
                    uid
                ),
                {

                    name:
                        name,

                    email:
                        email,

                    role:
                        "driver",

                    status:
                        "pending",

                    assignedBusId:
                        null,

                    createdAt:
                        serverTimestamp()

                }
            );


            /*
             * Send new driver to waiting page.
             */

            window.location.replace(
                "./waiting/"
            );


        } catch (error) {

            console.error(
                "REGISTER ERROR:",
                error
            );


            showError(
                registerMessage,
                getAuthError(
                    error
                )
            );


        } finally {

            registerButton.disabled =
                false;

            registerButton.textContent =
                "CREATE ACCOUNT";

        }

    }
);


/* =================================
   ROUTE USER
================================= */

async function routeUser(
    user
) {

    try {

        const userRef =
            doc(
                db,
                "users",
                user.uid
            );


        const snapshot =
            await getDoc(
                userRef
            );


        /*
         * No Firestore profile.
         *
         * Treat as waiting.
         */

        if (
            !snapshot.exists()
        ) {

            window.location.replace(
                "./waiting/"
            );

            return;

        }


        const data =
            snapshot.data();


        /* =========================
           ADMIN
        ========================= */

        if (
            data.role === "admin"
        ) {

            window.location.replace(
                "./admin/index.html"
            );

            return;

        }


        /* =========================
           DRIVER
        ========================= */

        if (
            data.role === "driver"
        ) {

            /*
             * Driver is still waiting.
             */

            if (
                data.status ===
                "pending"
            ) {

                window.location.replace(
                    "./waiting/"
                );

                return;

            }


            /*
             * Driver approved but
             * doesn't have a bus yet.
             */

            if (
                data.status === "approved" &&
                !data.assignedBusId
            ) {

                window.location.replace(
                    "./waiting/"
                );

                return;

            }


            /*
             * Driver is approved and
             * has a bus.
             */

            if (
                data.status === "approved" &&
                data.assignedBusId
            ) {

                window.location.replace(
                    "./driver/"
                );

                return;

            }


            /*
             * Anything else = waiting.
             */

            window.location.replace(
                "./waiting/"
            );

            return;

        }


        /*
         * Unknown/null role.
         */

        window.location.replace(
            "./waiting/"
        );


    } catch (error) {

        console.error(
            "ROUTING ERROR:",
            error
        );


        window.location.replace(
            "./waiting/"
        );

    }

}


/* =================================
   AUTH ERROR
================================= */

function getAuthError(
    error
) {

    switch (
        error.code
    ) {

        case "auth/invalid-credential":

            return "Email or password is incorrect.";

        case "auth/invalid-email":

            return "Please enter a valid email.";

        case "auth/email-already-in-use":

            return "An account with this email already exists.";

        case "auth/weak-password":

            return "Password must contain at least 6 characters.";

        case "auth/user-disabled":

            return "This account has been disabled.";

        case "auth/too-many-requests":

            return "Too many attempts. Please try again later.";

        default:

            return (
                error.message ||
                "Something went wrong. Please try again."
            );

    }

}


/* =================================
   ERROR
================================= */

function showError(
    element,
    text
) {

    element.textContent =
        text;

    element.classList.remove(
        "hidden"
    );

}


/* =================================
   HIDE MESSAGE
================================= */

function hideMessage(
    element
) {

    element.textContent =
        "";

    element.classList.add(
        "hidden"
    );

                }
