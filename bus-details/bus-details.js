import {
    doc,
    getDoc,
    collection,
    query,
    where,
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


/* =========================================================
   ELEMENTS
========================================================= */

const backButton =
    document.getElementById("backButton");

const busNumber =
    document.getElementById("busNumber");

const registrationNumber =
    document.getElementById("registrationNumber");

const busStatus =
    document.getElementById("busStatus");

const driverName =
    document.getElementById("driverName");

const driverPhone =
    document.getElementById("driverPhone");

const currentOdometer =
    document.getElementById("currentOdometer");

const totalDistance =
    document.getElementById("totalDistance");

const totalDiesel =
    document.getElementById("totalDiesel");

const totalFuelCost =
    document.getElementById("totalFuelCost");

const averageMileage =
    document.getElementById("averageMileage");

const fuelCostPerKm =
    document.getElementById("fuelCostPerKm");

const readingsTab =
    document.getElementById("readingsTab");

const dieselTab =
    document.getElementById("dieselTab");

const readingsSection =
    document.getElementById("readingsSection");

const dieselSection =
    document.getElementById("dieselSection");

const readingsList =
    document.getElementById("readingsList");

const dieselList =
    document.getElementById("dieselList");

const readingsEmpty =
    document.getElementById("readingsEmpty");

const dieselEmpty =
    document.getElementById("dieselEmpty");

const loading =
    document.getElementById("loading");


/* =========================================================
   GET BUS ID FROM URL
========================================================= */

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const busId =
    urlParams.get("id");


console.log(
    "BUS DETAILS PAGE"
);

console.log(
    "Selected Bus ID:",
    busId
);


/* =========================================================
   DATA
========================================================= */

let busData = null;

let readings = [];

let dieselRecords = [];


/* =========================================================
   BACK BUTTON
========================================================= */

if (backButton) {

    backButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "../buses/";

        }
    );

}


/* =========================================================
   TAB - ODOMETER
========================================================= */

if (readingsTab) {

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

}


/* =========================================================
   TAB - DIESEL
========================================================= */

if (dieselTab) {

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

}


/* =========================================================
   AUTHENTICATION
========================================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "../login/";

            return;

        }


        if (!busId) {

            showError(
                "No bus was selected."
            );

            return;

        }


        try {

            await loadBus();

            await loadDriver();

            await loadReadings();

            await loadDiesel();

            calculateOverview();

            hideLoading();

            console.log(
                "BUS DETAILS LOADED"
            );

        } catch (error) {

            console.error(
                "BUS DETAILS ERROR:",
                error
            );

            showError(
                error.message ||
                "Unable to load bus details."
            );

        }

    }
);


/* =========================================================
   LOAD BUS
========================================================= */

async function loadBus() {

    console.log(
        "Loading bus document..."
    );


    const busReference =
        doc(
            db,
            "buses",
            busId
        );


    const busSnapshot =
        await getDoc(
            busReference
        );


    if (
        !busSnapshot.exists()
    ) {

        throw new Error(
            "Bus not found in Firestore."
        );

    }


    busData =
        busSnapshot.data();


    console.log(
        "BUS DATA:",
        busData
    );


    /* BUS NUMBER */

    if (busNumber) {

        busNumber.textContent =
            busData.busNumber ||
            "BUS";

    }


    /* REGISTRATION */

    if (registrationNumber) {

        registrationNumber.textContent =
            busData.registrationNumber ||
            busData.registrationNo ||
            "Registration number not available";

    }


    /* STATUS */

    if (busStatus) {

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

    }

}


/* =========================================================
   LOAD DRIVER
========================================================= */

