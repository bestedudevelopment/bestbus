import {
    doc,
    getDoc,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth,
    db
} from "../core/firebase.js";


/* =========================================
   ELEMENTS
========================================= */

const loadingScreen =
    document.getElementById("loadingScreen");

const logoutButton =
    document.getElementById("logoutButton");

const driverName =
    document.getElementById("driverName");

const busNumber =
    document.getElementById("busNumber");

const registrationNumber =
    document.getElementById("registrationNumber");

const morningDisplay =
    document.getElementById("morningDisplay");

const eveningDisplay =
    document.getElementById("eveningDisplay");

const todayDistance =
    document.getElementById("todayDistance");

const morningOdometer =
    document.getElementById("morningOdometer");

const eveningOdometer =
    document.getElementById("eveningOdometer");

const morningButton =
    document.getElementById("morningButton");

const eveningButton =
    document.getElementById("eveningButton");

const dieselLitres =
    document.getElementById("dieselLitres");

const dieselAmount =
    document.getElementById("dieselAmount");

const dieselOdometer =
    document.getElementById("dieselOdometer");

const fuelStation =
    document.getElementById("fuelStation");

const dieselButton =
    document.getElementById("dieselButton");

const averageButton =
    document.getElementById("averageButton");

const historyButton =
    document.getElementById("historyButton");

const historyList =
    document.getElementById("historyList");

const message =
    document.getElementById("message");

const morningDate =
    document.getElementById("morningDate");

const eveningDate =
    document.getElementById("eveningDate");

const dieselDate =
    document.getElementById("dieselDate");
/* =========================================
   STATE
========================================= */

let currentUser = null;

let currentDriver = null;

let currentBus = null;

let morningRecord = null;

let eveningRecord = null;


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

            await loadTodayReadings();

            await loadHistory();

            updateTodayUI();

            hideLoading();

        } catch (error) {

            console.error(
                "DRIVER PANEL ERROR:",
                error
            );


            showMessage(
                error.message ||
                "Unable to load driver panel.",
                "error"
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
        "Loading driver:",
        currentUser.uid
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
            "Driver account was not found."
        );

    }


    const driverData =
        driverSnapshot.data();


    console.log(
        "Driver data:",
        driverData
    );


    if (
        driverData.role !==
        "driver"
    ) {

        throw new Error(
            "This account is not a driver account."
        );

    }


    if (
        driverData.active === false
    ) {

        throw new Error(
            "Your driver account is inactive."
        );

    }


    if (
        !driverData.assignedBusId
    ) {

        throw new Error(
            "No bus has been assigned to your account."
        );

    }


    currentDriver = {

        id:
            currentUser.uid,

        ...driverData

    };


    /* =====================================
       DRIVER NAME
    ===================================== */

    driverName.textContent =
        driverData.name ||
        driverData.fullName ||
        driverData.displayName ||
        currentUser.email ||
        "Driver";


    /* =====================================
       LOAD BUS
    ===================================== */

    const busReference =
        doc(
            db,
            "buses",
            driverData.assignedBusId
        );


    const busSnapshot =
        await getDoc(
            busReference
        );


    if (
        !busSnapshot.exists()
    ) {

        throw new Error(
            "The assigned bus could not be found."
        );

    }


    currentBus = {

        id:
            busSnapshot.id,

        ...busSnapshot.data()

    };


    console.log(
        "Assigned bus:",
        currentBus
    );


    busNumber.textContent =
        currentBus.busNumber ||
        currentBus.number ||
        "BUS";


    registrationNumber.textContent =
        currentBus.registrationNumber ||
        currentBus.registrationNo ||
        currentBus.regNumber ||
        "";

}


