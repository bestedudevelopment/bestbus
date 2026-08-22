import {
    doc,
    getDoc,
    setDoc,
    collection,
    query,
    where,
    getDocs,
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


/* =========================================
   ELEMENTS
========================================= */

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


/* SUMMARY */

const morningDistance =
    document.getElementById("morningDistance");

const eveningDistance =
    document.getElementById("eveningDistance");

const totalDistance =
    document.getElementById("totalDistance");


/* MORNING */

const morningStatus =
    document.getElementById("morningStatus");

const morningIndicator =
    document.getElementById("morningIndicator");

const morningStartArea =
    document.getElementById("morningStartArea");

const morningEndArea =
    document.getElementById("morningEndArea");

const morningCompleteArea =
    document.getElementById("morningCompleteArea");

const morningStartOdometer =
    document.getElementById("morningStartOdometer");

const morningStartInfo =
    document.getElementById("morningStartInfo");

const morningStartedOdometer =
    document.getElementById("morningStartedOdometer");

const morningStartedTime =
    document.getElementById("morningStartedTime");

const morningEndOdometer =
    document.getElementById("morningEndOdometer");

const morningCompleteText =
    document.getElementById("morningCompleteText");

const startMorningButton =
    document.getElementById("startMorningButton");

const endMorningButton =
    document.getElementById("endMorningButton");


/* EVENING */

const eveningStatus =
    document.getElementById("eveningStatus");

const eveningIndicator =
    document.getElementById("eveningIndicator");

const eveningStartArea =
    document.getElementById("eveningStartArea");

const eveningEndArea =
    document.getElementById("eveningEndArea");

const eveningCompleteArea =
    document.getElementById("eveningCompleteArea");

const eveningStartOdometer =
    document.getElementById("eveningStartOdometer");

const eveningStartInfo =
    document.getElementById("eveningStartInfo");

const eveningStartedOdometer =
    document.getElementById("eveningStartedOdometer");

const eveningStartedTime =
    document.getElementById("eveningStartedTime");

const eveningEndOdometer =
    document.getElementById("eveningEndOdometer");

const eveningCompleteText =
    document.getElementById("eveningCompleteText");

const startEveningButton =
    document.getElementById("startEveningButton");

const endEveningButton =
    document.getElementById("endEveningButton");


/* FINAL */

const dayCompleteCard =
    document.getElementById("dayCompleteCard");

const dayCompleteDistance =
    document.getElementById("dayCompleteDistance");

const message =
    document.getElementById("message");


/* =========================================
   STATE
========================================= */

let currentUser = null;

let currentDriver = null;

let currentBus = null;

let currentTrip = null;

let previousFinalOdometer = null;


/* =========================================
   AUTHENTICATION
========================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        /*
         * LOGIN IS COMPULSORY.
         */

        if (!user) {

            window.location.href =
                "../login/";

            return;

        }


        currentUser = user;


        try {

            await loadDriverAndBus();

            setDefaultDate();

            await loadSelectedDate();

            hideLoading();

        } catch (error) {

            console.error(
                "DRIVER PANEL ERROR:",
                error
            );


            showMessage(
                error.message ||
                "Unable to load driver panel."
            );


            hideLoading();

        }

    }
);


/* =========================================
   LOAD DRIVER
========================================= */

async function loadDriverAndBus() {

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
            "Driver profile was not found."
        );

    }


    const userData =
        userSnapshot.data();


    /*
     * Driver must actually have
     * the driver role.
     */

    if (
        userData.role !== "driver"
    ) {

        throw new Error(
            "This account is not a driver account."
        );

    }


    /*
     * Driver must have an assigned bus.
     */

    if (
        !userData.assignedBusId
    ) {

        throw new Error(
            "No bus is assigned to this driver."
        );

    }


    currentDriver = {

        id:
            currentUser.uid,

        ...userData

    };


    driverName.textContent =
        userData.name ||
        userData.fullName ||
        userData.displayName ||
        "Driver";


    /*
     * Load assigned bus.
     */

    const busReference =
        doc(
            db,
            "buses",
            userData.assignedBusId
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
        "";

}


