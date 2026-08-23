import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth
} from "../../core/firebase.js";


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


/* ================================
   AUTH
================================ */

onAuthStateChanged(
    auth,
    user => {

        if (!user) {

            window.location.href =
                "../login/";

            return;

        }

    }
);


/* ================================
   LOGOUT
================================ */

logoutButton.addEventListener(
    "click",
    async () => {

        const confirmed =
            window.confirm(
                "Are you sure you want to log out?"
            );


        if (!confirmed) {
            return;
        }


        try {

            await signOut(
                auth
            );


            window.location.href =
                "../login/";


        } catch (error) {

            console.error(
                "LOGOUT ERROR:",
                error
            );

            document
                .getElementById(
                    "message"
                )
                .textContent =
                "Unable to log out.";

        }

    }
);


/* ================================
   APP INFO
================================ */

document
    .getElementById(
        "appInfo"
    )
    .addEventListener(
        "click",
        () => {

            alert(
                "BEST Bus\n\nAdmin Management System"
            );

        }
    );


/* ================================
   NOTIFICATIONS
================================ */

document
    .getElementById(
        "notificationSetting"
    )
    .addEventListener(
        "click",
        () => {

            alert(
                "Notification settings will be available here."
            );

        }
    );