/* =========================================
   LOAD TODAY'S READINGS
========================================= */
async function loadSelectedReadings() {

    morningRecord = null;
    eveningRecord = null;

    const readingsReference =
        collection(db, "driverReadings");

    const snapshot =
        await getDocs(
            query(
                readingsReference,
                where(
                    "busId",
                    "==",
                    currentBus.id
                )
            )
        );

    const morningSelectedDate =
        morningDate.value;

    const eveningSelectedDate =
        eveningDate.value;

    snapshot.forEach((documentSnapshot) => {

        const data =
            documentSnapshot.data();

        if (
            data.driverId !== currentUser.uid
        ) {
            return;
        }

        const record = {
            id: documentSnapshot.id,
            ...data
        };

        if (
            data.type === "morning" &&
            data.date === morningSelectedDate
        ) {
            morningRecord = record;
        }

        if (
            data.type === "evening" &&
            data.date === eveningSelectedDate
        ) {
            eveningRecord = record;
        }

    });

    updateTodayUI();
}
/* =========================================
   SAVE MORNING
========================================= */

morningButton.addEventListener(
    "click",
    async () => {

        hideMessage();


        const value =
            Number(
                morningOdometer.value
            );


        if (
            !Number.isFinite(value) ||
            value <= 0
        ) {

            showMessage(
                "Enter a valid morning odometer reading.",
                "error"
            );

            morningOdometer.focus();

            return;

        }


       

        /*
         * Prevent a reading lower than
         * the bus's current recorded
         * odometer, when available.
         */

        const busCurrentOdometer =
            Number(
                currentBus.currentOdometer
            );


        if (
            Number.isFinite(
                busCurrentOdometer
            ) &&
            value <
            busCurrentOdometer
        ) {

            showMessage(
                `Reading cannot be lower than the bus current odometer (${formatNumber(busCurrentOdometer)} KM).`,
                "error"
            );

            return;

        }


        setButtonLoading(
            morningButton,
            true
        );


        try {

            const readingData = {

                driverId:
                    currentUser.uid,

                busId:
                    currentBus.id,

                type:
                    "morning",

                odometer:
                    value,

             date:
                   morningDate.value,

                createdAt:
                    serverTimestamp()

            };


            const reference =
                await addDoc(
                    collection(
                        db,
                        "driverReadings"
                    ),
                    readingData
                );


            console.log(
                "Morning reading saved:",
                reference.id
            );


            morningRecord = {

                id:
                    reference.id,

                ...readingData,

                odometer:
                    value

            };


            morningDisplay.textContent =
                formatNumber(value);


            morningOdometer.value =
                "";


            updateTodayUI();


            showMessage(
                "Morning reading saved successfully.",
                "success"
            );


        } catch (error) {

            console.error(
                "MORNING SAVE ERROR:",
                error
            );


            showMessage(
                getFirebaseErrorMessage(error),
                "error"
            );

        }
if (!morningDate.value) {

    showMessage(
        "Select the morning reading date.",
        "error"
    );

    morningDate.focus();

    return;
}

        setButtonLoading(
            morningButton,
            false
        );

    }
);


/* =========================================
   SAVE EVENING
========================================= */

eveningButton.addEventListener(
    "click",
    async () => {

        hideMessage();


        const value =
            Number(
                eveningOdometer.value
            );


        if (
            !Number.isFinite(value) ||
            value <= 0
        ) {

            showMessage(
                "Enter a valid evening odometer reading.",
                "error"
            );

            eveningOdometer.focus();

            return;

        }


         * If morning reading exists,
         * evening cannot be lower.
         */

        if (
            morningRecord
        ) {

            const morning =
                Number(
                    morningRecord.odometer
                );


            if (
                value <
                morning
            ) {

                showMessage(
                    "Evening reading cannot be lower than the morning reading.",
                    "error"
                );

                eveningOdometer.focus();

                return;

            }

        }


        setButtonLoading(
            eveningButton,
            true
        );


        try {

            const readingData = {

                driverId:
                    currentUser.uid,

                busId:
                    currentBus.id,

                type:
                    "evening",

                odometer:
                    value,

                date:
    eveningDate.value,

                createdAt:
                    serverTimestamp()

            };


            const reference =
                await addDoc(
                    collection(
                        db,
                        "driverReadings"
                    ),
                    readingData
                );


            console.log(
                "Evening reading saved:",
                reference.id
            );


            eveningRecord = {

                id:
                    reference.id,

                ...readingData,

                odometer:
                    value

            };


            eveningOdometer.value =
                "";


            updateTodayUI();


            await loadHistory();


            showMessage(
                "Evening reading saved successfully.",
                "success"
            );


        } catch (error) {

            console.error(
                "EVENING SAVE ERROR:",
                error
            );


            showMessage(
                getFirebaseErrorMessage(error),
                "error"
            );

        }

if (!eveningDate.value) {

    showMessage(
        "Select the evening reading date.",
        "error"
    );

    eveningDate.focus();

    return;
}
        setButtonLoading(
            eveningButton,
            false
        );

    }
);


