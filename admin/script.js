import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth,
    db
} from "../core/firebase.js";


/* =====================================
   ELEMENTS
===================================== */

const totalBuses =
    document.getElementById("totalBuses");

const totalDrivers =
    document.getElementById("totalDrivers");

const busList =
    document.getElementById("busList");


/* =====================================
   AUTHENTICATION
===================================== */

onAuthStateChanged(
    auth,
    async (user) => {

        /*
         * Nobody logged in
         */

        if (!user) {

            window.location.replace(
                "../login/"
            );

            return;
        }


        try {

            /*
             * Get the logged-in user's
             * Firestore profile.
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
             * User profile doesn't exist.
             */

            if (
                !userSnapshot.exists()
            ) {

                await auth.signOut();

                window.location.replace(
                    "../login/"
                );

                return;
            }


            const userData =
                userSnapshot.data();


            /*
             * Only ADMIN can enter.
             */

            if (
                userData.role !== "admin"
            ) {

                await auth.signOut();

                window.location.replace(
                    "../login/"
                );

                return;
            }


            /*
             * Authentication successful.
             * Now load dashboard.
             */

            await loadDashboard();


        } catch (error) {

            console.error(
                "ADMIN ACCESS ERROR:",
                error
            );

            await auth.signOut();

            window.location.replace(
                "../login/"
            );

        }

    }
);


/* =====================================
   LOAD DASHBOARD
===================================== */

async function loadDashboard() {

    try {

        const [
            busesSnapshot,
            driversSnapshot
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
            )

        ]);


        /*
         * Count only actual drivers.
         */

        let driverCount = 0;


        driversSnapshot.forEach(
            (snapshot) => {

                const user =
                    snapshot.data();


                if (
                    user.role === "driver"
                ) {

                    driverCount++;

                }

            }
        );


        totalBuses.textContent =
            busesSnapshot.size;


        totalDrivers.textContent =
            driverCount;


        renderBuses(
            busesSnapshot,
            driversSnapshot
        );


    } catch (error) {

        console.error(
            "DASHBOARD ERROR:",
            error
        );


        busList.innerHTML = `
            <div class="empty">
                Unable to load fleet information.
            </div>
        `;

    }

}


/* =====================================
   RENDER BUSES
===================================== */

function renderBuses(
    busesSnapshot,
    usersSnapshot
) {

    busList.innerHTML = "";


    if (
        busesSnapshot.empty
    ) {

        busList.innerHTML = `
            <div class="empty">
                No bus records yet.
            </div>
        `;

        return;
    }


    /*
     * Create driver lookup.
     */

    const drivers = new Map();


    usersSnapshot.forEach(
        (snapshot) => {

            const user =
                snapshot.data();


            if (
                user.role === "driver"
            ) {

                drivers.set(
                    snapshot.id,
                    user
                );

            }

        }
    );


    busesSnapshot.forEach(
        (snapshot) => {

            const bus =
                snapshot.data();


            const busId =
                snapshot.id;


            const driver =
                bus.assignedDriverId
                    ? drivers.get(
                        bus.assignedDriverId
                    )
                    : null;


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "bus-card";


            const lastOdometer =
                getLastOdometer(
                    bus
                );


            const updatedDate =
                getUpdatedDate(
                    bus
                );


            const diesel =
                getLastDiesel(
                    bus
                );


            card.innerHTML = `

                <div class="bus-left">

                    <div class="bus-top">

                        <div class="bus-number">
                            ${escapeHTML(
                                bus.busNumber ||
                                "Unnamed Bus"
                            )}
                        </div>

                        <span class="bus-status">
                            ${escapeHTML(
                                bus.status ||
                                "ACTIVE"
                            ).toUpperCase()}
                        </span>

                    </div>


                    <div class="registration">
                        ${escapeHTML(
                            bus.registrationNumber ||
                            "Registration not available"
                        )}
                    </div>


                    <div class="bus-info">

                        <div class="info-item">
                            Driver:
                            <strong>
                                ${escapeHTML(
                                    driver?.name ||
                                    "Not assigned"
                                )}
                            </strong>
                        </div>


                        <div class="info-item">
                            Starting:
                            <strong>
                                ${formatNumber(
                                    bus.startingOdometer
                                )}
                                KM
                            </strong>
                        </div>


                        <div class="info-item">
                            Expected:
                            <strong>
                                ${formatNumber(
                                    bus.expectedMileage
                                )}
                                KM/L
                            </strong>
                        </div>

                    </div>


                    ${
                        diesel
                            ? `
                                <div class="diesel-line">

                                    Last diesel:
                                    <strong>
                                        ${formatNumber(
                                            diesel.litres
                                        )} L
                                    </strong>

                                    ${
                                        diesel.amount != null
                                            ? `
                                                · ₹${formatNumber(
                                                    diesel.amount
                                                )}
                                            `
                                            : ""
                                    }

                                    ${
                                        diesel.odometer != null
                                            ? `
                                                · Odometer
                                                ${formatNumber(
                                                    diesel.odometer
                                                )} KM
                                            `
                                            : ""
                                    }

                                </div>
                            `
                            : `
                                <div class="diesel-line">
                                    No diesel record available.
                                </div>
                            `
                    }

                </div>


                <div class="bus-right">

                    <span class="last-label">
                        LAST ODOMETER
                    </span>

                    <strong class="last-odometer">
                        ${formatNumber(
                            lastOdometer
                        )}
                        KM
                    </strong>

                    <div class="updated">
                        ${updatedDate}
                    </div>


                    <a
                        class="view-btn"
                        href="../bus-details/?id=${encodeURIComponent(
                            busId
                        )}"
                    >
                        VIEW DETAILS →
                    </a>

                </div>

            `;


            busList.appendChild(
                card
            );

        }
    );

}


/* =====================================
   LAST ODOMETER
===================================== */

function getLastOdometer(
    bus
) {

    if (
        bus.currentOdometer != null
    ) {

        return bus.currentOdometer;

    }


    if (
        bus.lastOdometer != null
    ) {

        return bus.lastOdometer;

    }


    if (
        bus.startingOdometer != null
    ) {

        return bus.startingOdometer;

    }


    return 0;

}


/* =====================================
   UPDATED DATE
===================================== */

function getUpdatedDate(
    bus
) {

    const timestamp =
        bus.odometerUpdatedAt ||
        bus.updatedAt ||
        bus.createdAt;


    if (!timestamp) {

        return "No update date";

    }


    if (
        typeof timestamp.toDate ===
        "function"
    ) {

        return formatDate(
            timestamp.toDate()
        );

    }


    return "Date unavailable";

}


/* =====================================
   DIESEL
===================================== */

function getLastDiesel(
    bus
) {

    if (
        bus.lastDiesel
    ) {

        return bus.lastDiesel;

    }


    return null;

}


/* =====================================
   DATE
===================================== */

function formatDate(
    date
) {

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    ).format(
        date
    );

}


/* =====================================
   NUMBER
===================================== */

function formatNumber(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "0";

    }


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


/* =====================================
   HTML SAFETY
===================================== */

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
