import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth,
    db
} from "../core/firebase.js";


/* =====================================================
   ELEMENTS
===================================================== */

const loadingScreen =
    document.getElementById("loadingScreen");

const app =
    document.getElementById("app");

const driverName =
    document.getElementById("driverName");

const busNumber =
    document.getElementById("busNumber");

const registrationNumber =
    document.getElementById("registrationNumber");

const operationDate =
    document.getElementById("operationDate");

const logoutButton =
    document.getElementById("logoutButton");

const message =
    document.getElementById("message");


/* Morning */

const morningStatus =
    document.getElementById("morningStatus");

const morningStartOdometer =
    document.getElementById("morningStartOdometer");

const morningStartSource =
    document.getElementById("morningStartSource");

const morningStartTime =
    document.getElementById("morningStartTime");

const startMorningButton =
    document.getElementById("startMorningButton");

const morningEndBox =
    document.getElementById("morningEndBox");

const morningEndOdometer =
    document.getElementById("morningEndOdometer");

const endMorningButton =
    document.getElementById("endMorningButton");

const morningResult =
    document.getElementById("morningResult");

const morningDistance =
    document.getElementById("morningDistance");


/* Evening */

const eveningStatus =
    document.getElementById("eveningStatus");

const eveningStartOdometer =
    document.getElementById("eveningStartOdometer");

const eveningStartTime =
    document.getElementById("eveningStartTime");

const startEveningButton =
    document.getElementById("startEveningButton");

const eveningEndBox =
    document.getElementById("eveningEndBox");

const eveningEndOdometer =
    document.getElementById("eveningEndOdometer");

const endEveningButton =
    document.getElementById("endEveningButton");

const eveningResult =
    document.getElementById("eveningResult");

const eveningDistance =
    document.getElementById("eveningDistance");


/* Summary */

const daySummary =
    document.getElementById("daySummary");

const totalDistance =
    document.getElementById("totalDistance");

const summaryMorning =
    document.getElementById("summaryMorning");

const summaryEvening =
    document.getElementById("summaryEvening");

const summaryHalt =
    document.getElementById("summaryHalt");


/* =====================================================
   STATE
===================================================== */

let currentUser = null;

let currentDriver = null;

let currentBus = null;

let currentTrip = null;

let calculatedMorningStart = null;


/* =====================================================
   DATE
===================================================== */

/*
 * The selected date is the OPERATION DATE.
 *
 * createdAt / startedAt / endedAt are separate
 * Firebase timestamps representing actual time.
 */

operationDate.value =
    getLocalDateString();


/* =====================================================
   AUTHENTICATION
===================================================== */

onAuthStateChanged(
    auth,
    async (user) => {

        /*
         * LOGIN IS COMPULSORY.
         */

        if (!user) {

            window.location.replace(
                "../login/"
            );

            return;

        }


        currentUser =
            user;


        try {

            await loadDriver();

            await loadSelectedDate();

            hideLoading();

            app.classList.remove(
                "hidden"
            );

        } catch (error) {

            console.error(
                "DRIVER PANEL ERROR:",
                error
            );


            showError(
                error.message ||
                "Unable to load driver panel."
            );


            hideLoading();

        }

    }
);


/* =====================================================
   LOAD DRIVER
===================================================== */

async function loadDriver() {

    const driverReference =
        doc(
            db,
            "users",
            currentUser.uid
        );


    const driverSnapshot =
        await getDoc(
            driverReference
        );


    if (
        !driverSnapshot.exists()
    ) {

        throw new Error(
            "Driver profile not found."
        );

    }


    const driverData =
        driverSnapshot.data();


    /*
     * DRIVER ROLE IS COMPULSORY.
     */

    if (
        driverData.role !==
        "driver"
    ) {

        throw new Error(
            "This account is not a driver account."
        );

    }


    /*
     * DRIVER MUST HAVE AN ASSIGNED BUS.
     */

    if (
        !driverData.assignedBusId
    ) {

        throw new Error(
            "No bus is assigned to this driver."
        );

    }


    currentDriver = {

        id:
            currentUser.uid,

        ...driverData

    };


    driverName.textContent =
        driverData.name ||
        driverData.fullName ||
        currentUser.email ||
        "Driver";


    await loadBus(
        driverData.assignedBusId
    );

}


/* =====================================================
   LOAD ASSIGNED BUS
===================================================== */