async function loadDriver() {

    console.log(
        "Loading assigned driver..."
    );


    /*
     * Your bus document uses:
     *
     * driverId
     *
     * So we use driverId here.
     */

    const driverId =
        busData?.driverId;


    console.log(
        "Driver ID:",
        driverId
    );


    if (!driverId) {

        if (driverName) {

            driverName.textContent =
                "No Driver Assigned";

        }


        if (driverPhone) {

            driverPhone.textContent =
                "This bus is currently unassigned";

        }


        return;

    }


    try {

        const driverReference =
            doc(
                db,
                "users",
                driverId
            );


        const driverSnapshot =
            await getDoc(
                driverReference
            );


        if (
            !driverSnapshot.exists()
        ) {

            if (driverName) {

                driverName.textContent =
                    "Driver Not Found";

            }


            if (driverPhone) {

                driverPhone.textContent =
                    "Driver account may have been deleted";

            }


            return;

        }


        const driver =
            driverSnapshot.data();


        console.log(
            "DRIVER DATA:",
            driver
        );


        if (driverName) {

            driverName.textContent =
                driver.name ||
                driver.displayName ||
                "Driver";

        }


        if (driverPhone) {

            driverPhone.textContent =
                driver.phone ||
                driver.email ||
                "Contact not available";

        }

    } catch (error) {

        console.error(
            "DRIVER ERROR:",
            error
        );


        if (driverName) {

            driverName.textContent =
                "Unable to load driver";

        }


        if (driverPhone) {

            driverPhone.textContent =
                "";

        }

    }

}


/* =========================================================
   LOAD ODOMETER HISTORY
========================================================= */

async function loadReadings() {

    console.log(
        "Loading odometer history..."
    );


    readingsList.innerHTML =
        "";


    try {

        /*
         * IMPORTANT:
         *
         * Only where(busId) is used.
         *
         * NO orderBy()
         *
         * Therefore no composite index is required.
         */

        const readingsReference =
            collection(
                db,
                "driverReadings"
            );


        const readingsQuery =
            query(
                readingsReference,

                where(
                    "busId",
                    "==",
                    busId
                ),

                limit(100)
            );


        const snapshot =
            await getDocs(
                readingsQuery
            );


        console.log(
            "Odometer records:",
            snapshot.size
        );


        readings = [];


        snapshot.forEach(
            (documentSnapshot) => {

                readings.push({

                    id:
                        documentSnapshot.id,

                    ...documentSnapshot.data()

                });

            }
        );


        /*
         * Sort newest date first.
         */

        readings.sort(
            sortRecordsByDate
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

                const card =
                    createReadingCard(
                        record
                    );

                readingsList.appendChild(
                    card
                );

            }
        );


    } catch (error) {

        console.error(
            "ODOMETER HISTORY ERROR:",
            error
        );


        readingsEmpty.classList.remove(
            "hidden"
        );


        const text =
            readingsEmpty.querySelector(
                "span"
            );


        if (text) {

            text.textContent =
                "Unable to load odometer history.";

        }

    }

}


