import {
    doc,
    getDoc,
    setDoc,
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

const readingIcon =
    document.getElementById("readingIcon");

const readingTypeLabel =
    document.getElementById("readingTypeLabel");

const readingTitle =
    document.getElementById("readingTitle");

const readingDescription =
    document.getElementById("readingDescription");

const busNumber =
    document.getElementById("busNumber");

const registrationNumber =
    document.getElementById("registrationNumber");

const timeMessage =
    document.getElementById("timeMessage");

const form =
    document.getElementById("readingForm");

const odometer =
    document.getElementById("odometer");

const previousReading =
    document.getElementById("previousReading");

const previousValue =
    document.getElementById("previousValue");

const distancePreview =
    document.getElementById("distancePreview");

const meterPhoto =
    document.getElementById("meterPhoto");

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

const successValue =
    document.getElementById("successValue");

const successDetails =
    document.getElementById("successDetails");

const homeButton =
    document.getElementById("homeButton");


/* =========================================
   URL TYPE
========================================= */

const params =
    new URLSearchParams(
        window.location.search
    );

const readingType =
    params.get("type") === "evening"
        ? "evening"
        : "morning";


/* =========================================
   STATE
========================================= */

let currentUser = null;

let currentDriver = null;

let currentBus = null;

let previousOdometer = null;

let selectedPhoto = null;


/* =========================================
   SET PAGE TYPE
========================================= */

if (
    readingType === "morning"
) {

    readingIcon.textContent =
        "🌅";

    readingTypeLabel.textContent =
        "MORNING";

    readingTitle.textContent =
        "First Reading";

    readingDescription.textContent =
        "Enter the odometer reading after entering the campus.";

} else {

    readingIcon.textContent =
        "🌆";

    readingIcon.style.background =
        "#e8e5ff";

    readingTypeLabel.textContent =
        "EVENING";

    readingTitle.textContent =
        "Halting Reading";

    readingDescription.textContent =
        "Enter the odometer reading after halting the vehicle.";

}


/* =========================================
   BACK
========================================= */

backButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../driver/";

    }
);


/* =========================================
   HOME
========================================= */

homeButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../driver/";

    }
);


/* =========================================
   PHOTO BUTTON
========================================= */

photoButton.addEventListener(
    "click",
    () => {

        meterPhoto.click();

    }
);


/* =========================================
   PHOTO SELECT
========================================= */

meterPhoto.addEventListener(
    "change",
    () => {

        const file =
            meterPhoto.files?.[0];


        if (!file) {

            return;

        }


        selectedPhoto =
            file;


        const previewURL =
            URL.createObjectURL(
                file
            );


        photoPreview.src =
            previewURL;


        photoPreview.classList.remove(
            "hidden"
        );


        photoButton.querySelector(
            "strong"
        ).textContent =
            "PHOTO SELECTED";


        photoButton.querySelector(
            "small"
        ).textContent =
            file.name;

    }
);


/* =========================================
   ODOMETER PREVIEW
========================================= */

odometer.addEventListener(
    "input",
    () => {

        if (
            readingType !==
            "evening"
        ) {

            return;

        }


        const value =
            Number(
                odometer.value
            );


        if (
            !previousOdometer ||
            !value
        ) {

            distancePreview.textContent =
                "--";

            return;

        }


        const distance =
            value -
            previousOdometer;


        if (
            distance < 0
        ) {

            distancePreview.textContent =
                "INVALID";

            return;

        }


        distancePreview.textContent =
            distance;

    }
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

            await checkReading();

            hideLoading();

        } catch (error) {

            console.error(
                "READING PAGE ERROR:",
                error
            );

            showError(
                error.message ||
                "Unable to load reading page."
            );

            hideLoading();

        }

    }
);


/* =========================================
   LOAD DRIVER
========================================= */

async function loadDriver() {

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


    if (
        driver.role !==
        "driver"
    ) {

        throw new Error(
            "This account is not a driver account."
        );

    }


    if (
        !driver.assignedBusId
    ) {

        throw new Error(
            "No bus is assigned to this driver."
        );

    }


    currentDriver = {

        id:
            currentUser.uid,

        ...driver

    };


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


    busNumber.textContent =
        currentBus.busNumber ||
        "BUS";


    registrationNumber.textContent =
        currentBus.registrationNumber ||
        currentBus.registrationNo ||
        "";

}


/* =========================================
   TODAY KEY
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
   READING DOCUMENT
========================================= */

