import {
    collection,
    query,
    where,
    onSnapshot,
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


const driverContainer =
    document.getElementById("driverContainer");

const driverSummary =
    document.getElementById("driverSummary");

const searchInput =
    document.getElementById("searchInput");

const backButton =
    document.getElementById("backButton");

const addDriverButton =
    document.getElementById("addDriverButton");

const refreshButton =
    document.getElementById("refreshButton");


let allDrivers = [];


/* =========================
   NAVIGATION
========================= */

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


/* =========================
   AUTH
========================= */

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


            loadDrivers();


        } catch (error) {

            console.error(
                "Profile error:",
                error
            );

            showError(
                "Unable to verify admin account."
            );
        }

    }
);


/* =========================
   LOAD DRIVERS
========================= */

function loadDrivers() {

    driverContainer.innerHTML = `

        <div class="loading">
            Loading drivers...
        </div>

    `;


    const driversQuery =
        query(
            collection(
                db,
                "users"
            ),

            where(
                "role",
                "==",
                "driver"
            ),

            where(
                "active",
                "==",
                true
            )
        );


    onSnapshot(
        driversQuery,

        async (snapshot) => {

            try {

                const drivers =
                    await Promise.all(

                        snapshot.docs.map(
                            async (driverDoc) => {

                                const driver =
                                    driverDoc.data();


                                let bus = null;


                                if (
                                    driver.assignedBusId
                                ) {

                                    try {

                                        const busRef =
                                            doc(
                                                db,
                                                "buses",
                                                driver.assignedBusId
                                            );


                                        const busSnapshot =
                                            await getDoc(
                                                busRef
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
                                            "Bus loading error:",
                                            error
                                        );

                                    }

                                }


                                return {

                                    id:
                                        driverDoc.id,

                                    ...driver,

                                    bus

                                };

                            }
                        )

                    );


                allDrivers =
                    drivers;


                renderDrivers(
                    allDrivers
                );


            } catch (error) {

                console.error(
                    "Driver render error:",
                    error
                );

                showError(
                    "Unable to load driver information."
                );

            }

        },

        (error) => {

            console.error(
                "Firestore driver error:",
                error
            );

            showError(
                "Unable to load drivers."
            );

        }
    );

}


/* =========================
   RENDER
========================= */

function renderDrivers(
    drivers
) {

    if (
        drivers.length === 0
    ) {

        driverSummary.textContent =
            "0 active drivers";


        driverContainer.innerHTML = `

            <div class="empty">

                <div class="empty-icon">
                    👨‍✈️
                </div>

                <h3>
                    No Drivers Yet
                </h3>

                <p>
                    Add your first driver
                    to start managing your drivers.
                </p>

            </div>

        `;

        return;
    }


    driverSummary.textContent =
        `${drivers.length} active ${
            drivers.length === 1
                ? "driver"
                : "drivers"
        }`;


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


            const name =
                driver.name ||
                "Unnamed Driver";


            const phone =
                driver.phone ||
                "No phone";


            const email =
                driver.email ||
                "Not provided";


            const license =
                driver.licenseNumber ||
                "Not provided";


            let busText =
                "No Bus Assigned";


            let assignmentClass =
                "unassigned";


            if (
                driver.bus
            ) {

                busText =
                    `${driver.bus.busNumber || "BUS"} — ${
                        driver.bus.registrationNumber || ""
                    }`;

                assignmentClass =
                    "";

            }


            card.innerHTML = `

                <div class="driver-top">

                    <div class="driver-avatar">
                        👨‍✈️
                    </div>


                    <div class="driver-main">

                        <div class="driver-name">
                            ${escapeHtml(name)}
                        </div>

                        <div class="driver-phone">
                            ${escapeHtml(phone)}
                        </div>

                    </div>


                    <div class="active-badge">
                        ACTIVE
                    </div>

                </div>


                <div class="divider"></div>


                <div class="driver-details">

                    <div class="detail">

                        <span class="detail-label">
                            PHONE
                        </span>

                        <span class="detail-value">
                            ${escapeHtml(phone)}
                        </span>

                    </div>


                    <div class="detail">

                        <span class="detail-label">
                            EMAIL
                        </span>

                        <span class="detail-value">
                            ${escapeHtml(email)}
                        </span>

                    </div>


                    <div class="detail">

                        <span class="detail-label">
                            LICENCE
                        </span>

                        <span class="detail-value">
                            ${escapeHtml(license)}
                        </span>

                    </div>


                    <div class="detail">

                        <span class="detail-label">
                            DRIVER ID
                        </span>

                        <span class="detail-value">
                            ${escapeHtml(
                                driver.id.substring(
                                    0,
                                    8
                                )
                            )}
                        </span>

                    </div>

                </div>


                <div class="assignment">

                    <div class="assignment-left">

                        <div class="assignment-label">
                            ASSIGNED BUS
                        </div>

                        <div
                            class="
                                assignment-value
                                ${assignmentClass}
                            "
                        >
                            ${escapeHtml(busText)}
                        </div>

                    </div>


                    <div
                        class="
                            assignment-status
                            ${assignmentClass}
                        "
                    >
                        ${
                            driver.bus
                                ? "ASSIGNED"
                                : "UNASSIGNED"
                        }
                    </div>

                </div>


                <button
                    class="driver-action"
                    data-driver-id="${driver.id}"
                >
                    VIEW DRIVER
                </button>

            `;


            const viewButton =
                card.querySelector(
                    ".driver-action"
                );


            viewButton.addEventListener(
                "click",
                () => {

                    /*
                     * Driver details page will
                     * be created later.
                     */

                    alert(
                        `Driver: ${name}`
                    );

                }
            );


            driverContainer.appendChild(
                card
            );

        }
    );

}


/* =========================
   SEARCH
========================= */

searchInput.addEventListener(
    "input",
    () => {

        const search =
            searchInput.value
                .trim()
                .toLowerCase();


        if (!search) {

            renderDrivers(
                allDrivers
            );

            return;
        }


        const filtered =
            allDrivers.filter(
                (driver) => {

                    const name =
                        String(
                            driver.name || ""
                        ).toLowerCase();


                    const phone =
                        String(
                            driver.phone || ""
                        ).toLowerCase();


                    const email =
                        String(
                            driver.email || ""
                        ).toLowerCase();


                    const bus =
                        String(
                            driver.bus?.busNumber || ""
                        ).toLowerCase();


                    return (
                        name.includes(search) ||
                        phone.includes(search) ||
                        email.includes(search) ||
                        bus.includes(search)
                    );

                }
            );


        renderDrivers(
            filtered
        );

    }
);


/* =========================
   ERROR
========================= */

function showError(
    message
) {

    driverContainer.innerHTML = `

        <div class="error">
            ${escapeHtml(message)}
        </div>

    `;

}


/* =========================
   ESCAPE HTML
========================= */

function escapeHtml(
    value
) {

    return String(value)
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
