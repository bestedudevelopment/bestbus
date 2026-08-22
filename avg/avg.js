import {
    doc,
    getDoc,
    collection,
    query,
    where,
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

const loadingScreen =
    document.getElementById(
        "loadingScreen"
    );

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

const currentOdometer =
    document.getElementById(
        "currentOdometer"
    );

const expectedAverage =
    document.getElementById(
        "expectedAverage"
    );

const latestAverage =
    document.getElementById(
        "latestAverage"
    );

const overallStatus =
    document.getElementById(
        "overallStatus"
    );

const overallStatusCard =
    document.getElementById(
        "overallStatusCard"
    );

const averageTable =
    document.getElementById(
        "averageTable"
    );

const redFlag =
    document.getElementById(
        "redFlag"
    );

const redFlagText =
    document.getElementById(
        "redFlagText"
    );

const errorMessage =
    document.getElementById(
        "errorMessage"
    );


/* =========================================
   STATE
========================================= */

let currentUser = null;

let currentBus = null;

let dieselRecords = [];

let expectedAverageValue = 5;


/* =========================================
   GET BUS ID
========================================= */

const urlParams =
    new URLSearchParams(
        window.location.search
    );


const busId =
    urlParams.get(
        "id"
    );


/* =========================================
   CHECK BUS ID
========================================= */

if (
    !busId
) {

    showError(
        "No bus was selected."
    );

    hideLoading();

}


/* =========================================
   BACK
========================================= */

backButton.addEventListener(
    "click",
    () => {

        window.history.back();

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


        if (
            !busId
        ) {

            return;

        }


        try {

            /*
             * First check whether
             * this user can view the bus.
             */

            await checkAccess();

            await loadBus();

            await loadDieselRecords();

            calculateAndRender();

            hideLoading();

        } catch (error) {

            console.error(
                "AVERAGE PAGE ERROR:",
                error
            );


            showError(
                error.message ||
                "Unable to load fuel average."
            );


            hideLoading();

        }

    }
);


/* =========================================
   ACCESS CONTROL
========================================= */

async function checkAccess() {

    const userReference =
        doc(
            db,
            "users",
            currentUser.uid
        );


    const userSnapshot =
        await getDoc(
            userReference
        );


    if (
        !userSnapshot.exists()
    ) {

        throw new Error(
            "User account not found."
        );

    }


    const userData =
        userSnapshot.data();


    /*
     * ADMIN CAN VIEW ANY BUS
     */

    if (
        userData.role ===
        "admin"
    ) {

        return;

    }


    /*
     * DRIVER CAN VIEW ONLY
     * THEIR ASSIGNED BUS
     */

    if (
        userData.role ===
        "driver"
    ) {

        if (
            userData.assignedBusId !==
            busId
        ) {

            throw new Error(
                "You can only view the average of your assigned bus."
            );

        }


        return;

    }


    throw new Error(
        "You do not have permission to view this page."
    );

}


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


    const busSnapshot =
        await getDoc(
            busReference
        );


    if (
        !busSnapshot.exists()
    ) {

        throw new Error(
            "Bus not found."
        );

    }


    currentBus = {

        id:
            busSnapshot.id,

        ...busSnapshot.data()

    };


    busNumber.textContent =
        currentBus.busNumber ||
        currentBus.number ||
        "BUS";


    registrationNumber.textContent =
        currentBus.registrationNumber ||
        currentBus.registrationNo ||
        "";


    /*
     * Current odometer
     */

    const busOdometer =
        Number(
            currentBus.currentOdometer
        );


    if (
        Number.isFinite(
            busOdometer
        )
    ) {

        currentOdometer.textContent =
            formatNumber(
                busOdometer
            );

    }


    /*
     * Expected average
     *
     * If the bus has an expectedAverage
     * field, use it.
     *
     * Otherwise testing default = 5.
     */

    const configuredAverage =
        Number(
            currentBus.expectedAverage
        );


    if (
        Number.isFinite(
            configuredAverage
        ) &&
        configuredAverage > 0
    ) {

        expectedAverageValue =
            configuredAverage;

    } else {

        expectedAverageValue =
            5;

    }


    expectedAverage.textContent =
        expectedAverageValue.toFixed(
            2
        );

}


/* =========================================
   LOAD DIESEL RECORDS
========================================= */

async function loadDieselRecords() {

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
            )
        );


    const snapshot =
        await getDocs(
            dieselQuery
        );


    dieselRecords = [];


    snapshot.forEach(
        (documentSnapshot) => {

            const data =
                documentSnapshot.data();


            dieselRecords.push({

                id:
                    documentSnapshot.id,

                ...data

            });

        }
    );


    /*
     * Sort by odometer.
     *
     * This is safer than depending
     * on Firestore timestamp order.
     */

    dieselRecords.sort(
        (a, b) => {

            const aOdo =
                Number(
                    a.odometer
                ) || 0;


            const bOdo =
                Number(
                    b.odometer
                ) || 0;


            return (
                aOdo -
                bOdo
            );

        }
    );

}


/* =========================================
   CALCULATE
========================================= */