/* =========================================
   DEFAULT DATE
========================================= */

function setDefaultDate() {

    const today =
        getLocalDateKey(
            new Date()
        );


    operationDate.value =
        today;

}


/* =========================================
   DATE CHANGE
========================================= */

operationDate.addEventListener(
    "change",
    async () => {

        hideMessage();


        try {

            await loadSelectedDate();

        } catch (error) {

            console.error(
                error
            );


            showMessage(
                error.message ||
                "Unable to load selected date."
            );

        }

    }
);


/* =========================================
   LOAD SELECTED DATE
========================================= */

async function loadSelectedDate() {

    const date =
        operationDate.value;


    if (
        !date
    ) {

        return;

    }


    resetUI();


    /*
     * First load the selected day's
     * existing trip.
     */

    currentTrip =
        await getTrip(
            date
        );


    /*
     * Then find the previous completed
     * operation date for this bus.
     */

    previousFinalOdometer =
        await getPreviousFinalOdometer(
            date
        );


    /*
     * Determine automatic morning start.
     */

    let automaticStart =
        null;


    if (
        currentTrip &&
        currentTrip.morning &&
        currentTrip.morning.startOdometer != null
    ) {

        automaticStart =
            Number(
                currentTrip.morning.startOdometer
            );

    } else if (
        previousFinalOdometer != null
    ) {

        automaticStart =
            Number(
                previousFinalOdometer
            );

    } else {

        /*
         * First-ever trip for this bus.
         * Use admin-created starting odometer.
         */

        const starting =
            Number(
                currentBus.startingOdometer
            );


        if (
            Number.isFinite(
                starting
            )
        ) {

            automaticStart =
                starting;

        }

    }


    /*
     * Display morning starting odometer.
     */

    if (
        automaticStart != null
    ) {

        morningStartOdometer.textContent =
            formatNumber(
                automaticStart
            );

    } else {

        morningStartOdometer.textContent =
            "—";

    }


    /*
     * Render current state.
     */

    renderTrip();


}


/* =========================================
   GET TRIP
========================================= */

async function getTrip(
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
     * There should only be one daily
     * trip for a bus/date.
     */

    const documentSnapshot =
        snapshot.docs[0];


    return {

        id:
            documentSnapshot.id,

        ...documentSnapshot.data()

    };

}


/* =========================================
   PREVIOUS FINAL ODOMETER
========================================= */

async function getPreviousFinalOdometer(
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
            ),

            where(
                "completed",
                "==",
                true
            )
        );


    const snapshot =
        await getDocs(
            tripsQuery
        );


    let previousTrip = null;


    snapshot.forEach(
        (documentSnapshot) => {

            const data =
                documentSnapshot.data();


            if (
                !data.date
            ) {

                return;

            }


            /*
             * Only dates BEFORE the selected
             * operation date.
             */

            if (
                data.date >=
                selectedDate
            ) {

                return;

            }


            if (
                !data.finalHaltOdometer
            ) {

                return;

            }


            if (
                !previousTrip ||
                data.date >
                previousTrip.date
            ) {

                previousTrip = {

                    date:
                        data.date,

                    finalHaltOdometer:
                        Number(
                            data.finalHaltOdometer
                        )

                };

            }

        }
    );


    if (
        previousTrip
    ) {

        return previousTrip.finalHaltOdometer;

    }


    /*
     * No previous completed trip.
     *
     * Return null so the system uses
     * bus.startingOdometer.
     */

    return null;

}


/* =========================================
   START MORNING
========================================= */

