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

const driverContainer =
    document.getElementById(
        "driverContainer"
    );

const totalDrivers =
    document.getElementById(
        "totalDrivers"
    );

const activeDrivers =
    document.getElementById(
        "activeDrivers"
    );

const assignedDrivers =
    document.getElementById(
        "assignedDrivers"
    );

const searchInput =
    document.getElementById(
        "searchInput"
    );

const backButton =
    document.getElementById(
        "backButton"
    );

const addDriverButton =
    document.getElementById(
        "addDriverButton"
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

let allDrivers = [];

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


addDriverButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../add-driver/";

    }
);


refreshButton.addEventListener(
    "click",
    () => {

        loadDrivers();

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


            await loadDrivers();


        } catch (error) {

            console.error(
                "AUTH ERROR:",
                error
            );


            showError(
                error.message ||
                "Unable to verify administrator."
            );

        }

    }
);


/* =====================================================
   LOAD DRIVERS
===================================================== */

async function loadDrivers() {

    showLoading();


    try {

        console.log(
            "Loading drivers..."
        );


        /*
         * We use the users collection
         * and select only role == driver.
         */

        const driversQuery =
            await getDocs(
                collection(
                    db,
                    "users"
                )
            );


        console.log(
            "USER DOCUMENTS:",
            driversQuery.size
        );


        const drivers = [];


        for (
            const driverDocument
            of driversQuery.docs
        ) {

            const data =
                driverDocument.data();


            /*
             * Ignore admins and other users.
             */

            if (
                data.role !== "driver"
            ) {

                continue;
            }


            let bus =
                null;


            /*
             * Get assigned bus.
             */

            if (
                data.assignedBusId
            ) {

                try {

                    const busReference =
                        doc(
                            db,
                            "buses",
                            data.assignedBusId
                        );


                    const busSnapshot =
                        await getDoc(
                            busReference
                        );


                    if (
                        busSnapshot.exists()
                    ) {

                        bus = {

                            id:
                                busSnapshot.id,

                            ...busSnapshot.data()

                        };

                    }

                } catch (error) {

                    console.error(
                        "BUS LOAD ERROR:",
                        error
                    );

                }

            }


            drivers.push({

                id:
                    driverDocument.id,

                ...data,

                bus

            });

        }


        allDrivers =
            drivers;


        updateSummary();


        applyFilters();


    } catch (error) {

        console.error(
            "DRIVER LOAD ERROR:",
            error
        );


        showError(
            error.message ||
            "Unable to load drivers."
        );

    }

}


/* =====================================================
   SUMMARY
===================================================== */

