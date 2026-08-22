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


const loadingScreen =
    document.getElementById(
        "loadingScreen"
    );

const adminPage =
    document.getElementById(
        "adminPage"
    );

const adminName =
    document.getElementById(
        "adminName"
    );

const totalBuses =
    document.getElementById(
        "totalBuses"
    );

const totalDrivers =
    document.getElementById(
        "totalDrivers"
    );

const busList =
    document.getElementById(
        "busList"
    );

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


/* =================================
   AUTHENTICATION
================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        /*
         * Keep logo visible for exactly
         * approximately 2 seconds.
         */

        await wait(
            2000
        );


        /*
         * No logged-in user.
         */

        if (!user) {

            window.location.replace(
                "../index.html"
            );

            return;

        }


        try {

            /*
             * Get Firestore user profile.
             */

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


            /*
             * Profile doesn't exist.
             */

            if (
                !userSnapshot.exists()
            ) {

                await signOut(
                    auth
                );


                window.location.replace(
                    "../index.html"
                );

                return;

            }


            const userData =
                userSnapshot.data();


            /*
             * Only Admin can enter.
             */

            if (
                userData.role !==
                "admin"
            ) {

                await signOut(
                    auth
                );


                window.location.replace(
                    "../index.html"
                );

                return;

            }


            /*
             * Show admin name.
             */

            adminName.textContent =
                userData.name ||
                "Admin";


            /*
             * Load dashboard.
             */

            await loadDashboard();


            /*
             * Remove loading screen.
             */

            loadingScreen.classList.add(
                "hidden"
            );

            adminPage.classList.remove(
                "hidden"
            );


        } catch (error) {

            console.error(
                "ADMIN ERROR:",
                error
            );


            await signOut(
                auth
            );


            window.location.replace(
                "../index.html"
            );

        }

    }
);


/* =================================
   DASHBOARD DATA
================================= */

async function loadDashboard() {

    const busesSnapshot =
        await getDocs(
            collection(
                db,
                "buses"
            )
        );


    const usersSnapshot =
        await getDocs(
            collection(
                db,
                "users"
            )
        );


    /*
     * Total buses
     */

    totalBuses.textContent =
        busesSnapshot.size;


    /*
     * Total drivers
     */

    let drivers = 0;


    usersSnapshot.forEach(
        (snapshot) => {

            const data =
                snapshot.data();


            if (
                data.role ===
                "driver"
            ) {

                drivers++;

            }

        }
    );


    totalDrivers.textContent =
        drivers;


    /*
     * Render bus overview.
     */

    renderBuses(
        busesSnapshot
    );

}


/* =================================
   BUS OVERVIEW
================================= */

function renderBuses(
    busesSnapshot
) {

    busList.innerHTML =
        "";


    if (
        busesSnapshot.empty
    ) {

        busList.innerHTML = `
            <div class="empty">
                No bus information available.
            </div>
        `;

        return;

    }


    busesSnapshot.forEach(
        (snapshot) => {

            const bus =
                snapshot.data();


            const currentOdometer =
                bus.currentOdometer ??
                bus.startingOdometer ??
                0;


            /*
             * These are placeholders until
             * we build the trip/diesel data
             * structure.
             */

            const lastUpdated =
                formatTimestamp(
                    bus.updatedAt
                );


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "bus-card";


            card.innerHTML = `

                <div>

                    <div class="bus-name">
                        ${escapeHTML(
                            bus.busNumber ||
                            "Bus"
                        )}
                    </div>

                    <div class="bus-registration">
                        ${escapeHTML(
                            bus.registrationNumber ||
                            "Registration not available"
                        )}
                    </div>

                </div>


                <div class="bus-info">

                    <span>
                        LAST ODOMETER
                    </span>

                    <strong>
                        ${formatNumber(
                            currentOdometer
                        )} KM
                    </strong>

                    <div class="bus-registration">
                        ${lastUpdated}
                    </div>

                </div>


                <a
                    class="view-button"
                    href="../bus-details/?busId=${encodeURIComponent(
                        snapshot.id
                    )}"
                >
                    VIEW →
                </a>

            `;


            busList.appendChild(
                card
            );

        }
    );

}


/* =================================
   TIMESTAMP
================================= */

function formatTimestamp(
    timestamp
) {

    if (
        !timestamp ||
        typeof timestamp.toDate !==
        "function"
    ) {

        return "Not updated yet";

    }


    return timestamp
        .toDate()
        .toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

}


/* =================================
   NUMBER
================================= */

function formatNumber(
    value
) {

    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return "0";

    }


    return number.toLocaleString(
        "en-IN",
        {
            maximumFractionDigits: 2
        }
    );

}


/* =================================
   HTML SAFETY
================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =================================
   WAIT
================================= */

function wait(
    milliseconds
) {

    return new Promise(
        (resolve) => {

            setTimeout(
                resolve,
                milliseconds
            );

        }
    );

}


/* =================================
   LOGOUT
================================= */

logoutBtn.addEventListener(
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