startMorningButton.addEventListener(
    "click",
    async () => {

        hideMessage();


        const startOdometer =
            getAutomaticMorningStart();


        if (
            startOdometer == null
        ) {

            showMessage(
                "Starting odometer is not available. Ask admin to set the bus starting odometer or complete the previous operation day."
            );

            return;

        }


        setButtonLoading(
            startMorningButton,
            true
        );


        try {

            const date =
                operationDate.value;


            /*
             * ACTUAL timestamp.
             *
             * serverTimestamp() records when
             * the action actually happened.
             */

            const morningData = {

                started: true,

                startOdometer:
                    startOdometer,

                startedAt:
                    serverTimestamp()

            };


            await saveTripUpdate(
                date,
                {
                    morning:
                        morningData
                }
            );


            /*
             * Reload from Firestore.
             */

            currentTrip =
                await getTrip(
                    date
                );


            renderTrip();


            showMessage(
                "Morning pickup started."
            );


        } catch (error) {

            console.error(
                "START MORNING ERROR:",
                error
            );


            showMessage(
                error.message ||
                "Unable to start morning pickup."
            );

        }


        setButtonLoading(
            startMorningButton,
            false
        );

    }
);


/* =========================================
   END MORNING
========================================= */

endMorningButton.addEventListener(
    "click",
    async () => {

        hideMessage();


        const value =
            Number(
                morningEndOdometer.value
            );


        if (
            !Number.isFinite(
                value
            ) ||
            value < 0
        ) {

            showMessage(
                "Enter a valid college odometer reading."
            );

            morningEndOdometer.focus();

            return;

        }


        const start =
            Number(
                currentTrip?.morning?.startOdometer
            );


        if (
            !Number.isFinite(
                start
            )
        ) {

            showMessage(
                "Morning starting odometer is missing."
            );

            return;

        }


        /*
         * Odometer cannot go backwards.
         */

        if (
            value < start
        ) {

            showMessage(
                "College odometer cannot be lower than the morning starting odometer."
            );

            morningEndOdometer.focus();

            return;

        }


        const distance =
            value -
            start;


        setButtonLoading(
            endMorningButton,
            true
        );


        try {

            const date =
                operationDate.value;


            const morningData = {

                ...currentTrip.morning,

                ended: true,

                endOdometer:
                    value,

                distance:
                    roundNumber(
                        distance
                    ),

                endedAt:
                    serverTimestamp()

            };


            await saveTripUpdate(
                date,
                {
                    morning:
                        morningData
                }
            );


            currentTrip =
                await getTrip(
                    date
                );


            renderTrip();


            showMessage(
                `Morning pickup completed. Distance: ${formatNumber(distance)} KM`
            );


        } catch (error) {

            console.error(
                "END MORNING ERROR:",
                error
            );


            showMessage(
                error.message ||
                "Unable to save morning pickup."
            );

        }


        setButtonLoading(
            endMorningButton,
            false
        );

    }
);


/* =========================================
   START EVENING
========================================= */

startEveningButton.addEventListener(
    "click",
    async () => {

        hideMessage();


        /*
         * Morning MUST be completed first.
         */

        if (
            !currentTrip?.morning?.ended
        ) {

            showMessage(
                "Complete the morning pickup first."
            );

            return;

        }


        const startOdometer =
            Number(
                currentTrip.morning.endOdometer
            );


        if (
            !Number.isFinite(
                startOdometer
            )
        ) {

            showMessage(
                "Evening starting odometer is not available."
            );

            return;

        }


        setButtonLoading(
            startEveningButton,
            true
        );


        try {

            const date =
                operationDate.value;


            const eveningData = {

                started: true,

                startOdometer:
                    startOdometer,

                startedAt:
                    serverTimestamp()

            };


            await saveTripUpdate(
                date,
                {
                    evening:
                        eveningData
                }
            );


            currentTrip =
                await getTrip(
                    date
                );


            renderTrip();


            showMessage(
                "Evening pickup started."
            );


        } catch (error) {

            console.error(
                "START EVENING ERROR:",
                error
            );


            showMessage(
                error.message ||
                "Unable to start evening pickup."
            );

        }


        setButtonLoading(
            startEveningButton,
            false
        );

    }
);


/* =========================================
   END EVENING
========================================= */

