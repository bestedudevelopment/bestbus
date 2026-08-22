import {
    doc,
    getDoc,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    serverTimestamp
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


const morningOdometer =
    document.getElementById(
        "morningOdometer"
    );


const eveningOdometer =
    document.getElementById(
        "eveningOdometer"
    );


const morningButton =
    document.getElementById(
        "morningButton"
    );


const eveningButton =
    document.getElementById(
        "eveningButton"
    );


const morningButtonText =
    document.getElementById(
        "morningButtonText"
    );


const eveningButtonText =
    document.getElementById(
        "eveningButtonText"
    );


const morningSpinner =
    document.getElementById(
        "morningSpinner"
    );


const eveningSpinner =
    document.getElementById(
        "eveningSpinner"
    );


const morningExisting =
    document.getElementById(
        "morningExisting"
    );


const morningExistingValue =
    document.getElementById(
        "morningExistingValue"
    );


const eveningExisting =
    document.getElementById(
        "eveningExisting"
    );


const eveningExistingValue =
    document.getElementById(
        "eveningExistingValue"
    );


const todayDistance =
    document.getElementById(
        "todayDistance"
    );


const dayStatus =
    document.getElementById(
        "dayStatus"
    );


const calculationText =
    document.getElementById(
        "calculationText"
    );


const errorMessage =
    document.getElementById(
        "errorMessage"
    );


const successMessage =
    document.getElementById(
        "successMessage"
    );


/* =========================================
   STATE
========================================= */

let currentUser = null;

let currentDriver = null;

let currentBus = null;

let morningRecord = null;

let eveningRecord = null;


/* =========================================
   BACK BUTTON
========================================= */

backButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../driver/";

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

            await loadTodayReadings();

            updatePage();

            hideLoading();

        } catch (error) {

            console.error(
                "READING PAGE ERROR:",
                error
            );


            showError(
                error.message ||
                "Unable to load reading page."
            );


            hideLoading();

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


    const driverSnapshot =
        await getDoc(
            driverReference
        );


    if (
        !driverSnapshot.exists()
    ) {

        throw new Error(
            "Driver account not found."
        );

    }


    const driver =
        driverSnapshot.data();


    if (
        driver.role !==
        "driver"
    ) {

        throw new Error(
            "This account is not a driver account."
        );

    }


    if (
        driver.active === false
    ) {

        throw new Error(
            "Your driver account is inactive."
        );

    }


    if (
        !driver.assignedBusId
    ) {

        throw new Error(
            "No bus is assigned to you."
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
        "BUS";


    registrationNumber.textContent =
        currentBus.registrationNumber ||
        currentBus.registrationNo ||
        "";

}


/* =========================================
   LOAD TODAY'S READINGS
========================================= */

async function loadTodayReadings() {

    const today =
        getTodayKey();


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
                currentBus.id
            ),

            where(
                "date",
                "==",
                today
            )
        );


    const snapshot =
        await getDocs(
            readingsQuery
        );


    morningRecord =
        null;


    eveningRecord =
        null;


    snapshot.forEach(
        (documentSnapshot) => {

            const data =
                documentSnapshot.data();


            const record = {

                id:
                    documentSnapshot.id,

                ...data

            };


            if (
                data.type ===
                "morning"
            ) {

                /*
                 * Only use this driver's
                 * reading for the UI.
                 */

                if (
                    data.driverId ===
                    currentUser.uid
                ) {

                    morningRecord =
                        record;

                }

            }


            if (
                data.type ===
                "evening"
            ) {

                if (
                    data.driverId ===
                    currentUser.uid
                ) {

                    eveningRecord =
                        record;

                }

            }

        }
    );

}


/* =========================================
   MORNING SAVE
========================================= */

morningButton.addEventListener(
    "click",
    async () => {

        hideMessages();


        const value =
            Number(
                morningOdometer.value
            );


        if (
            !value ||
            value < 0
        ) {

            showError(
                "Enter a valid morning odometer reading."
            );

            morningOdometer.focus();

            return;

        }


        /*
         * If already saved today,
         * don't create another one.
         */

        if (
            morningRecord
        ) {

            showError(
                "Morning reading has already been saved for today."
            );

            return;

        }


        setMorningLoading(
            true
        );


        try {

            const readingData = {

                driverId:
                    currentUser.uid,

                busId:
                    currentBus.id,

                type:
                    "morning",

                odometer:
                    value,

                date:
                    getTodayKey(),

                createdAt:
                    serverTimestamp()

            };


            const reference =
                await addDoc(
                    collection(
                        db,
                        "driverReadings"
                    ),
                    readingData
                );


            console.log(
                "Morning reading saved:",
                reference.id
            );


            morningRecord = {

                id:
                    reference.id,

                ...readingData,

                odometer:
                    value

            };


            morningOdometer.value =
                "";


            updatePage();


            showSuccess(
                "Morning reading saved successfully."
            );


        } catch (error) {

            console.error(
                "MORNING SAVE ERROR:",
                error
            );


            showError(
                error.message ||
                "Unable to save morning reading."
            );

        }


        setMorningLoading(
            false
        );

    }
);


/* =========================================
   EVENING SAVE
========================================= */

