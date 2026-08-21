import {
    collection,
    getDocs,
    addDoc,
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
} from "../core/firebase.js";

import {
    getUserProfile
} from "../core/auth.js";


/* =========================================
   ELEMENTS
========================================= */

const form =
    document.getElementById("busForm");

const busNumber =
    document.getElementById("busNumber");

const registrationNumber =
    document.getElementById(
        "registrationNumber"
    );

const route =
    document.getElementById("route");

const expectedMileage =
    document.getElementById(
        "expectedMileage"
    );

const currentOdometer =
    document.getElementById(
        "currentOdometer"
    );

const active =
    document.getElementById("active");

const saveButton =
    document.getElementById(
        "saveButton"
    );

const saveText =
    document.getElementById(
        "saveText"
    );

const spinner =
    document.getElementById(
        "spinner"
    );

const errorMessage =
    document.getElementById(
        "errorMessage"
    );

const successMessage =
    document.getElementById(
        "successMessage"
    );

const backButton =
    document.getElementById(
        "backButton"
    );


/* =========================================
   BACK
========================================= */

backButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../buses/";

    }
);


/* =========================================
   ADMIN AUTH
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

            console.error(
                error
            );

            showError(
                "Unable to verify administrator."
            );

        }

    }
);


/* =========================================
   FORM SUBMIT
========================================= */

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        hideMessages();

        const number =
            busNumber.value
                .trim()
                .toUpperCase();

        const registration =
            registrationNumber.value
                .trim()
                .toUpperCase();

        const busRoute =
            route.value
                .trim();

        const mileageValue =
            expectedMileage.value;

        const odometerValue =
            currentOdometer.value;

        const isActive =
            active.checked;


        /* =====================================
           VALIDATION
        ===================================== */

        if (!number) {

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


        setLoading(true);


        try {

            /* =================================
               CHECK BUS NUMBER
            ================================= */

            const numberQuery =
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


            const numberSnapshot =
                await getDocs(
                    numberQuery
                );


            if (
                !numberSnapshot.empty
            ) {

                throw new Error(
                    "This bus number already exists."
                );

            }


            /* =================================
               CHECK REGISTRATION
            ================================= */

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

                throw new Error(
                    "This registration number already exists."
                );

            }


            /* =================================
               CREATE BUS
            ================================= */

            const busData = {

                busNumber:
                    number,

                registrationNumber:
                    registration,

                route:
                    busRoute,

                expectedMileage:
                    mileageValue
                        ? Number(
                            mileageValue
                          )
                        : 0,

                currentOdometer:
                    odometerValue
                        ? Number(
                            odometerValue
                          )
                        : 0,

                active:
                    isActive,

                /*
                 * No driver when a bus
                 * is first created.
                 */

                driverId:
                    "",

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
                "BUS CREATED:",
                busReference.id
            );


            /* =================================
               SUCCESS
            ================================= */

            showSuccess(
                `${number} has been added successfully.`
            );


            form.reset();


            /*
             * Keep status ON after reset.
             */

            active.checked =
                true;


            setTimeout(
                () => {

                    window.location.href =
                        "../buses/";

                },
                1200
            );


        } catch (error) {

            console.error(
                "ADD BUS ERROR:",
                error
            );


            showError(
                error.message ||
                "Unable to add bus."
            );


        } finally {

            setLoading(false);

        }

    }
);


/* =========================================
   LOADING
========================================= */

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


/* =========================================
   MESSAGES
========================================= */

function hideMessages() {

    errorMessage.classList.add(
        "hidden"
    );

    successMessage.classList.add(
        "hidden"
    );

}


function showError(
    message
) {

    errorMessage.textContent =
        message;

    errorMessage.classList.remove(
        "hidden"
    );

    successMessage.classList.add(
        "hidden"
    );

}


function showSuccess(
    message
) {

    successMessage.textContent =
        message;

    successMessage.classList.remove(
        "hidden"
    );

    errorMessage.classList.add(
        "hidden"
    );

}
