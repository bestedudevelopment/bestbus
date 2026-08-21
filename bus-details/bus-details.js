import {
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth,
    db
} from "../core/firebase.js";


/* =====================================================
   ELEMENTS
===================================================== */

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


/* =====================================================
   GET BUS ID FROM URL
===================================================== */

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const busId =
    urlParams.get("id");


console.log(
    "BUS DETAILS - BUS ID:",
    busId
);


if (!busId) {

    showError(
        "No bus ID found in the URL."
    );

}


/* =====================================================
   STATE
===================================================== */

let busData = null;

let readings = [];

let dieselRecords = [];


/* =====================================================
   BACK BUTTON
===================================================== */

backButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../buses/";

    }
);


/* =====================================================
   TABS
===================================================== */

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


        if (!busId) {

            return;

        }


        try {

            console.log(
                "Loading bus:",
                busId
            );


            await loadBus();


            await loadDriver();


            await loadReadings();


            await loadDiesel();


            calculateOverview();


            loading.classList.add(
                "hidden"
            );


            console.log(
                "Bus details loaded successfully."
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


/* =====================================================
   LOAD BUS
===================================================== */

async function loadBus() {

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


    console.log(
        "BUS EXISTS:",
        busSnapshot.exists()
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

    busNumber.textContent =
        busData.busNumber ||
        "BUS";


    /* REGISTRATION */

    registrationNumber.textContent =
        busData.registrationNumber ||
        busData.registrationNo ||
        "Registration not available";


    /* STATUS */

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


/* =====================================================
   LOAD DRIVER
===================================================== */

async function loadDriver() {

    /*
     * IMPORTANT:
     *
     * Your buses.js uses:
     *
     * bus.driverId
     *
     * Therefore we use driverId here.
     */

    const driverId =
        busData?.driverId;


    console.log(
        "ASSIGNED DRIVER ID:",
        driverId
    );


    if (!driverId) {

        driverName.textContent =
            "No Driver Assigned";

        driverPhone.textContent =
            "This bus is currently available";

        return;

    }


    try {

        const driverRef =
            doc(
                db,
                "users",
                driverId
            );


        const driverSnapshot =
            await getDoc(
                driverRef
            );


        console.log(
            "DRIVER EXISTS:",
            driverSnapshot.exists()
        );


        if (
            !driverSnapshot.exists()
        ) {

            driverName.textContent =
                "Driver Not Found";

            driverPhone.textContent =
                "Driver account may have been deleted";

            return;

        }


        const driver =
            driverSnapshot.data();


        console.log(
            "DRIVER DATA:",
            driver
        );


        driverName.textContent =
            driver.name ||
            driver.displayName ||
            "Driver";


        driverPhone.textContent =
            driver.phone ||
            driver.email ||
            "Contact not available";


    } catch (error) {

        console.error(
            "DRIVER LOAD ERROR:",
            error
        );


        driverName.textContent =
            "Unable to load driver";

        driverPhone.textContent =
            "";

    }

}


/* =====================================================
   LOAD ODOMETER READINGS
===================================================== */

async function loadReadings() {

    readingsList.innerHTML =
        "";


    console.log(
        "Loading readings for bus:",
        busId
    );


    try {

        /*
         * We ONLY use busId.
         *
         * Therefore readings remain connected
         * to the bus even when the driver changes.
         */

        const readingsRef =
            collection(
                db,
                "driverReadings"
            );


        const readingsQuery =
            query(
                readingsRef,

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
            "READINGS FOUND:",
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
         * Sort locally.
         *
         * This avoids Firestore composite-index
         * problems caused by orderBy().
         */

        readings.sort(
            (a, b) => {

                return String(
                    b.date || ""
                ).localeCompare(
                    String(
                        a.date || ""
                    )
                );

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


    } catch (error) {

        console.error(
            "READINGS ERROR:",
            error
        );


        readingsEmpty.classList.remove(
            "hidden"
        );


        readingsEmpty.querySelector(
            "span"
        ).textContent =
            "Unable to load odometer records.";

    }

}


/* =====================================================
   CREATE READING CARD
===================================================== */

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


    /*
     * If distance wasn't saved,
     * calculate it automatically.
     */

    if (
        distance === undefined &&
        morning !== null &&
        evening !== null &&
        evening >= morning
    ) {

        distance =
            evening -
            morning;

    }


    const distanceText =
        distance !== undefined
            ? `${formatNumber(distance)} KM`
            : "--";


    card.innerHTML = `

        <div class="record-header">

            <div class="date-info">

                <span>
                    DATE
                </span>

                <strong>
                    ${escapeHtml(
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
                    ${distanceText}
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


/* =====================================================
   LOAD DIESEL
===================================================== */

async function loadDiesel() {

    dieselList.innerHTML =
        "";


    console.log(
        "Loading diesel for bus:",
        busId
    );


    try {

        const dieselRef =
            collection(
                db,
                "dieselRecords"
            );


        /*
         * Again we ONLY use busId.
         */

        const dieselQuery =
            query(
                dieselRef,

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
            "DIESEL RECORDS FOUND:",
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
         * Newest first.
         *
         * createdAt is a Firestore Timestamp.
         */

        dieselRecords.sort(
            (a, b) => {

                const timeA =
                    a.createdAt?.toMillis
                        ? a.createdAt.toMillis()
                        : 0;


                const timeB =
                    b.createdAt?.toMillis
                        ? b.createdAt.toMillis()
                        : 0;


                return timeB - timeA;

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


    } catch (error) {

        console.error(
            "DIESEL ERROR:",
            error
        );


        dieselEmpty.classList.remove(
            "hidden"
        );


        dieselEmpty.querySelector(
            "span"
        ).textContent =
            "Unable to load diesel records.";

    }

}


/* =====================================================
   CREATE DIESEL CARD
===================================================== */

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


    let price =
        Number(
            data.pricePerLitre || 0
        );


    if (
        !price &&
        litres > 0
    ) {

        price =
            amount /
            litres;

    }


    const odometer =
        data.odometer !== undefined
            ? Number(
                data.odometer
            )
            : null;


    card.innerHTML = `

        <div class="diesel-title">

            <div class="diesel-icon">
                ⛽
            </div>

            <div>

                <span>
                    ${escapeHtml(
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
                    ₹ ${price.toFixed(2)}
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


/* =====================================================
   CALCULATE OVERVIEW
===================================================== */

function calculateOverview() {

    let totalDistanceValue =
        0;


    let totalDieselValue =
        0;


    let totalFuelCostValue =
        0;


    let latestOdometerValue =
        null;


    /*
     * READINGS
     */

    readings.forEach(
        (record) => {

            const morning =
                Number(
                    record.morningReading
                );


            const evening =
                Number(
                    record.eveningReading
                );


            let distance =
                Number(
                    record.distance
                );


            /*
             * If distance wasn't stored,
             * calculate from readings.
             */

            if (
                !distance &&
                !isNaN(morning) &&
                !isNaN(evening) &&
                evening >= morning
            ) {

                distance =
                    evening -
                    morning;

            }


            if (
                !isNaN(distance) &&
                distance > 0
            ) {

                totalDistanceValue +=
                    distance;

            }


            /*
             * Current/latest odometer
             */

            if (
                !isNaN(evening) &&
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


            if (
                !isNaN(morning) &&
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

        }
    );


    /*
     * DIESEL
     */

    dieselRecords.forEach(
        (record) => {

            totalDieselValue +=
                Number(
                    record.litres || 0
                );


            totalFuelCostValue +=
                Number(
                    record.amount || 0
                );


            /*
             * Diesel odometer can also help
             * determine current odometer.
             */

            const dieselOdometer =
                Number(
                    record.odometer
                );


            if (
                !isNaN(dieselOdometer) &&
                dieselOdometer > 0
            ) {

                if (
                    latestOdometerValue === null ||
                    dieselOdometer >
                    latestOdometerValue
                ) {

                    latestOdometerValue =
                        dieselOdometer;

                }

            }

        }
    );


    /*
     * If bus document itself has
     * currentOdometer, use it if
     * it is higher.
     */

    const busOdometer =
        Number(
            busData?.currentOdometer
        );


    if (
        !isNaN(busOdometer) &&
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


    /* =====================================
       DISPLAY
    ===================================== */

    currentOdometer.textContent =
        latestOdometerValue !== null
            ? formatNumber(
                latestOdometerValue
            )
            : "--";


    totalDistance.textContent =
        totalDistanceValue > 0
            ? formatNumber(
                totalDistanceValue
            )
            : "--";


    totalDiesel.textContent =
        totalDieselValue > 0
            ? totalDieselValue.toFixed(2)
            : "--";


    totalFuelCost.textContent =
        totalFuelCostValue > 0
            ? `₹ ${formatNumber(
                totalFuelCostValue
            )}`
            : "₹ --";


    /*
     * Average mileage
     */

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


    /*
     * Fuel cost per KM
     */

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


/* =====================================================
   DATE FORMAT
===================================================== */

function formatDate(
    value
) {

    if (!value) {

        return "--";

    }


    /*
     * YYYY-MM-DD
     */

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


    /*
     * Firestore Timestamp
     */

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


    return String(
        value
    );

}


/* =====================================================
   NUMBER
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


function escapeAttribute(
    value
) {

    return escapeHtml(
        value
    );

}


/* =====================================================
   ERROR
===================================================== */

function showError(
    message
) {

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
                    margin-bottom:7px;
                "
            >
                Unable to load bus
            </strong>

            <span
                style="
                    display:block;
                    color:#777;
                    font-size:9px;
                    line-height:1.5;
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
                    margin-top:15px;
                    padding:11px 18px;
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


    errorBackButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "../buses/";

        }
    );

}
