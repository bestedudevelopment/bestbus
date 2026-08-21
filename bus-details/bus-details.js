import {
    doc,
    getDoc,
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth,
    db
} from "../core/firebase.js";


/* =========================================
   ELEMENTS
========================================= */

const backButton =
    document.getElementById(
        "backButton"
    );

const busNumber =
    document.getElementById(
        "busNumber"
    );

const registrationNumber =
    document.getElementById(
        "registrationNumber"
    );

const busStatus =
    document.getElementById(
        "busStatus"
    );

const driverName =
    document.getElementById(
        "driverName"
    );

const driverPhone =
    document.getElementById(
        "driverPhone"
    );

const currentOdometer =
    document.getElementById(
        "currentOdometer"
    );

const totalDistance =
    document.getElementById(
        "totalDistance"
    );

const totalDiesel =
    document.getElementById(
        "totalDiesel"
    );

const totalFuelCost =
    document.getElementById(
        "totalFuelCost"
    );

const averageMileage =
    document.getElementById(
        "averageMileage"
    );

const fuelCostPerKm =
    document.getElementById(
        "fuelCostPerKm"
    );

const readingsTab =
    document.getElementById(
        "readingsTab"
    );

const dieselTab =
    document.getElementById(
        "dieselTab"
    );

const readingsSection =
    document.getElementById(
        "readingsSection"
    );

const dieselSection =
    document.getElementById(
        "dieselSection"
    );

const readingsList =
    document.getElementById(
        "readingsList"
    );

const dieselList =
    document.getElementById(
        "dieselList"
    );

const readingsEmpty =
    document.getElementById(
        "readingsEmpty"
    );

const dieselEmpty =
    document.getElementById(
        "dieselEmpty"
    );

const loading =
    document.getElementById(
        "loading"
    );


/* =========================================
   BUS ID
========================================= */

const params =
    new URLSearchParams(
        window.location.search
    );

const busId =
    params.get("id");


if (!busId) {

    showFatalError(
        "No bus was selected."
    );

}


/* =========================================
   STATE
========================================= */

let busData = null;

let readings = [];

let dieselRecords = [];


/* =========================================
   BACK
========================================= */

backButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../buses/";

    }
);


/* =========================================
   TABS
========================================= */

readingsTab.addEventListener(
    "click",
    () => {

        readingsTab.classList.add(
            "active"
        );

        dieselTab.classList.remove(
            "active"
        );

        readingsSection.classList.remove(
            "hidden"
        );

        dieselSection.classList.add(
            "hidden"
        );

    }
);


dieselTab.addEventListener(
    "click",
    () => {

        dieselTab.classList.add(
            "active"
        );

        readingsTab.classList.remove(
            "active"
        );

        dieselSection.classList.remove(
            "hidden"
        );

        readingsSection.classList.add(
            "hidden"
        );

    }
);


/* =========================================
   AUTH
========================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "../login/";

            return;

        }


        if (!busId) {

            return;

        }


        try {

            await loadBus();

            await loadReadings();

            await loadDiesel();

            calculateOverview();

            loading.classList.add(
                "hidden"
            );

        } catch (error) {

            console.error(
                "BUS DETAILS ERROR:",
                error
            );

            showFatalError(
                error.message ||
                "Unable to load bus details."
            );

        }

    }
);


/* =========================================
   LOAD BUS
========================================= */

async function loadBus() {

    const busReference =
        doc(
            db,
            "buses",
            busId
        );


    const snapshot =
        await getDoc(
            busReference
        );


    if (
        !snapshot.exists()
    ) {

        throw new Error(
            "This bus does not exist."
        );

    }


    busData =
        snapshot.data();


    busNumber.textContent =
        busData.busNumber ||
        "BUS";


    registrationNumber.textContent =
        busData.registrationNumber ||
        busData.registrationNo ||
        "Registration number not available";


    if (
        busData.active === false
    ) {

        busStatus.textContent =
            "INACTIVE";

        busStatus.style.background =
            "#3b2222";

        busStatus.style.color =
            "#ff9b9b";

    } else {

        busStatus.textContent =
            "ACTIVE";

    }


    /*
     * Load assigned driver.
     */

    if (
        busData.assignedDriverId
    ) {

        await loadDriver(
            busData.assignedDriverId
        );

    } else {

        driverName.textContent =
            "No driver assigned";

        driverPhone.textContent =
            "Unassigned";

    }

}


/* =========================================
   LOAD DRIVER
========================================= */

async function loadDriver(
    driverId
) {

    const driverReference =
        doc(
            db,
            "users",
            driverId
        );


    const snapshot =
        await getDoc(
            driverReference
        );


    if (
        !snapshot.exists()
    ) {

        driverName.textContent =
            "Driver account deleted";

        driverPhone.textContent =
            "No driver assigned";

        return;

    }


    const driver =
        snapshot.data();


    driverName.textContent =
        driver.name ||
        driver.displayName ||
        "Driver";


    driverPhone.textContent =
        driver.phone ||
        driver.email ||
        "Contact unavailable";

}


