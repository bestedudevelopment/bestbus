import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth,
    db
} from "../../core/firebase.js";


/* ================================
   ELEMENTS
================================ */

const form =
    document.getElementById(
        "problemForm"
    );

const busDisplay =
    document.getElementById(
        "busDisplay"
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


/* ================================
   STATE
================================ */

let currentUser = null;

let currentDriver = null;

let currentBus = null;


/* ================================
   AUTH
================================ */

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

            await loadAssignedBus();


        } catch (error) {

            console.error(
                "TOOLS ERROR:",
                error
            );


            busDisplay.textContent =
                "Unable to load bus";


            showMessage(
                error.message,
                "error"
            );

        }

    }
);


/* ================================
   LOAD DRIVER
================================ */

async function loadDriver() {

    /*
     * Drivers collection uses
     * document ID as the driver ID.
     */

    const driverQuery =
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
        );


    const snapshot =
        await getDocs(
            driverQuery
        );


    if (
        snapshot.empty
    ) {

        throw new Error(
            "Driver profile not found."
        );

    }


    const driverDocument =
        snapshot.docs[0];


    currentDriver = {

        id:
            driverDocument.id,

        ...driverDocument.data()

    };

}


/* ================================
   LOAD ASSIGNED BUS
================================ */

async function loadAssignedBus() {

    /*
     * First try the driver's
     * assignedBusId.
     */

    if (
        currentDriver.assignedBusId
    ) {

        const busesSnapshot =
            await getDocs(
                query(
                    collection(
                        db,
                        "buses"
                    ),
                    where(
                        "__name__",
                        "==",
                        currentDriver.assignedBusId
                    )
                )
            );


        if (
            !busesSnapshot.empty
        ) {

            const document =
                busesSnapshot.docs[0];


            currentBus = {

                id:
                    document.id,

                ...document.data()

            };

        }

    }


    /*
     * If no bus was found,
     * search buses by driver ID.
     */

    if (
        !currentBus
    ) {

        const busesSnapshot =
            await getDocs(
                collection(
                    db,
                    "buses"
                )
            );


        busesSnapshot.forEach(
            document => {

                const bus =
                    document.data();


                const assignedDriver =
                    bus.assignedDriverId ||
                    bus.driverId;


                if (
                    assignedDriver ===
                    currentDriver.id
                    ||
                    assignedDriver ===
                    currentUser.uid
                ) {

                    currentBus = {

                        id:
                            document.id,

                        ...bus

                    };

                }

            }
        );

    }


    if (
        !currentBus
    ) {

        busDisplay.textContent =
            "No bus assigned";

        return;

    }


    busDisplay.innerHTML = `
        🚌
        ${escapeHTML(
            currentBus.busNumber ||
            currentBus.registrationNumber ||
            "Assigned Bus"
        )}
    `;

}


/* ================================
   SUBMIT PROBLEM
================================ */

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        if (
            !currentUser
        ) {

            showMessage(
                "Please login again.",
                "error"
            );

            return;

        }


        if (
            !currentBus
        ) {

            showMessage(
                "No bus is currently assigned to you.",
                "error"
            );

            return;

        }


        const problem =
            problemInput.value.trim();


        const typeElement =
            document.querySelector(
                'input[name="problemType"]:checked'
            );


        if (
            !problem
        ) {

            showMessage(
                "Please describe the problem.",
                "error"
            );

            return;

        }


        if (
            !typeElement
        ) {

            showMessage(
                "Please select the problem type.",
                "error"
            );

            return;

        }


        const problemType =
            typeElement.value;


        submitButton.disabled =
            true;

        submitButton.textContent =
            "SUBMITTING...";


        try {

            /*
             * Create a maintenance
             * ticket.
             */

            await addDoc(

                collection(
                    db,
                    "maintenanceTickets"
                ),

                {

                    /*
                     * BUS
                     */

                    busId:
                        currentBus.id,

                    busNumber:
                        currentBus.busNumber ||
                        currentBus.registrationNumber ||
                        "Unknown",


                    /*
                     * DRIVER
                     */

                    driverId:
                        currentDriver.id,

                    driverUid:
                        currentUser.uid,

                    driverName:
                        currentDriver.name ||
                        currentUser.displayName ||
                        currentUser.email ||
                        "Unknown",


                    /*
                     * PROBLEM
                     */

                    problem:
                        problem,

                    problemType:
                        problemType,


                    /*
                     * STATUS
                     */

                    status:
                        "reported",


                    /*
                     * TIME
                     */

                    reportedAt:
                        serverTimestamp(),


                    /*
                     * Admin will fill these
                     * later.
                     */

                    solved:
                        false,

                    solvedBy:
                        "",

                    solution:
                        "",

                    partsReplaced:
                        [],

                    labourCost:
                        0,

                    partsCost:
                        0,

                    totalCost:
                        0

                }

            );


            form.reset();


            showMessage(
                "Problem reported successfully.",
                "success"
            );


        } catch (error) {

            console.error(
                "SUBMIT ERROR:",
                error
            );


            showMessage(
                "Unable to submit problem. Please try again.",
                "error"
            );

        }


        submitButton.disabled =
            false;

        submitButton.textContent =
            "SUBMIT PROBLEM";

    }
);


/* ================================
   MESSAGE
================================ */

function showMessage(
    text,
    type
) {

    message.textContent =
        text;

    message.className =
        `message ${type || ""}`;

}


/* ================================
   ESCAPE HTML
================================ */

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
