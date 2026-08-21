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

import {
    getUserProfile
} from "../core/auth.js";


/* =========================
   ELEMENTS
========================= */

const loadingState =
    document.getElementById("loadingState");

const busContent =
    document.getElementById("busContent");

const errorState =
    document.getElementById("errorState");

const errorText =
    document.getElementById("errorText");

const backButton =
    document.getElementById("backButton");

const errorBackButton =
    document.getElementById("errorBackButton");


const busNumber =
    document.getElementById("busNumber");

const registrationNumber =
    document.getElementById("registrationNumber");

const route =
    document.getElementById("route");

const currentMeter =
    document.getElementById("currentMeter");

const expectedMileage =
    document.getElementById("expectedMileage");

const driverName =
    document.getElementById("driverName");

const driverNameBottom =
    document.getElementById("driverNameBottom");

const driverPhone =
    document.getElementById("driverPhone");


const morningKm =
    document.getElementById("morningKm");

const eveningKm =
    document.getElementById("eveningKm");

const totalKm =
    document.getElementById("totalKm");


const performanceExpected =
    document.getElementById("performanceExpected");

const latestMileage =
    document.getElementById("latestMileage");

const overallMileage =
    document.getElementById("overallMileage");

const performanceStatus =
    document.getElementById("performanceStatus");


/* =========================
   GET BUS ID
========================= */

const params =
    new URLSearchParams(
        window.location.search
    );

const busId =
    params.get("id");


/* =========================
   NAVIGATION
========================= */

backButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../buses/";

    }
);


errorBackButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../buses/";

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


            if (!busId) {

                showError(
                    "No bus was selected."
                );

                return;
            }


            await loadBus();

        } catch (error) {

            console.error(
                "Bus page error:",
                error
            );

            showError(
                "Unable to load bus information."
            );
        }

    }
);


/* =========================
   LOAD BUS
========================= */

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


    if (!busSnapshot.exists()) {

        showError(
            "This bus does not exist in Firestore."
        );

        return;
    }


    const bus =
        busSnapshot.data();


    /* =====================
       BASIC INFORMATION
    ===================== */

    busNumber.textContent =
        bus.busNumber ||
        "Unknown";

    registrationNumber.textContent =
        bus.registrationNumber ||
        "No registration";

    route.textContent =
        bus.route ||
        "Not specified";


    const meter =
        Number(
            bus.currentOdometer || 0
        );


    currentMeter.textContent =
        meter
            ? `${formatNumber(meter)} KM`
            : "—";


    const expected =
        Number(
            bus.expectedMileage || 0
        );


    expectedMileage.textContent =
        expected
            ? `${expected.toFixed(2)} KM/L`
            : "—";


    performanceExpected.textContent =
        expected
            ? `${expected.toFixed(2)} KM/L`
            : "—";


    /* =====================
       DRIVER
    ===================== */

    if (bus.driverId) {

        await loadDriver(
            bus.driverId
        );

    } else {

        driverName.textContent =
            "Not Assigned";

        driverNameBottom.textContent =
            "No Driver Assigned";

        driverPhone.textContent =
            "Assign a driver from Driver Management.";

    }


    /* =====================
       TODAY
    ===================== */

    await loadTodayTravel();


    /* =====================
       DIESEL
    ===================== */

    await loadDieselPerformance(
        expected
    );


    /* =====================
       SHOW PAGE
    ===================== */

    loadingState.classList.add(
        "hidden"
    );

    busContent.classList.remove(
        "hidden"
    );
}


/* =========================
   DRIVER
========================= */

async function loadDriver(
    driverId
) {

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

            driverName.textContent =
                "Driver Not Found";

            driverNameBottom.textContent =
                "Driver Not Found";

            return;
        }


        const driver =
            driverSnapshot.data();


        const name =
            driver.name ||
            "Unnamed Driver";


        driverName.textContent =
            name;

        driverNameBottom.textContent =
            name;

        driverPhone.textContent =
            driver.phone ||
            "Phone number not available.";

    } catch (error) {

        console.error(
            "Driver loading error:",
            error
        );

        driverName.textContent =
            "Unable to load";

    }
}


/* =========================
   TODAY TRAVEL
========================= */

