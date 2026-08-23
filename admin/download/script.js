import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "../../core/firebase.js";

/* ==========================================
   ELEMENTS
========================================== */

const busSelect =
    document.getElementById(
        "busSelect"
    );

const busInfo =
    document.getElementById(
        "busInfo"
    );

const selectedRegistration =
    document.getElementById(
        "selectedRegistration"
    );

const selectedDriver =
    document.getElementById(
        "selectedDriver"
    );

const availableDays =
    document.getElementById(
        "availableDays"
    );

const dateSection =
    document.getElementById(
        "dateSection"
    );

const fromDate =
    document.getElementById(
        "fromDate"
    );

const toDate =
    document.getElementById(
        "toDate"
    );

const dateMessage =
    document.getElementById(
        "dateMessage"
    );

const generateButton =
    document.getElementById(
        "generateButton"
    );

const selectionSection =
    document.getElementById(
        "selectionSection"
    );

const reportSection =
    document.getElementById(
        "reportSection"
    );

const backButton =
    document.getElementById(
        "backButton"
    );

const downloadButton =
    document.getElementById(
        "downloadButton"
    );

const reportBus =
    document.getElementById(
        "reportBus"
    );

const reportRegistration =
    document.getElementById(
        "reportRegistration"
    );

const reportDriver =
    document.getElementById(
        "reportDriver"
    );

const reportPeriod =
    document.getElementById(
        "reportPeriod"
    );

const reportGenerated =
    document.getElementById(
        "reportGenerated"
    );

const reportBody =
    document.getElementById(
        "reportBody"
    );

const message =
    document.getElementById(
        "message"
    );

/* ==========================================
   STATE
========================================== */

let buses = [];

let selectedBus = null;

let tripRecords = [];

let dieselRecords = [];

let reportRows = [];

let reportStart = null;

let reportEnd = null;

/* ==========================================
   AUTH
========================================== */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.replace(
                "../../index.html"
            );

            return;

        }

        await loadBuses();

    }
);

/* ==========================================
   LOAD BUSES
========================================== */

async function loadBuses() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "buses"
                )
            );

        buses = [];

        snapshot.forEach(
            item => {

                buses.push({
                    id:
                        item.id,

                    ...item.data()

                });

            }
        );

        buses.sort(
            (a, b) =>
                String(
                    a.busNumber || ""
                ).localeCompare(
                    String(
                        b.busNumber || ""
                    )
                )
        );

        busSelect.innerHTML =
            `
            <option value="">
                Select a bus
            </option>
            `;

        buses.forEach(
            bus => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    bus.id;

                option.textContent =
                    bus.busNumber ||
                    bus.registrationNumber ||
                    bus.id;

                busSelect.appendChild(
                    option
                );

            }
        );

    } catch (error) {

        console.error(
            "BUS LOAD ERROR:",
            error
        );

        busSelect.innerHTML =
            `
            <option value="">
                Unable to load buses
            </option>
            `;

        showError(
            "Unable to load buses."
        );

    }

}

/* ==========================================
   BUS CHANGE
========================================== */

busSelect.addEventListener(
    "change",
    async () => {

        const id =
            busSelect.value;

        selectedBus =
            buses.find(
                bus =>
                    bus.id === id
            ) || null;

        generateButton.disabled =
            true;

        dateMessage.textContent =
            "";

        if (!selectedBus) {

            busInfo.classList.add(
                "hidden"
            );

            dateSection.classList.add(
                "hidden"
            );

            return;

        }

        busInfo.classList.remove(
            "hidden"
        );

        selectedRegistration.textContent =
            selectedBus.registrationNumber ||
            "—";

        selectedDriver.textContent =
            selectedBus.assignedDriverName ||
            "Not assigned";

        await loadRecords();

    }
);

/* ==========================================
   LOAD TRIP + DIESEL RECORDS
========================================== */

async function loadRecords() {

    try {

        const [
            tripSnapshot,
            dieselSnapshot
        ] = await Promise.all([

            getDocs(
                query(
                    collection(
                        db,
                        "driverRecords"
                    ),

                    where(
                        "busId",
                        "==",
                        selectedBus.id
                    )
                )
            ),

            getDocs(
                query(
                    collection(
                        db,
                        "dieselRecords"
                    ),

                    where(
                        "busId",
                        "==",
                        selectedBus.id
                    )
                )
            )

        ]);

        tripRecords = [];

        dieselRecords = [];

        tripSnapshot.forEach(
            item => {

                tripRecords.push({

                    id:
                        item.id,

                    ...item.data()

                });

            }
        );

        dieselSnapshot.forEach(
            item => {

                dieselRecords.push({

                    id:
                        item.id,

                    ...item.data()

                });

            }
        );

        prepareDateSelection();

    } catch (error) {

        console.error(
            "RECORD LOAD ERROR:",
            error
        );

        showError(
            "Unable to load bus records."
        );

    }

}

