import {
    collection,
    getDocs,
    addDoc,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    db
} from "../core/firebase.js";


/* ================================
   ELEMENTS
================================ */

const driverForm =
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


/* ================================
   LOAD BUSES
================================ */

loadBuses();


async function loadBuses() {

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


        if (
            snapshot.empty
        ) {

            busSelect.innerHTML = `
                <option value="">
                    No buses available
                </option>
            `;

            return;
        }


        snapshot.forEach(
            (busSnapshot) => {

                const bus =
                    busSnapshot.data();


                /*
                 * Only show active buses.
                 */

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

            }
        );


    } catch (error) {

        console.error(
            "LOAD BUSES ERROR:",
            error
        );


        busSelect.innerHTML = `
            <option value="">
                Unable to load buses
            </option>
        `;

    }

}


/* ================================
   CREATE DRIVER PROFILE
================================ */

driverForm.addEventListener(
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


        const busId =
            busSelect.value;


        /* =========================
           VALIDATION
        ========================= */

        if (!name) {

            showError(
                "Enter the driver's name."
            );

            return;
        }


        if (!email) {

            showError(
                "Enter the driver's email."
            );

            return;
        }


        if (
            password.length < 6
        ) {

            showError(
                "Password must contain at least 6 characters."
            );

            return;
        }


        if (!busId) {

            showError(
                "Select a bus."
            );

            return;
        }


        saveButton.disabled =
            true;

        saveButton.textContent =
            "CREATING...";


        try {

            /* =========================
               DUPLICATE EMAIL CHECK
            ========================= */

            const emailQuery =
                query(
                    collection(
                        db,
                        "drivers"
                    ),
                    where(
                        "email",
                        "==",
                        email
                    )
                );


            const existing =
                await getDocs(
                    emailQuery
                );


            if (
                !existing.empty
            ) {

                throw new Error(
                    "A driver with this email already exists."
                );

            }


            /* =========================
               CHECK BUS
            ========================= */

            const busQuery =
                query(
                    collection(
                        db,
                        "drivers"
                    ),
                    where(
                        "assignedBusId",
                        "==",
                        busId
                    )
                );


            const busDriverSnapshot =
                await getDocs(
                    busQuery
                );


            if (
                !busDriverSnapshot.empty
            ) {

                throw new Error(
                    "This bus is already assigned to a driver."
                );

            }


            /* =========================
               SAVE DRIVER PROFILE
            ========================= */

            await addDoc(
                collection(
                    db,
                    "drivers"
                ),
                {

                    name:

                        name,

                    email:

                        email,

                    /*
                     * This is stored temporarily
                     * only as a profile field.
                     *
                     * DO NOT use this field as
                     * authentication.
                     */

                    assignedBusId:

                        busId,

                    status:

                        "active",

                    role:

                        "driver",

                    createdAt:

                        serverTimestamp()

                }
            );


            showSuccess(
                "Driver profile created. Authentication account still needs to be connected."
            );


            driverForm.reset();


        } catch (error) {

            console.error(
                "CREATE DRIVER ERROR:",
                error
            );


            showError(
                error.message ||
                "Unable to create driver."
            );

        } finally {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "CREATE DRIVER";

        }

    }
);


/* ================================
   ERROR
================================ */

function showError(
    text
) {

    message.style.borderColor =
        "";

    message.style.background =
        "";

    message.style.color =
        "";

    message.textContent =
        text;

    message.classList.remove(
        "hidden"
    );

}


/* ================================
   SUCCESS
================================ */

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


/* ================================
   HIDE
================================ */

function hideMessage() {

    message.textContent =
        "";

    message.classList.add(
        "hidden"
    );

}
