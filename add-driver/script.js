import {
    collection,
    getDocs,
    doc,
    setDoc,
    updateDoc,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth,
    db
} from "../core/firebase.js";


/* =================================
   ELEMENTS
================================= */

const form =
    document.getElementById(
        "driverForm"
    );

const driverName =
    document.getElementById(
        "driverName"
    );

const driverEmail =
    document.getElementById(
        "driverEmail"
    );

const driverPassword =
    document.getElementById(
        "driverPassword"
    );

const adminPassword =
    document.getElementById(
        "adminPassword"
    );

const busSelect =
    document.getElementById(
        "busSelect"
    );

const saveButton =
    document.getElementById(
        "saveButton"
    );

const message =
    document.getElementById(
        "message"
    );


let adminEmail = null;


/* =================================
   CHECK CURRENT ADMIN
================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            showError(
                "Admin is not logged in."
            );

            saveButton.disabled =
                true;

            return;
        }


        adminEmail =
            user.email;


        await loadAvailableBuses();

    }
);


/* =================================
   LOAD AVAILABLE BUSES
================================= */

async function loadAvailableBuses() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "buses"
                )
            );


        busSelect.innerHTML = `
            <option value="">
                Select a bus
            </option>
        `;


        let availableCount = 0;


        snapshot.forEach(
            (busSnapshot) => {

                const bus =
                    busSnapshot.data();


                /*
                 * A bus is available if it
                 * does NOT have an assigned
                 * driver.
                 */

                if (
                    bus.assignedDriverId
                ) {

                    return;

                }


                if (
                    bus.status &&
                    bus.status !== "active"
                ) {

                    return;

                }


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    busSnapshot.id;


                option.textContent =
                    `${bus.busNumber || "Unnamed Bus"} — ${
                        bus.registrationNumber || "No registration"
                    }`;


                busSelect.appendChild(
                    option
                );


                availableCount++;

            }
        );


        if (
            availableCount === 0
        ) {

            busSelect.innerHTML = `
                <option value="">
                    No unassigned buses
                </option>
            `;

        }


    } catch (error) {

        console.error(
            "BUS LOAD ERROR:",
            error
        );


        busSelect.innerHTML = `
            <option value="">
                Unable to load buses
            </option>
        `;

        showError(
            "Unable to load buses."
        );

    }

}


/* =================================
   CREATE DRIVER
================================= */

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        hideMessage();


        const name =
            driverName.value.trim();


        const email =
            driverEmail.value
                .trim()
                .toLowerCase();


        const password =
            driverPassword.value;


        const adminPass =
            adminPassword.value;


        const busId =
            busSelect.value;


        /* =========================
           VALIDATION
        ========================= */

        if (!name) {

            showError(
                "Enter the driver name."
            );

            return;

        }


        if (!email) {

            showError(
                "Enter the driver email."
            );

            return;

        }


        if (
            password.length < 6
        ) {

            showError(
                "Driver password must contain at least 6 characters."
            );

            return;

        }


        if (!busId) {

            showError(
                "Select an available bus."
            );

            return;

        }


        if (!adminPass) {

            showError(
                "Enter the Admin password."
            );

            return;

        }


        saveButton.disabled =
            true;

        saveButton.textContent =
            "CREATING DRIVER...";


        try {

            /*
             * First verify that the
             * Admin password is correct.
             */

            await signInWithEmailAndPassword(
                auth,
                adminEmail,
                adminPass
            );


            /*
             * Now create the driver
             * Firebase Auth account.
             *
             * IMPORTANT:
             * Firebase automatically signs
             * in the newly-created driver.
             */

            const credential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            const driverUid =
                credential.user.uid;


            /*
             * Save the driver's profile
             * using UID as the document ID.
             */

            await setDoc(
                doc(
                    db,
                    "users",
                    driverUid
                ),
                {

                    name:
                        name,

                    email:
                        email,

                    role:
                        "driver",

                    assignedBusId:
                        busId,

                    status:
                        "active",

                    createdAt:
                        serverTimestamp()

                }
            );


            /*
             * Mark the bus as assigned.
             */

            await updateDoc(
                doc(
                    db,
                    "buses",
                    busId
                ),
                {

                    assignedDriverId:
                        driverUid,

                    assignedDriverName:
                        name

                }
            );


            /*
             * Now restore Admin login.
             */

            await signInWithEmailAndPassword(
                auth,
                adminEmail,
                adminPass
            );


            showSuccess(
                "Driver created and bus assigned successfully."
            );


            form.reset();


            /*
             * Reload available buses.
             *
             * The newly assigned bus will
             * now disappear automatically.
             */

            await loadAvailableBuses();


            setTimeout(
                () => {

                    window.location.href =
                        "../admin/";

                },
                1000
            );


        } catch (error) {

            console.error(
                "CREATE DRIVER ERROR:",
                error
            );


            /*
             * Convert Firebase errors
             * into simple messages.
             */

            showError(
                getErrorMessage(
                    error
                )
            );

        } finally {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "CREATE DRIVER";

        }

    }
);


/* =================================
   ERROR MESSAGE
================================= */

function getErrorMessage(
    error
) {

    switch (
        error.code
    ) {

        case "auth/email-already-in-use":

            return "This driver email is already registered.";

        case "auth/invalid-email":

            return "Enter a valid driver email.";

        case "auth/weak-password":

            return "Driver password is too weak.";

        case "auth/invalid-credential":

            return "Admin password is incorrect.";

        case "auth/wrong-password":

            return "Admin password is incorrect.";

        case "permission-denied":

            return "Firestore permission denied.";

        default:

            return (
                error.message ||
                "Unable to create driver."
            );

    }

}


/* =================================
   SHOW ERROR
================================= */

function showError(
    text
) {

    message.style.borderColor =
        "#c62828";

    message.style.background =
        "#fff1f1";

    message.style.color =
        "#c62828";

    message.textContent =
        text;

    message.classList.remove(
        "hidden"
    );

}


/* =================================
   SHOW SUCCESS
================================= */

function showSuccess(
    text
) {

    message.style.borderColor =
        "#e7b900";

    message.style.background =
        "#fff8d9";

    message.style.color =
        "#111111";

    message.textContent =
        text;

    message.classList.remove(
        "hidden"
    );

}


/* =================================
   HIDE MESSAGE
================================= */

function hideMessage() {

    message.textContent =
        "";

    message.classList.add(
        "hidden"
    );

                    }
