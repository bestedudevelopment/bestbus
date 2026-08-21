import {
    collection,
    query,
    where,
    onSnapshot
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


const busContainer =
    document.getElementById("busContainer");

const busSummary =
    document.getElementById("busSummary");

const backButton =
    document.getElementById("backButton");

const addBusButton =
    document.getElementById("addBusButton");

const refreshButton =
    document.getElementById("refreshButton");


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


addBusButton.addEventListener(
    "click",
    () => {
        window.location.href =
            "../add-bus/";
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

            loadBuses();

        } catch (error) {

            console.error(error);

            showError(
                "Unable to verify your account."
            );
        }
    }
);


/* =========================
   LOAD BUSES
========================= */

function loadBuses() {

    busContainer.innerHTML = `
        <div class="loading">
            Loading buses...
        </div>
    `;


    const busesQuery =
        query(
            collection(db, "buses"),
            where("active", "==", true)
        );


    onSnapshot(
        busesQuery,
        (snapshot) => {

            renderBuses(
                snapshot.docs
            );

        },
        (error) => {

            console.error(
                "Bus loading error:",
                error
            );

            showError(
                "Unable to load buses. Please check your connection."
            );
        }
    );
}


/* =========================
   RENDER
========================= */

function renderBuses(
    documents
) {

    if (documents.length === 0) {

        busSummary.textContent =
            "0 active buses";

        busContainer.innerHTML = `

            <div class="empty">

                <div class="empty-icon">
                    🚌
                </div>

                <h3>
                    No Buses Yet
                </h3>

                <p>
                    Add your first school bus
                    to start managing the fleet.
                </p>

            </div>
        `;

        return;
    }


    busSummary.textContent =
        `${documents.length} active ${
            documents.length === 1
                ? "bus"
                : "buses"
        }`;


    busContainer.innerHTML = "";


    documents.forEach(
        (busDoc) => {

            const bus =
                busDoc.data();

            const card =
                document.createElement(
                    "article"
                );

            card.className =
                "bus-card";


            const busNumber =
                bus.busNumber ||
                "Unknown Bus";

            const registration =
                bus.registrationNumber ||
                "No registration";

            const route =
                bus.route ||
                "No route";

            const expected =
                Number(
                    bus.expectedMileage || 0
                );

            const odometer =
                Number(
                    bus.currentOdometer || 0
                );

            const driverId =
                bus.driverId || "";


            card.innerHTML = `

                <div class="bus-top">

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

                    <div class="status">
                        ACTIVE
                    </div>

                </div>


                <div class="bus-divider"></div>


                <div class="details">

                    <div>

                        <span class="detail-label">
                            Route
                        </span>

                        <span class="detail-value">
                            ${escapeHtml(
                                route
                            )}
                        </span>

                    </div>


                    <div>

                        <span class="detail-label">
                            Expected Mileage
                        </span>

                        <span class="detail-value">
                            ${
                                expected
                                    ? expected.toFixed(2)
                                    : "—"
                            } KM/L
                        </span>

                    </div>


                    <div>

                        <span class="detail-label">
                            Current Meter
                        </span>

                        <span class="detail-value">
                            ${
                                odometer
                                    ? formatNumber(
                                        odometer
                                    )
                                    : "—"
                            } KM
                        </span>

                    </div>


                    <div>

                        <span class="detail-label">
                            Bus ID
                        </span>

                        <span class="detail-value">
                            ${busDoc.id.substring(0, 8)}
                        </span>

                    </div>

                </div>


                <div
                    class="
                        driver-row
                        ${
                            driverId
                                ? ""
                                : "driver-unassigned"
                        }
                    "
                >

                    ${
                        driverId
                            ? "👨‍✈️ Driver Assigned"
                            : "⚠ Driver Not Assigned"
                    }

                </div>

            `;


            card.addEventListener(
                "click",
                () => {

                    window.location.href =
                        `../bus/?id=${encodeURIComponent(
                            busDoc.id
                        )}`;
                }
            );


            busContainer.appendChild(
                card
            );
        }
    );
}


/* =========================
   REFRESH
========================= */

refreshButton.addEventListener(
    "click",
    () => {

        loadBuses();

    }
);


/* =========================
   HELPERS
========================= */

function formatNumber(
    value
) {

    return value.toLocaleString(
        "en-IN",
        {
            maximumFractionDigits: 2
        }
    );
}


function escapeHtml(
    value
) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function showError(
    message
) {

    busContainer.innerHTML = `

        <div class="error">
            ${escapeHtml(message)}
        </div>

    `;
}
