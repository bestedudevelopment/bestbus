import {
    collection,
    query,
    where,
    onSnapshot,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth,
    db
} from "../core/firebase.js";

import {
    getUserProfile
} from "../core/auth.js";


/* ================================
   ELEMENTS
================================ */

const adminName =
    document.getElementById("adminName");

const currentDate =
    document.getElementById("currentDate");

const busCount =
    document.getElementById("busCount");

const driverCount =
    document.getElementById("driverCount");

const todayKm =
    document.getElementById("todayKm");

const todayDiesel =
    document.getElementById("todayDiesel");

const fleetContainer =
    document.getElementById("fleetContainer");

const alertsContainer =
    document.getElementById("alertsContainer");

const alertCount =
    document.getElementById("alertCount");


/* ================================
   DATE
================================ */

const today =
    new Date();

currentDate.textContent =
    today.toLocaleDateString(
        "en-IN",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );


/* ================================
   NAVIGATION
================================ */

function goTo(path) {

    window.location.href = path;
}


document
    .getElementById("addBusButton")
    .addEventListener(
        "click",
        () => goTo("../add-bus/")
    );


document
    .getElementById("busListButton")
    .addEventListener(
        "click",
        () => goTo("../buses/")
    );


document
    .getElementById("viewBusesButton")
    .addEventListener(
        "click",
        () => goTo("../buses/")
    );


document
    .getElementById("navBuses")
    .addEventListener(
        "click",
        () => goTo("../buses/")
    );


document
    .getElementById("driverButton")
    .addEventListener(
        "click",
        () => goTo("../drivers/")
    );


document
    .getElementById("navDrivers")
    .addEventListener(
        "click",
        () => goTo("../drivers/")
    );


document
    .getElementById("reportsButton")
    .addEventListener(
        "click",
        () => goTo("../reports/")
    );


document
    .getElementById("navReports")
    .addEventListener(
        "click",
        () => goTo("../reports/")
    );


/* ================================
   LOGOUT
================================ */

document
    .getElementById("logoutButton")
    .addEventListener(
        "click",
        async () => {

            try {

                await signOut(auth);

                window.location.href =
                    "../login/";

            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );
            }
        }
    );


/* ================================
   AUTH GUARD
================================ */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "../login/";

            return;
        }

        try {

            const profile =
                await getUserProfile(
                    user.uid
                );


            if (
                !profile ||
                profile.role !== "admin"
            ) {

                window.location.href =
                    "../login/";

                return;
            }


            adminName.textContent =
                profile.name ||
                "Admin";


            loadDashboard();

        } catch (error) {

            console.error(
                "Profile error:",
                error
            );

            window.location.href =
                "../login/";
        }
    }
);


/* ================================
   DASHBOARD
================================ */

function loadDashboard() {

    loadBusCount();

    loadDriverCount();

    loadFleet();

    loadTodayData();

}


/* ================================
   BUS COUNT
================================ */

function loadBusCount() {

    const busesQuery =
        query(
            collection(db, "buses"),
            where("active", "==", true)
        );


    onSnapshot(
        busesQuery,
        (snapshot) => {

            busCount.textContent =
                snapshot.size;

        },
        (error) => {

            console.error(
                "Bus count error:",
                error
            );

            busCount.textContent =
                "—";
        }
    );
}


/* ================================
   DRIVER COUNT
================================ */

function loadDriverCount() {

    const driverQuery =
        query(
            collection(db, "users"),
            where("role", "==", "driver"),
            where("active", "==", true)
        );


    onSnapshot(
        driverQuery,
        (snapshot) => {

            driverCount.textContent =
                snapshot.size;

        },
        (error) => {

            console.error(
                "Driver count error:",
                error
            );

            driverCount.textContent =
                "—";
        }
    );
}


/* ================================
   FLEET
================================ */

function loadFleet() {

    const busesQuery =
        query(
            collection(db, "buses"),
            where("active", "==", true)
        );


    onSnapshot(
        busesQuery,
        (snapshot) => {

            fleetContainer.innerHTML = "";

            if (snapshot.empty) {

                fleetContainer.innerHTML = `
                    <div class="loading-state">
                        No buses added yet.
                    </div>
                `;

                return;
            }


            snapshot.forEach(
                (busDoc) => {

                    const bus =
                        busDoc.data();

                    const expected =
                        Number(
                            bus.expectedMileage || 0
                        );

                    /*
                     * Actual mileage will be
                     * connected to diesel records
                     * later.
                     */

                    const actual =
                        expected;


                    const status =
                        getMileageStatus(
                            expected,
                            actual
                        );


                    const card =
                        document.createElement(
                            "div"
                        );

                    card.className =
                        "bus-performance-card";


                    card.innerHTML = `

                        <div class="bus-top">

                            <div>

                                <div class="bus-name">
                                    ${escapeHtml(
                                        bus.busNumber ||
                                        "BUS"
                                    )}
                                </div>

                                <div class="bus-registration">
                                    ${escapeHtml(
                                        bus.registrationNumber ||
                                        "No registration"
                                    )}
                                </div>

                            </div>

                            <div>

                                <div class="mileage">
                                    ${expected
                                        ? expected.toFixed(2)
                                        : "—"}
                                    KM/L
                                </div>

                                <div class="mileage-label">
                                    EXPECTED
                                </div>

                            </div>

                        </div>

                        <div class="status-row">

                            <span
                                class="status-dot ${status.className}"
                            ></span>

                            <span class="status-text">
                                ${status.label}
                            </span>

                        </div>
                    `;


                    fleetContainer.appendChild(
                        card
                    );
                }
            );
        }
    );
}


/* ================================
   MILEAGE STATUS
================================ */

function getMileageStatus(
    expected,
    actual
) {

    if (!expected || !actual) {

        return {
            className:
                "status-warning",

            label:
                "NO DATA"
        };
    }


    const deviation =
        Math.abs(
            expected - actual
        ) / expected * 100;


    if (deviation <= 5) {

        return {
            className:
                "status-normal",

            label:
                "NORMAL"
        };

    }


    if (deviation <= 15) {

        return {
            className:
                "status-warning",

            label:
                "ATTENTION"
        };

    }


    return {
        className:
            "status-danger",

        label:
            "MAJOR ALERT"
    };
}


/* ================================
   TODAY DATA
================================ */

async function loadTodayData() {

    /*
     * These values will become real
     * once dailyTrips and dieselRecords
     * are created.
     */

    todayKm.textContent =
        "0 KM";

    todayDiesel.textContent =
        "0 L";

}


/* ================================
   ESCAPE HTML
================================ */

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
