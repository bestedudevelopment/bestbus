import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
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


/* =========================
   ELEMENTS
========================= */

const driverName =
    document.getElementById("driverName");

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

const openingMeter =
    document.getElementById("openingMeter");

const closingMeter =
    document.getElementById("closingMeter");

const distance =
    document.getElementById("distance");

const dieselLitres =
    document.getElementById("dieselLitres");

const dieselAmount =
    document.getElementById("dieselAmount");

const mileage =
    document.getElementById("mileage");

const meterPhoto =
    document.getElementById("meterPhoto");

const photoName =
    document.getElementById("photoName");

const submitButton =
    document.getElementById("submitButton");

const errorMessage =
    document.getElementById("errorMessage");

const todayStatus =
    document.getElementById("todayStatus");

const logoutButton =
    document.getElementById("logoutButton");


/* =========================
   STATE
========================= */

let currentUser = null;

let driverProfile = null;

let assignedBus = null;


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


        currentUser =
            user;


        try {

            await loadDriverProfile();


        } catch (error) {

            console.error(
                "Driver loading error:",
                error
            );


            showError(
                error.message ||
                "Unable to load driver information."
            );
        }

    }
);


/* =========================
   LOAD DRIVER
========================= */

async function loadDriverProfile() {

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
            "Driver profile was not found."
        );
    }


    driverProfile =
        driverSnapshot.data();


    console.log(
        "Driver profile:",
        driverProfile
    );


    if (
        driverProfile.role !== "driver"
    ) {

        throw new Error(
            "This account is not registered as a driver."
        );
    }


    if (
        driverProfile.active === false
    ) {

        throw new Error(
            "Your driver account is inactive."
        );
    }


    driverName.textContent =
        driverProfile.name ||
        "Driver";


    const busId =
        driverProfile.assignedBusId;


    if (!busId) {

        throw new Error(
            "No bus has been assigned to your account."
        );
    }


    await loadAssignedBus(
        busId
    );


    await checkTodayEntry();

}


/* =========================
   LOAD BUS
========================= */

async function loadAssignedBus(
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
            "Your assigned bus could not be found."
        );
    }


    assignedBus = {

        id:
            busSnapshot.id,

        ...busSnapshot.data()

    };


    console.log(
        "Assigned bus:",
        assignedBus
    );


    busNumber.textContent =
        assignedBus.busNumber ||
        "BUS";


    registrationNumber.textContent =
        assignedBus.registrationNumber ||
        "No Registration";


    route.textContent =
        assignedBus.route ||
        "No Route";


    const meter =
        Number(
            assignedBus.currentOdometer || 0
        );


    currentMeter.textContent =
        meter
            ? formatNumber(meter)
            : "—";


    const expected =
        Number(
            assignedBus.expectedMileage || 0
        );


    expectedMileage.textContent =
        expected
            ? expected.toFixed(2)
            : "—";


    /*
     * Automatically use the current
     * bus meter as the opening meter.
     */

    if (meter > 0) {

        openingMeter.value =
            meter;

    }


    calculateValues();

}


/* =========================
   CALCULATIONS
========================= */

openingMeter.addEventListener(
    "input",
    calculateValues
);

closingMeter.addEventListener(
    "input",
    calculateValues
);

dieselLitres.addEventListener(
    "input",
    calculateValues
);


function calculateValues() {

    const opening =
        Number(
            openingMeter.value
        );


    const closing =
        Number(
            closingMeter.value
        );


    const diesel =
        Number(
            dieselLitres.value
        );


    /* DISTANCE */

    if (
        closing > 0 &&
        opening >= 0 &&
        closing >= opening
    ) {

        const km =
            closing - opening;


        distance.textContent =
            `${formatNumber(km)} KM`;

    } else {

        distance.textContent =
            "0 KM";
    }


    /* MILEAGE */

    if (
        closing >= opening &&
        diesel > 0
    ) {

        const km =
            closing - opening;


        const calculated =
            km / diesel;


        if (
            calculated >= 0
        ) {

            mileage.textContent =
                calculated.toFixed(2);

        }

    } else {

        mileage.textContent =
            "—";
    }

}


/* =========================
   PHOTO
========================= */

meterPhoto.addEventListener(
    "change",
    () => {

        if (
            meterPhoto.files &&
            meterPhoto.files.length
        ) {

            photoName.textContent =
                meterPhoto.files[0].name;

        } else {

            photoName.textContent =
                "";

        }

    }
);


/* =========================
   SUBMIT
========================= */

submitButton.addEventListener(
    "click",
    submitDailyEntry
);


