import {
    collection,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth,
    db
} from "../core/firebase.js";


/* =========================================
   ELEMENTS
========================================= */

const loadingScreen =
    document.getElementById(
        "loadingScreen"
    );

const adminApp =
    document.getElementById(
        "adminApp"
    );

const adminName =
    document.getElementById(
        "adminName"
    );

const logoutButton =
    document.getElementById(
        "logoutButton"
    );

const message =
    document.getElementById(
        "message"
    );

const totalBuses =
    document.getElementById(
        "totalBuses"
    );

const totalDrivers =
    document.getElementById(
        "totalDrivers"
    );

const assignedDrivers =
    document.getElementById(
        "assignedDrivers"
    );

const availableBuses =
    document.getElementById(
        "availableBuses"
    );


/* =========================================
   AUTH
========================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        /*
         * No login = no admin panel.
         */

        if (!user) {

            window.location.replace(
                "../login/"
            );

            return;

        }


        try {

            await verifyAdmin(
                user
            );


            await loadDashboard();


            loadingScreen.classList.add(
                "hidden"
            );

            adminApp.classList.remove(
                "hidden"
            );


        } catch (error) {

            console.error(
                "ADMIN AUTH ERROR:",
                error
            );


            loadingScreen.classList.add(
                "hidden"
            );


            showError(
                error.message ||
                "Access denied."
            );


            /*
             * Do not leave a non-admin
             * sitting on the admin page.
             */

            setTimeout(
                () => {

                    signOut(
                        auth
                    ).finally(
                        () => {

                            window.location.replace(
                                "../login/"
                            );

                        }
                    );

                },
                1500
            );

        }

    }
);


/* =========================================
   VERIFY ADMIN
========================================= */

async function verifyAdmin(
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


    if (
        !userSnapshot.exists()
    ) {

        throw new Error(
            "Admin profile does not exist."
        );

    }


    const data =
        userSnapshot.data();


    /*
     * This is the actual authorization check.
     */

    if (
        data.role !==
        "admin"
    ) {

        throw new Error(
            "You do not have administrator access."
        );

    }


    adminName.textContent =
        data.name ||
        "Administrator";

}


/* =========================================
   LOAD DASHBOARD
========================================= */

async function loadDashboard() {

    /*
     * Get buses
     */

    const busesSnapshot =
        await getDocs(
            collection(
                db,
                "buses"
            )
        );


    /*
     * Get users
     */

    const usersSnapshot =
        await getDocs(
            collection(
                db,
                "users"
            )
        );


    let busCount = 0;

    let driverCount = 0;

    let assignedCount = 0;


    busCount =
        busesSnapshot.size;


    usersSnapshot.forEach(
        (snapshot) => {

            const data =
                snapshot.data();


            if (
                data.role ===
                "driver"
            ) {

                driverCount++;


                if (
                    data.assignedBusId
                ) {

                    assignedCount++;

                }

            }

        }
    );


    totalBuses.textContent =
        busCount;


    totalDrivers.textContent =
        driverCount;


    assignedDrivers.textContent =
        assignedCount;


    /*
     * Available buses =
     * buses without a driver.
     *
     * We check driver assignments
     * from users.
     */

    const assignedBusIds =
        new Set();


    usersSnapshot.forEach(
        (snapshot) => {

            const data =
                snapshot.data();


            if (
                data.role === "driver" &&
                data.assignedBusId
            ) {

                assignedBusIds.add(
                    data.assignedBusId
                );

            }

        }
    );


    let availableCount = 0;


    busesSnapshot.forEach(
        (snapshot) => {

            if (
                !assignedBusIds.has(
                    snapshot.id
                )
            ) {

                availableCount++;

            }

        }
    );


    availableBuses.textContent =
        availableCount;

}


/* =========================================
   LOGOUT
========================================= */

logoutButton.addEventListener(
    "click",
    async () => {

        logoutButton.disabled =
            true;

        logoutButton.textContent =
            "LOGGING OUT...";


        try {

            await signOut(
                auth
            );


            window.location.replace(
                "../login/"
            );


        } catch (error) {

            console.error(
                error
            );


            logoutButton.disabled =
                false;

            logoutButton.textContent =
                "LOGOUT";


            showError(
                "Unable to logout."
            );

        }

    }
);


/* =========================================
   ERROR
========================================= */

function showError(
    text
) {

    message.textContent =
        text;

    message.classList.remove(
        "hidden"
    );

}