async function loadTodayTravel() {

    /*
     * dailyTrips will be populated
     * when we build the driver meter
     * system.
     *
     * For now we safely show zero.
     */

    const today =
        getTodayString();


    try {

        const tripsQuery =
            query(
                collection(
                    db,
                    "dailyTrips"
                ),
                where(
                    "busId",
                    "==",
                    busId
                ),
                where(
                    "date",
                    "==",
                    today
                )
            );


        const snapshot =
            await getDocs(
                tripsQuery
            );


        if (snapshot.empty) {

            setTravelValues(
                0,
                0
            );

            return;
        }


        const trip =
            snapshot.docs[0].data();


        const morning =
            Number(
                trip.morningDistance || 0
            );

        const evening =
            Number(
                trip.eveningDistance || 0
            );


        setTravelValues(
            morning,
            evening
        );


    } catch (error) {

        /*
         * If the collection doesn't exist
         * yet, simply show zero.
         */

        console.log(
            "No daily travel data yet."
        );

        setTravelValues(
            0,
            0
        );
    }
}


function setTravelValues(
    morning,
    evening
) {

    const total =
        morning + evening;


    morningKm.textContent =
        `${formatNumber(morning)} KM`;

    eveningKm.textContent =
        `${formatNumber(evening)} KM`;

    totalKm.textContent =
        `${formatNumber(total)} KM`;
}


/* =========================
   DIESEL PERFORMANCE
========================= */

async function loadDieselPerformance(
    expected
) {

    if (!expected) {

        setPerformanceStatus(
            "neutral",
            "EXPECTED MILEAGE NOT SET"
        );

        return;
    }


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


        if (snapshot.empty) {

            setPerformanceStatus(
                "neutral",
                "NO DIESEL DATA"
            );

            return;
        }


        const records =
            snapshot.docs
                .map(
                    doc => doc.data()
                )
                .filter(
                    record =>
                        Number(
                            record.calculatedMileage
                        ) > 0
                );


        if (!records.length) {

            setPerformanceStatus(
                "neutral",
                "NO CALCULATED MILEAGE"
            );

            return;
        }


        /*
         * Sort newest first.
         */

        records.sort(
            (a, b) => {

                const dateA =
                    a.createdAt?.seconds || 0;

                const dateB =
                    b.createdAt?.seconds || 0;

                return dateB - dateA;
            }
        );


        const latest =
            Number(
                records[0]
                    .calculatedMileage
            );


        const average =
            records.reduce(
                (
                    sum,
                    record
                ) =>
                    sum +
                    Number(
                        record.calculatedMileage
                    ),
                0
            ) / records.length;


        latestMileage.textContent =
            `${latest.toFixed(2)} KM/L`;

        overallMileage.textContent =
            `${average.toFixed(2)} KM/L`;


        /*
         * Compare latest mileage
         * against expected mileage.
         */

        const deviation =
            Math.abs(
                expected - latest
            ) /
            expected *
            100;


        if (deviation <= 5) {

            setPerformanceStatus(
                "normal",
                "NORMAL PERFORMANCE"
            );

        } else if (
            deviation <= 15
        ) {

            setPerformanceStatus(
                "warning",
                "SMALL VARIATION"
            );

        } else {

            setPerformanceStatus(
                "danger",
                "MAJOR VARIATION"
            );
        }


    } catch (error) {

        console.log(
            "No diesel data yet."
        );

        setPerformanceStatus(
            "neutral",
            "NO DIESEL DATA"
        );
    }
}


/* =========================
   PERFORMANCE STATUS
========================= */

function setPerformanceStatus(
    className,
    text
) {

    performanceStatus.className =
        `performance-status ${className}`;

    performanceStatus.textContent =
        text;
}


/* =========================
   ERROR
========================= */

function showError(
    message
) {

    loadingState.classList.add(
        "hidden"
    );

    busContent.classList.add(
        "hidden"
    );

    errorText.textContent =
        message;

    errorState.classList.remove(
        "hidden"
    );
}


/* =========================
   DATE
========================= */

function getTodayString() {

    const date =
        new Date();


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


/* =========================
   FORMAT NUMBER
========================= */

function formatNumber(
    value
) {

    return Number(value)
        .toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 2
            }
        );
}