/* =========================================
   LOAD READINGS
========================================= */

async function loadReadings() {

    readingsList.innerHTML =
        "";


    const readingsQuery =
        query(
            collection(
                db,
                "driverReadings"
            ),
            where(
                "busId",
                "==",
                busId
            ),
            orderBy(
                "date",
                "desc"
            ),
            limit(100)
        );


    const snapshot =
        await getDocs(
            readingsQuery
        );


    readings =
        [];


    snapshot.forEach(
        (documentSnapshot) => {

            readings.push({

                id:
                    documentSnapshot.id,

                ...documentSnapshot.data()

            });

        }
    );


    if (
        readings.length === 0
    ) {

        readingsEmpty.classList.remove(
            "hidden"
        );

        return;

    }


    readingsEmpty.classList.add(
        "hidden"
    );


    readings.forEach(
        (record) => {

            readingsList.appendChild(
                createReadingCard(
                    record
                )
            );

        }
    );

}


/* =========================================
   READING CARD
========================================= */

function createReadingCard(
    data
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "reading-card";


    const morning =
        data.morningReading !==
        undefined
            ? Number(
                data.morningReading
            )
            : null;


    const evening =
        data.eveningReading !==
        undefined
            ? Number(
                data.eveningReading
            )
            : null;


    let distance =
        data.distance;


    if (
        distance === undefined &&
        morning !== null &&
        evening !== null
    ) {

        distance =
            evening -
            morning;

    }


    card.innerHTML = `

        <div class="record-header">

            <div class="date-info">

                <span>
                    DATE
                </span>

                <strong>
                    ${escapeHTML(
                        formatDate(
                            data.date
                        )
                    )}
                </strong>

            </div>


            <div class="distance">

                <span>
                    DISTANCE
                </span>

                <strong>
                    ${
                        distance !== undefined
                            ? `${distance} KM`
                            : "--"
                    }
                </strong>

            </div>

        </div>


        <div class="reading-grid">

            <div class="reading-value">

                <span>
                    🌅 MORNING READING
                </span>

                <strong>
                    ${
                        morning !== null
                            ? morning
                            : "--"
                    }
                </strong>

                <small>
                    ${
                        morning !== null
                            ? "KM"
                            : ""
                    }
                </small>

            </div>


            <div class="reading-value">

                <span>
                    🌆 EVENING READING
                </span>

                <strong>
                    ${
                        evening !== null
                            ? evening
                            : "--"
                    }
                </strong>

                <small>
                    ${
                        evening !== null
                            ? "KM"
                            : ""
                    }
                </small>

            </div>

        </div>


        <div class="photo-links">

            ${
                data.morningPhoto
                    ? `
                        <a
                            class="photo-link"
                            href="${escapeAttribute(
                                data.morningPhoto
                            )}"
                            target="_blank"
                            rel="noopener"
                        >
                            📷 MORNING PHOTO
                        </a>
                    `
                    : ""
            }


            ${
                data.eveningPhoto
                    ? `
                        <a
                            class="photo-link"
                            href="${escapeAttribute(
                                data.eveningPhoto
                            )}"
                            target="_blank"
                            rel="noopener"
                        >
                            📷 EVENING PHOTO
                        </a>
                    `
                    : ""
            }

        </div>

    `;


    return card;

}


/* =========================================
   LOAD DIESEL
========================================= */

async function loadDiesel() {

    dieselList.innerHTML =
        "";


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
            ),
            orderBy(
                "createdAt",
                "desc"
            ),
            limit(100)
        );


    const snapshot =
        await getDocs(
            dieselQuery
        );


    dieselRecords =
        [];


    snapshot.forEach(
        (documentSnapshot) => {

            dieselRecords.push({

                id:
                    documentSnapshot.id,

                ...documentSnapshot.data()

            });

        }
    );


    if (
        dieselRecords.length === 0
    ) {

        dieselEmpty.classList.remove(
            "hidden"
        );

        return;

    }


    dieselEmpty.classList.add(
        "hidden"
    );


    dieselRecords.forEach(
        (record) => {

            dieselList.appendChild(
                createDieselCard(
                    record
                )
            );

        }
    );

}


/* =========================================
   DIESEL CARD
========================================= */

