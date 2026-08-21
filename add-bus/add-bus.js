import {
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

import {
    getUserProfile
} from "../core/auth.js";


/* =========================
   ELEMENTS
========================= */

const form =
    document.getElementById("addBusForm");

const busNumber =
    document.getElementById("busNumber");

const registrationNumber =
    document.getElementById("registrationNumber");

const route =
    document.getElementById("route");

const expectedMileage =
    document.getElementById("expectedMileage");

const currentOdometer =
    document.getElementById("currentOdometer");

const saveButton =
    document.getElementById("saveButton");

const saveText =
    document.getElementById("saveText");

const spinner =
    document.getElementById("spinner");

const errorMessage =
    document.getElementById("errorMessage");

const successMessage =
    document.getElementById("successMessage");

const backButton =
    document.getElementById("backButton");


/* =========================
   AUTH GUARD
========================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "../login/";

            return;
        }

        try {

            const profile =
                await getUserProfile(
                    user.uid
                );

            if (
                !profile ||
                profile.role !== "admin"
            ) {

                window.location.href =
                    "../login/";

            }

        } catch (error) {

            console.error(error);

            window.location.href =
                "../login/";
        }
    }
);


/* =========================
   BACK
========================= */

backButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../buses/";

    }
);


/* =========================
   MESSAGES
========================= */

function showError(message) {

    errorMessage.textContent =
        message;

    errorMessage.classList.remove(
        "hidden"
    );
}

function hideError() {

    errorMessage.textContent = "";

    errorMessage.classList.add(
        "hidden"
    );
}

function showSuccess(message) {

    successMessage.textContent =
        message;

    successMessage.classList.remove(
        "hidden"
    );
}


/* =========================
   LOADING
========================= */

function setLoading(
    loading
) {

    saveButton.disabled =
        loading;

    saveText.classList.toggle(
        "hidden",
        loading
    );

    spinner.classList.toggle(
        "hidden",
        !loading
    );
}


/* =========================
   FORM SUBMIT
========================= */

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        hideError();

        const bus =
            busNumber.value
                .trim()
                .toUpperCase();

        const registration =
            registrationNumber.value
                .trim()
                .toUpperCase();

        const routeValue =
            route.value.trim();

        const mileage =
            Number(
                expectedMileage.value
            );

        const meter =
            Number(
                currentOdometer.value
            );


        /* =====================
           VALIDATION
        ===================== */

        if (!bus) {

            showError(
                "Please enter the bus number."
            );

            busNumber.focus();

            return;
        }


        if (!registration) {

            showError(
                "Please enter the registration number."
            );

            registrationNumber.focus();

            return;
        }


        if (!routeValue) {

            showError(
                "Please enter the route."
            );

            route.focus();

            return;
        }


        if (
            !mileage ||
            mileage <= 0
        ) {

            showError(
                "Please enter a valid expected mileage."
            );

            expectedMileage.focus();

            return;
        }


        if (
            meter < 0 ||
            Number.isNaN(meter)
        ) {

            showError(
                "Please enter a valid meter reading."
            );

            currentOdometer.focus();

            return;
        }


        setLoading(true);


        try {

            /* =====================
               DUPLICATE BUS NUMBER
            ===================== */

            const busQuery =
                query(
                    collection(
                        db,
                        "buses"
                    ),
                    where(
                        "busNumber",
                        "==",
                        bus
                    )
                );


            const busSnapshot =
                await getDocs(
                    busQuery
                );


            if (
                !busSnapshot.empty
            ) {

                showError(
                    `Bus ${bus} already exists.`
                );

                setLoading(false);

                busNumber.focus();

                return;
            }


            /* =====================
               DUPLICATE REGISTRATION
            ===================== */

            const registrationQuery =
                query(
                    collection(
                        db,
                        "buses"
                    ),
                    where(
                        "registrationNumber",
                        "==",
                        registration
                    )
                );


            const registrationSnapshot =
                await getDocs(
                    registrationQuery
                );


            if (
                !registrationSnapshot.empty
            ) {

                showError(
                    `Registration number ${registration} already exists.`
                );

                setLoading(false);

                registrationNumber.focus();

                return;
            }


            /* =====================
               CREATE BUS
            ===================== */

            const busData = {

                busNumber:
                    bus,

                registrationNumber:
                    registration,

                route:
                    routeValue,

                expectedMileage:
                    mileage,

                currentOdometer:
                    meter,

                driverId:
                    "",

                active:
                    true,

                createdAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()

            };


            const busReference =
                await addDoc(
                    collection(
                        db,
                        "buses"
                    ),
                    busData
                );


            console.log(
                "Bus created:",
                busReference.id
            );


            showSuccess(
                `${bus} has been added successfully.`
            );


            /*
             * Give the user a moment
             * to see the success message.
             */

            setTimeout(
                () => {

                    window.location.href =
                        `../bus/?id=${encodeURIComponent(
                            busReference.id
                        )}`;

                },
                800
            );


        } catch (error) {

            console.error(
                "Add bus error:",
                error
            );


            showError(
                "Unable to save the bus. Please try again."
            );


        } finally {

            setLoading(false);

        }

    }
);