async function loadBus(
    busId
) {

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
            "Assigned bus was not found."
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
        "Registration not available";


    /*
     * A starting odometer is REQUIRED
     * for the first-ever trip.
     */

    const startingOdometer =
        Number(
            currentBus.startingOdometer
        );


    if (
        !Number.isFinite(
            startingOdometer
        )
    ) {

        throw new Error(
            "This bus does not have a starting odometer configured by Admin."
        );

    }

}


/* =====================================================
   DATE CHANGE
===================================================== */

operationDate.addEventListener(
    "change",
    async () => {

        hideMessage();


        if (
            !operationDate.value
        ) {

            return;

        }


        /*
         * Reload the selected operation date.
         *
         * This allows testing many different
         * dates on the same real calendar day.
         */

        try {

            await loadSelectedDate();

        } catch (error) {

            console.error(
                error
            );


            showError(
                error.message
            );

        }

    }
);


/* =====================================================
   LOAD SELECTED DATE
===================================================== */

async function loadSelectedDate() {

    const selectedDate =
        operationDate.value;


    if (
        !selectedDate
    ) {

        return;

    }


    resetUI();


    /*
     * First check whether this bus already
     * has a trip for the selected operation date.
     */

    currentTrip =
        await findTripForDate(
            selectedDate
        );


    /*
     * If trip exists, load its state.
     */

    if (
        currentTrip
    ) {

        calculatedMorningStart =
            Number(
                currentTrip.morning?.startOdometer
            );


        renderExistingTrip();

        return;

    }


    /*
     * No trip yet.
     *
     * Find the most recent completed trip
     * BEFORE the selected operation date.
     */

    const previousTrip =
        await findPreviousCompletedTrip(
            selectedDate
        );


    let startingOdometer;

    let sourceText;


    if (
        previousTrip
    ) {

        startingOdometer =
            Number(
                previousTrip.finalHaltOdometer
            );


        sourceText =
            `From previous final halt • ${previousTrip.date}`;

    } else {

        startingOdometer =
            Number(
                currentBus.startingOdometer
            );


        sourceText =
            "Initial odometer set by Admin";

    }


    if (
        !Number.isFinite(
            startingOdometer
        )
    ) {

        throw new Error(
            "Unable to determine the morning starting odometer."
        );

    }


    calculatedMorningStart =
        startingOdometer;


    morningStartOdometer.textContent =
        formatNumber(
            startingOdometer
        );


    morningStartSource.textContent =
        sourceText;


    morningStatus.textContent =
        "NOT STARTED";


    eveningStatus.textContent =
        "LOCKED";


    startMorningButton.disabled =
        false;

}


/* =====================================================
   FIND CURRENT DATE TRIP
===================================================== */

async function findTripForDate(
    date
) {

    const tripsReference =
        collection(
            db,
            "dailyTrips"
        );


    const tripsQuery =
        query(
            tripsReference,

            where(
                "busId",
                "==",
                currentBus.id
            ),

            where(
                "date",
                "==",
                date
            )
        );


    const snapshot =
        await getDocs(
            tripsQuery
        );


    if (
        snapshot.empty
    ) {

        return null;

    }


    /*
     * There should only be one daily trip
     * for one bus + operation date.
     *
     * If duplicate records somehow exist,
     * use the first one.
     */

    const documentSnapshot =
        snapshot.docs[0];


    return {

        id:
            documentSnapshot.id,

        ...documentSnapshot.data()

    };

}


/* =====================================================
   FIND PREVIOUS COMPLETED TRIP
===================================================== */

async function findPreviousCompletedTrip(
    selectedDate
) {

    const tripsReference =
        collection(
            db,
            "dailyTrips"
        );


    const tripsQuery =
        query(
            tripsReference,

            where(
                "busId",
                "==",
                currentBus.id
            )
        );


    const snapshot =
        await getDocs(
            tripsQuery
        );


    const previousTrips = [];


    snapshot.forEach(
        (documentSnapshot) => {

            const data =
                documentSnapshot.data();


            /*
             * Only consider dates before
             * the selected operation date.
             */

            if (
                data.date &&
                data.date <
                selectedDate &&
                data.finalHaltOdometer !== undefined &&
                data.finalHaltOdometer !== null
            ) {

                previousTrips.push({

                    id:
                        documentSnapshot.id,

                    ...data

                });

            }

        }
    );


    if (
        previousTrips.length === 0
    ) {

        return null;

    }


    /*
     * Latest operation date before
     * selected date.
     */

    previousTrips.sort(
        (a, b) =>
            b.date.localeCompare(
                a.date
            )
    );


    return previousTrips[0];

}