/* =========================================
   SAVE DIESEL
========================================= */

dieselButton.addEventListener(
    "click",
    async () => {

        hideMessage();


        const litres =
            Number(
                dieselLitres.value
            );


        const amount =
            Number(
                dieselAmount.value
            );


        const odometer =
            Number(
                dieselOdometer.value
            );


        const station =
            fuelStation.value.trim();


        /* =====================================
           VALIDATION
        ===================================== */

        if (
            !Number.isFinite(litres) ||
            litres <= 0
        ) {

            showMessage(
                "Enter valid diesel litres.",
                "error"
            );

            dieselLitres.focus();

            return;

        }


        if (
            !Number.isFinite(amount) ||
            amount < 0
        ) {

            showMessage(
                "Enter a valid diesel amount.",
                "error"
            );

            dieselAmount.focus();

            return;

        }


        if (
            !Number.isFinite(odometer) ||
            odometer <= 0
        ) {

            showMessage(
                "Enter the odometer reading at the time of diesel filling.",
                "error"
            );

            dieselOdometer.focus();

            return;

        }


        /*
         * Diesel odometer should not be
         * lower than the current known
         * bus odometer.
         */

        const currentBusOdometer =
            Number(
                currentBus.currentOdometer
            );


        if (
            Number.isFinite(
                currentBusOdometer
            ) &&
            odometer <
            currentBusOdometer
        ) {

            showMessage(
                `Diesel odometer cannot be lower than the bus current odometer (${formatNumber(currentBusOdometer)} KM).`,
                "error"
            );

            return;

        }


        setButtonLoading(
            dieselButton,
            true
        );


        try {

            const pricePerLitre =
                amount /
                litres;


            const dieselData = {

                driverId:
                    currentUser.uid,

                busId:
                    currentBus.id,

                litres:
                    litres,

                amount:
                    amount,

                pricePerLitre:
                    Number(
                        pricePerLitre.toFixed(2)
                    ),

                odometer:
                    odometer,

                fuelStation:
                    station,

               date:
    dieselDate.value,

                createdAt:
                    serverTimestamp()

            };


            const reference =
                await addDoc(
                    collection(
                        db,
                        "dieselRecords"
                    ),
                    dieselData
                );


            console.log(
                "Diesel saved:",
                reference.id
            );


            dieselLitres.value =
                "";

            dieselAmount.value =
                "";

            dieselOdometer.value =
                "";

            fuelStation.value =
                "";


            await loadHistory();


            showMessage(
                "Diesel details saved successfully.",
                "success"
            );


        } catch (error) {

            console.error(
                "DIESEL SAVE ERROR:",
                error
            );


            showMessage(
                getFirebaseErrorMessage(error),
                "error"
            );

        }

if (!dieselDate.value) {

    showMessage(
        "Select the diesel date.",
        "error"
    );

    dieselDate.focus();

    return;
}
        setButtonLoading(
            dieselButton,
            false
        );

    }
);


/* =========================================
   AVERAGE BUTTON
========================================= */

averageButton.addEventListener(
    "click",
    () => {

        if (
            !currentBus
        ) {

            showMessage(
                "Bus information is not loaded yet.",
                "error"
            );

            return;

        }


        window.location.href =
            `../avg/?id=${encodeURIComponent(currentBus.id)}`;

    }
);


/* =========================================
   HISTORY BUTTON
========================================= */

