import {
    collection,
    getDocs,
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

import {
    getUserProfile
} from "../core/auth.js";


/* =====================================================
   ELEMENTS
===================================================== */

const busContainer =
    document.getElementById(
        "busContainer"
    );

const totalBuses =
    document.getElementById(
        "totalBuses"
    );

const activeBuses =
    document.getElementById(
        "activeBuses"
    );

const availableBuses =
    document.getElementById(
        "availableBuses"
    );

const searchInput =
    document.getElementById(
        "searchInput"
    );

const backButton =
    document.getElementById(
        "backButton"
    );

const addBusButton =
    document.getElementById(
        "addBusButton"
    );

const refreshButton =
    document.getElementById(
        "refreshButton"
    );

const filterButtons =
    document.querySelectorAll(
        ".filter-button"
    );


/* =====================================================
   STATE
===================================================== */

let allBuses = [];

let currentFilter =
    "all";


/* =====================================================
   NAVIGATION
===================================================== */

backButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../admin/";

    }
);


addBusButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../add-bus/";

    }
);


refreshButton.addEventListener(
    "click",
    () => {

        loadBuses();

    }
);


/* =====================================================
   AUTH
===================================================== */

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


            await loadBuses();


        } catch (error) {

            console.error(
                "Admin verification error:",
                error
            );


            showError(
                "Unable to verify administrator."
            );

        }

    }
);


/* =====================================================
   LOAD BUSES
===================================================== */

async function loadBuses() {

    showLoading();


    try {

        console.log(
            "Loading buses..."
        );


        const busesSnapshot =
            await getDocs(
                collection(
                    db,
                    "buses"
                )
            );


        console.log(
            "Buses found:",
            busesSnapshot.size
        );


        if (
            busesSnapshot.empty
        ) {

            allBuses = [];

            updateSummary();

            renderBuses(
                []
            );

            return;
        }


        /*
         * Load each bus and its driver.
         */

        const buses =
            await Promise.all(

                busesSnapshot.docs.map(
                    async (busDocument) => {

                        const bus =
                            busDocument.data();


                        let driver =
                            null;


                        /*
                         * If this bus has a driverId,
                         * load the corresponding user.
                         */

                        if (
                            bus.driverId
                        ) {

                            try {

                                const driverReference =
                                    doc(
                                        db,
                                        "users",
                                        bus.driverId
                                    );


                                const driverSnapshot =
                                    await getDoc(
                                        driverReference
                                    );


                                if (
                                    driverSnapshot.exists()
                                ) {

                                    driver = {

                                        id:
                                            driverSnapshot.id,

                                        ...driverSnapshot.data()

                                    };

                                }

                            } catch (error) {

                                console.error(
                                    "Driver loading error:",
                                    error
                                );

                            }

                        }


                        return {

                            id:
                                busDocument.id,

                            ...bus,

                            driver

                        };

                    }
                )

            );


        allBuses =
            buses;


        updateSummary();


        applyFilters();


    } catch (error) {

        console.error(
            "BUS LOAD ERROR:",
            error
        );


        showError(
            error.message ||
            "Unable to load buses."
        );

    }

}


/* =====================================================
   SUMMARY
===================================================== */

function updateSummary() {

    const total =
        allBuses.length;


    const active =
        allBuses.filter(
            (bus) =>
                bus.active !== false
        ).length;


    const available =
        allBuses.filter(
            (bus) =>
                bus.active !== false &&
                !bus.driverId
        ).length;


    totalBuses.textContent =
        total;


    activeBuses.textContent =
        active;


    availableBuses.textContent =
        available;

}


/* =====================================================
   FILTER BUTTONS
===================================================== */

filterButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                filterButtons.forEach(
                    (item) => {

                        item.classList.remove(
                            "active"
                        );

                    }
                );


                button.classList.add(
                    "active"
                );


                currentFilter =
                    button.dataset.filter;


                applyFilters();

            }
        );

    }
);


/* =====================================================
   APPLY FILTERS
===================================================== */

function applyFilters() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();


    let filtered =
        [...allBuses];


    /* FILTER */

    if (
        currentFilter ===
        "active"
    ) {

        filtered =
            filtered.filter(
                (bus) =>
                    bus.active !== false
            );

    }


    if (
        currentFilter ===
        "available"
    ) {

        filtered =
            filtered.filter(
                (bus) =>
                    bus.active !== false &&
                    !bus.driverId
            );

    }


    if (
        currentFilter ===
        "assigned"
    ) {

        filtered =
            filtered.filter(
                (bus) =>
                    !!bus.driverId
            );

    }


    /* SEARCH */

    if (
        search
    ) {

        filtered =
            filtered.filter(
                (bus) => {

                    const number =
                        String(
                            bus.busNumber ||
                            ""
                        ).toLowerCase();


                    const registration =
                        String(
                            bus.registrationNumber ||
                            bus.registrationNo ||
                            ""
                        ).toLowerCase();


                    const route =
                        String(
                            bus.route ||
                            ""
                        ).toLowerCase();


                    const driver =
                        String(
                            bus.driver?.name ||
                            ""
                        ).toLowerCase();


                    return (

                        number.includes(
                            search
                        ) ||

                        registration.includes(
                            search
                        ) ||

                        route.includes(
                            search
                        ) ||

                        driver.includes(
                            search
                        )

                    );

                }
            );

    }


    renderBuses(
        filtered
    );

}


/* =====================================================
   SEARCH
===================================================== */