function calculateAndRender() {

    if (
        !dieselRecords.length
    ) {

        renderEmpty();

        latestAverage.textContent =
            "—";

        overallStatus.textContent =
            "NO DATA";

        overallStatus.className =
            "";

        redFlag.classList.add(
            "hidden"
        );

        return;

    }


    const rows = [];


    let latestCalculatedAverage =
        null;


    let latestStatus =
        "NORMAL";


    /*
     * First diesel record is the
     * starting point.
     */

    dieselRecords.forEach(
        (record, index) => {

            const current =
                Number(
                    record.odometer
                );


            const litres =
                Number(
                    record.litres
                );


            /*
             * First entry
             */

            if (
                index === 0
            ) {

                rows.push({

                    index:
                        index + 1,

                    date:
                        record.date,

                    previous:
                        null,

                    current:
                        current,

                    km:
                        null,

                    litres:
                        litres,

                    average:
                        null,

                    status:
                        "START"

                });


                return;

            }


            const previous =
                Number(
                    dieselRecords[
                        index - 1
                    ].odometer
                );


            const km =
                current -
                previous;


            let average =
                null;


            if (
                litres > 0
            ) {

                average =
                    km /
                    litres;

            }


            let status =
                "NORMAL";


            /*
             * Red flag rule:
             *
             * Difference of 1 KM/L
             * or more.
             */

            if (
                average !== null
            ) {

                const difference =
                    Math.abs(
                        average -
                        expectedAverageValue
                    );


                if (
                    difference >= 1
                ) {

                    status =
                        "RED";

                }

            }


            rows.push({

                index:
                    index + 1,

                date:
                    record.date,

                previous:
                    previous,

                current:
                    current,

                km:
                    km,

                litres:
                    litres,

                average:
                    average,

                status:
                    status

            });


            latestCalculatedAverage =
                average;


            latestStatus =
                status;

        }
    );


    /*
     * Latest average
     */

    if (
        latestCalculatedAverage !==
        null
    ) {

        latestAverage.textContent =
            latestCalculatedAverage.toFixed(
                2
            );

    } else {

        latestAverage.textContent =
            "—";

    }


    /*
     * Overall status
     */

    if (
        latestStatus ===
        "RED"
    ) {

        overallStatus.textContent =
            "RED FLAG";

        overallStatus.className =
            "status-danger";

        overallStatusCard.classList.add(
            "main-average"
        );


        redFlag.classList.remove(
            "hidden"
        );


        redFlagText.textContent =
            `Latest average is ${latestCalculatedAverage.toFixed(2)} KM/L. Expected average is ${expectedAverageValue.toFixed(2)} KM/L. Difference is ${Math.abs(latestCalculatedAverage - expectedAverageValue).toFixed(2)} KM/L.`;

    } else {

        overallStatus.textContent =
            "NORMAL";

        overallStatus.className =
            "status-normal";


        redFlag.classList.add(
            "hidden"
        );

    }


    renderRows(
        rows
    );

}


/* =========================================
   RENDER TABLE
========================================= */

function renderRows(
    rows
) {

    averageTable.innerHTML =
        "";


    rows.forEach(
        (row) => {

            const tr =
                document.createElement(
                    "tr"
                );


            if (
                row.status ===
                "START"
            ) {

                tr.className =
                    "start-row";

            }


            let statusHTML =
                "";


            if (
                row.status ===
                "START"
            ) {

                statusHTML = `
                    <span class="start-badge">
                        START
                    </span>
                `;

            } else if (
                row.status ===
                "RED"
            ) {

                statusHTML = `
                    <span class="danger-badge">
                        🔴 RED FLAG
                    </span>
                `;

            } else {

                statusHTML = `
                    <span class="normal-badge">
                        🟢 NORMAL
                    </span>
                `;

            }


            tr.innerHTML = `

                <td>
                    ${row.index}
                </td>

                <td>
                    ${escapeHTML(
                        formatDate(
                            row.date
                        )
                    )}
                </td>

                <td>
                    ${
                        row.previous === null
                        ? "—"
                        : formatNumber(
                            row.previous
                        )
                    }
                </td>

                <td>
                    ${formatNumber(
                        row.current
                    )}
                </td>

                <td>
                    ${
                        row.km === null
                        ? "—"
                        : formatNumber(
                            row.km
                        )
                    }
                </td>

                <td>
                    ${formatNumber(
                        row.litres
                    )} L
                </td>

                <td>
                    ${
                        row.average === null
                        ? "—"
                        : row.average.toFixed(2)
                    }
                </td>

                <td>
                    ${statusHTML}
                </td>

            `;


            averageTable.appendChild(
                tr
            );

        }
    );

}


/* =========================================
   EMPTY
========================================= */

function renderEmpty() {

    averageTable.innerHTML = `

        <tr>

            <td
                colspan="8"
                class="table-loading"
            >

                No diesel records found
                for this bus.

            </td>

        </tr>

    `;

}


/* =========================================
   FORMAT NUMBER
========================================= */

function formatNumber(
    value
) {

    return Number(
        value || 0
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
    date
) {

    if (
        !date
    ) {

        return "—";

    }


    const parts =
        String(
            date
        ).split("-");


    if (
        parts.length !== 3
    ) {

        return date;

    }


    return `${parts[2]}/${parts[1]}/${parts[0]}`;

}


/* =========================================
   ESCAPE HTML
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


/* =========================================
   ERROR
========================================= */

function showError(
    text
) {

    errorMessage.textContent =
        text;


    errorMessage.classList.remove(
        "hidden"
    );

}


/* =========================================
   HIDE LOADING
========================================= */

function hideLoading() {

    loadingScreen.classList.add(
        "hidden"
    );

}