/* ==========================================
   DATE SELECTION LOGIC
========================================== */

function prepareDateSelection() {

    const dates =
        getAvailableDates();

    availableDays.textContent =
        `${dates.length} day${dates.length === 1 ? "" : "s"}`;

    dateSection.classList.remove(
        "hidden"
    );

    /*
     * No records.
     */

    if (
        dates.length === 0
    ) {

        dateMessage.textContent =
            "No report data is available for this bus.";

        generateButton.disabled =
            true;

        return;

    }

    /*
     * 30 days or fewer:
     * automatically select the full
     * available range.
     */

    if (
        dates.length <= 30
    ) {

        reportStart =
            dates[0];

        reportEnd =
            dates[dates.length - 1];

        fromDate.value =
            reportStart;

        toDate.value =
            reportEnd;

        fromDate.disabled =
            true;

        toDate.disabled =
            true;

        dateMessage.textContent =
            "All available days will be included.";

        generateButton.disabled =
            false;

        return;

    }

    /*
     * More than 30 available days.
     */

    fromDate.disabled =
        false;

    toDate.disabled =
        false;

    fromDate.value =
        "";

    toDate.value =
        "";

    fromDate.min =
        dates[0];

    fromDate.max =
        dates[dates.length - 1];

    toDate.min =
        dates[0];

    toDate.max =
        dates[dates.length - 1];

    dateMessage.textContent =
        "More than 30 days are available. Select a maximum 30-day period.";

    generateButton.disabled =
        true;

}

/* ==========================================
   DATE CHANGES
========================================== */

fromDate.addEventListener(
    "change",
    validateDates
);

toDate.addEventListener(
    "change",
    validateDates
);

function validateDates() {

    const from =
        fromDate.value;

    const to =
        toDate.value;

    if (!from || !to) {

        generateButton.disabled =
            true;

        return;

    }

    if (
        from > to
    ) {

        dateMessage.textContent =
            "From date cannot be after To date.";

        generateButton.disabled =
            true;

        return;

    }

    const days =
        differenceInDays(
            from,
            to
        ) + 1;

    if (
        days > 30
    ) {

        dateMessage.textContent =
            "Maximum report period is 30 days.";

        generateButton.disabled =
            true;

        return;

    }

    dateMessage.textContent =
        `${days} day${days === 1 ? "" : "s"} selected.`;

    generateButton.disabled =
        false;

}

/* ==========================================
   GENERATE REPORT
========================================== */

generateButton.addEventListener(
    "click",
    async () => {

        if (!selectedBus) {

            showError(
                "Please select a bus."
            );

            return;

        }

        reportStart =
            fromDate.value;

        reportEnd =
            toDate.value;

        if (
            !reportStart ||
            !reportEnd
        ) {

            showError(
                "Please select the report period."
            );

            return;

        }

        const days =
            differenceInDays(
                reportStart,
                reportEnd
            ) + 1;

        if (
            days > 30
        ) {

            showError(
                "Report cannot exceed 30 days."
            );

            return;

        }

        await buildReport();

        selectionSection.classList.add(
            "hidden"
        );

        reportSection.classList.remove(
            "hidden"
        );

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }
);

/* ==========================================
   BUILD REPORT
========================================== */

