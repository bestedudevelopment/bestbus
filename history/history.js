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

const loadingContent =
    document.getElementById(
        "loadingContent"
    );


/* =========================================
   STATE
========================================= */

let currentUser =
    null;

let currentDriver =
    null;

let currentBus =
    null;


/* =========================================
   BACK
========================================= */

backButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../driver/";

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


        currentUser =
            user;


        try {

            await loadDriver();

            await loadReadings();

            await loadDiesel();

            loadingContent.classList.add(
                "hidden"
            );

        } catch (error) {

            console.error(
                "HISTORY ERROR:",
                error
            );


            loadingContent.innerHTML = `
                <strong>
                    Unable to load history
                </strong>

                <span>
                    ${escapeHTML(
                        error.message ||
                        "Please try again."
                    )}
                </span>
            `;

        }

    }
);


/* =========================================
   LOAD DRIVER
========================================= */

async function loadDriver() {

    const driverReference =
        doc(
            db,
            "users",
            currentUser.uid
        );


    const snapshot =
        await getDoc(
            driverReference
        );


    if (
        !snapshot.exists()
    ) {

        throw new Error(
            "Driver account not found."
        );

    }


    const driver =
        snapshot.data();


    if (
        driver.role !==
        "driver"
    ) {

        throw new Error(
            "This account is not a driver account."
        );

    }


    if (
        !driver.assignedBusId
    ) {

        throw new Error(
            "No bus is assigned to this driver."
        );

    }


    currentDriver = {

        id:
            currentUser.uid,

        ...driver

    };


    const busReference =
        doc(
            db,
            "buses",
            driver.assignedBusId
        );


    const busSnapshot =
        await getDoc(
            busReference
        );


    if (
        !busSnapshot.exists()
    ) {

        throw new Error(
            "Assigned bus not found."
        );

    }


    currentBus = {

        id:
            busSnapshot.id,

        ...busSnapshot.data()

    };


    busNumber.textContent =
        currentBus.busNumber ||
        "BUS";


    registrationNumber.textContent =
        currentBus.registrationNumber ||
        currentBus.registrationNo ||
        "";

}


/* =========================================
   READINGS
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
                "driverId",
                "==",
                currentUser.uid
            ),
            where(
                "busId",
                "==",
                currentBus.id
            ),
            orderBy(
                "date",
                "desc"
            ),
            limit(50)
        );


    const snapshot =
        await getDocs(
            readingsQuery
        );


    if (
        snapshot.empty
    ) {

        readingsEmpty.classList.remove(
            "hidden"
        );

        return;

    }


    readingsEmpty.classList.add(
        "hidden"
    );


    snapshot.forEach(
        (documentSnapshot) => {

            const data =
                documentSnapshot.data();


            readingsList.appendChild(
                createReadingCard(
                    data
                )
            );

        }
    );

}


/* =========================================
   CREATE READING CARD
========================================= */

function createReadingCard(
    data
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "history-card";


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
     * Calculate if Firestore distance
     * wasn't stored for some reason.
     */

    if (
        distance === undefined &&
        morning !== null &&
        evening !== null
    ) {

        distance =
            evening -
            morning;

    }


    const date =
        formatDate(
            data.date
        );


    const distanceText =
        distance !== undefined
            ? `${distance} KM`
            : "--";


    card.innerHTML = `

        <div class="card-header">

            <div class="date-box">

                <span>
                    DATE
                </span>

                <strong>
                    ${escapeHTML(date)}
                </strong>

            </div>

            <div class="distance-badge">

                <span>
                    DISTANCE
                </span>

                <strong>
                    ${escapeHTML(distanceText)}
                </strong>

            </div>

        </div>


        <div class="reading-row">

            <div class="reading-box">

                <span>
                    🌅 MORNING
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


            <div class="reading-box">

                <span>
                    🌆 EVENING
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

    `;


    return card;

}


/* =========================================
   DIESEL
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
                "driverId",
                "==",
                currentUser.uid
            ),
            where(
                "busId",
                "==",
                currentBus.id
            ),
            orderBy(
                "createdAt",
                "desc"
            ),
            limit(50)
        );


    const snapshot =
        await getDocs(
            dieselQuery
        );


    if (
        snapshot.empty
    ) {

        dieselEmpty.classList.remove(
            "hidden"
        );

        return;

    }


    dieselEmpty.classList.add(
        "hidden"
    );


    snapshot.forEach(
        (documentSnapshot) => {

            const data =
                documentSnapshot.data();


            dieselList.appendChild(
                createDieselCard(
                    data
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

        <div class="diesel-header">

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
                    LITRES
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
                    <div class="fuel-station">
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