historyButton.addEventListener(
    "click",
    () => {

        /*
         * For now history is already
         * displayed on this page.
         *
         * Later we can connect this
         * to a separate history page.
         */

        const historySection =
            document.querySelector(
                ".history-section"
            );


        if (
            historySection
        ) {

            historySection.scrollIntoView({
                behavior: "smooth"
            });

        }

    }
);


/* =========================================
   LOGOUT
========================================= */

logoutButton.addEventListener(
    "click",
    async () => {

        try {

            await signOut(
                auth
            );


            window.location.href =
                "../login/";

        } catch (error) {

            console.error(
                "LOGOUT ERROR:",
                error
            );


            showMessage(
                "Unable to logout. Please try again.",
                "error"
            );

        }

    }
);


/* =========================================
   HISTORY
========================================= */

async function loadHistory() {

    if (
        !currentBus
    ) {

        return;

    }


    historyList.innerHTML = `
        <div class="history-empty">
            Loading history...
        </div>
    `;


    try {

        const history = [];


        /* =====================================
           READINGS
        ===================================== */

        const readingsReference =
            collection(
                db,
                "driverReadings"
            );


        const readingsQuery =
            query(
                readingsReference,

                where(
                    "busId",
                    "==",
                    currentBus.id
                ),

                limit(50)
            );


        const readingSnapshot =
            await getDocs(
                readingsQuery
            );


        readingSnapshot.forEach(
            (documentSnapshot) => {

                const data =
                    documentSnapshot.data();


                if (
                    data.driverId !==
                    currentUser.uid
                ) {

                    return;

                }


                history.push({

                    id:
                        documentSnapshot.id,

                    category:
                        "reading",

                    type:
                        data.type,

                    date:
                        data.date,

                    odometer:
                        Number(
                            data.odometer
                        ),

                    createdAt:
                        data.createdAt

                });

            }
        );


        /* =====================================
           DIESEL
        ===================================== */

        const dieselReference =
            collection(
                db,
                "dieselRecords"
            );


        const dieselQuery =
            query(
                dieselReference,

                where(
                    "busId",
                    "==",
                    currentBus.id
                ),

                limit(50)
            );


        const dieselSnapshot =
            await getDocs(
                dieselQuery
            );


        dieselSnapshot.forEach(
            (documentSnapshot) => {

                const data =
                    documentSnapshot.data();


                if (
                    data.driverId !==
                    currentUser.uid
                ) {

                    return;

                }


                history.push({

                    id:
                        documentSnapshot.id,

                    category:
                        "diesel",

                    type:
                        "diesel",

                    date:
                        data.date,

                    odometer:
                        Number(
                            data.odometer
                        ),

                    litres:
                        Number(
                            data.litres
                        ),

                    amount:
                        Number(
                            data.amount
                        ),

                    createdAt:
                        data.createdAt

                });

            }
        );


        /* =====================================
           SORT
        ===================================== */

        history.sort(
            (a, b) => {

                const aTime =
                    a.createdAt?.seconds ||
                    0;


                const bTime =
                    b.createdAt?.seconds ||
                    0;


                return (
                    bTime -
                    aTime
                );

            }
        );


        renderHistory(
            history.slice(
                0,
                10
            )
        );


    } catch (error) {

        console.error(
            "HISTORY ERROR:",
            error
        );


        historyList.innerHTML = `
            <div class="history-empty">
                Unable to load history.
            </div>
        `;

    }

}


/* =========================================
   RENDER HISTORY
========================================= */

function renderHistory(
    history
) {

    if (
        !history.length
    ) {

        historyList.innerHTML = `
            <div class="history-empty">
                No activity yet.
            </div>
        `;

        return;

    }


    historyList.innerHTML =
        "";


    history.forEach(
        (item) => {

            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "history-item";


            let title =
                "";


            let value =
                "";


            if (
                item.category ===
                "reading"
            ) {

                if (
                    item.type ===
                    "morning"
                ) {

                    title =
                        "Morning Reading";

                } else {

                    title =
                        "Evening Reading";

                }


                value =
                    `${formatNumber(item.odometer)} KM`;

            }


            if (
                item.category ===
                "diesel"
            ) {

                title =
                    "Diesel Added";


                value =
                    `${formatNumber(item.litres)} L`;

            }


            element.innerHTML = `

                <div class="history-left">

                    <div class="history-title">
                        ${escapeHTML(title)}
                    </div>

                    <div class="history-date">
                        ${escapeHTML(
                            formatDate(item.date)
                        )}
                    </div>

                </div>


                <div class="history-value">

                    ${escapeHTML(value)}

                    ${
                        item.category === "diesel"
                        ? `
                            <small>
                                ₹ ${formatNumber(item.amount)}
                            </small>
                          `
                        : ""
                    }

                </div>

            `;


            historyList.appendChild(
                element
            );

        }
    );

}