async function buildReport() {

    reportBus.textContent =
        selectedBus.busNumber ||
        "—";

    reportRegistration.textContent =
        selectedBus.registrationNumber ||
        "—";

    reportDriver.textContent =
        selectedBus.assignedDriverName ||
        "Not assigned";

    reportPeriod.textContent =
        `${formatDate(reportStart)} - ${formatDate(reportEnd)}`;

    reportGenerated.textContent =
        formatDateTime(
            new Date()
        );

    /*
     * Sort diesel records by odometer.
     *
     * This is important for average
     * calculation.
     */

    const sortedDiesel =
        [...dieselRecords]
            .filter(
                item =>
                    Number.isFinite(
                        Number(
                            item.odometer
                        )
                    )
            )
            .sort(
                (a, b) =>
                    Number(
                        a.odometer
                    ) -
                    Number(
                        b.odometer
                    )
            );

    /*
     * Create one row for every
     * available date in the selected
     * period.
     */

    const dates =
        getDatesBetween(
            reportStart,
            reportEnd
        );

    reportRows = [];

    dates.forEach(
        date => {

            const tripsForDate =
                tripRecords.filter(
                    record =>
                        record.selectedDate === date
                );

            const dieselForDate =
                dieselRecords.filter(
                    record =>
                        record.selectedDate === date
                );

            /*
             * If multiple trip records exist
             * for the same testing date,
             * use the latest one.
             */

            const trip =
                getLatestRecord(
                    tripsForDate
                );

            /*
             * If multiple diesel entries
             * exist on the same date,
             * the report will use the latest.
             */

            const diesel =
                getLatestRecord(
                    dieselForDate
                );

            const dieselCalculation =
                calculateDieselAverage(
                    diesel,
                    sortedDiesel
                );

            reportRows.push({

                date,

                morningStart:
                    trip?.morningStartOdometer
                    ?? null,

                morningStop:
                    trip?.morningEndOdometer
                    ?? null,

                eveningStart:
                    trip?.eveningStartOdometer
                    ?? null,

                eveningStop:
                    trip?.eveningEndOdometer
                    ?? null,

                diesel:
                    diesel
                        ? "Yes"
                        : "No",

                litres:
                    diesel?.litres
                    ?? null,

                cost:
                    diesel?.amount
                    ?? null,

                dieselOdometer:
                    diesel?.odometer
                    ?? null,

                avg:
                    dieselCalculation.avg,

                avgFrom:
                    dieselCalculation.from,

                avgTo:
                    dieselCalculation.to

            });

        }
    );

    renderReportTable();

}

/* ==========================================
   DIESEL AVERAGE
========================================== */

function calculateDieselAverage(
    currentDiesel,
    sortedDiesel
) {

    /*
     * No diesel today.
     */

    if (!currentDiesel) {

        return {

            avg: null,

            from: null,

            to: null

        };

    }

    const currentOdometer =
        Number(
            currentDiesel.odometer
        );

    const currentIndex =
        sortedDiesel.findIndex(
            item =>
                item.id ===
                currentDiesel.id
        );

    /*
     * No previous diesel record.
     */

    if (
        currentIndex <= 0
    ) {

        return {

            avg: null,

            from: null,

            to: null

        };

    }

    const previousDiesel =
        sortedDiesel[
            currentIndex - 1
        ];

    const previousOdometer =
        Number(
            previousDiesel.odometer
        );

    const litres =
        Number(
            currentDiesel.litres
        );

    if (
        !Number.isFinite(
            previousOdometer
        ) ||
        !Number.isFinite(
            currentOdometer
        ) ||
        !Number.isFinite(
            litres
        ) ||
        litres <= 0
    ) {

        return {

            avg: null,

            from:
                previousOdometer,

            to:
                currentOdometer

        };

    }

    const distance =
        currentOdometer -
        previousOdometer;

    if (
        distance < 0
    ) {

        return {

            avg: null,

            from:
                previousOdometer,

            to:
                currentOdometer

        };

    }

    const avg =
        distance /
        litres;

    return {

        avg,

        from:
            previousOdometer,

        to:
            currentOdometer

    };

}

/* ==========================================
   RENDER TABLE
========================================== */

function renderReportTable() {

    reportBody.innerHTML =
        "";

    reportRows.forEach(
        row => {

            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML = `

                <td>
                    ${formatDate(
                        row.date
                    )}
                </td>

                <td>
                    ${formatKm(
                        row.morningStart
                    )}
                </td>

                <td>
                    ${formatKm(
                        row.morningStop
                    )}
                    /
                    ${formatKm(
                        row.eveningStart
                    )}
                </td>

                <td>
                    ${formatKm(
                        row.eveningStop
                    )}
                </td>

                <td>
                    ${row.diesel}
                </td>

                <td>
                    ${
                        row.litres === null
                            ? "—"
                            : Number(
                                row.litres
                              ).toFixed(2)
                    }
                </td>

                <td>
                    ${
                        row.cost === null
                            ? "—"
                            : "₹" +
                              formatMoney(
                                  row.cost
                              )
                    }
                </td>

                <td>
                    ${formatKm(
                        row.dieselOdometer
                    )}
                </td>

                <td>
                    ${
                        row.avg === null
                            ? "—"
                            : Number(
                                row.avg
                              ).toFixed(2)
                    }
                </td>

                <td>
                    ${
                        row.avgFrom === null
                            ? "—"
                            :
                            `${formatNumber(
                                row.avgFrom
                            )} - ${formatNumber(
                                row.avgTo
                            )}`
                    }
                </td>

            `;

            reportBody.appendChild(
                tr
            );

        }
    );

}