/* =====================================================
   START MORNING
===================================================== */

startMorningButton.addEventListener(
    "click",
    async () => {

        hideMessage();


        if (
            !calculatedMorningStart ||
            !Number.isFinite(
                calculatedMorningStart
            )
        ) {

            showError(
                "Morning starting odometer is not available."
            );

            return;

        }


        setButtonLoading(
            startMorningButton,
            true,
            "STARTING..."
        );


        try {

            const selectedDate =
                operationDate.value;


            /*
             * Double-check that another trip
             * wasn't created meanwhile.
             */

            const existingTrip =
                await findTripForDate(
                    selectedDate
                );


            if (
                existingTrip
            ) {

                currentTrip =
                    existingTrip;

                renderExistingTrip();

                showError(
                    "This date already has a trip record."
                );

                return;

            }


            const tripData = {

                busId:
                    currentBus.id,

                driverId:
                    currentUser.uid,

                date:
                    selectedDate,

                morning: {

                    status:
                        "started",

                    startOdometer:
                        calculatedMorningStart,

                    startedAt:
                        serverTimestamp()

                },

                evening: {

                    status:
                        "locked"

                },

                status:
                    "morning_started",

                /*
                 * Actual creation time.
                 */

                createdAt:
                    serverTimestamp()

            };


            const tripReference =
                await addDoc(
                    collection(
                        db,
                        "dailyTrips"
                    ),
                    tripData
                );


            /*
             * serverTimestamp() is not immediately
             * readable on the client, so UI time
             * uses the actual device time for display.
             *
             * Firestore still stores the server timestamp.
             */

            currentTrip = {

                id:
                    tripReference.id,

                ...tripData,

                morning: {

                    status:
                        "started",

                    startOdometer:
                        calculatedMorningStart,

                    startedAt:
                        new Date()

                }

            };


            renderExistingTrip();


            showSuccess(
                "Morning pickup started."
            );


        } catch (error) {

            console.error(
                "START MORNING ERROR:",
                error
            );


            showError(
                getErrorMessage(
                    error
                )
            );

        } finally {

            setButtonLoading(
                startMorningButton,
                false
            );

        }

    }
);


/* =====================================================
   END MORNING
===================================================== */

endMorningButton.addEventListener(
    "click",
    async () => {

        hideMessage();


        const endingOdometer =
            Number(
                morningEndOdometer.value
            );


        if (
            !Number.isFinite(
                endingOdometer
            ) ||
            endingOdometer < 0
        ) {

            showError(
                "Enter a valid college odometer reading."
            );

            morningEndOdometer.focus();

            return;

        }


        const startingOdometer =
            Number(
                currentTrip?.morning?.startOdometer
            );


        if (
            !Number.isFinite(
                startingOdometer
            )
        ) {

            showError(
                "Morning starting odometer is missing."
            );

            return;

        }


        /*
         * Odometer can never go backwards.
         */

        if (
            endingOdometer <
            startingOdometer
        ) {

            showError(
                `College odometer cannot be lower than the morning starting odometer (${formatNumber(startingOdometer)} KM).`
            );

            return;

        }


        const distance =
            endingOdometer -
            startingOdometer;


        setButtonLoading(
            endMorningButton,
            true,
            "SAVING..."
        );


        try {

            const tripReference =
                doc(
                    db,
                    "dailyTrips",
                    currentTrip.id
                );


            await updateDoc(
                tripReference,
                {

                    "morning.status":
                        "completed",

                    "morning.endOdometer":
                        endingOdometer,

                    "morning.distance":
                        distance,

                    "morning.endedAt":
                        serverTimestamp(),

                    "evening.status":
                        "ready",

                    "evening.startOdometer":
                        endingOdometer,

                    status:
                        "morning_completed",

                    /*
                     * This is NOT the final halt.
                     * Final halt is only written after
                     * evening ends.
                     */

                }
            );


            /*
             * Update local state.
             */

            currentTrip.morning = {

                ...currentTrip.morning,

                status:
                    "completed",

                endOdometer:
                    endingOdometer,

                distance:
                    distance,

                endedAt:
                    new Date()

            };


            currentTrip.evening = {

                ...currentTrip.evening,

                status:
                    "ready",

                startOdometer:
                    endingOdometer

            };


            currentTrip.status =
                "morning_completed";


            renderExistingTrip();


            showSuccess(
                "Morning pickup completed."
            );


        } catch (error) {

            console.error(
                "END MORNING ERROR:",
                error
            );


            showError(
                getErrorMessage(
                    error
                )
            );

        } finally {

            setButtonLoading(
                endMorningButton,
                false
            );

        }

    }
);


