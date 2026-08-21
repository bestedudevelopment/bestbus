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
   SETTINGS
========================================================= */

/*
 * Expected average for the fleet.
 *
 * Change this later from one place.
 *
 * Example:
 * 5.00 = expected vehicle average
 */

const EXPECTED_AVERAGE = 5.00;


/*
 * Red flag threshold.
 *
 * If difference is 1 KM/L or more,
 * show RED FLAG.
 */

const RED_FLAG_DIFFERENCE = 1.00;


/*
 * Optional warning level.
 *
 * Less than 1 KM/L difference but
 * still noticeably lower than expected.
 */

const WARNING_DIFFERENCE = 0.50;


/* =========================================================
   ELEMENTS
========================================================= */

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


const currentAverage =
    document.getElementById(
        "currentAverage"
    );


const currentStatus =
    document.getElementById(
        "currentStatus"
    );


const expectedAverage =
    document.getElementById(
        "expectedAverage"
    );


const expectedLabel =
    document.getElementById(
        "expectedLabel"
    );


const averageDifference =
    document.getElementById(
        "averageDifference"
    );


const totalDistance =
    document.getElementById(
        "totalDistance"
    );


const totalDiesel =
    document.getElementById(
        "totalDiesel"
    );


const overallAverage =
    document.getElementById(
        "overallAverage"
    );


const redFlags =
    document.getElementById(
        "redFlags"
    );


const historyTable =
    document.getElementById(
        "historyTable"
    );


const mobileHistory =
    document.getElementById(
        "mobileHistory"
    );


const emptyState =
    document.getElementById(
        "emptyState"
    );


const loading =
    document.getElementById(
        "loading"
    );


/* =========================================================
   GET BUS ID
========================================================= */

const params =
    new URLSearchParams(
        window.location.search
    );


const busId =
    params.get("id");


console.log(
    "AVERAGE PAGE BUS ID:",
    busId
);


/* =========================================================
   DATA
========================================================= */

let busData = null;

let dieselRecords = [];

let efficiencyRecords = [];


/* =========================================================
   BACK BUTTON
========================================================= */

backButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../bus-details/?id=" +
            encodeURIComponent(
                busId
            );

    }
);


/* =========================================================
   AUTH
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
                "No bus ID was provided."
            );

            return;

        }


        try {

            await loadBus();

            await loadDieselRecords();

            calculateEfficiency();

            renderHistory();

            hideLoading();

        } catch (error) {

            console.error(
                "AVERAGE PAGE ERROR:",
                error
            );

            showError(
                error.message ||
                "Unable to load fuel efficiency."
            );

        }

    }
);


/* =========================================================
   LOAD BUS
========================================================= */

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
            "Bus was not found."
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
        "Registration unavailable";


    expectedAverage.textContent =
        EXPECTED_AVERAGE.toFixed(2);


    expectedLabel.textContent =
        EXPECTED_AVERAGE.toFixed(2) +
        " KM/L";

}


/* =========================================================
   LOAD DIESEL RECORDS
========================================================= */