async function submitDailyEntry() {

    hideError();


    if (!assignedBus) {

        showError(
            "Bus information is not loaded."
        );

        return;
    }


    const opening =
        Number(
            openingMeter.value
        );


    const closing =
        Number(
            closingMeter.value
        );


    const diesel =
        Number(
            dieselLitres.value
        );


    const amount =
        Number(
            dieselAmount.value || 0
        );


    /* =====================
       VALIDATION
    ===================== */

    if (
        !openingMeter.value
    ) {

        showError(
            "Please enter the opening meter."
        );

        return;
    }


    if (
        !closingMeter.value
    ) {

        showError(
            "Please enter the closing meter."
        );

        return;
    }


    if (
        closing < opening
    ) {

        showError(
            "Closing meter cannot be lower than opening meter."
        );

        return;
    }


    if (
        !diesel ||
        diesel <= 0
    ) {

        showError(
            "Please enter the diesel quantity."
        );

        return;
    }


    const travelled =
        closing - opening;


    const calculatedMileage =
        travelled / diesel;


    /* =====================
       TODAY
    ===================== */

    const today =
        getTodayString();


    /* =====================
       CHECK DUPLICATE
    ===================== */

    try {

        submitButton.disabled =
            true;

        submitButton.textContent =
            "CHECKING...";


        const existingQuery =
            query(
                collection(
                    db,
                    "dailyEntries"
                ),

                where(
                    "driverId",
                    "==",
                    currentUser.uid
                ),

                where(
                    "busId",
                    "==",
                    assignedBus.id
                ),

                where(
                    "date",
                    "==",
                    today
                )
            );


        const existingSnapshot =
            await getDocs(
                existingQuery
            );


        if (
            !existingSnapshot.empty
        ) {

            showError(
                "Today's entry has already been submitted."
            );

            submitButton.disabled =
                false;

            submitButton.textContent =
                "SUBMIT TODAY";

            return;
        }


        /* =====================
           STATUS
        ===================== */

        const expected =
            Number(
                assignedBus.expectedMileage || 0
            );


        let status =
            "normal";


        if (expected > 0) {

            const variation =
                (
                    (
                        calculatedMileage -
                        expected
                    ) /
                    expected
                ) * 100;


            if (
                Math.abs(variation) <= 5
            ) {

                status =
                    "normal";

            } else if (
                Math.abs(variation) <= 15
            ) {

                status =
                    "warning";

            } else {

                status =
                    "danger";
            }

        }


        /* =====================
           SAVE
        ===================== */

        submitButton.textContent =
            "SAVING...";


        const entry = {

            date:
                today,

            busId:
                assignedBus.id,

            driverId:
                currentUser.uid,

            openingMeter:
                opening,

            closingMeter:
                closing,

            distance:
                travelled,

            dieselLitres:
                diesel,

            dieselAmount:
                amount,

            calculatedMileage:
                Number(
                    calculatedMileage.toFixed(2)
                ),

            expectedMileage:
                expected,

            status:
                status,

            meterPhotoUrl:
                "",

            createdAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp()

        };


        const entryReference =
            await addDoc(
                collection(
                    db,
                    "dailyEntries"
                ),
                entry
            );


        console.log(
            "Daily entry saved:",
            entryReference.id
        );


        /* =====================
           UPDATE BUS METER
        ===================== */

        /*
         * The bus's current meter becomes
         * today's closing meter.
         */

        const busReference =
            doc(
                db,
                "buses",
                assignedBus.id
            );


        /*
         * We use updateDoc dynamically
         * so the page remains compatible
         * with the existing Firebase setup.
         */

        const {
            updateDoc
        } = await import(
            "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js"
        );


        await updateDoc(
            busReference,
            {
                currentOdometer:
                    closing,

                updatedAt:
                    serverTimestamp()
            }
        );


        todayStatus.textContent =
            "SUBMITTED ✓";


        todayStatus.style.color =
            "#16803c";


        submitButton.textContent =
            "SUBMITTED";


        submitButton.disabled =
            true;


        /*
         * Keep the current screen.
         * We will later add photo upload,
         * history and editing.
         */

    } catch (error) {

        console.error(
            "Daily entry error:",
            error
        );


        showError(
            error.message ||
            "Unable to save today's entry."
        );


        submitButton.disabled =
            false;

        submitButton.textContent =
            "SUBMIT TODAY";
    }

}


/* =========================
   CHECK TODAY
========================= */

async function checkTodayEntry() {

    if (
        !currentUser ||
        !assignedBus
    ) {
        return;
    }


    try {

        const today =
            getTodayString();


        const entryQuery =
            query(
                collection(
                    db,
                    "dailyEntries"
                ),

                where(
                    "driverId",
                    "==",
                    currentUser.uid
                ),

                where(
                    "busId",
                    "==",
                    assignedBus.id
                ),

                where(
                    "date",
                    "==",
                    today
                )
            );


        const snapshot =
            await getDocs(
                entryQuery
            );


        if (
            snapshot.empty
        ) {

            todayStatus.textContent =
                "NOT SUBMITTED";

            return;
        }


        const entry =
            snapshot.docs[0].data();


        todayStatus.textContent =
            "SUBMITTED ✓";


        todayStatus.style.color =
            "#16803c";


        /*
         * Fill today's saved values.
         */

        openingMeter.value =
            entry.openingMeter;


        closingMeter.value =
            entry.closingMeter;


        dieselLitres.value =
            entry.dieselLitres;


        dieselAmount.value =
            entry.dieselAmount || "";


        calculateValues();


        submitButton.textContent =
            "ALREADY SUBMITTED";


        submitButton.disabled =
            true;


    } catch (error) {

        console.log(
            "No previous entry found."
        );

    }

}


/* =========================
   LOGOUT
========================= */

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
                "Logout error:",
                error
            );

        }

    }
);


/* =========================
   ERROR
========================= */

function showError(
    message
) {

    errorMessage.textContent =
        message;

    errorMessage.classList.remove(
        "hidden"
    );

}


function hideError() {

    errorMessage.textContent =
        "";

    errorMessage.classList.add(
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
   NUMBER
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
