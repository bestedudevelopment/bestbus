import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    db,
    auth
} from "../core/firebase.js";


/* ================================
   ELEMENTS
================================ */

const busForm =
    document.getElementById(
        "busForm"
    );

const busNumber =
    document.getElementById(
        "busNumber"
    );

const registrationNumber =
    document.getElementById(
        "registrationNumber"
    );

const startingOdometer =
    document.getElementById(
        "startingOdometer"
    );

const expectedMileage =
    document.getElementById(
        "expectedMileage"
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
   SUBMIT
================================ */

busForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        hideMessage();


        const number =
            busNumber.value
                .trim()
                .toUpperCase();


        const registration =
            registrationNumber.value
                .trim()
                .toUpperCase();


        const starting =
            Number(
                startingOdometer.value
            );


        const mileage =
            Number(
                expectedMileage.value
            );


        /* =========================
           VALIDATION
        ========================= */

        if (!number) {

            showError(
                "Enter the bus number."
            );

            return;
        }


        if (!registration) {

            showError(
                "Enter the registration number."
            );

            return;
        }


        if (
            !Number.isFinite(starting) ||
            starting < 0
        ) {

            showError(
                "Enter a valid starting odometer."
            );

            return;
        }


        if (
            !Number.isFinite(mileage) ||
            mileage <= 0
        ) {

            showError(
                "Enter a valid expected mileage."
            );

            return;
        }


        saveButton.disabled =
            true;

        saveButton.textContent =
            "CREATING BUS...";


        try {

            /* =========================
               DUPLICATE CHECK
            ========================= */

            const busQuery =
                query(
                    collection(
                        db,
                        "buses"
                    ),
                    where(
                        "busNumber",
                        "==",
                        number
                    )
                );


            const existing =
                await getDocs(
                    busQuery
                );


            if (
                !existing.empty
            ) {

                showError(
                    "This bus number already exists."
                );

                return;
            }


            /* =========================
               CREATE BUS
            ========================= */

            const busData = {

                busNumber:
                    number,

                registrationNumber:
                    registration,

                startingOdometer:
                    starting,

                /*
                 * At creation, current
                 * odometer is the same
                 * as starting odometer.
                 */

                currentOdometer:
                    starting,

                expectedMileage:
                    mileage,

                /*
                 * No driver initially.
                 */

                assignedDriverId:
                    null,

                status:
                    "active",

                createdAt:
                    serverTimestamp(),

                /*
                 * If someone is authenticated,
                 * save their UID.
                 *
                 * Otherwise null.
                 */

                createdBy:
                    auth.currentUser
                        ? auth.currentUser.uid
                        : null

            };


            const created =
                await addDoc(
                    collection(
                        db,
                        "buses"
                    ),
                    busData
                );


            console.log(
                "BUS CREATED:",
                created.id
            );


            showSuccess(
                "Bus created successfully."
            );


            busForm.reset();


            /*
             * Return to Admin dashboard
             * after successful creation.
             */

            setTimeout(
                () => {

                    window.location.href =
                        "../admin/";

                },
                900
            );


        } catch (error) {

            console.error(
                "ADD BUS ERROR:",
                error
            );


            showError(
                error.message ||
                "Unable to create bus."
            );

        } finally {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "CREATE BUS";

        }

    }
);


/* ================================
   ERROR
================================ */

function showError(
    text
) {

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

    /*
     * Message uses the same
     * minimal style.
     */

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

    message.style.borderColor =
        "";

    message.style.background =
        "";

    message.style.color =
        "";

}
