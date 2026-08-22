import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "../core/firebase.js";


const refreshButton =
    document.getElementById(
        "refreshButton"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


const statusMessage =
    document.getElementById(
        "statusMessage"
    );


/* =================================
   CHECK USER
================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.replace(
                "../index.html"
            );

            return;

        }


        await checkStatus(
            user
        );

    }
);


/* =================================
   CHECK STATUS
================================= */

async function checkStatus(
    user
) {

    try {

        showMessage(
            "Checking account status..."
        );


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


        if (
            !snapshot.exists()
        ) {

            showMessage(
                "Your account profile has not been created yet."
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
                "../admin/"
            );

            return;

        }


        /* =========================
           APPROVED DRIVER
        ========================= */

        if (
            data.role === "driver" &&
            data.status === "approved" &&
            data.assignedBusId
        ) {

            window.location.replace(
                "../driver/"
            );

            return;

        }


        /* =========================
           STILL WAITING
        ========================= */

        if (
            data.role === "driver" &&
            data.status === "pending"
        ) {

            showMessage(
                "Your account is still waiting for Admin approval."
            );

            return;

        }


        /* =========================
           APPROVED BUT NO BUS
        ========================= */

        if (
            data.role === "driver" &&
            data.status === "approved" &&
            !data.assignedBusId
        ) {

            showMessage(
                "Your account has been approved. Waiting for a bus assignment."
            );

            return;

        }


        /* =========================
           UNKNOWN
        ========================= */

        showMessage(
            "Your account is waiting for administrator review."
        );


    } catch (error) {

        console.error(
            "STATUS CHECK ERROR:",
            error
        );


        showMessage(
            "Unable to check your account status."
        );

    }

}


/* =================================
   REFRESH
================================= */

refreshButton.addEventListener(
    "click",
    async () => {

        const user =
            auth.currentUser;


        if (!user) {

            window.location.replace(
                "../index.html"
            );

            return;

        }


        await checkStatus(
            user
        );

    }
);


/* =================================
   LOGOUT
================================= */

logoutButton.addEventListener(
    "click",
    async () => {

        try {

            await signOut(
                auth
            );


            window.location.replace(
                "../index.html"
            );


        } catch (error) {

            console.error(
                "LOGOUT ERROR:",
                error
            );

        }

    }
);


/* =================================
   MESSAGE
================================= */

function showMessage(
    text
) {

    statusMessage.textContent =
        text;

    statusMessage.classList.remove(
        "hidden"
    );

}