/* =====================================================
   START EVENING
===================================================== */

startEveningButton.addEventListener(
    "click",
    async () => {

        hideMessage();


        if (
            !currentTrip ||
            currentTrip.morning?.status !==
            "completed"
        ) {

            showError(
                "Complete the morning pickup first."
            );

            return;

        }


        const eveningStart =
            Number(
                currentTrip.morning.endOdometer
            );


        if (
            !Number.isFinite(
                eveningStart
            )
        ) {

            showError(
                "Evening starting odometer is not available."
            );

            return;

        }


        setButtonLoading(
            startEveningButton,
            true,
            "STARTING..."
        );


        try {

            const tripReference =
                doc(
                    db,
                    "dailyTrips",
                    currentTrip.id
                );


            await updateDoc(
                tripReference,
                {

                    "evening.status":
                        "started",

                    "evening.startOdometer":
                        eveningStart,

                    "evening.startedAt":
                        serverTimestamp(),

                    status:
                        "evening_started"

                }
            );


            currentTrip.evening = {

                ...currentTrip.evening,

                status:
                    "started",

                startOdometer:
                    eveningStart,

                startedAt:
                    new Date()

            };


            currentTrip.status =
                "evening_started";


            renderExistingTrip();


            showSuccess(
                "Evening pickup started."
            );


        } catch (error) {

            console.error(
                "START EVENING ERROR:",
                error
            );


            showError(
                getErrorMessage(
                    error
                )
            );

        } finally {

            setButtonLoading(
                startEveningButton,
                false
            );

        }

    }
);


/* =====================================================
   END EVENING
===================================================== */

endEveningButton.addEventListener(
    "click",
    async () => {

        hideMessage();


        const endingOdometer =
            Number(
                eveningEndOdometer.value
            );


        if (
            !Number.isFinite(
                endingOdometer
            ) ||
            endingOdometer < 0
        ) {

            showError(
                "Enter a valid halting odometer reading."
            );

            eveningEndOdometer.focus();

            return;

        }


        const startingOdometer =
            Number(
                currentTrip?.evening?.startOdometer
            );


        if (
            !Number.isFinite(
                startingOdometer
            )
        ) {

            showError(
                "Evening starting odometer is missing."
            );

            return;

        }


        /*
         * Odometer cannot decrease.
         */

        if (
            endingOdometer <
            startingOdometer
        ) {

            showError(
                `Halting odometer cannot be lower than the evening starting odometer (${formatNumber(startingOdometer)} KM).`
            );

            return;

        }


        const distance =
            endingOdometer -
            startingOdometer;


        const morningDistanceValue =
            Number(
                currentTrip.morning?.distance
            ) || 0;


        const total =
            morningDistanceValue +
            distance;


        setButtonLoading(
            endEveningButton,
            true,
            "SAVING..."
        );


        try {

            const tripReference =
                doc(
                    db,
                    "dailyTrips",
                    currentTrip.id
                );


            await updateDoc(
                tripReference,
                {

                    "evening.status":
                        "completed",

                    "evening.endOdometer":
                        endingOdometer,

                    "evening.distance":
                        distance,

                    "evening.endedAt":
                        serverTimestamp(),

                    totalDistance:
                        total,

                    finalHaltOdometer:
                        endingOdometer,

                    status:
                        "completed",

                    completedAt:
                        serverTimestamp()

                }
            );


            /*
             * IMPORTANT:
             *
             * We also update the bus's current
             * odometer because this is now the
             * latest confirmed final halt.
             */

            const busReference =
                doc(
                    db,
                    "buses",
                    currentBus.id
                );


            await updateDoc(
                busReference,
                {

                    currentOdometer:
                        endingOdometer,

                    lastOperationDate:
                        operationDate.value,

                    lastOdometerUpdatedAt:
                        serverTimestamp()

                }
            );


            currentTrip.evening = {

                ...currentTrip.evening,

                status:
                    "completed",

                endOdometer:
                    endingOdometer,

                distance:
                    distance,

                endedAt:
                    new Date()

            };


            currentTrip.totalDistance =
                total;


            currentTrip.finalHaltOdometer =
                endingOdometer;


            currentTrip.status =
                "completed";


            renderExistingTrip();


            showSuccess(
                "Evening pickup completed. Today's trip is saved."
            );


        } catch (error) {

            console.error(
                "END EVENING ERROR:",
                error
            );


            showError(
                getErrorMessage(
                    error
                )
            );

        } finally {

            setButtonLoading(
                endEveningButton,
                false
            );

        }

    }
);


