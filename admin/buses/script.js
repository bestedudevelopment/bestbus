import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth,
    db
} from "../../core/firebase.js";


/* ================================
   ELEMENTS
================================ */

const busList =
    document.getElementById(
        "busList"
    );

const busCount =
    document.getElementById(
        "busCount"
    );


/* ================================
   AUTH
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

            await loadBuses();

        } catch (error) {

            console.error(
                "BUS PAGE ERROR:",
                error
            );


            busList.innerHTML = `
                <div class="empty">
                    Unable to load buses.
                    <br><br>
                    ${escapeHTML(
                        error.message
                    )}
                </div>
            `;

        }

    }
);


/* ================================
   LOAD BUSES
================================ */

async function loadBuses() {

    const [
        busesSnapshot,
        usersSnapshot
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


    const drivers = [];


    usersSnapshot.forEach(
        snapshot => {

            const data =
                snapshot.data();


            if (
                data.role === "driver"
            ) {

                drivers.push({

                    id:
                        snapshot.id,

                    ...data

                });

            }

        }
    );


    const buses = [];


    busesSnapshot.forEach(
        snapshot => {

            buses.push({

                id:
                    snapshot.id,

                ...snapshot.data()

            });

        }
    );


    busCount.textContent =
        buses.length;


    if (
        buses.length === 0
    ) {

        busList.innerHTML = `
            <div class="empty">
                No buses registered yet.
            </div>
        `;

        return;

    }


    busList.innerHTML = "";


    buses.forEach(
        bus => {

            const driver =
                drivers.find(
                    item =>
                        item.id ===
                        (
                            bus.assignedDriverId ||
                            bus.driverId
                        )
                );


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "bus-card";


            const status =
                (
                    bus.status ||
                    "active"
                ).toLowerCase();


            const isActive =
                status === "active";


            card.innerHTML = `

                <div class="bus-icon">
                    🚌
                </div>


                <div class="bus-main">

                    <div class="bus-number">
                        ${escapeHTML(
                            bus.busNumber ||
                            "Unnamed Bus"
                        )}
                    </div>

                    <div class="registration">
                        ${escapeHTML(
                            bus.registrationNumber ||
                            bus.registrationNo ||
                            "No registration"
                        )}
                    </div>

                    <div class="driver">

                        Driver:

                        <strong>
                            ${escapeHTML(
                                driver?.name ||
                                "Not assigned"
                            )}
                        </strong>

                    </div>

                </div>


                <div class="bus-details">

                    <div class="detail">

                        <div class="detail-label">
                            ROUTE
                        </div>

                        <div class="detail-value">
                            ${escapeHTML(
                                bus.route ||
                                bus.routeName ||
                                "Not set"
                            )}
                        </div>

                    </div>


                    <div class="detail">

                        <div class="detail-label">
                            CURRENT ODOMETER
                        </div>

                        <div class="detail-value">
                            ${formatNumber(
                                bus.currentOdometer
                            )}
                            km
                        </div>

                    </div>


                    <div class="detail">

                        <div class="detail-label">
                            STATUS
                        </div>

                        <div class="
                            status
                            ${isActive
                                ? ""
                                : "inactive"}
                        ">

                            <span
                                class="status-dot"
                            ></span>

                            ${isActive
                                ? "ACTIVE"
                                : "INACTIVE"}

                        </div>

                    </div>

                </div>


                <button
                    type="button"
                    class="explore"
                    data-id="${bus.id}"
                >
                    EXPLORE →
                </button>

            `;


            busList.appendChild(
                card
            );

        }
    );


    /*
     * Explore button
     */

    document
        .querySelectorAll(
            ".explore"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const busId =
                            button.dataset.id;


                        window.location.href =
                            `../bus-details/?id=${encodeURIComponent(
                                busId
                            )}`;

                    }
                );

            }
        );

}


/* ================================
   NUMBER FORMAT
================================ */

function formatNumber(
    value
) {

    const number =
        Number(value);


    if (
        Number.isNaN(number)
    ) {

        return "0";

    }


    return number.toLocaleString(
        "en-IN"
    );

}


/* ================================
   ESCAPE HTML
================================ */

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