function getReadingReference() {

    const today =
        getTodayKey();


    return doc(
        db,
        "driverReadings",
        `${currentUser.uid}_${currentBus.id}_${today}`
    );

}


/* =========================================
   CHECK READING
========================================= */

async function checkReading() {

    const now =
        new Date();


    const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes();


    const readingReference =
        getReadingReference();


    const snapshot =
        await getDoc(
            readingReference
        );


    if (
        snapshot.exists()
    ) {

        const data =
            snapshot.data();


        if (
            readingType ===
            "morning"
        ) {

            if (
                data.morningReading !==
                undefined
            ) {

                showAlreadySaved(
                    data.morningReading
                );

                return;

            }

        }


        if (
            readingType ===
            "evening"
        ) {

            if (
                data.eveningReading !==
                undefined
            ) {

                showAlreadySaved(
                    data.eveningReading
                );

                return;

            }

        }

    }


    /* =====================================
       MORNING TIME
    ===================================== */

    if (
        readingType ===
        "morning"
    ) {

        const start =
            8 * 60;

        const end =
            10 * 60;


        if (
            currentMinutes <
            start
        ) {

            lockPage(
                "Morning reading opens at 8:00 AM."
            );

            return;

        }


        if (
            currentMinutes >
            end
        ) {

            lockPage(
                "Morning reading time has ended. It was available from 8:00 AM to 10:00 AM."
            );

            return;

        }


        timeMessage.textContent =
            "✓ Morning reading is available now.";

    }


    /* =====================================
       EVENING TIME
    ===================================== */

    if (
        readingType ===
        "evening"
    ) {

        const start =
            16 * 60;

        const end =
            19 * 60;


        if (
            currentMinutes <
            start
        ) {

            lockPage(
                "Evening halting reading opens at 4:00 PM."
            );

            return;

        }


        if (
            currentMinutes >
            end
        ) {

            lockPage(
                "Evening reading time has ended. It was available from 4:00 PM to 7:00 PM."
            );

            return;

        }


        timeMessage.textContent =
            "✓ Evening halting reading is available now.";


        await loadPreviousReading();

    }

}


/* =========================================
   PREVIOUS READING
========================================= */

async function loadPreviousReading() {

    /*
     * Find today's morning reading.
     */

    const todayReference =
        getReadingReference();


    const todaySnapshot =
        await getDoc(
            todayReference
        );


    if (
        todaySnapshot.exists()
    ) {

        const data =
            todaySnapshot.data();


        if (
            data.morningReading !==
            undefined
        ) {

            previousOdometer =
                Number(
                    data.morningReading
                );


            showPreviousReading();

            return;

        }

    }


    /*
     * If today's morning reading isn't
     * available, find the previous
     * day's halting reading.
     *
     * We search backwards up to 7 days.
     */

    for (
        let i = 1;
        i <= 7;
        i++
    ) {

        const date =
            new Date();


        date.setDate(
            date.getDate() - i
        );


        const year =
            date.getFullYear();


        const month =
            String(
                date.getMonth() + 1
            ).padStart(
                2,
                "0"
            );


        const day =
            String(
                date.getDate()
            ).padStart(
                2,
                "0"
            );


        const dateKey =
            `${year}-${month}-${day}`;


        const reference =
            doc(
                db,
                "driverReadings",
                `${currentUser.uid}_${currentBus.id}_${dateKey}`
            );


        const snapshot =
            await getDoc(
                reference
            );


        if (
            snapshot.exists()
        ) {

            const data =
                snapshot.data();


            if (
                data.eveningReading !==
                undefined
            ) {

                previousOdometer =
                    Number(
                        data.eveningReading
                    );


                showPreviousReading();

                return;

            }

        }

    }


    /*
     * No previous reading found.
     */

    previousOdometer =
        null;


    timeMessage.textContent =
        "No previous vehicle reading was found. Please contact the administrator.";

}


/* =========================================
   SHOW PREVIOUS
========================================= */

function showPreviousReading() {

    previousReading.classList.remove(
        "hidden"
    );


    previousValue.textContent =
        previousOdometer;


    distancePreview.textContent =
        "--";

}