/* =====================================================
   RENDER EXISTING TRIP
===================================================== */

function renderExistingTrip() {

    if (
        !currentTrip
    ) {

        return;

    }


    const morning =
        currentTrip.morning ||
        {};


    const evening =
        currentTrip.evening ||
        {};


    /*
     * MORNING START
     */

    if (
        Number.isFinite(
            Number(
                morning.startOdometer
            )
        )
    ) {

        morningStartOdometer.textContent =
            formatNumber(
                morning.startOdometer
            );

    }


    /*
     * MORNING STATUS
     */

    if (
        morning.status ===
        "started"
    ) {

        morningStatus.textContent =
            "IN PROGRESS";

        morningStatus.className =
            "status active";


        startMorningButton.disabled =
            true;


        morningEndBox.classList.remove(
            "hidden"
        );


        endMorningButton.disabled =
            false;


        if (
            morning.startedAt
        ) {

            morningStartTime.textContent =
                formatTimestamp(
                    morning.startedAt
                );

        }

    }


    if (
        morning.status ===
        "completed"
    ) {

        morningStatus.textContent =
            "COMPLETED";

        morningStatus.className =
            "status complete";


        startMorningButton.disabled =
            true;


        morningEndBox.classList.add(
            "hidden"
        );


        morningResult.classList.remove(
            "hidden"
        );


        morningDistance.textContent =
            formatNumber(
                morning.distance
            );


        if (
            morning.startedAt
        ) {

            morningStartTime.textContent =
                formatTimestamp(
                    morning.startedAt
                );

        }

    }


    /*
     * MORNING START NOT YET STARTED
     */

    if (
        !morning.status
    ) {

        morningStatus.textContent =
            "NOT STARTED";

        morningStatus.className =
            "status";

        startMorningButton.disabled =
            false;

    }


    /*
     * EVENING
     */

    if (
        evening.status ===
        "locked"
    ) {

        eveningStatus.textContent =
            "LOCKED";

        eveningStatus.className =
            "status";

        startEveningButton.disabled =
            true;

    }


    if (
        evening.status ===
        "ready"
    ) {

        eveningStartOdometer.textContent =
            formatNumber(
                evening.startOdometer
            );


        eveningStatus.textContent =
            "READY";

        eveningStatus.className =
            "status";

        startEveningButton.disabled =
            false;

    }


    if (
        evening.status ===
        "started"
    ) {

        eveningStartOdometer.textContent =
            formatNumber(
                evening.startOdometer
            );


        eveningStatus.textContent =
            "IN PROGRESS";

        eveningStatus.className =
            "status active";


        startEveningButton.disabled =
            true;


        eveningEndBox.classList.remove(
            "hidden"
        );


        endEveningButton.disabled =
            false;


        if (
            evening.startedAt
        ) {

            eveningStartTime.textContent =
                formatTimestamp(
                    evening.startedAt
                );

        }

    }


    if (
        evening.status ===
        "completed"
    ) {

        eveningStartOdometer.textContent =
            formatNumber(
                evening.startOdometer
            );


        eveningStatus.textContent =
            "COMPLETED";

        eveningStatus.className =
            "status complete";


        startEveningButton.disabled =
            true;


        eveningEndBox.classList.add(
            "hidden"
        );


        eveningResult.classList.remove(
            "hidden"
        );


        eveningDistance.textContent =
            formatNumber(
                evening.distance
            );


        if (
            evening.startedAt
        ) {

            eveningStartTime.textContent =
                formatTimestamp(
                    evening.startedAt
                );

        }

    }


    /*
     * DAY SUMMARY
     */

    if (
        currentTrip.status ===
        "completed"
    ) {

        const morningKm =
            Number(
                morning.distance
            ) || 0;


        const eveningKm =
            Number(
                evening.distance
            ) || 0;


        const totalKm =
            Number(
                currentTrip.totalDistance
            ) ||
            (
                morningKm +
                eveningKm
            );


        daySummary.classList.remove(
            "hidden"
        );


        totalDistance.textContent =
            formatNumber(
                totalKm
            );


        summaryMorning.textContent =
            `${formatNumber(morningKm)} KM`;


        summaryEvening.textContent =
            `${formatNumber(eveningKm)} KM`;


        summaryHalt.textContent =
            `${formatNumber(currentTrip.finalHaltOdometer)} KM`;

    } else {

        daySummary.classList.add(
            "hidden"
        );

    }

}


