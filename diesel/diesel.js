import {
    doc,
    getDoc,
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth,
    db,
    storage
} from "../core/firebase.js";


/* =========================================
   ELEMENTS
========================================= */

const loadingScreen =
    document.getElementById("loadingScreen");

const backButton =
    document.getElementById("backButton");

const busNumber =
    document.getElementById("busNumber");

const registrationNumber =
    document.getElementById("registrationNumber");

const form =
    document.getElementById("dieselForm");

const litres =
    document.getElementById("litres");

const amount =
    document.getElementById("amount");

const pricePerLitre =
    document.getElementById("pricePerLitre");

const odometer =
    document.getElementById("odometer");

const fuelStation =
    document.getElementById("fuelStation");

const fuelPhoto =
    document.getElementById("fuelPhoto");

const photoButton =
    document.getElementById("photoButton");

const photoPreview =
    document.getElementById("photoPreview");

const saveButton =
    document.getElementById("saveButton");

const saveText =
    document.getElementById("saveText");

const spinner =
    document.getElementById("spinner");

const errorMessage =
    document.getElementById("errorMessage");

const successCard =
    document.getElementById("successCard");

const successLitres =
    document.getElementById("successLitres");

const successAmount =
    document.getElementById("successAmount");

const homeButton =
    document.getElementById("homeButton");


/* =========================================
   STATE
========================================= */

let currentUser = null;

let currentDriver = null;

let currentBus = null;

let selectedPhoto = null;


/* =========================================
   BACK
========================================= */

if (backButton) {

    backButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "../driver/";

        }
    );

}


if (homeButton) {

    homeButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "../driver/";

        }
    );

}


/* =========================================
   PHOTO
========================================= */

if (photoButton) {

    photoButton.addEventListener(
        "click",
        () => {

            fuelPhoto.click();

        }
    );

}


if (fuelPhoto) {

    fuelPhoto.addEventListener(
        "change",
        () => {

            const file =
                fuelPhoto.files?.[0];


            if (!file) {

                return;

            }


            selectedPhoto =
                file;


            const previewURL =
                URL.createObjectURL(
                    file
                );


            if (photoPreview) {

                photoPreview.src =
                    previewURL;

                photoPreview.classList.remove(
                    "hidden"
                );

            }


            const strong =
                photoButton?.querySelector(
                    "strong"
                );

            const small =
                photoButton?.querySelector(
                    "small"
                );


            if (strong) {

                strong.textContent =
                    "PHOTO SELECTED";

            }


            if (small) {

                small.textContent =
                    file.name;

            }

        }
    );

}


/* =========================================
   PRICE CALCULATION
========================================= */

function calculatePrice() {

    const litresValue =
        Number(
            litres.value
        );


    const amountValue =
        Number(
            amount.value
        );


    if (
        litresValue > 0 &&
        amountValue >= 0
    ) {

        const price =
            amountValue /
            litresValue;


        pricePerLitre.textContent =
            `₹ ${price.toFixed(2)}`;

    } else {

        pricePerLitre.textContent =
            "₹ --";

    }

}


litres.addEventListener(
    "input",
    calculatePrice
);


amount.addEventListener(
    "input",
    calculatePrice
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


        currentUser =
            user;


        try {

            await loadDriver();

            hideLoading();

        } catch (error) {

            console.error(
                "DIESEL PAGE ERROR:",
                error
            );


            showError(
                error.message ||
                "Unable to load diesel page."
            );


            hideLoading();

        }

    }
);


/* =========================================
   LOAD DRIVER
========================================= */

async function loadDriver() {

    console.log(
        "Loading driver..."
    );


    const driverReference =
        doc(
            db,
            "users",
            currentUser.uid
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


    console.log(
        "Driver data:",
        driver
    );


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


    if (
        !driver.assignedBusId
    ) {

        throw new Error(
            "No bus is assigned to you."
        );

    }


    currentDriver = {

        id:
            currentUser.uid,

        ...driver

    };


    console.log(
        "Assigned Bus ID:",
        driver.assignedBusId
    );


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
            "Assigned bus not found."
        );

    }


    currentBus = {

        id:
            busSnapshot.id,

        ...busSnapshot.data()

    };


    console.log(
        "Current bus:",
        currentBus
    );


    busNumber.textContent =
        currentBus.busNumber ||
        "BUS";


    registrationNumber.textContent =
        currentBus.registrationNumber ||
        currentBus.registrationNo ||
        "";

}