eveningButton.addEventListener(
    "click",
    async () => {

        hideMessages();


        const value =
            Number(
                eveningOdometer.value
            );


        if (
            !value ||
            value < 0
        ) {

            showError(
                "Enter a valid evening odometer reading."
            );

            eveningOdometer.focus();

            return;

        }


        if (
            eveningRecord
        ) {

            showError(
                "Evening reading has already been saved for today."
            );

            return;

        }


        /*
         * If morning exists, evening
         * should not be lower.
         */

        if (
            morningRecord &&
            value <
            Number(
                morningRecord.odometer
            )
        ) {

            showError(
                "Evening odometer cannot be lower than the morning reading."
            );

            eveningOdometer.focus();

            return;

        }


        setEveningLoading(
            true
        );


        try {

            const readingData = {

                driverId:
                    currentUser.uid,

                busId:
                    currentBus.id,

                type:
                    "evening",

                odometer:
                    value,

                date:
                    getTodayKey(),

                createdAt:
                    serverTimestamp()

            };


            const reference =
                await addDoc(
                    collection(
                        db,
                        "driverReadings"
                    ),
                    readingData
                );


            console.log(
                "Evening reading saved:",
                reference.id
            );


            eveningRecord = {

                id:
                    reference.id,

                ...readingData,

                odometer:
                    value

            };


            eveningOdometer.value =
                "";


            updatePage();


            showSuccess(
                "Evening reading saved successfully."
            );


        } catch (error) {

            console.error(
                "EVENING SAVE ERROR:",
                error
            );


            showError(
                error.message ||
                "Unable to save evening reading."
            );

        }


        setEveningLoading(
            false
        );

    }
);


/* =========================================
   UPDATE PAGE
========================================= */

function updatePage() {

    /*
     * Morning
     */

    if (
        morningRecord
    ) {

        morningExisting.classList.remove(
            "hidden"
        );


        morningExistingValue.textContent =
            formatNumber(
                morningRecord.odometer
            ) +
            " KM";


        morningButton.disabled =
            true;


        morningButtonText.textContent =
            "MORNING READING SAVED";

    } else {

        morningExisting.classList.add(
            "hidden"
        );


        morningButton.disabled =
            false;


        morningButtonText.textContent =
            "SAVE MORNING READING";

    }


    /*
     * Evening
     */

    if (
        eveningRecord
    ) {

        eveningExisting.classList.remove(
            "hidden"
        );


        eveningExistingValue.textContent =
            formatNumber(
                eveningRecord.odometer
            ) +
            " KM";


        eveningButton.disabled =
            true;


        eveningButtonText.textContent =
            "EVENING READING SAVED";

    } else {

        eveningExisting.classList.add(
            "hidden"
        );


        eveningButton.disabled =
            false;


        eveningButtonText.textContent =
            "SAVE EVENING READING";

    }


    /*
     * Distance
     */

    if (
        morningRecord &&
        eveningRecord
    ) {

        const morning =
            Number(
                morningRecord.odometer
            );


        const evening =
            Number(
                eveningRecord.odometer
            );


        const distance =
            evening -
            morning;


        todayDistance.textContent =
            formatNumber(
                distance
            );


        dayStatus.textContent =
            "COMPLETED";


        dayStatus.style.color =
            "#15803d";


        calculationText.textContent =
            `${formatNumber(evening)} − ${formatNumber(morning)} = ${formatNumber(distance)} KM travelled today.`;

    }

    else if (
        morningRecord
    ) {

        todayDistance.textContent =
            "—";


        dayStatus.textContent =
            "STARTED";


        dayStatus.style.color =
            "#9a7300";


        calculationText.textContent =
            "Morning reading saved. Enter the evening reading to calculate today's distance.";

    }

    else {

        todayDistance.textContent =
            "—";


        dayStatus.textContent =
            "NOT STARTED";


        dayStatus.style.color =
            "#777";


        calculationText.textContent =
            "Morning and evening readings will calculate the distance automatically.";

    }

}


/* =========================================
   DATE KEY
========================================= */

function getTodayKey() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


/* =========================================
   NUMBER FORMAT
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
   MORNING LOADING
========================================= */

function setMorningLoading(
    loading
) {

    morningButton.disabled =
        loading;


    morningButtonText.classList.toggle(
        "hidden",
        loading
    );


    morningSpinner.classList.toggle(
        "hidden",
        !loading
    );

}


/* =========================================
   EVENING LOADING
========================================= */

function setEveningLoading(
    loading
) {

    eveningButton.disabled =
        loading;


    eveningButtonText.classList.toggle(
        "hidden",
        loading
    );


    eveningSpinner.classList.toggle(
        "hidden",
        !loading
    );

}


/* =========================================
   ERROR
========================================= */

function showError(
    message
) {

    errorMessage.textContent =
        message;


    errorMessage.classList.remove(
        "hidden"
    );


    successMessage.classList.add(
        "hidden"
    );

}


/* =========================================
   SUCCESS
========================================= */

function showSuccess(
    message
) {

    successMessage.textContent =
        message;


    successMessage.classList.remove(
        "hidden"
    );


    errorMessage.classList.add(
        "hidden"
    );

}


/* =========================================
   HIDE MESSAGES
========================================= */

function hideMessages() {

    errorMessage.classList.add(
        "hidden"
    );


    successMessage.classList.add(
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