endEveningButton.addEventListener(
    "click",
    async () => {

        hideMessage();


        const value =
            Number(
                eveningEndOdometer.value
            );


        if (
            !Number.isFinite(
                value
            ) ||
            value < 0
        ) {

            showMessage(
                "Enter a valid halting odometer reading."
            );

            eveningEndOdometer.focus();

            return;

        }


        const start =
            Number(
                currentTrip?.evening?.startOdometer
            );


        if (
            !Number.isFinite(
                start
            )
        ) {

            showMessage(
                "Evening starting odometer is missing."
            );

            return;

        }


        if (
            value < start
        ) {

            showMessage(
                "Halting odometer cannot be lower than the evening starting odometer."
            );

            eveningEndOdometer.focus();

            return;

        }


        const distance =
            value -
            start;


        const morningDistance =
            Number(
                currentTrip?.morning?.distance
            ) || 0;


        const totalDistance =
            morningDistance +
            distance;


        setButtonLoading(
            endEveningButton,
            true
        );


        try {

            const date =
                operationDate.value;


            const eveningData = {

                ...currentTrip.evening,

                ended: true,

                endOdometer:
                    value,

                distance:
                    roundNumber(
                        distance
                    ),

                endedAt:
                    serverTimestamp()

            };


            await saveTripUpdate(
                date,
                {
                    evening:
                        eveningData,

                    totalDistance:
                        roundNumber(
                            totalDistance
                        ),

                    finalHaltOdometer:
                        value,

                    completed:
                        true,

                    completedAt:
                        serverTimestamp()

                }
            );


            currentTrip =
                await getTrip(
                    date
                );


            renderTrip();


            showMessage(
                `Day completed. Total distance: ${formatNumber(totalDistance)} KM`
            );


        } catch (error) {

            console.error(
                "END EVENING ERROR:",
                error
            );


            showMessage(
                error.message ||
                "Unable to save evening pickup."
            );

        }


        setButtonLoading(
            endEveningButton,
            false
        );

    }
);


/* =========================================
   SAVE TRIP
========================================= */

async function saveTripUpdate(
    date,
    updates
) {

    /*
     * One document per BUS + OPERATION DATE.
     *
     * ID:
     * busId_date
     *
     * Example:
     * bus123_2026-08-22
     *
     * This prevents duplicate daily records.
     */

    const tripId =
        `${currentBus.id}_${date}`;


    const tripReference =
        doc(
            db,
            "dailyTrips",
            tripId
        );


    const baseData = {

        busId:
            currentBus.id,

        driverId:
            currentUser.uid,

        date:
            date,

        updatedAt:
            serverTimestamp()

    };


    await setDoc(
        tripReference,
        {
            ...baseData,
            ...updates
        },
        {
            merge: true
        }
    );

}


/* =========================================
   GET AUTOMATIC MORNING START
========================================= */

function getAutomaticMorningStart() {

    /*
     * Existing trip already has
     * a starting odometer.
     */

    if (
        currentTrip?.morning?.startOdometer != null
    ) {

        const value =
            Number(
                currentTrip.morning.startOdometer
            );


        if (
            Number.isFinite(
                value
            )
        ) {

            return value;

        }

    }


    /*
     * Previous completed day's halt.
     */

    if (
        previousFinalOdometer != null
    ) {

        return Number(
            previousFinalOdometer
        );

    }


    /*
     * First trip ever.
     *
     * Use admin-created bus
     * starting odometer.
     */

    const starting =
        Number(
            currentBus.startingOdometer
        );


    if (
        Number.isFinite(
            starting
        )
    ) {

        return starting;

    }


    return null;

}


/* =========================================
   RENDER
========================================= */