function createDieselCard(
    data
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "diesel-card";


    const litres =
        Number(
            data.litres || 0
        );


    const amount =
        Number(
            data.amount || 0
        );


    const price =
        Number(
            data.pricePerLitre ||
            (
                litres > 0
                    ? amount / litres
                    : 0
            )
        );


    const odometer =
        data.odometer !== undefined
            ? data.odometer
            : "--";


    card.innerHTML = `

        <div class="diesel-title">

            <div class="diesel-icon">
                ⛽
            </div>

            <div>

                <span>
                    ${escapeHTML(
                        formatDate(
                            data.date
                        )
                    )}
                </span>

                <strong>
                    Diesel Filled
                </strong>

            </div>

        </div>


        <div class="diesel-grid">


            <div class="diesel-value">

                <span>
                    DIESEL
                </span>

                <strong>
                    ${litres.toFixed(2)}
                </strong>

                <small>
                    L
                </small>

            </div>


            <div class="diesel-value">

                <span>
                    AMOUNT
                </span>

                <strong>
                    ₹ ${amount.toFixed(2)}
                </strong>

            </div>


            <div class="diesel-value">

                <span>
                    PRICE / LITRE
                </span>

                <strong>
                    ₹ ${price.toFixed(2)}
                </strong>

            </div>


            <div class="diesel-value">

                <span>
                    ODOMETER
                </span>

                <strong>
                    ${escapeHTML(
                        String(
                            odometer
                        )
                    )}
                </strong>

                <small>
                    KM
                </small>

            </div>

        </div>


        ${
            data.fuelStation
                ? `
                    <div class="station">
                        📍 ${escapeHTML(
                            data.fuelStation
                        )}
                    </div>
                `
                : ""
        }


        ${
            data.photo
                ? `
                    <a
                        class="fuel-photo"
                        href="${escapeAttribute(
                            data.photo
                        )}"
                        target="_blank"
                        rel="noopener"
                    >
                        📷 VIEW FUEL PHOTO
                    </a>
                `
                : ""
        }

    `;


    return card;

}


/* =========================================
   CALCULATE OVERVIEW
========================================= */

function calculateOverview() {

    let distance =
        0;


    let diesel =
        0;


    let fuelCost =
        0;


    let latestOdometer =
        null;


    /*
     * DISTANCE
     */

    readings.forEach(
        (record) => {

            if (
                record.distance !==
                undefined
            ) {

                distance +=
                    Number(
                        record.distance
                    );

            } else {

                const morning =
                    Number(
                        record.morningReading
                    );


                const evening =
                    Number(
                        record.eveningReading
                    );


                if (
                    !isNaN(morning) &&
                    !isNaN(evening) &&
                    evening >= morning
                ) {

                    distance +=
                        evening -
                        morning;

                }

            }


            /*
             * Latest odometer.
             */

            const evening =
                Number(
                    record.eveningReading
                );


            const morning =
                Number(
                    record.morningReading
                );


            if (
                !isNaN(evening) &&
                evening > 0
            ) {

                if (
                    latestOdometer === null ||
                    evening >
                    latestOdometer
                ) {

                    latestOdometer =
                        evening;

                }

            }


            if (
                !isNaN(morning) &&
                morning > 0
            ) {

                if (
                    latestOdometer === null ||
                    morning >
                    latestOdometer
                ) {

                    latestOdometer =
                        morning;

                }

            }

        }
    );


    /*
     * DIESEL
     */

    dieselRecords.forEach(
        (record) => {

            diesel +=
                Number(
                    record.litres || 0
                );


            fuelCost +=
                Number(
                    record.amount || 0
                );

        }
    );


    /*
     * DISPLAY
     */

    currentOdometer.textContent =
        latestOdometer !== null
            ? formatNumber(
                latestOdometer
            )
            : "--";


    totalDistance.textContent =
        formatNumber(
            distance
        );


    totalDiesel.textContent =
        diesel > 0
            ? diesel.toFixed(2)
            : "--";


    totalFuelCost.textContent =
        fuelCost > 0
            ? `₹ ${formatNumber(
                fuelCost
            )}`
            : "₹ --";


    /*
     * Mileage
     */

    if (
        diesel > 0 &&
        distance > 0
    ) {

        averageMileage.textContent =
            (
                distance /
                diesel
            ).toFixed(2);

    } else {

        averageMileage.textContent =
            "--";

    }


    /*
     * Fuel cost per KM
     */

    if (
        fuelCost > 0 &&
        distance > 0
    ) {

        fuelCostPerKm.textContent =
            `₹ ${
                (
                    fuelCost /
                    distance
                ).toFixed(2)
            }`;

    } else {

        fuelCostPerKm.textContent =
            "₹ --";

    }

}


/* =========================================
   FORMAT NUMBER
========================================= */

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


/* =========================================
   FORMAT DATE
========================================= */

function formatDate(
    dateString
) {

    if (!dateString) {

        return "--";

    }


    const parts =
        String(
            dateString
        ).split("-");


    if (
        parts.length !== 3
    ) {

        return dateString;

    }


    const date =
        new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2])
        );


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


/* =========================================
   SECURITY HELPERS
========================================= */

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


function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );

}


/* =========================================
   FATAL ERROR
========================================= */

function showFatalError(
    message
) {

    loading.innerHTML = `

        <strong>
            Unable to load bus
        </strong>

        <span>
            ${escapeHTML(
                message
            )}
        </span>

        <button
            id="errorBackButton"
            type="button"
            style="
                margin-top:12px;
                padding:10px 15px;
                border:none;
                border-radius:10px;
                background:#ffc400;
                font-weight:900;
                cursor:pointer;
            "
        >
            BACK TO BUSES
        </button>

    `;


    const errorBackButton =
        document.getElementById(
            "errorBackButton"
        );


    errorBackButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "../buses/";

        }
    );

}