/* ==========================================
   DOWNLOAD PDF
========================================== */

downloadButton.addEventListener(
    "click",
    async () => {

        try {

            downloadButton.disabled =
                true;

            downloadButton.textContent =
                "CREATING PDF...";

            await generatePDF();

        } catch (error) {

            console.error(
                "PDF ERROR:",
                error
            );

            showError(
                "Unable to create PDF."
            );

        } finally {

            downloadButton.disabled =
                false;

            downloadButton.textContent =
                "DOWNLOAD PDF";

        }

    }
);

/* ==========================================
   GENERATE PDF
========================================== */

async function generatePDF() {

    const {
        jsPDF
    } = window.jspdf;

    const pdf =
        new jsPDF({

            orientation:
                "landscape",

            unit:
                "mm",

            format:
                "a4"

        });

    const pageWidth =
        pdf.internal.pageSize.getWidth();

    const pageHeight =
        pdf.internal.pageSize.getHeight();

    const margin =
        8;

    /*
     * Logo
     */

    try {

        const logo =
            await loadImage(
                "../../logo.png"
            );

        pdf.addImage(
            logo,
            "PNG",
            margin,
            8,
            27,
            27
        );

    } catch (error) {

        console.warn(
            "Logo could not be loaded."
        );

    }

    /*
     * School title
     */

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.setFontSize(
        15
    );

    pdf.text(
        "BEST English Medium School &",
        pageWidth / 2,
        13,
        {
            align: "center"
        }
    );

    pdf.text(
        "International PU College",
        pageWidth / 2,
        20,
        {
            align: "center"
        }
    );

    pdf.setFontSize(
        11
    );

    pdf.text(
        "BUS TRANSPORT REPORT",
        pageWidth / 2,
        28,
        {
            align: "center"
        }
    );

    /*
     * Meta information
     */

    pdf.setFont(
        "helvetica",
        "normal"
    );

    pdf.setFontSize(
        7
    );

    const metaX =
        pageWidth - 70;

    let metaY =
        10;

    addMetaLine(
        pdf,
        "Bus Number",
        selectedBus.busNumber ||
            "—",
        metaX,
        metaY
    );

    metaY += 5;

    addMetaLine(
        pdf,
        "Registration No",
        selectedBus.registrationNumber ||
            "—",
        metaX,
        metaY
    );

    metaY += 5;

    addMetaLine(
        pdf,
        "Driver",
        selectedBus.assignedDriverName ||
            "Not assigned",
        metaX,
        metaY
    );

    metaY += 5;

    addMetaLine(
        pdf,
        "Report Period",
        `${formatDate(
            reportStart
        )} - ${formatDate(
            reportEnd
        )}`,
        metaX,
        metaY
    );

    metaY += 5;

    addMetaLine(
        pdf,
        "Generated On",
        formatDateTime(
            new Date()
        ),
        metaX,
        metaY
    );

    /*
     * Header line
     */

    pdf.setDrawColor(
        20,
        20,
        20
    );

    pdf.setLineWidth(
        0.5
    );

    pdf.line(
        margin,
        39,
        pageWidth - margin,
        39
    );

    /*
     * Table data
     */

    const tableBody =
        reportRows.map(
            row => [

                formatDate(
                    row.date
                ),

                formatKm(
                    row.morningStart
                ),

                `${formatKm(
                    row.morningStop
                )} / ${formatKm(
                    row.eveningStart
                )}`,

                formatKm(
                    row.eveningStop
                ),

                row.diesel,

                row.litres === null
                    ? "—"
                    : Number(
                        row.litres
                      ).toFixed(2),

                row.cost === null
                    ? "—"
                    : "₹" +
                      formatMoney(
                          row.cost
                      ),

                formatKm(
                    row.dieselOdometer
                ),

                row.avg === null
                    ? "—"
                    : Number(
                        row.avg
                      ).toFixed(2),

                row.avgFrom === null
                    ? "—"
                    :
                    `${formatNumber(
                        row.avgFrom
                    )} - ${formatNumber(
                        row.avgTo
                    )}`

            ]
        );

    pdf.autoTable({

        startY:
            43,

        margin: {
            left:
                margin,

            right:
                margin
        },

        head: [[

            "Date",

            "Morning Start\n(Odometer)",

            "Morning Stop /\nEvening Start",

            "Evening Stop\n(Odometer)",

            "Diesel\n(Yes/No)",

            "Liters",

            "Cost (₹)",

            "Odometer At\nDiesel",

            "Avg\n(KM/L)",

            "Avg (From - To)"

        ]],

        body:
            tableBody,

        theme:
            "grid",

        styles: {

            font:
                "helvetica",

            fontSize:
                6.5,

            cellPadding:
                2,

            lineColor:
                [
                    180,
                    180,
                    180
                ],

            lineWidth:
                0.2,

            textColor:
                [
                    20,
                    20,
                    20
                ],

            halign:
                "center",

            valign:
                "middle"

        },

        headStyles: {

            fontStyle:
                "bold",

            fillColor:
                [
                    250,
                    250,
                    250
                ],

            textColor:
                [
                    20,
                    20,
                    20
                ],

            lineColor:
                [
                    150,
                    150,
                    150
                ],

            lineWidth:
                0.2

        },

        alternateRowStyles: {

            fillColor:
                [
                    255,
                    255,
                    255
                ]

        },

        didDrawPage:
            function(data) {

                /*
                 * Footer
                 */

                pdf.setFontSize(
                    6
                );

                pdf.setFont(
                    "helvetica",
                    "normal"
                );

                pdf.text(
                    `Page ${pdf.internal.getNumberOfPages()}`,
                    pageWidth - margin,
                    pageHeight - 5,
                    {
                        align:
                            "right"
                    }
                );

            }

    });

    /*
     * Get table ending position
     */

    let finalY =
        pdf.lastAutoTable.finalY + 7;

    /*
     * Notes
     */

    if (
        finalY >
        pageHeight - 38
    ) {

        pdf.addPage();

        finalY =
            12;

    }

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.setFontSize(
        7
    );

    pdf.text(
        "Note:",
        margin,
        finalY
    );

    pdf.setFont(
        "helvetica",
        "normal"
    );

    pdf.setFontSize(
        6.5
    );

    pdf.text(
        "1. Avg (KM/L) = (Current Diesel Odometer - Previous Diesel Odometer) / Current Diesel Liters.",
        margin,
        finalY + 4
    );

    pdf.text(
        '2. If previous diesel record is not available, Avg and Avg (From - To) are shown as "-".',
        margin,
        finalY + 8
    );

    /*
     * Signatures
     */

    const signatureY =
        finalY + 22;

    const col1 =
        pageWidth * 0.17;

    const col2 =
        pageWidth * 0.50;

    const col3 =
        pageWidth * 0.83;

    pdf.text(
        "Prepared By",
        col1,
        signatureY,
        {
            align:
                "center"
        }
    );

    pdf.text(
        "Checked By",
        col2,
        signatureY,
        {
            align:
                "center"
        }
    );

    pdf.text(
        "Authorized By",
        col3,
        signatureY,
        {
            align:
                "center"
        }
    );

    pdf.line(
        col1 - 22,
        signatureY + 8,
        col1 + 22,
        signatureY + 8
    );

    pdf.line(
        col2 - 22,
        signatureY + 8,
        col2 + 22,
        signatureY + 8
    );

    pdf.line(
        col3 - 22,
        signatureY + 8,
        col3 + 22,
        signatureY + 8
    );

    /*
     * Filename
     */

    const safeBusName =
        String(
            selectedBus.busNumber ||
            "BUS"
        )
            .replace(
                /[^a-z0-9]/gi,
                "_"
            );

    pdf.save(
        `${safeBusName}_Transport_Report_${reportStart}_to_${reportEnd}.pdf`
    );

}