searchInput.addEventListener(
    "input",
    () => {

        applyFilters();

    }
);


/* =====================================================
   RENDER
===================================================== */

function renderBuses(
    buses
) {

    if (
        buses.length === 0
    ) {

        busContainer.innerHTML = `

            <div class="empty">

                <div class="empty-icon">
                    🚌
                </div>

                <h2>
                    No Buses Found
                </h2>

                <p>
                    ${
                        allBuses.length === 0
                            ? "Add your first bus to start managing your fleet."
                            : "No buses match your current search or filter."
                    }
                </p>

            </div>

        `;

        return;
    }


    busContainer.innerHTML =
        "";


    buses.forEach(
        (bus) => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "bus-card";


            /* =========================================
               BUS INFORMATION
            ========================================= */

            const busNumber =
                bus.busNumber ||
                "BUS";


            const registration =
                bus.registrationNumber ||
                bus.registrationNo ||
                "No registration";


            const route =
                bus.route ||
                "Route not configured";


            const active =
                bus.active !== false;


            const expectedMileage =
                Number(
                    bus.expectedMileage ||
                    0
                );


            const currentOdometer =
                Number(
                    bus.currentOdometer ||
                    0
                );


            /* =========================================
               DRIVER
            ========================================= */

            let driverHTML = "";


            if (
                bus.driver
            ) {

                driverHTML = `

                    <div class="driver-avatar">
                        👨‍✈️
                    </div>

                    <div class="driver-info">

                        <div class="driver-name">
                            ${escapeHtml(
                                bus.driver.name ||
                                "Driver"
                            )}
                        </div>

                        <div class="driver-phone">
                            ${escapeHtml(
                                bus.driver.phone ||
                                "No phone"
                            )}
                        </div>

                    </div>

                `;

            } else {

                driverHTML = `

                    <div class="driver-avatar">
                        👤
                    </div>

                    <div class="driver-info">

                        <div class="no-driver">
                            No Driver Assigned
                        </div>

                    </div>

                `;

            }


            /* =========================================
               ASSIGNMENT
            ========================================= */

            const assignmentText =
                bus.driverId
                    ? "DRIVER ASSIGNED"
                    : "AVAILABLE";


            const assignmentClass =
                bus.driverId
                    ? "assigned"
                    : "available";


            /* =========================================
               CARD
            ========================================= */

            card.innerHTML = `

                <div class="bus-card-top">

                    <div class="bus-heading">

                        <div class="bus-identity">

                            <div class="bus-icon">
                                🚌
                            </div>

                            <div>

                                <div class="bus-number">
                                    ${escapeHtml(
                                        busNumber
                                    )}
                                </div>

                                <div class="registration">
                                    ${escapeHtml(
                                        registration
                                    )}
                                </div>

                            </div>

                        </div>


                        <div
                            class="status ${
                                active
                                    ? "active"
                                    : "inactive"
                            }"
                        >
                            ${
                                active
                                    ? "ACTIVE"
                                    : "INACTIVE"
                            }
                        </div>

                    </div>

                </div>


                <div class="bus-card-body">


                    <div class="route">

                        <span class="label">
                            ROUTE
                        </span>

                        <div class="route-value">
                            ${escapeHtml(
                                route
                            )}
                        </div>

                    </div>


                    <div class="driver-box">

                        ${driverHTML}

                    </div>


                    <div class="bus-stats">

                        <div class="stat">

                            <span>
                                CURRENT KM
                            </span>

                            <strong>
                                ${
                                    currentOdometer
                                        ? formatNumber(
                                            currentOdometer
                                          )
                                        : "—"
                                }
                            </strong>

                            <small>
                                KM
                            </small>

                        </div>


                        <div class="stat">

                            <span>
                                EXPECTED
                            </span>

                            <strong>
                                ${
                                    expectedMileage
                                        ? expectedMileage.toFixed(2)
                                        : "—"
                                }
                            </strong>

                            <small>
                                KM/L
                            </small>

                        </div>

                    </div>

                </div>


                <div class="bus-card-footer">

                    <div
                        class="
                            assignment
                            ${assignmentClass}
                        "
                    >
                        ${assignmentText}
                    </div>


                    <button
                        class="view-button"
                        type="button"
                        data-bus-id="${bus.id}"
                    >
                        VIEW BUS
                    </button>

                </div>

            `;


            /* =========================================
               VIEW BUTTON
            ========================================= */

            const viewButton =
                card.querySelector(
                    ".view-button"
                );


            viewButton.addEventListener(
                "click",
                () => {
window.location.href =
    `../bus-details/?id=${encodeURIComponent(
        bus.id
    )}`;

                }
            );


            busContainer.appendChild(
                card
            );

        }
    );

}


/* =====================================================
   LOADING
===================================================== */

function showLoading() {

    busContainer.innerHTML = `

        <div class="loading">

            <div class="loading-spinner"></div>

            <span>
                Loading buses...
            </span>

        </div>

    `;

}


/* =====================================================
   ERROR
===================================================== */

function showError(
    message
) {

    busContainer.innerHTML = `

        <div class="error">

            <strong>
                Unable to load buses
            </strong>

            <br><br>

            ${escapeHtml(
                message
            )}

        </div>

    `;

}


/* =====================================================
   NUMBER FORMAT
===================================================== */

function formatNumber(
    value
) {

    return Number(
        value
    ).toLocaleString(
        "en-IN",
        {
            maximumFractionDigits: 2
        }
    );

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(
    value
) {

    return String(
        value
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}
