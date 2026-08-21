import {
    doc,
    getDoc
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
    document.getElementById(
        "loadingScreen"
    );

const driverName =
    document.getElementById(
        "driverName"
    );

const busNumber =
    document.getElementById(
        "busNumber"
    );

const registrationNumber =
    document.getElementById(
        "registrationNumber"
    );

const route =
    document.getElementById(
        "route"
    );

const todayDate =
    document.getElementById(
        "todayDate"
    );

const morningStatus =
    document.getElementById(
        "morningStatus"
    );

const morningDescription =
    document.getElementById(
        "morningDescription"
    );

const morningButton =
    document.getElementById(
        "morningButton"
    );

const morningSaved =
    document.getElementById(
        "morningSaved"
    );

const morningValue =
    document.getElementById(
        "morningValue"
    );

const morningTime =
    document.getElementById(
        "morningTime"
    );

const eveningStatus =
    document.getElementById(
        "eveningStatus"
    );

const eveningDescription =
    document.getElementById(
        "eveningDescription"
    );

const eveningButton =
    document.getElementById(
        "eveningButton"
    );

const eveningSaved =
    document.getElementById(
        "eveningSaved"
    );

const eveningValue =
    document.getElementById(
        "eveningValue"
    );

const eveningTime =
    document.getElementById(
        "eveningTime"
    );

const distanceValue =
    document.getElementById(
        "distanceValue"
    );

const dieselButton =
    document.getElementById(
        "dieselButton"
    );

const historyButton =
    document.getElementById(
        "historyButton"
    );

const logoutButton =
    document.getElementById(
        "logoutButton"
    );


/* =========================================
   STATE
========================================= */

let currentDriver =
    null;

let currentBus =
    null;


/* =========================================
   DATE
========================================= */

const today =
    new Date();


todayDate.textContent =
    today.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
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


        try {

            await loadDriver(
                user.uid
            );


        } catch (error) {

            console.error(
                "DRIVER PANEL ERROR:",
                error
            );

            alert(
                error.message ||
                "Unable to load driver account."
            );

            await signOut(
                auth
            );

            window.location.href =
                "../login/";

        }

    }
);


/* =========================================
   LOAD DRIVER
========================================= */

async function loadDriver(
    uid
) {

    const driverReference =
        doc(
            db,
            "users",
            uid
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


    currentDriver = {

        id: uid,

        ...driver

    };


    driverName.textContent =
        driver.name ||
        "Driver";


    /* =====================================
       BUS
    ===================================== */

    if (
        !driver.assignedBusId
    ) {

        busNumber.textContent =
            "No Bus Assigned";

        registrationNumber.textContent =
            "";

        route.textContent =
            "Please contact administrator.";

        disableReadingButtons();

        hideLoading();

        return;

    }


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
            "Your assigned bus could not be found."
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


    route.textContent =
        currentBus.route ||
        "Route not configured";


    /*
     * For now, readings are prepared
     * as pending.
     *
     * The actual Firestore reading
     * screen will be connected next.
     */

    updateReadingAvailability();


    hideLoading();

}


/* =========================================
   TIME CONTROL
========================================= */


/* =========================================
   BUTTONS
========================================= */

morningButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../reading/?type=morning";

    }
);


eveningButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../reading/?type=evening";

    }
);


dieselButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../diesel/";

    }
);


historyButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../history/";

    }
);


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
                "Logout error:",
                error
            );

        }

    }
);


/* =========================================
   DISABLE
========================================= */

function disableReadingButtons() {

    morningButton.disabled =
        true;

    eveningButton.disabled =
        true;

}


/* =========================================
   LOADING
========================================= */

function hideLoading() {

    loadingScreen.classList.add(
        "hidden"
    );

}