/* =========================================
   UPDATE TODAY UI
========================================= */

function updateTodayUI() {

    if (
        morningRecord
    ) {

        morningDisplay.textContent =
            formatNumber(
                morningRecord.odometer
            );

    } else {

        morningDisplay.textContent =
            "—";

    }


    if (
        eveningRecord
    ) {

        eveningDisplay.textContent =
            formatNumber(
                eveningRecord.odometer
            );

    } else {

        eveningDisplay.textContent =
            "—";

    }


    /*
     * Calculate today's distance
     */

    if (
        morningRecord &&
        eveningRecord
    ) {

        const morning =
            Number(
                morningRecord.odometer
            );


        const evening =
            Number(
                eveningRecord.odometer
            );


        const distance =
            evening -
            morning;


        todayDistance.textContent =
            formatNumber(
                distance
            );

    } else {

        todayDistance.textContent =
            "—";

    }


    /*
     * Disable buttons after saving
     */

    if (
        morningRecord
    ) {

        morningButton.disabled =
            true;

        morningButton.textContent =
            "MORNING READING SAVED";

    } else {

        morningButton.disabled =
            false;

        morningButton.textContent =
            "SAVE MORNING READING";

    }


    if (
        eveningRecord
    ) {

        eveningButton.disabled =
            true;

        eveningButton.textContent =
            "EVENING READING SAVED";

    } else {

        eveningButton.disabled =
            false;

        eveningButton.textContent =
            "SAVE EVENING READING";

    }

}


/* =========================================
   BUTTON LOADING
========================================= */

function setButtonLoading(
    button,
    loading
) {

    button.disabled =
        loading;


    if (
        loading
    ) {

        button.dataset.originalText =
            button.textContent;


        button.textContent =
            "SAVING...";

    } else {

        button.textContent =
            button.dataset.originalText ||
            button.textContent;

    }

}


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
   FORMAT NUMBER
========================================= */

function formatNumber(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-IN",
        {
            maximumFractionDigits: 2
        }
    );

}


/* =========================================
   FORMAT DATE
========================================= */

function formatDate(
    dateString
) {

    if (
        !dateString
    ) {

        return "Unknown date";

    }


    const parts =
        String(
            dateString
        ).split("-");


    if (
        parts.length !== 3
    ) {

        return dateString;

    }


    return `${parts[2]}/${parts[1]}/${parts[0]}`;

}


/* =========================================
   ESCAPE HTML
========================================= */

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


/* =========================================
   MESSAGES
========================================= */

function showMessage(
    text,
    type
) {

    message.textContent =
        text;


    message.className =
        `message ${type}`;

}


function hideMessage() {

    message.textContent =
        "";


    message.className =
        "message hidden";

}


/* =========================================
   FIREBASE ERROR
========================================= */

function getFirebaseErrorMessage(
    error
) {

    console.error(
        "Firebase error:",
        error
    );


    if (
        error?.code ===
        "permission-denied"
    ) {

        return "Firebase permission denied. Check your Firestore rules.";

    }


    if (
        error?.code ===
        "unavailable"
    ) {

        return "Firebase is temporarily unavailable. Check your internet connection.";

    }


    return (
        error?.message ||
        "Something went wrong while saving."
    );

}


/* =========================================
   HIDE LOADING
========================================= */

function hideLoading() {

    if (
        loadingScreen
    ) {

        loadingScreen.classList.add(
            "hidden"
        );

    }

          }