/* =====================================================
   RESET UI
===================================================== */

function resetUI() {

    currentTrip =
        null;

    calculatedMorningStart =
        null;


    morningStatus.textContent =
        "NOT STARTED";

    morningStatus.className =
        "status";


    eveningStatus.textContent =
        "LOCKED";

    eveningStatus.className =
        "status";


    morningStartOdometer.textContent =
        "—";

    morningStartSource.textContent =
        "Loading...";

    morningStartTime.textContent =
        "—";


    eveningStartOdometer.textContent =
        "—";

    eveningStartTime.textContent =
        "—";


    morningEndBox.classList.add(
        "hidden"
    );

    eveningEndBox.classList.add(
        "hidden"
    );


    morningResult.classList.add(
        "hidden"
    );

    eveningResult.classList.add(
        "hidden"
    );

    daySummary.classList.add(
        "hidden"
    );


    morningEndOdometer.value =
        "";

    eveningEndOdometer.value =
        "";


    startMorningButton.disabled =
        true;

    startEveningButton.disabled =
        true;

    endMorningButton.disabled =
        false;

    endEveningButton.disabled =
        false;

}


/* =====================================================
   LOGOUT
===================================================== */

logoutButton.addEventListener(
    "click",
    async () => {

        try {

            await signOut(
                auth
            );


            window.location.replace(
                "../login/"
            );

        } catch (error) {

            console.error(
                error
            );


            showError(
                "Unable to logout."
            );

        }

    }
);


/* =====================================================
   BUTTON LOADING
===================================================== */

function setButtonLoading(
    button,
    loading,
    text
) {

    if (
        loading
    ) {

        button.dataset.originalText =
            button.textContent;

        button.textContent =
            text;

        button.disabled =
            true;

    } else {

        button.textContent =
            button.dataset.originalText ||
            button.textContent;

        button.disabled =
            false;

    }

}


/* =====================================================
   LOCAL DATE
===================================================== */

function getLocalDateString() {

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


/* =====================================================
   FORMAT NUMBER
===================================================== */

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


/* =====================================================
   FORMAT TIMESTAMP
===================================================== */

function formatTimestamp(
    timestamp
) {

    let date;


    /*
     * Firestore Timestamp
     */

    if (
        timestamp &&
        typeof timestamp.toDate ===
        "function"
    ) {

        date =
            timestamp.toDate();

    }

    /*
     * JavaScript Date
     */

    else if (
        timestamp instanceof Date
    ) {

        date =
            timestamp;

    }

    else if (
        timestamp?.seconds
    ) {

        date =
            new Date(
                timestamp.seconds * 1000
            );

    }

    else {

        return "Time recorded";

    }


    return date.toLocaleString(
        "en-IN",
        {
            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit",

            hour12:
                true
        }
    );

}


/* =====================================================
   MESSAGE
===================================================== */

function showError(
    text
) {

    message.textContent =
        text;

    message.className =
        "message";

}


function showSuccess(
    text
) {

    /*
     * Keeping the visual system
     * black/white/minimal.
     *
     * Success is not green.
     */

    message.textContent =
        text;

    message.className =
        "message";

}


function hideMessage() {

    message.textContent =
        "";

    message.className =
        "message hidden";

}


/* =====================================================
   FIREBASE ERROR
===================================================== */

function getErrorMessage(
    error
) {

    if (
        error?.code ===
        "permission-denied"
    ) {

        return "Permission denied by Firebase. Check Firestore rules.";

    }


    if (
        error?.code ===
        "unavailable"
    ) {

        return "Firebase is temporarily unavailable.";

    }


    return (
        error?.message ||
        "Something went wrong."
    );

}


/* =====================================================
   HIDE LOADING
===================================================== */

function hideLoading() {

    loadingScreen.classList.add(
        "hidden"
    );

}