/* ==========================================
   BACK
========================================== */

backButton.addEventListener(
    "click",
    () => {

        reportSection.classList.add(
            "hidden"
        );

        selectionSection.classList.remove(
            "hidden"
        );

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }
);

/* ==========================================
   AVAILABLE DATES
========================================== */

function getAvailableDates() {

    const dateSet =
        new Set();

    tripRecords.forEach(
        record => {

            if (
                record.selectedDate
            ) {

                dateSet.add(
                    record.selectedDate
                );

            }

        }
    );

    dieselRecords.forEach(
        record => {

            if (
                record.selectedDate
            ) {

                dateSet.add(
                    record.selectedDate
                );

            }

        }
    );

    return Array.from(
        dateSet
    ).sort();

}

/* ==========================================
   GET DATES BETWEEN
========================================== */

function getDatesBetween(
    start,
    end
) {

    const dates = [];

    let current =
        parseDate(
            start
        );

    const last =
        parseDate(
            end
        );

    while (
        current <= last
    ) {

        dates.push(
            formatInputDate(
                current
            )
        );

        current.setDate(
            current.getDate() + 1
        );

    }

    return dates;

}

/* ==========================================
   DATE DIFFERENCE
========================================== */

function differenceInDays(
    start,
    end
) {

    const a =
        parseDate(
            start
        );

    const b =
        parseDate(
            end
        );

    return Math.round(
        (
            b.getTime() -
            a.getTime()
        ) /
        86400000
    );

}