function renderTrip() {

    /*
     * If no trip exists, show fresh state.
     */

    if (
        !currentTrip
    ) {

        renderFreshState();

        return;

    }


    const morning =
        currentTrip.morning || null;


    const evening =
        currentTrip.evening || null;


    /* =====================================
       MORNING
    ===================================== */

    if (
        morning?.ended
    ) {

        const distance =
            Number(
                morning.distance
            ) || 0;


        morningDistance.textContent =
            formatNumber(
                distance
            );


        morningStatus.textContent =
            "COMPLETED";


        morningIndicator.className =
            "indicator active";


        morningStartArea.classList.add(
            "hidden"
        );

        morningEndArea.classList.add(
            "hidden"
        );

        morningCompleteArea.classList.remove(
            "hidden"
        );


        morningCompleteText.textContent =
            `${formatNumber(morning.startOdometer)} → ${formatNumber(morning.endOdometer)} KM · ${formatNumber(distance)} KM`;

    }

    else if (
        morning?.started
    ) {

        morningStatus.textContent =
            "IN PROGRESS";


        morningIndicator.className =
            "indicator active";


        morningStartArea.classList.add(
            "hidden"
        );

        morningEndArea.classList.remove(
            "hidden"
        );

        morningCompleteArea.classList.add(
            "hidden"
        );


        morningStartedOdometer.textContent =
            formatNumber(
                morning.startOdometer
            );


        morningStartedTime.textContent =
            formatTimestamp(
                morning.startedAt
            );

    }

    else {

        morningStatus.textContent =
            "NOT STARTED";


        morningIndicator.className =
            "indicator";


        morningStartArea.classList.remove(
            "hidden"
        );

        morningEndArea.classList.add(
            "hidden"
        );

        morningCompleteArea.classList.add(
            "hidden"
        );


        const start =
            getAutomaticMorningStart();


        if (
            start != null
        ) {

            morningStartOdometer.textContent =
                formatNumber(
                    start
                );


            morningStartInfo.textContent =
                "Automatically taken from the previous final halt or the bus starting odometer.";

            startMorningButton.disabled =
                false;

        } else {

            morningStartOdometer.textContent =
                "—";


            morningStartInfo.textContent =
                "Starting odometer is not available.";

            startMorningButton.disabled =
                true;

        }

    }


    /* =====================================
       EVENING
    ===================================== */

    if (
        evening?.ended
    ) {

        const distance =
            Number(
                evening.distance
            ) || 0;


        eveningDistance.textContent =
            formatNumber(
                distance
            );


        eveningStatus.textContent =
            "COMPLETED";


        eveningIndicator.className =
            "indicator active";


        eveningStartArea.classList.add(
            "hidden"
        );

        eveningEndArea.classList.add(
            "hidden"
        );

        eveningCompleteArea.classList.remove(
            "hidden"
        );


        eveningCompleteText.textContent =
            `${formatNumber(evening.startOdometer)} → ${formatNumber(evening.endOdometer)} KM · ${formatNumber(distance)} KM`;

    }

    else if (
        evening?.started
    ) {

        eveningStatus.textContent =
            "IN PROGRESS";


        eveningIndicator.className =
            "indicator active";


        eveningStartArea.classList.add(
            "hidden"
        );

        eveningEndArea.classList.remove(
            "hidden"
        );

        eveningCompleteArea.classList.add(
            "hidden"
        );


        eveningStartedOdometer.textContent =
            formatNumber(
                evening.startOdometer
            );


        eveningStartedTime.textContent =
            formatTimestamp(
                evening.startedAt
            );

    }

    else {

        eveningStartArea.classList.remove(
            "hidden"
        );

        eveningEndArea.classList.add(
            "hidden"
        );

        eveningCompleteArea.classList.add(
            "hidden"
        );


        if (
            morning?.ended
        ) {

            const start =
                Number(
                    morning.endOdometer
                );


            eveningStartOdometer.textContent =
                formatNumber(
                    start
                );


            eveningStartInfo.textContent =
                "Automatically taken from the morning ending odometer.";

            startEveningButton.disabled =
                false;


            eveningStatus.textContent =
                "READY";

        } else {

            eveningStartOdometer.textContent =
                "—";


            eveningStartInfo.textContent =
                "Complete the morning pickup first.";

            startEveningButton.disabled =
                true;


            eveningStatus.textContent =
                "NOT READY";

        }


        eveningIndicator.className =
            "indicator";

    }


    /* =====================================
       TOTAL
    ===================================== */

    const morningKm =
        Number(
            morning?.distance
        ) || 0;


    const eveningKm =
        Number(
            evening?.distance
        ) || 0;


    morningDistance.textContent =
        morningKm > 0
            ? formatNumber(morningKm)
            : "—";


    eveningDistance.textContent =
        eveningKm > 0
            ? formatNumber(eveningKm)
            : "—";


    const total =
        morningKm +
        eveningKm;


    totalDistance.textContent =
        total > 0
            ? formatNumber(total)
            : "—";


    /* =====================================
       DAY COMPLETE
    ===================================== */

    if (
        currentTrip.completed
    ) {

        dayCompleteCard.classList.remove(
            "hidden"
        );


        dayCompleteDistance.textContent =
            `${formatNumber(total)} KM`;

    } else {

        dayCompleteCard.classList.add(
            "hidden"
        );

    }

}


