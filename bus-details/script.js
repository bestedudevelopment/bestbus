import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "../../core/firebase.js";


const busNumber =
    document.getElementById("busNumber");

const registration =
    document.getElementById("registration");

const driver =
    document.getElementById("driver");

const startingOdometer =
    document.getElementById("startingOdometer");

const currentOdometer =
    document.getElementById("currentOdometer");

const expectedMileage =
    document.getElementById("expectedMileage");

const tripList =
    document.getElementById("tripList");

const dieselList =
    document.getElementById("dieselList");


/* =================================
   GET BUS ID FROM URL
================================= */

const params =
    new URLSearchParams(
        window.location.search
    );

const busId =
    params.get("id");


/* =================================
   AUTH
================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.replace(
                "../../index.html"
            );

            return;

        }


        if (!busId) {

            showMessage(
                "No bus was selected."
            );

            return;

        }


        await loadBus();

    }
);


/* =================================
   LOAD BUS
================================= */

async function loadBus() {

    try {

        const busRef =
            doc(
                db,
                "buses",
                busId
            );


        const busSnapshot =
            await getDoc(
                busRef
            );


        if (
            !busSnapshot.exists()
        ) {

            showMessage(
                "Bus not found."
            );

            return;

        }


        const bus =
            busSnapshot.data();


        busNumber.textContent =
            bus.busNumber ||
            "BUS";


        registration.textContent =
            bus.registrationNumber ||
            "Registration not available";


        startingOdometer.textContent =
            formatKm(
                bus.startingOdometer
            );


        currentOdometer.textContent =
            formatKm(
                bus.currentOdometer ??
                bus.startingOdometer
            );


        expectedMileage.textContent =
            bus.expectedMileage
                ? `${bus.expectedMileage} KM/L`
                : "--";


        driver.textContent =
            bus.assignedDriverName ||
            "Not assigned";


        await loadTrips();

        await loadDiesel();


    } catch (error) {

        console.error(
            "BUS LOAD ERROR:",
            error
        );

        showMessage(
            "Unable to load bus details."
        );

    }

}


/* =================================
   LOAD TRIPS
================================= */

async function loadTrips() {

    try {

        const tripsQuery =
            query(
                collection(
                    db,
                    "driverRecords"
                ),

                where(
                    "busId",
                    "==",
                    busId
                )
            );


        const snapshot =
            await getDocs(
                tripsQuery
            );


        const records = [];


        snapshot.forEach(
            item => {

                records.push({
                    id: item.id,
                    ...item.data()
                });

            }
        );


        records.sort(
            (a, b) => {

                return (
                    getTime(
                        b.createdAt
                    ) -
                    getTime(
                        a.createdAt
                    )
                );

            }
        );


        tripList.innerHTML =
            "";


        if (
            records.length === 0
        ) {

            tripList.innerHTML =
                `
                <div class="empty">
                    No trip records available yet.
                </div>
                `;

            return;

        }


        records.forEach(
            record => {

                const morningStart =
                    Number(
                        record.morningStartOdometer ?? 0
                    );


                const morningEnd =
                    Number(
                        record.morningEndOdometer ?? 0
                    );


                const eveningStart =
                    Number(
                        record.eveningStartOdometer ?? 0
                    );


                const eveningEnd =
                    Number(
                        record.eveningEndOdometer ?? 0
                    );


                const morningDistance =
                    Number(
                        record.morningDistance ??
                        (
                            morningEnd &&
                            morningStart
                                ? morningEnd - morningStart
                                : 0
                        )
                    );


                const eveningDistance =
                    Number(
                        record.eveningDistance ??
                        (
                            eveningEnd &&
                            eveningStart
                                ? eveningEnd - eveningStart
                                : 0
                        )
                    );


                const totalDistance =
                    Number(
                        record.totalDistance ??
                        (
                            morningDistance +
                            eveningDistance
                        )
                    );


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "record-card";


                card.innerHTML = `

                    <div class="record-date">
                        ${escapeHTML(
                            record.selectedDate ||
                            "--"
                        )}
                    </div>


                    <div class="trip-grid">

                        <div class="trip-box">

                            <span>
                                MORNING
                            </span>

                            <strong>
                                ${formatKm(
                                    morningDistance
                                )}
                            </strong>

                        </div>


                        <div class="trip-box">

                            <span>
                                EVENING
                            </span>

                            <strong>
                                ${formatKm(
                                    eveningDistance
                                )}
                            </strong>

                        </div>


                        <div class="trip-box">

                            <span>
                                TOTAL
                            </span>

                            <strong>
                                ${formatKm(
                                    totalDistance
                                )}
                            </strong>

                        </div>

                    </div>


                    <div class="trip-times">

                        <div class="time-box">

                            <span>
                                MORNING START
                            </span>

                            <strong>
                                ${formatKm(
                                    record.morningStartOdometer
                                )}
                            </strong>

                        </div>


                        <div class="time-box">

                            <span>
                                MORNING END
                            </span>

                            <strong>
                                ${formatKm(
                                    record.morningEndOdometer
                                )}
                            </strong>

                        </div>


                        <div class="time-box">

                            <span>
                                EVENING START
                            </span>

                            <strong>
                                ${formatKm(
                                    record.eveningStartOdometer
                                )}
                            </strong>

                        </div>


                        <div class="time-box">

                            <span>
                                EVENING END
                            </span>

                            <strong>
                                ${formatKm(
                                    record.eveningEndOdometer
                                )}
                            </strong>

                        </div>

                    </div>

                `;


                tripList.appendChild(
                    card
                );

            }
        );


    } catch (error) {

        console.error(
            "TRIP LOAD ERROR:",
            error
        );

        tripList.innerHTML =
            `
            <div class="empty">
                Unable to load trip records.
            </div>
            `;

    }

}