async function loadDieselRecords() {

    console.log(
        "Loading diesel records for:",
        busId
    );


    const dieselReference =
        collection(
            db,
            "dieselRecords"
        );


    /*
     * IMPORTANT:
     *
     * Only where(busId) is used.
     *
     * NO orderBy().
     *
     * Therefore Firestore composite index
     * is NOT required.
     */

    const dieselQuery =
        query(
            dieselReference,

            where(
                "busId",
                "==",
                busId
            ),

            limit(200)
        );


    const snapshot =
        await getDocs(
            dieselQuery
        );


    console.log(
        "Diesel records found:",
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
     * Sort by date / createdAt.
     *
     * Oldest first is important because
     * every entry depends on the previous
     * diesel filling.
     */

    dieselRecords.sort(
        sortOldestFirst
    );


}


/* =========================================================
   CALCULATE EFFICIENCY
========================================================= */

function calculateEfficiency() {

    efficiencyRecords = [];


    let totalDistanceValue =
        0;


    let totalDieselValue =
        0;


    let redFlagCount =
        0;


    /*
     * FIRST DIESEL ENTRY
     *
     * There is no previous odometer,
     * therefore no average.
     */

    if (
        dieselRecords.length === 0
    ) {

        showEmpty();

        return;

    }


    for (
        let i = 0;
        i < dieselRecords.length;
        i++
    ) {

        const current =
            dieselRecords[i];


        const previous =
            i > 0
                ? dieselRecords[i - 1]
                : null;


        const currentOdo =
            getNumber(
                current.odometer
            );


        const litres =
            getNumber(
                current.litres
            );


        const previousOdo =
            previous
                ? getNumber(
                    previous.odometer
                )
                : null;


        let distance =
            null;


        let average =
            null;


        /*
         * From SECOND filling onward:
         *
         * Current Odometer
         * -
         * Previous Odometer
         *
         * = Distance
         */

        if (
            previousOdo !== null &&
            currentOdo !== null &&
            currentOdo >= previousOdo
        ) {

            distance =
                currentOdo -
                previousOdo;

        }


        /*
         * Average:
         *
         * Distance / current diesel added
         */

        if (
            distance !== null &&
            litres !== null &&
            litres > 0
        ) {

            average =
                distance /
                litres;

        }


        /*
         * Status
         */

        let status =
            "FIRST";


        let statusClass =
            "green";


        let difference =
            null;


        if (
            average !== null
        ) {

            difference =
                average -
                EXPECTED_AVERAGE;


            /*
             * Absolute difference >= 1
             * = RED FLAG
             */

            if (
                Math.abs(
                    difference
                ) >=
                RED_FLAG_DIFFERENCE
            ) {

                status =
                    "RED FLAG";

                statusClass =
                    "red";

                redFlagCount++;

            }


            /*
             * Difference >= 0.5
             * but less than 1
             */

            else if (
                Math.abs(
                    difference
                ) >=
                WARNING_DIFFERENCE
            ) {

                status =
                    "CHECK";

                statusClass =
                    "warning";

            }


            else {

                status =
                    "NORMAL";

                statusClass =
                    "green";

            }

        }


        /*
         * Add to totals.
         */

        if (
            distance !== null &&
            distance > 0
        ) {

            totalDistanceValue +=
                distance;

        }


        if (
            litres !== null &&
            litres > 0
        ) {

            totalDieselValue +=
                litres;

        }


        efficiencyRecords.push({

            number:
                i + 1,

            date:
                current.date,

            previousOdometer:
                previousOdo,

            currentOdometer:
                currentOdo,

            distance:
                distance,

            litres:
                litres,

            average:
                average,

            amount:
                getNumber(
                    current.amount
                ),

            difference:
                difference,

            status:
                status,

            statusClass:
                statusClass

        });

    }


    /*
     * Current average is the LAST
     * calculated diesel-to-diesel average.
     */

    const calculatedRecords =
        efficiencyRecords.filter(
            record =>
                record.average !== null
        );


    const latest =
        calculatedRecords.length > 0
            ? calculatedRecords[
                calculatedRecords.length - 1
            ]
            : null;


    /*
     * Overall average:
     *
     * Total distance between diesel fills
     * /
     * Total diesel used in those intervals
     *
     * We don't include the first filling
     * because it has no previous interval.
     */

    let intervalDiesel =
        0;


    calculatedRecords.forEach(
        record => {

            if (
                record.litres !== null
            ) {

                intervalDiesel +=
                    record.litres;

            }

        }
    );


    let overall =
        null;


    if (
        totalDistanceValue > 0 &&
        intervalDiesel > 0
    ) {

        overall =
            totalDistanceValue /
            intervalDiesel;

    }


    /*
     * Display summary.
     */

    totalDistance.textContent =
        totalDistanceValue > 0
            ? formatNumber(
                totalDistanceValue
            )
            : "--";


    totalDiesel.textContent =
        intervalDiesel > 0
            ? intervalDiesel.toFixed(2)
            : "--";


    overallAverage.textContent =
        overall !== null
            ? overall.toFixed(2)
            : "--";


    redFlags.textContent =
        redFlagCount;


    /*
     * Current average.
     */

    if (
        latest
    ) {

        currentAverage.textContent =
            latest.average.toFixed(2);


        averageDifference.textContent =
            formatSigned(
                latest.difference
            );


        setCurrentStatus(
            latest
        );

    } else {

        currentAverage.textContent =
            "--";


        averageDifference.textContent =
            "--";


        currentStatus.textContent =
            "WAITING";


        currentStatus.className =
            "status normal";

    }

}


/* =========================================================
   RENDER HISTORY
========================================================= */

function renderHistory() {

    historyTable.innerHTML =
        "";


    mobileHistory.innerHTML =
        "";


    if (
        efficiencyRecords.length === 0
    ) {

        showEmpty();

        return;

    }


    hideEmpty();


    efficiencyRecords.forEach(
        record => {

            renderDesktopRow(
                record
            );


            renderMobileRecord(
                record
            );

        }
    );

}


/* =========================================================
   DESKTOP TABLE ROW
========================================================= */

function renderDesktopRow(
    record
) {

    const row =
        document.createElement(
            "tr"
        );


    const averageText =
        record.average !== null
            ? record.average.toFixed(2) +
              " KM/L"
            : "—";


    const distanceText =
        record.distance !== null
            ? formatNumber(
                record.distance
            ) + " KM"
            : "—";


    const dieselText =
        record.litres !== null
            ? record.litres.toFixed(2) +
              " L"
            : "—";


    const amountText =
        record.amount !== null
            ? "₹ " +
              formatNumber(
                  record.amount
              )
            : "—";


    row.innerHTML = `

        <td class="number">
            ${record.number}
        </td>


        <td>
            ${escapeHtml(
                formatDate(
                    record.date
                )
            )}
        </td>


        <td>
            ${
                record.previousOdometer !== null
                    ? formatNumber(
                        record.previousOdometer
                    )
                    : "—"
            }
        </td>


        <td>
            ${
                record.currentOdometer !== null
                    ? formatNumber(
                        record.currentOdometer
                    )
                    : "—"
            }
        </td>


        <td>
            ${distanceText}
        </td>


        <td>
            ${dieselText}
        </td>


        <td
            class="average ${
                record.statusClass === "red"
                    ? "red"
                    : record.statusClass === "green"
                        ? "green"
                        : ""
            }"
        >
            ${averageText}
        </td>


        <td>
            ${amountText}
        </td>


        <td>

            ${createStatusBadge(
                record
            )}

        </td>

    `;


    historyTable.appendChild(
        row
    );

}


/* =========================================================
   MOBILE RECORD
========================================================= */

function renderMobileRecord(
    record
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "mobile-record";


    const averageText =
        record.average !== null
            ? record.average.toFixed(2) +
              " KM/L"
            : "—";


    card.innerHTML = `

        <div class="mobile-record-header">

            <div>

                <div class="mobile-record-date">

                    ${escapeHtml(
                        formatDate(
                            record.date
                        )
                    )}

                </div>

                <div class="mobile-record-number">

                    FILLING #${record.number}

                </div>

            </div>


            ${createStatusBadge(
                record
            )}

        </div>


        <div class="mobile-record-grid">


            <div class="mobile-value">

                <span>
                    PREVIOUS ODO
                </span>

                <strong>
                    ${
                        record.previousOdometer !== null
                            ? formatNumber(
                                record.previousOdometer
                            )
                            : "—"
                    }
                </strong>

            </div>


            <div class="mobile-value">

                <span>
                    CURRENT ODO
                </span>

                <strong>
                    ${
                        record.currentOdometer !== null
                            ? formatNumber(
                                record.currentOdometer
                            )
                            : "—"
                    }
                </strong>

            </div>


            <div class="mobile-value">

                <span>
                    KM TRAVELLED
                </span>

                <strong>
                    ${
                        record.distance !== null
                            ? formatNumber(
                                record.distance
                            ) +
                              " KM"
                            : "—"
                    }
                </strong>

            </div>


            <div class="mobile-value">

                <span>
                    DIESEL
                </span>

                <strong>
                    ${
                        record.litres !== null
                            ? record.litres.toFixed(2) +
                              " L"
                            : "—"
                    }
                </strong>

            </div>


            <div class="mobile-value">

                <span>
                    AMOUNT
                </span>

                <strong>
                    ${
                        record.amount !== null
                            ? "₹ " +
                              formatNumber(
                                  record.amount
                              )
                            : "—"
                    }
                </strong>

            </div>


            <div class="mobile-value">

                <span>
                    DIFFERENCE
                </span>

                <strong>
                    ${
                        record.difference !== null
                            ? formatSigned(
                                record.difference
                              )
                            : "—"
                    }
                </strong>

            </div>


        </div>


        <div
            class="mobile-average ${
                record.statusClass
            }"
        >

            AVERAGE

            <strong>
                ${averageText}
            </strong>

        </div>

    `;


    mobileHistory.appendChild(
        card
    );

}


/* =========================================================
   STATUS BADGE
========================================================= */

function createStatusBadge(
    record
) {

    if (
        record.status === "FIRST"
    ) {

        return `

            <span class="table-status green">
                START
            </span>

        `;

    }


    if (
        record.statusClass === "red"
    ) {

        return `

            <span class="table-status red">
                🔴 RED FLAG
            </span>

        `;

    }


    if (
        record.statusClass === "warning"
    ) {

        return `

            <span class="table-status warning">
                🟡 CHECK
            </span>

        `;

    }


    return `

        <span class="table-status green">
            🟢 NORMAL
        </span>

    `;

}


/* =========================================================
   CURRENT STATUS
========================================================= */

function setCurrentStatus(
    record
) {

    if (
        record.statusClass === "red"
    ) {

        currentStatus.textContent =
            "🔴 RED FLAG";


        currentStatus.className =
            "status danger";


        return;

    }


    if (
        record.statusClass === "warning"
    ) {

        currentStatus.textContent =
            "🟡 CHECK";


        currentStatus.className =
            "status warning";


        return;

    }


    currentStatus.textContent =
        "🟢 NORMAL";


    currentStatus.className =
        "status normal";

}


/* =========================================================
   SORT OLDEST FIRST
========================================================= */

function sortOldestFirst(
    a,
    b
) {

    const dateA =
        getRecordTime(
            a
        );


    const dateB =
        getRecordTime(
            b
        );


    return dateA - dateB;

}


/* =========================================================
   GET RECORD TIME
========================================================= */

function getRecordTime(
    record
) {

    /*
     * Prefer date because the average
     * calculation depends on filling order.
     */

    if (
        record.date
    ) {

        const dateValue =
            parseDate(
                record.date
            );


        if (
            dateValue !== 0
        ) {

            return dateValue;

        }

    }


    if (
        record.createdAt
    ) {

        if (
            typeof record.createdAt.toMillis ===
            "function"
        ) {

            return record.createdAt.toMillis();

        }


        if (
            typeof record.createdAt.toDate ===
            "function"
        ) {

            return record.createdAt
                .toDate()
                .getTime();

        }

    }


    return 0;

}


/* =========================================================
   PARSE DATE
========================================================= */

function parseDate(
    value
) {

    if (
        value?.toDate
    ) {

        return value
            .toDate()
            .getTime();

    }


    if (
        typeof value !== "string"
    ) {

        return 0;

    }


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


    return Number.isNaN(
        parsed
    )
        ? 0
        : parsed;

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
   NUMBER
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


    return Number.isNaN(
        number
    )
        ? null
        : number;

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
   SIGNED NUMBER
========================================================= */

function formatSigned(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "--";

    }


    const number =
        Number(
            value
        );


    if (
        number > 0
    ) {

        return "+" +
            number.toFixed(2);

    }


    return number.toFixed(2);

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
   EMPTY
========================================================= */

function showEmpty() {

    emptyState.classList.remove(
        "hidden"
    );

    document.querySelector(
        ".history-section .table-wrapper"
    ).classList.add(
        "hidden"
    );

    mobileHistory.classList.add(
        "hidden"
    );

}


/* =========================================================
   HIDE EMPTY
========================================================= */

function hideEmpty() {

    emptyState.classList.add(
        "hidden"
    );

    document.querySelector(
        ".history-section .table-wrapper"
    ).classList.remove(
        "hidden"
    );

    mobileHistory.classList.remove(
        "hidden"
    );

}


/* =========================================================
   HIDE LOADING
========================================================= */

function hideLoading() {

    loading.classList.add(
        "hidden"
    );

}


/* =========================================================
   ERROR
========================================================= */

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
                    margin-bottom:8px;
                "
            >
                Unable to load
            </strong>


            <span
                style="
                    display:block;
                    color:#777;
                    font-size:9px;
                    line-height:1.6;
                "
            >
                ${escapeHtml(
                    message
                )}
            </span>


            <button
                id="errorBack"
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
                BACK
            </button>

        </div>

    `;


    document
        .getElementById(
            "errorBack"
        )
        .addEventListener(
            "click",
            () => {

                window.location.href =
                    "../bus-details/?id=" +
                    encodeURIComponent(
                        busId
                    );

            }
        );

          }