/* ==========================================
   GET LATEST RECORD
========================================== */

function getLatestRecord(
    records
) {

    if (
        !records.length
    ) {

        return null;

    }

    return [...records].sort(
        (a, b) => {

            return (
                getTimestamp(
                    b.createdAt
                ) -
                getTimestamp(
                    a.createdAt
                )
            );

        }
    )[0];

}

/* ==========================================
   TIMESTAMP
========================================== */

function getTimestamp(
    value
) {

    if (
        value &&
        typeof value.toMillis ===
        "function"
    ) {

        return value.toMillis();

    }

    return 0;

}

/* ==========================================
   DATE PARSING
========================================== */

function parseDate(
    value
) {

    const [
        year,
        month,
        day
    ] =
        value.split(
            "-"
        ).map(
            Number
        );

    return new Date(
        year,
        month - 1,
        day
    );

}

/* ==========================================
   INPUT DATE
========================================== */

function formatInputDate(
    date
) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${year}-${month}-${day}`;

}

/* ==========================================
   DISPLAY DATE
========================================== */

function formatDate(
    value
) {

    if (!value) {

        return "—";

    }

    const [
        year,
        month,
        day
    ] =
        value.split(
            "-"
        );

    return `${day}-${month}-${year}`;

}

/* ==========================================
   DATE + TIME
========================================== */

function formatDateTime(
    date
) {

    const datePart =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        ) +
        "-" +
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        ) +
        "-" +
        date.getFullYear();

    const timePart =
        date.toLocaleTimeString(
            "en-IN",
            {
                hour:
                    "2-digit",

                minute:
                    "2-digit",

                hour12:
                    true
            }
        );

    return `${datePart} ${timePart}`;

}

/* ==========================================
   NUMBER
========================================== */

function formatNumber(
    value
) {

    const number =
        Number(
            value
        );

    if (
        !Number.isFinite(
            number
        )
    ) {

        return "—";

    }

    return number.toLocaleString(
        "en-IN",
        {
            maximumFractionDigits:
                2
        }
    );

}

/* ==========================================
   KM
========================================== */

function formatKm(
    value
) {

    const number =
        Number(
            value
        );

    if (
        !Number.isFinite(
            number
        )
    ) {

        return "—";

    }

    return (
        number.toLocaleString(
            "en-IN",
            {
                maximumFractionDigits:
                    2
            }
        ) +
        " KM"
    );

}

/* ==========================================
   MONEY
========================================== */

function formatMoney(
    value
) {

    const number =
        Number(
            value
        );

    if (
        !Number.isFinite(
            number
        )
    ) {

        return "0.00";

    }

    return number.toLocaleString(
        "en-IN",
        {
            minimumFractionDigits:
                2,

            maximumFractionDigits:
                2
        }
    );

}

/* ==========================================
   IMAGE LOADER
========================================== */

function loadImage(
    src
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const image =
                new Image();

            image.onload =
                () => {

                    resolve(
                        image
                    );

                };

            image.onerror =
                reject;

            image.src =
                src;

        }
    );

}

/* ==========================================
   PDF META LINE
========================================== */

function addMetaLine(
    pdf,
    label,
    value,
    x,
    y
) {

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.text(
        label,
        x,
        y
    );

    pdf.setFont(
        "helvetica",
        "normal"
    );

    pdf.text(
        ":",
        x + 27,
        y
    );

    pdf.text(
        String(
            value
        ),
        x + 30,
        y
    );

}

/* ==========================================
   MESSAGE
========================================== */

function showError(
    text
) {

    message.textContent =
        text;

    message.className =
        "message error";

    setTimeout(
        () => {

            message.classList.add(
                "hidden"
            );

        },
        4000
    );

}