/* =========================================
   SAVE DIESEL
========================================= */

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        hideError();


        /* =====================================
           CHECK AUTH / BUS
        ===================================== */

        if (!currentUser) {

            showError(
                "You are not logged in."
            );

            return;

        }


        if (!currentBus) {

            showError(
                "Assigned bus information is not available."
            );

            return;

        }


        /* =====================================
           READ VALUES
        ===================================== */

        const litresValue =
            Number(
                litres.value
            );


        const amountValue =
            Number(
                amount.value
            );


        const odometerValue =
            Number(
                odometer.value
            );


        const station =
            fuelStation.value.trim();


        /* =====================================
           VALIDATION
        ===================================== */

        if (
            !litresValue ||
            litresValue <= 0
        ) {

            showError(
                "Enter the amount of diesel filled in litres."
            );

            litres.focus();

            return;

        }


        if (
            Number.isNaN(
                amountValue
            ) ||
            amountValue < 0
        ) {

            showError(
                "Enter a valid amount."
            );

            amount.focus();

            return;

        }


        if (
            !odometerValue ||
            odometerValue < 0
        ) {

            showError(
                "Enter the current odometer reading."
            );

            odometer.focus();

            return;

        }


        setLoading(
            true
        );


        try {

            /* =================================
               PRICE
            ================================= */

            const price =
                amountValue /
                litresValue;


            /* =================================
               PHOTO
            ================================= */

            let photoURL =
                "";


            /*
             * Photo upload is OPTIONAL.
             *
             * Even if Storage fails,
             * the diesel record will still
             * be saved to Firestore.
             */

            if (
                selectedPhoto
            ) {

                try {

                    const today =
                        getTodayKey();


                    const extension =
                        selectedPhoto.name
                            .split(".")
                            .pop()
                            .toLowerCase() ||
                        "jpg";


                    const path =
                        `dieselRecords/${currentUser.uid}/${currentBus.id}/${today}/${Date.now()}.${extension}`;


                    console.log(
                        "Uploading photo:",
                        path
                    );


                    const storageReference =
                        ref(
                            storage,
                            path
                        );


                    await uploadBytes(
                        storageReference,
                        selectedPhoto,
                        {
                            contentType:
                                selectedPhoto.type
                        }
                    );


                    photoURL =
                        await getDownloadURL(
                            storageReference
                        );


                    console.log(
                        "Photo uploaded:"
                    );

                } catch (
                    photoError
                ) {

                    console.error(
                        "PHOTO UPLOAD FAILED:",
                        photoError
                    );


                    /*
                     * Do NOT stop the
                     * diesel save.
                     */

                    photoURL =
                        "";

                }

            }


            /* =================================
               DIESEL DATA
            ================================= */

            const dieselData = {

                driverId:
                    currentUser.uid,

                busId:
                    currentBus.id,

                date:
                    getTodayKey(),

                litres:
                    litresValue,

                amount:
                    amountValue,

                pricePerLitre:
                    Number(
                        price.toFixed(2)
                    ),

                odometer:
                    odometerValue,

                fuelStation:
                    station,

                photo:
                    photoURL,

                createdAt:
                    serverTimestamp()

            };


            console.log(
                "Saving diesel data:",
                dieselData
            );


            /* =================================
               FIRESTORE SAVE
            ================================= */

            const dieselReference =
                await addDoc(
                    collection(
                        db,
                        "dieselRecords"
                    ),
                    dieselData
                );


            console.log(
                "DIESEL SAVED:",
                dieselReference.id
            );


            /* =================================
               SUCCESS
            ================================= */

            form.classList.add(
                "hidden"
            );


            successCard.classList.remove(
                "hidden"
            );


            successLitres.textContent =
                litresValue.toFixed(2);


            successAmount.textContent =
                `₹ ${amountValue.toFixed(2)}`;


            setLoading(
                false
            );


        } catch (error) {

            console.error(
                "DIESEL SAVE ERROR:",
                error
            );


            /*
             * Show the REAL Firebase error.
             * This is important for testing.
             */

            let message =
                error.message ||
                "Unable to save diesel details.";


            if (
                error.code
            ) {

                message +=
                    ` (${error.code})`;

            }


            showError(
                message
            );


            setLoading(
                false
            );

        }

    }
);


/* =========================================
   DATE
========================================= */

function getTodayKey() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


/* =========================================
   ERROR
========================================= */

function showError(
    message
) {

    console.error(
        "DIESEL ERROR:",
        message
    );


    if (!errorMessage) {

        alert(
            message
        );

        return;

    }


    errorMessage.textContent =
        message;


    errorMessage.classList.remove(
        "hidden"
    );

}


function hideError() {

    if (!errorMessage) {

        return;

    }


    errorMessage.classList.add(
        "hidden"
    );

}


/* =========================================
   LOADING
========================================= */

function setLoading(
    loading
) {

    if (saveButton) {

        saveButton.disabled =
            loading;

    }


    if (saveText) {

        saveText.classList.toggle(
            "hidden",
            loading
        );

    }


    if (spinner) {

        spinner.classList.toggle(
            "hidden",
            !loading
        );

    }

}


function hideLoading() {

    if (loadingScreen) {

        loadingScreen.classList.add(
            "hidden"
        );

    }

}