/* =========================================================
   CREATE ODOMETER CARD
========================================================= */

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
        getNumber(
            data.morningReading
        );


    const evening =
        getNumber(
            data.eveningReading
        );


    let distance =
        getNumber(
            data.distance
        );


    /*
     * If distance wasn't saved,
     * calculate it automatically.
     */

    if (
        distance === null &&
        morning !== null &&
        evening !== null &&
        evening >= morning
    ) {

        distance =
            evening -
            morning;

    }


    const date =
        formatDate(
            data.date
        );


    card.innerHTML = `

        <div class="record-header">

            <div class="date-info">

                <span>
                    DATE
                </span>

                <strong>
                    ${escapeHtml(date)}
                </strong>

            </div>


            <div class="distance">

                <span>
                    DISTANCE
                </span>

                <strong>
                    ${
                        distance !== null
                            ? formatNumber(
                                distance
                            ) + " KM"
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
                            ? formatNumber(
                                morning
                            )
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
                            ? formatNumber(
                                evening
                            )
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


/* =========================================================
   LOAD DIESEL HISTORY
========================================================= */

async function loadDiesel() {

    console.log(
        "Loading diesel history..."
    );


    dieselList.innerHTML =
        "";


    try {

        /*
         * IMPORTANT:
         *
         * Only where(busId) is used.
         *
         * NO orderBy()
         *
         * Therefore no composite index is required.
         */

        const dieselReference =
            collection(
                db,
                "dieselRecords"
            );


        const dieselQuery =
            query(
                dieselReference,

                where(
                    "busId",
                    "==",
                    busId
                ),

                limit(100)
            );


        const snapshot =
            await getDocs(
                dieselQuery
            );


        console.log(
            "Diesel records:",
            snapshot.size
        );


        dieselRecords = [];


        snapshot.forEach(
            (documentSnapshot) => {

                dieselRecords.push({

                    id:
                        documentSnapshot.id,

                    ...documentSnapshot.data()

                });

            }
        );


        /*
         * Sort newest first.
         */

        dieselRecords.sort(
            sortRecordsByCreatedAt
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

                const card =
                    createDieselCard(
                        record
                    );

                dieselList.appendChild(
                    card
                );

            }
        );


    } catch (error) {

        console.error(
            "DIESEL HISTORY ERROR:",
            error
        );


        dieselEmpty.classList.remove(
            "hidden"
        );


        const text =
            dieselEmpty.querySelector(
                "span"
            );


        if (text) {

            text.textContent =
                "Unable to load diesel history.";

        }

    }

}


/* =========================================================
   CREATE DIESEL CARD
========================================================= */

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
        getNumber(
            data.litres
        ) || 0;


    const amount =
        getNumber(
            data.amount
        ) || 0;


    let price =
        getNumber(
            data.pricePerLitre
        );


    /*
     * Calculate price if it wasn't saved.
     */

    if (
        price === null &&
        litres > 0
    ) {

        price =
            amount /
            litres;

    }


    const odometer =
        getNumber(
            data.odometer
        );


    const date =
        formatDate(
            data.date
        );


    card.innerHTML = `

        <div class="diesel-title">


            <div class="diesel-icon">
                ⛽
            </div>


            <div>

                <span>
                    ${escapeHtml(date)}
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
                    ₹ ${formatNumber(
                        amount
                    )}
                </strong>

            </div>


            <div class="diesel-value">

                <span>
                    PRICE / LITRE
                </span>

                <strong>
                    ${
                        price !== null
                            ? "₹ " +
                              price.toFixed(2)
                            : "--"
                    }
                </strong>

            </div>


            <div class="diesel-value">

                <span>
                    ODOMETER
                </span>

                <strong>
                    ${
                        odometer !== null
                            ? formatNumber(
                                odometer
                            )
                            : "--"
                    }
                </strong>

                <small>
                    ${
                        odometer !== null
                            ? "KM"
                            : ""
                    }
                </small>

            </div>


        </div>


        ${
            data.fuelStation
                ? `

                    <div class="station">

                        📍 ${escapeHtml(
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


/* =========================================================
   CALCULATE BUS OVERVIEW
========================================================= */

function calculateOverview() {

    let totalDistanceValue =
        0;


    let totalDieselValue =
        0;


    let totalFuelCostValue =
        0;


    let latestOdometerValue =
        null;


    /* -----------------------------------------------------
       ODOMETER
    ----------------------------------------------------- */

    readings.forEach(
        (record) => {

            const morning =
                getNumber(
                    record.morningReading
                );


            const evening =
                getNumber(
                    record.eveningReading
                );


            let distance =
                getNumber(
                    record.distance
                );


            /*
             * Calculate distance if necessary.
             */

            if (
                distance === null &&
                morning !== null &&
                evening !== null &&
                evening >= morning
            ) {

                distance =
                    evening -
                    morning;

            }


            if (
                distance !== null &&
                distance > 0
            ) {

                totalDistanceValue +=
                    distance;

            }


            /*
             * Find latest/highest odometer.
             */

            if (
                morning !== null &&
                morning > 0
            ) {

                if (
                    latestOdometerValue === null ||
                    morning >
                    latestOdometerValue
                ) {

                    latestOdometerValue =
                        morning;

                }

            }


            if (
                evening !== null &&
                evening > 0
            ) {

                if (
                    latestOdometerValue === null ||
                    evening >
                    latestOdometerValue
                ) {

                    latestOdometerValue =
                        evening;

                }

            }

        }
    );


    /* -----------------------------------------------------
       DIESEL
    ----------------------------------------------------- */

    dieselRecords.forEach(
        (record) => {

            const litres =
                getNumber(
                    record.litres
                );


            const amount =
                getNumber(
                    record.amount
                );


            const odometer =
                getNumber(
                    record.odometer
                );


            if (
                litres !== null &&
                litres > 0
            ) {

                totalDieselValue +=
                    litres;

            }


            if (
                amount !== null &&
                amount > 0
            ) {

                totalFuelCostValue +=
                    amount;

            }


            /*
             * Diesel odometer can also tell
             * us the latest meter reading.
             */

            if (
                odometer !== null &&
                odometer > 0
            ) {

                if (
                    latestOdometerValue === null ||
                    odometer >
                    latestOdometerValue
                ) {

                    latestOdometerValue =
                        odometer;

                }

            }

        }
    );


    /* -----------------------------------------------------
       BUS CURRENT ODOMETER
    ----------------------------------------------------- */

    const busOdometer =
        getNumber(
            busData?.currentOdometer
        );


    if (
        busOdometer !== null &&
        busOdometer > 0
    ) {

        if (
            latestOdometerValue === null ||
            busOdometer >
            latestOdometerValue
        ) {

            latestOdometerValue =
                busOdometer;

        }

    }


    /* -----------------------------------------------------
       DISPLAY CURRENT ODOMETER
    ----------------------------------------------------- */

    currentOdometer.textContent =
        latestOdometerValue !== null
            ? formatNumber(
                latestOdometerValue
            )
            : "--";


    /* -----------------------------------------------------
       TOTAL DISTANCE
    ----------------------------------------------------- */

    totalDistance.textContent =
        totalDistanceValue > 0
            ? formatNumber(
                totalDistanceValue
            )
            : "--";


    /* -----------------------------------------------------
       TOTAL DIESEL
    ----------------------------------------------------- */

    totalDiesel.textContent =
        totalDieselValue > 0
            ? totalDieselValue.toFixed(2)
            : "--";


    /* -----------------------------------------------------
       TOTAL FUEL COST
    ----------------------------------------------------- */

    totalFuelCost.textContent =
        totalFuelCostValue > 0
            ? `₹ ${formatNumber(
                totalFuelCostValue
            )}`
            : "₹ --";


    /* -----------------------------------------------------
       AVERAGE MILEAGE
    ----------------------------------------------------- */

    if (
        totalDistanceValue > 0 &&
        totalDieselValue > 0
    ) {

        averageMileage.textContent =
            (
                totalDistanceValue /
                totalDieselValue
            ).toFixed(2);

    } else {

        averageMileage.textContent =
            "--";

    }


    /* -----------------------------------------------------
       FUEL COST PER KM
    ----------------------------------------------------- */

    if (
        totalDistanceValue > 0 &&
        totalFuelCostValue > 0
    ) {

        fuelCostPerKm.textContent =
            `₹ ${
                (
                    totalFuelCostValue /
                    totalDistanceValue
                ).toFixed(2)
            }`;

    } else {

        fuelCostPerKm.textContent =
            "₹ --";

    }

}


/* =========================================================
   SORT READINGS
========================================================= */

function sortRecordsByDate(
    a,
    b
) {

    const dateA =
        getDateValue(
            a.date
        );


    const dateB =
        getDateValue(
            b.date
        );


    return dateB - dateA;

}


/* =========================================================
   SORT DIESEL
========================================================= */

function sortRecordsByCreatedAt(
    a,
    b
) {

    const timeA =
        getTimestampValue(
            a.createdAt
        );


    const timeB =
        getTimestampValue(
            b.createdAt
        );


    /*
     * If createdAt isn't available,
     * fall back to date.
     */

    if (
        timeA === 0 &&
        timeB === 0
    ) {

        return sortRecordsByDate(
            a,
            b
        );

    }


    return timeB - timeA;

}


/* =========================================================
   DATE VALUE
========================================================= */

function getDateValue(
    value
) {

    if (!value) {

        return 0;

    }


    if (
        value?.toDate
    ) {

        return value
            .toDate()
            .getTime();

    }


    if (
        typeof value === "string"
    ) {

        const parts =
            value.split("-");


        if (
            parts.length === 3
        ) {

            return new Date(
                Number(parts[0]),
                Number(parts[1]) - 1,
                Number(parts[2])
            ).getTime();

        }


        const parsed =
            new Date(
                value
            ).getTime();


        return isNaN(parsed)
            ? 0
            : parsed;

    }


    return 0;

}


/* =========================================================
   TIMESTAMP VALUE
========================================================= */

function getTimestampValue(
    value
) {

    if (!value) {

        return 0;

    }


    if (
        typeof value.toMillis ===
        "function"
    ) {

        return value.toMillis();

    }


    if (
        typeof value.toDate ===
        "function"
    ) {

        return value
            .toDate()
            .getTime();

    }


    if (
        value instanceof Date
    ) {

        return value.getTime();

    }


    return 0;

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
    value
) {

    if (!value) {

        return "--";

    }


    if (
        value?.toDate
    ) {

        return value
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


    if (
        typeof value === "string"
    ) {

        const parts =
            value.split("-");


        if (
            parts.length === 3
        ) {

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

    }


    return String(
        value
    );

}


/* =========================================================
   GET NUMBER
========================================================= */

function getNumber(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;

    }


    const number =
        Number(
            value
        );


    if (
        Number.isNaN(
            number
        )
    ) {

        return null;

    }


    return number;

}


/* =========================================================
   FORMAT NUMBER
========================================================= */

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


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
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


/* =========================================================
   ESCAPE ATTRIBUTE
========================================================= */

function escapeAttribute(
    value
) {

    return escapeHtml(
        value
    );

}


/* =========================================================
   HIDE LOADING
========================================================= */

function hideLoading() {

    if (loading) {

        loading.classList.add(
            "hidden"
        );

    }

}


/* =========================================================
   SHOW ERROR
========================================================= */

function showError(
    message
) {

    console.error(
        "PAGE ERROR:",
        message
    );


    if (!loading) {

        return;

    }


    loading.innerHTML = `

        <div
            style="
                text-align:center;
                padding:25px;
            "
        >

            <div
                style="
                    font-size:35px;
                    margin-bottom:12px;
                "
            >
                ⚠️
            </div>


            <strong
                style="
                    display:block;
                    font-size:14px;
                    margin-bottom:8px;
                "
            >
                Unable to load bus
            </strong>


            <span
                style="
                    display:block;
                    color:#777;
                    font-size:9px;
                    line-height:1.6;
                    word-break:break-word;
                "
            >
                ${escapeHtml(
                    message
                )}
            </span>


            <button
                id="errorBackButton"
                type="button"
                style="
                    margin-top:16px;
                    padding:11px 20px;
                    border:none;
                    border-radius:10px;
                    background:#ffc400;
                    color:#111;
                    font-size:9px;
                    font-weight:900;
                    cursor:pointer;
                "
            >
                BACK TO BUSES
            </button>

        </div>

    `;


    const errorBackButton =
        document.getElementById(
            "errorBackButton"
        );


    if (errorBackButton) {

        errorBackButton.addEventListener(
            "click",
            () => {

                window.location.href =
                    "../buses/";

            }
        );

    }

}
const averageButton =
    document.getElementById("averageButton");

averageButton.addEventListener("click", () => {

    window.location.href =
        `../avg/?id=${encodeURIComponent(busId)}`;

});
