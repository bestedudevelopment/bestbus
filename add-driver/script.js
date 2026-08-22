import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    getFunctions,
    httpsCallable
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js";

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
   FIREBASE FUNCTIONS
================================ */

const functions =
    getFunctions();


const createDriver =
    httpsCallable(
        functions,
        "createDriver"
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


/* ================================
   CREATE DRIVER
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
            "CREATING DRIVER...";


        try {

            const result =
                await createDriver({

                    name:
                        name,

                    email:
                        email,

                    password:
                        password,

                    busId:
                        busId

                });


            console.log(
                "DRIVER CREATED:",
                result.data
            );


            showSuccess(
                "Driver created successfully."
            );


            driverForm.reset();


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


            showError(
                getReadableError(
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
   HIDE MESSAGE
================================ */

function hideMessage() {

    message.textContent =
        "";

    message.classList.add(
        "hidden"
    );

}


/* ================================
   READABLE ERRORS
================================ */

function getReadableError(
    error
) {

    if (
        error?.message
    ) {

        return error.message;

    }

    return "Unable to create driver.";

}