/* =========================================
   FRESH STATE
========================================= */

function renderFreshState() {

    morningStatus.textContent =
        "NOT STARTED";

    eveningStatus.textContent =
        "NOT READY";


    morningIndicator.className =
        "indicator";

    eveningIndicator.className =
        "indicator";


    morningStartArea.classList.remove(
        "hidden"
    );

    morningEndArea.classList.add(
        "hidden"
    );

    morningCompleteArea.classList.add(
        "hidden"
    );


    eveningStartArea.classList.remove(
        "hidden"
    );

    eveningEndArea.classList.add(
        "hidden"
    );

    eveningCompleteArea.classList.add(
        "hidden"
    );


    const start =
        getAutomaticMorningStart();


    if (
        start != null
    ) {

        morningStartOdometer.textContent =
            formatNumber(
                start
            );


        morningStartInfo.textContent =
            "Automatically taken from the previous final halt or the bus starting odometer.";

        startMorningButton.disabled =
            false;

    } else {

        morningStartOdometer.textContent =
            "—";


        morningStartInfo.textContent =
            "Starting odometer is not available.";

        startMorningButton.disabled =
            true;

    }


    eveningStartOdometer.textContent =
        "—";


    eveningStartInfo.textContent =
        "Complete the morning pickup first.";

    startEveningButton.disabled =
        true;


    morningDistance.textContent =
        "—";

    eveningDistance.textContent =
        "—";

    totalDistance.textContent =
        "—";


    dayCompleteCard.classList.add(
        "hidden"
    );

}


/* =========================================
   RESET UI
========================================= */

function resetUI() {

    currentTrip =
        null;


    morningEndOdometer.value =
        "";

    eveningEndOdometer.value =
        "";


    hideMessage();

}


/* =========================================
   BUTTON LOADING
========================================= */

function setButtonLoading(
    button,
    loading
) {

    if (
        loading
    ) {

        button.disabled =
            true;

        button.dataset.originalText =
            button.textContent;

        button.textContent =
            "SAVING...";

    } else {

        button.textContent =
            button.dataset.originalText ||
            button.textContent;

    }

}


/* =========================================
   LOGOUT
========================================= */

logoutButton.addEventListener(
    "click",
    async () => {

        try {

            await signOut(
                auth
            );


            window.location.href =
                "../login/";

        } catch (error) {

            console.error(
                error
            );


            showMessage(
                "Unable to logout."
            );

        }

    }
);


/* =========================================
   MESSAGE
========================================= */

function showMessage(
    text
) {

    message.textContent =
        text;

    message.classList.remove(
        "hidden"
    );

}


function hideMessage() {

    message.textContent =
        "";

    message.classList.add(
        "hidden"
    );

}


/* =========================================
   LOADING
========================================= */

function hideLoading() {

    loadingScreen.classList.add(
        "hidden"
    );

    app.classList.remove(
        "hidden"
    );

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
            maximumFractionDigits: 1
        }
    );

}


/* =========================================
   ROUND
========================================= */

function roundNumber(
    value
) {

    return Math.round(
        Number(value) * 10
    ) / 10;

}


/* =========================================
   LOCAL DATE KEY
========================================= */

function getLocalDateKey(
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


/* =========================================
   TIMESTAMP FORMAT
========================================= */

function formatTimestamp(
    timestamp
) {

    if (
        !timestamp
    ) {

        return "—";

    }


    /*
     * Firestore Timestamp
     */

    if (
        typeof timestamp.toDate ===
        "function"
    ) {

        return timestamp
            .toDate()
            .toLocaleString(
                "en-IN",
                {
                    dateStyle: "medium",
                    timeStyle: "short"
                }
            );

    }


    return "Saved";

}
