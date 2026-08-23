import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "../core/firebase.js";


/* =================================
   ELEMENTS
================================= */

const adminName =
    document.getElementById(
        "adminName"
    );

const busCount =
    document.getElementById(
        "busCount"
    );

const driverCount =
    document.getElementById(
        "driverCount"
    );

const logoutButton =
    document.getElementById(
        "logoutButton"
    );

const message =
    document.getElementById(
        "message"
    );


/* =================================
   AUTH
================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        console.log("LOGGED IN USER:", user);

        if (!user) {

            window.location.href =
                "../login/";

            return;
        }

        try {

            const userRef =
                doc(
                    db,
                    "users",
                    user.uid
                );

            const userSnapshot =
                await getDoc(
                    userRef
                );


            console.log(
                "USER DOCUMENT EXISTS:",
                userSnapshot.exists()
            );


            if (
                !userSnapshot.exists()
            ) {

                throw new Error(
                    "User profile not found in Firestore."
                );

            }


            const userData =
                userSnapshot.data();


            console.log(
                "USER DATA:",
                userData
            );


            /*
             * ADMIN ACCESS
             */

            if (
                userData.role !== "admin"
            ) {

                document.body.innerHTML = `

                    <div style="
                        min-height:100vh;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        text-align:center;
                        padding:30px;
                        font-family:Arial;
                    ">

                        <div>

                            <h1>
                                Access Denied
                            </h1>

                            <p>
                                Admin access is required.
                            </p>

                        </div>

                    </div>

                `;

                return;

            }


            /*
             * SHOW ADMIN NAME
             */

            adminName.textContent =
                `Welcome, ${
                    userData.name ||
                    userData.displayName ||
                    user.email ||
                    "Administrator"
                }`;


            /*
             * LOAD DASHBOARD
             */

            await loadStats();


        } catch (error) {

            console.error(
                "SUPER ADMIN ERROR:",
                error
            );


            showMessage(
                error.message
            );

        }

    }
);
/* =================================
   STATS
================================= */

async function loadStats() {

    try {

        const [
            busesSnapshot,
            usersSnapshot,
            notificationsSnapshot
        ] = await Promise.all([

            getDocs(
                collection(
                    db,
                    "buses"
                )
            ),

            getDocs(
                collection(
                    db,
                    "users"
                )
            ),

            getDocs(
                collection(
                    db,
                    "notifications"
                )
            )

        ]);


        let drivers = 0;


        usersSnapshot.forEach(
            snapshot => {

                const data =
                    snapshot.data();


                if (
                    data.role === "driver"
                ) {

                    drivers++;

                }

            }
        );


        busCount.textContent =
            busesSnapshot.size;


        driverCount.textContent =
            drivers;


        notificationCount.textContent =
            notificationsSnapshot.size;


    } catch (error) {

        /*
         * Notifications collection may
         * not exist yet. Don't break the
         * entire dashboard.
         */

        console.error(
            "STATS ERROR:",
            error
        );


        busCount.textContent =
            "—";

        driverCount.textContent =
            "—";

        notificationCount.textContent =
            "0";

    }

}


/* =================================
   NAVIGATION
================================= */

document
    .getElementById(
        "notificationCard"
    )
    .addEventListener(
        "click",
        () => {

            window.location.href =
                "notifications/";

        }
    );


document
    .getElementById(
        "driversCard"
    )
    .addEventListener(
        "click",
        () => {

            window.location.href =
                "../admin/drivers/";

        }
    );


document
    .getElementById(
        "busesCard"
    )
    .addEventListener(
        "click",
        () => {

            window.location.href =
                "../admin/buses/";

        }
    );


document
    .getElementById(
        "logsCard"
    )
    .addEventListener(
        "click",
        () => {

            window.location.href =
                "logs/";

        }
    );


document
    .getElementById(
        "settingsCard"
    )
    .addEventListener(
        "click",
        () => {

            window.location.href =
                "settings/";

        }
    );


/* =================================
   LOGOUT
================================= */

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


            showMessage(
                "Unable to log out."
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

    message.textContent =
        text;

}