/* =========================================
   SAVE
========================================= */

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        hideError();


        const value =
            Number(
                odometer.value
            );


        /* =====================================
           VALIDATION
        ===================================== */

        if (
            !value ||
            value < 0
        ) {

            showError(
                "Please enter a valid odometer reading."
            );

            return;

        }


        if (
            !selectedPhoto
        ) {

            showError(
                "Please take or upload a clear photo of the odometer."
            );

            return;

        }


        if (
            readingType ===
            "evening"
        ) {

            if (
                previousOdometer ===
                null
            ) {

                showError(
                    "Previous reading is unavailable."
                );

                return;

            }


            if (
                value <
                previousOdometer
            ) {

                showError(
                    `Evening reading cannot be less than the previous reading of ${previousOdometer} KM.`
                );

                return;

            }

        }


        setLoading(
            true
        );


        try {

            const readingReference =
                getReadingReference();


            /*
             * Re-check so duplicate
             * submissions are prevented.
             */

            const existing =
                await getDoc(
                    readingReference
                );


            if (
                existing.exists()
            ) {

                const data =
                    existing.data();


                if (
                    readingType ===
                    "morning" &&
                    data.morningReading !==
                    undefined
                ) {

                    throw new Error(
                        "Today's morning reading has already been saved."
                    );

                }


                if (
                    readingType ===
                    "evening" &&
                    data.eveningReading !==
                    undefined
                ) {

                    throw new Error(
                        "Today's evening reading has already been saved."
                    );

                }

            }


            /* =================================
               PHOTO
            ================================= */

            const today =
                getTodayKey();


            const fileExtension =
                selectedPhoto.name
                    .split(".")
                    .pop()
                    .toLowerCase() ||
                "jpg";


            const photoPath =
                `driverReadings/${currentUser.uid}/${currentBus.id}/${today}/${readingType}.${fileExtension}`;


            const storageReference =
                ref(
                    storage,
                    photoPath
                );


            await uploadBytes(
                storageReference,
                selectedPhoto,
                {
                    contentType:
                        selectedPhoto.type
                }
            );


            const photoURL =
                await getDownloadURL(
                    storageReference
                );


            /* =================================
               DATA
            ================================= */

            const data = {

                driverId:
                    currentUser.uid,

                busId:
                    currentBus.id,

                date:
                    today,

                updatedAt:
                    serverTimestamp()

            };


            if (
                readingType ===
                "morning"
            ) {

                data.morningReading =
                    value;

                data.morningPhoto =
                    photoURL;

                data.morningTime =
                    serverTimestamp();

            } else {

                data.eveningReading =
                    value;

                data.eveningPhoto =
                    photoURL;

                data.eveningTime =
                    serverTimestamp();


                if (
                    previousOdometer !==
                    null
                ) {

                    data.distance =
                        value -
                        previousOdometer;

                }

            }


            await setDoc(
                readingReference,
                data,
                {
                    merge: true
                }
            );


            showSuccess(
                value,
                data.distance
            );


        } catch (error) {

            console.error(
                "SAVE READING ERROR:",
                error
            );


            showError(
                error.message ||
                "Unable to save reading."
            );


            setLoading(
                false
            );

        }

    }
);


/* =========================================
   SUCCESS
========================================= */

function showSuccess(
    value,
    distance
) {

    form.classList.add(
        "hidden"
    );


    timeMessage.classList.add(
        "hidden"
    );


    successCard.classList.remove(
        "hidden"
    );


    successValue.textContent =
        value;


    if (
        readingType ===
        "morning"
    ) {

        successDetails.textContent =
            "Morning first reading has been saved successfully.";

    } else {

        successDetails.textContent =
            distance !== undefined
                ? `Halting reading saved. Today's distance is ${distance} KM.`
                : "Evening halting reading has been saved successfully.";

    }


    setLoading(
        false
    );

}


/* =========================================
   ALREADY SAVED
========================================= */

function showAlreadySaved(
    value
) {

    form.classList.add(
        "hidden"
    );


    timeMessage.textContent =
        `✓ Today's ${
            readingType === "morning"
                ? "morning"
                : "evening"
        } reading is already saved.`;

}


/* =========================================
   LOCK
========================================= */

function lockPage(
    message
) {

    timeMessage.textContent =
        message;


    timeMessage.style.background =
        "#eeeeee";

    timeMessage.style.borderColor =
        "#dddddd";

    timeMessage.style.color =
        "#666666";


    saveButton.disabled =
        true;


    odometer.disabled =
        true;

}


/* =========================================
   ERROR
========================================= */

function showError(
    message
) {

    errorMessage.textContent =
        message;

    errorMessage.classList.remove(
        "hidden"
    );

}


function hideError() {

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


function hideLoading() {

    loadingScreen.classList.add(
        "hidden"
    );

}