/* =================================
   LOAD DIESEL
================================= */

async function loadDiesel() {

    try {

        const dieselQuery =
            query(
                collection(
                    db,
                    "dieselRecords"
                ),

                where(
                    "busId",
                    "==",
                    busId
                )
            );


        const snapshot =
            await getDocs(
                dieselQuery
            );


        const records = [];


        snapshot.forEach(
            item => {

                records.push({
                    id: item.id,
                    ...item.data()
                });

            }
        );


        records.sort(
            (a, b) => {

                return (
                    getTime(
                        b.createdAt
                    ) -
                    getTime(
                        a.createdAt
                    )
                );

            }
        );


        dieselList.innerHTML =
            "";


        if (
            records.length === 0
        ) {

            dieselList.innerHTML =
                `
                <div class="empty">
                    No diesel records available yet.
                </div>
                `;

            return;

        }


        records.forEach(
            record => {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "record-card";


                card.innerHTML = `

                    <div class="record-date">
                        ${escapeHTML(
                            record.selectedDate ||
                            "--"
                        )}
                    </div>


                    <div class="diesel-grid">

                        <div class="diesel-box">

                            <span>
                                ODOMETER
                            </span>

                            <strong>
                                ${formatKm(
                                    record.odometer
                                )}
                            </strong>

                        </div>


                        <div class="diesel-box">

                            <span>
                                DIESEL
                            </span>

                            <strong>
                                ${Number(
                                    record.litres || 0
                                )} L
                            </strong>

                        </div>


                        <div class="diesel-box">

                            <span>
                                COST
                            </span>

                            <strong>
                                ₹${formatMoney(
                                    record.amount
                                )}
                            </strong>

                        </div>

                    </div>

                `;


                dieselList.appendChild(
                    card
                );

            }
        );


    } catch (error) {

        console.error(
            "DIESEL LOAD ERROR:",
            error
        );

        dieselList.innerHTML =
            `
            <div class="empty">
                Unable to load diesel records.
            </div>
            `;

    }

}


/* =================================
   HELPERS
================================= */

function formatKm(value) {

    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return "--";

    }


    return (
        number.toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 2
            }
        ) + " KM"
    );

}


function formatMoney(value) {

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


function getTime(timestamp) {

    if (
        timestamp &&
        typeof timestamp.toMillis === "function"
    ) {

        return timestamp.toMillis();

    }


    return 0;

}


function escapeHTML(value) {

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


function showMessage(text) {

    tripList.innerHTML = `
        <div class="empty">
            ${escapeHTML(text)}
        </div>
    `;

      }