function updateSummary() {

    const total =
        allDrivers.length;


    const active =
        allDrivers.filter(
            (driver) =>
                driver.active !== false
        ).length;


    const assigned =
        allDrivers.filter(
            (driver) =>
                !!driver.assignedBusId
        ).length;


    totalDrivers.textContent =
        total;


    activeDrivers.textContent =
        active;


    assignedDrivers.textContent =
        assigned;

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
   SEARCH
===================================================== */

searchInput.addEventListener(
    "input",
    () => {

        applyFilters();

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
        [...allDrivers];


    if (
        currentFilter ===
        "active"
    ) {

        filtered =
            filtered.filter(
                (driver) =>
                    driver.active !== false
            );

    }


    if (
        currentFilter ===
        "assigned"
    ) {

        filtered =
            filtered.filter(
                (driver) =>
                    !!driver.assignedBusId
            );

    }


    if (
        currentFilter ===
        "unassigned"
    ) {

        filtered =
            filtered.filter(
                (driver) =>
                    !driver.assignedBusId
            );

    }


    if (
        search
    ) {

        filtered =
            filtered.filter(
                (driver) => {

                    const name =
                        String(
                            driver.name ||
                            ""
                        ).toLowerCase();


                    const email =
                        String(
                            driver.email ||
                            ""
                        ).toLowerCase();


                    const phone =
                        String(
                            driver.phone ||
                            ""
                        ).toLowerCase();


                    const license =
                        String(
                            driver.licenseNumber ||
                            ""
                        ).toLowerCase();


                    const busNumber =
                        String(
                            driver.bus?.busNumber ||
                            ""
                        ).toLowerCase();


                    return (

                        name.includes(search) ||

                        email.includes(search) ||

                        phone.includes(search) ||

                        license.includes(search) ||

                        busNumber.includes(search)

                    );

                }
            );

    }


    renderDrivers(
        filtered
    );

}


/* =====================================================
   RENDER
===================================================== */

function renderDrivers(
    drivers
) {

    if (
        drivers.length === 0
    ) {

        driverContainer.innerHTML = `

            <div class="empty">

                <div class="empty-icon">
                    👨‍✈️
                </div>

                <h2>
                    No Drivers Found
                </h2>

                <p>
                    ${
                        allDrivers.length === 0
                            ? "Add your first driver to start managing your drivers."
                            : "No drivers match your current search or filter."
                    }
                </p>

            </div>

        `;

        return;
    }


    driverContainer.innerHTML =
        "";


    drivers.forEach(
        (driver) => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "driver-card";


            const active =
                driver.active !== false;


            const driverName =
                driver.name ||
                "Unnamed Driver";


            const email =
                driver.email ||
                "No email";


            const phone =
                driver.phone ||
                "No phone";


            const license =
                driver.licenseNumber ||
                "Licence not added";


            let busHTML = "";


            if (
                driver.bus
            ) {

                busHTML = `

                    <div class="bus-icon">
                        🚌
                    </div>

                    <div class="bus-info">

                        <div class="bus-number">
                            ${escapeHtml(
                                driver.bus.busNumber ||
                                "BUS"
                            )}
                        </div>

                        <div class="bus-registration">
                            ${escapeHtml(
                                driver.bus.registrationNumber ||
                                driver.bus.registrationNo ||
                                "No registration"
                            )}
                        </div>

                    </div>

                `;

            } else {

                busHTML = `

                    <div class="bus-icon">
                        🚌
                    </div>

                    <div class="bus-info">

                        <div class="no-bus">
                            No Bus Assigned
                        </div>

                    </div>

                `;

            }


            card.innerHTML = `

                <div class="driver-card-top">

                    <div class="driver-heading">

                        <div class="driver-avatar">
                            👨‍✈️
                        </div>

                        <div>

                            <div class="driver-name">
                                ${escapeHtml(
                                    driverName
                                )}
                            </div>

                            <div class="driver-email">
                                ${escapeHtml(
                                    email
                                )}
                            </div>

                        </div>


                        <div
                            class="
                                status
                                ${
                                    active
                                        ? "active"
                                        : "inactive"
                                }
                            "
                        >
                            ${
                                active
                                    ? "ACTIVE"
                                    : "INACTIVE"
                            }
                        </div>

                    </div>

                </div>


                <div class="driver-card-body">


                    <div class="info-row">

                        <div class="info-icon">
                            📞
                        </div>

                        <div>

                            <div class="info-label">
                                PHONE
                            </div>

                            <div class="info-value">
                                ${escapeHtml(
                                    phone
                                )}
                            </div>

                        </div>

                    </div>


                    <div class="assigned-bus">

                        ${busHTML}

                    </div>

                </div>


                <div class="driver-card-footer">

                    <div class="license">

                        LICENCE:
                        ${escapeHtml(
                            license
                        )}

                    </div>


                    <button
                        class="edit-button"
                        type="button"
                        data-driver-id="${driver.id}"
                    >
                        EDIT
                    </button>

                </div>

            `;


            const editButton =
                card.querySelector(
                    ".edit-button"
                );


            editButton.addEventListener(
                "click",
                () => {

                    window.location.href =
                        `../edit-driver/?id=${encodeURIComponent(
                            driver.id
                        )}`;

                }
            );


            driverContainer.appendChild(
                card
            );

        }
    );

}


/* =====================================================
   LOADING
===================================================== */

function showLoading() {

    driverContainer.innerHTML = `

        <div class="loading">

            <div class="loading-spinner"></div>

            <span>
                Loading drivers...
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

    driverContainer.innerHTML = `

        <div class="error">

            <strong>
                Unable to load drivers
            </strong>

            <br><br>

            ${escapeHtml(
                message
            )}

        </div>

    `;

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
