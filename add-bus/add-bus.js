import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth,
    db
} from "../core/firebase.js";


/* =================================
   ELEMENTS
================================= */

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


/* =================================
   AUTH CHECK
================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        /*
         * Login is compulsory.
         */

        if (!user) {

            window.location.replace(
                "../login/"
            );

            return;

        }


        try {

            await verifyAdmin(
                user
            );

        } catch (error) {

            console.error(
                "ADMIN VERIFICATION ERROR:",
                error
            );

            window.location.replace(
                "../login/"
            );

        }

    }
);


/* =================================
   VERIFY ADMIN
================================= */

async function verifyAdmin(
    user
) {

    const userReference =
        doc(
            db,
            "users",
            user.uid
        );


    const userSnapshot =
        await getDoc(
            userReference
        );


    if (
        !userSnapshot.exists()
    ) {

        throw new Error(
            "Admin profile not found."
        );

    }


    const userData =
        userSnapshot.data();


    if (
        userData.role !==
        "admin"
    ) {

        throw new Error(
            "Administrator access required."
        );

    }

}


/* =================================
   FORM SUBMIT
================================= */

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


        const initialOdometer =
            Number(
                startingOdometer.value
            );


        const mileage =
            Number(
                expectedMileage.value
            );


        /* -------------------------
           VALIDATION
        ------------------------- */

        if (!number) {

            showError(
                "Enter the bus number."
            );

            busNumber.focus();

            return;

        }


        if (!registration) {

            showError(
                "Enter the registration number."
            );

            registrationNumber.focus();

            return;

        }


        if (
            !Number.isFinite(
                initialOdometer
            ) ||
            initialOdometer < 0
        ) {

            showError(
                "Enter a valid starting odometer."
            );

            startingOdometer.focus();

            return;

        }


        if (
            !Number.isFinite(
                mileage
            ) ||
            mileage <= 0
        ) {

            showError(
                "Enter a valid expected mileage."
            );

            expectedMileage.focus();

            return;

        }


        setSaving(
            true
        );


        try {

            /* -------------------------
               DUPLICATE CHECK
            ------------------------- */

            const busesReference =
                collection(
                    db,
                    "buses"
                );


            const duplicateQuery =
                query(
                    busesReference,

                    where(
                        "busNumber",
                        "==",
                        number
                    )
                );


            const duplicateSnapshot =
                await getDocs(
                    duplicateQuery
                );


            if (
                !duplicateSnapshot.empty
            ) {

                showError(
                    "A bus with this bus number already exists."
                );

                setSaving(
                    false
                );

                return;

            }


            /* -------------------------
               CREATE BUS
            ------------------------- */

            const busData = {

                busNumber:
                    number,

                registrationNumber:
                    registration,

                startingOdometer:
                    initialOdometer,

                /*
                 * At creation, current
                 * odometer equals the
                 * starting odometer.
                 */

                currentOdometer:
                    initialOdometer,

                expectedMileage:
                    mileage,

                /*
                 * No driver initially.
                 */

                driverId:
                    null,

                driverAssigned:
                    false,

                status:
                    "active",

                createdAt:
                    serverTimestamp(),

                createdBy:
                    auth.currentUser.uid

            };


            const busReference =
                await addDoc(
                    busesReference,
                    busData
                );


            console.log(
                "BUS CREATED:",
                busReference.id
            );


            showSuccess(
                "Bus created successfully."
            );


            /*
             * Clear form after success.
             */

            busForm.reset();


            /*
             * Redirect after a short delay.
             */

            setTimeout(
                () => {

                    window.location.href =
                        "../buses/";

                },
                900
            );


        } catch (error) {

            console.error(
                "CREATE BUS ERROR:",
                error
            );


            if (
                error.code ===
                "permission-denied"
            ) {

                showError(
                    "Firebase denied this operation. Check your Firestore rules."
                );

            } else {

                showError(
                    error.message ||
                    "Unable to create bus."
                );

            }


        } finally {

            setSaving(
                false
            );

        }

    }
);


/* =================================
   BUTTON STATE
================================= */

function setSaving(
    saving
) {

    saveButton.disabled =
        saving;


    saveButton.textContent =
        saving
            ? "CREATING..."
            : "CREATE BUS";

}


/* =================================
   MESSAGES
================================= */

function showError(
    text
) {

    message.textContent =
        text;

    message.className =
        "message";

}


function showSuccess(
    text
) {

    /*
     * Black/white design.
     * Red is reserved for errors.
     */

    message.textContent =
        text;

    message.className =
        "message";

}


function hideMessage() {

    message.textContent =
        "";

    message.className =
        "message hidden";

}
