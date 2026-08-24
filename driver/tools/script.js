import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "../../core/firebase.js";


/* =================================
   ELEMENTS
================================= */

const busNumber =
    document.getElementById(
        "busNumber"
    );

const busRegistration =
    document.getElementById(
        "busRegistration"
    );

const busStatus =
    document.getElementById(
        "busStatus"
    );

const problemForm =
    document.getElementById(
        "problemForm"
    );

const problemInput =
    document.getElementById(
        "problem"
    );

const submitButton =
    document.getElementById(
        "submitButton"
    );

const message =
    document.getElementById(
        "message"
    );


/* =================================
   CURRENT USER / DRIVER / BUS
================================= */

let currentUser = null;

let currentDriver = null;

let currentBus = null;


/* =================================
   LOGIN
================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        /*
         * NOT LOGGED IN
         */

        if (!user) {

            window.location.href =
                "../login/";

            return;

        }


        currentUser = user;


        try {

            /*
             * Find logged-in driver's
             * driver document.
             */

            await findDriver();


            /*
             * Find ONLY the bus assigned
             * to this driver.
             */

            await findAssignedBus();


        } catch (error) {

            console.error(
                "TOOLS LOAD ERROR:",
                error
            );


            showError(
                error.message
            );

        }

    }
);


/* =================================
   FIND DRIVER
================================= */

async function findDriver() {

    /*
     * We support both common structures:
     *
     * drivers/{uid}
     *
     * OR
     *
     * drivers document containing uid
     */

    let driverSnapshot =
        await getDocs(

            query(
                collection(
                    db,
                    "drivers"
                ),

                where(
                    "uid",
                    "==",
                    currentUser.uid
                )
            )

        );


    /*
     * If no document was found using uid,
     * try document ID = Firebase UID.
     */

    if (
        driverSnapshot.empty
    ) {

        /*
         * We cannot use getDoc here
         * because we're keeping this file
         * simple and compatible with the
         * existing Firebase setup.
         *
         * Instead get all drivers and
         * match document ID.
         */

        const allDrivers =
            await getDocs(
                collection(
                    db,
                    "drivers"
                )
            );


        let found = null;


        allDrivers.forEach(
            (document) => {

                if (
                    document.id ===
                    currentUser.uid
                ) {

                    found = {

                        id:
                            document.id,

                        ...document.data()

                    };

                }

            }
        );


        if (!found) {

            throw new Error(
                "Your driver profile was not found."
            );

        }


        currentDriver =
            found;


        return;

    }


    const document =
        driverSnapshot.docs[0];


    currentDriver = {

        id:
            document.id,

        ...document.data()

    };

}


/* =================================
   FIND ASSIGNED BUS
================================= */

async function findAssignedBus() {

    /*
     * IMPORTANT:
     *
     * We do NOT show a bus selector.
     *
     * We automatically find the bus
     * assigned to this driver.
     */


    const allBuses =
        await getDocs(
            collection(
                db,
                "buses"
            )
        );


    let assignedBus = null;


    allBuses.forEach(
        (document) => {

            const bus =
                document.data();


            /*
             * Possible assignment fields.
             */

            const assignedDriverId =
                bus.assignedDriverId ||
                bus.driverId ||
                bus.driverUid;


            /*
             * Match driver's document ID.
             */

            if (
                assignedDriverId ===
                currentDriver.id
            ) {

                assignedBus = {

                    id:
                        document.id,

                    ...bus

                };

            }


            /*
             * Also match Firebase UID.
             */

            if (
                assignedDriverId ===
                currentUser.uid
            ) {

                assignedBus = {

                    id:
                        document.id,

                    ...bus

                };

            }

        }
    );


    /*
     * No bus assigned.
     */

    if (
        !assignedBus
    ) {

        currentBus = null;


        busNumber.textContent =
            "No bus assigned";

        busRegistration.textContent =
            "Contact administration";

        busStatus.textContent =
            "●";

        busStatus.className =
            "bus-status";


        submitButton.disabled =
            true;


        showError(
            "You do not have a bus assigned to you."
        );


        return;

    }


    currentBus =
        assignedBus;


    /*
     * DISPLAY BUS
     */

    busNumber.textContent =
        currentBus.busNumber ||
        currentBus.name ||
        "Bus";


    busRegistration.textContent =
        currentBus.registrationNumber ||
        currentBus.registrationNo ||
        "Assigned vehicle";


    busStatus.textContent =
        "●";

    busStatus.className =
        "bus-status";


    /*
     * NOW DRIVER CAN SUBMIT
     */

    submitButton.disabled =
        false;

}


/* =================================
   SUBMIT PROBLEM
================================= */

problemForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        /*
         * Security check on client side.
         */

        if (
            !currentUser ||
            !currentDriver
        ) {

            showError(
                "Driver login could not be verified."
            );

            return;

        }


        if (
            !currentBus
        ) {

            showError(
                "No bus is assigned to you."
            );

            return;

        }


        const problem =
            problemInput.value.trim();


        const selectedType =
            document.querySelector(
                'input[name="problemType"]:checked'
            );


        if (
            !problem
        ) {

            showError(
                "Please describe the problem."
            );

            return;

        }


        if (
            !selectedType
        ) {

            showError(
                "Please select the problem type."
            );

            return;

        }


        const problemType =
            selectedType.value;


        submitButton.disabled =
            true;

        submitButton.textContent =
            "SUBMITTING...";


        clearMessage();


        try {

            /*
             * CREATE MAINTENANCE TICKET
             */

            await addDoc(

                collection(
                    db,
                    "maintenanceTickets"
                ),

                {

                    /* BUS */

                    busId:
                        currentBus.id,

                    busNumber:
                        currentBus.busNumber ||
                        currentBus.name ||
                        "",

                    busRegistration:
                        currentBus.registrationNumber ||
                        currentBus.registrationNo ||
                        "",


                    /* DRIVER */

                    driverId:
                        currentDriver.id,

                    driverUid:
                        currentUser.uid,

                    driverName:
                        currentDriver.name ||
                        currentUser.displayName ||
                        currentUser.email ||
                        "",


                    /* PROBLEM */

                    problem:
                        problem,

                    problemType:
                        problemType,


                    /* STATUS */

                    status:
                        "reported",

                    solved:
                        false,


                    /* TIMESTAMP */

                    reportedAt:
                        serverTimestamp(),


                    /* ADMIN FIELDS */

                    solvedBy:
                        "",

                    solution:
                        "",

                    partsReplaced:
                        [],

                    partsCost:
                        0,

                    labourCost:
                        0,

                    totalCost:
                        0

                }

            );


            /*
             * SUCCESS
             */

            problemForm.reset();


            showSuccess(
                "Problem reported successfully."
            );


        } catch (error) {

            console.error(
                "PROBLEM SUBMIT ERROR:",
                error
            );


            showError(
                "Could not submit the problem. Please try again."
            );

        }


        submitButton.disabled =
            !currentBus;

        submitButton.textContent =
            "REPORT PROBLEM";

    }
);


/* =================================
   SUCCESS
================================= */

function showSuccess(
    text
) {

    message.textContent =
        text;

    message.className =
        "message success";

}


/* =================================
   ERROR
================================= */

function showError(
    text
) {

    message.textContent =
        text;

    message.className =
        "message error";

}


/* =================================
   CLEAR
================================= */

function clearMessage() {

    message.textContent =
        "";

    message.className =
        "message";

}
