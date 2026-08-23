import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";


import {
    auth,
    db
} from "../core/firebase.js";



const storage = getStorage(auth.app);
/* =================================
   ELEMENTS
================================= */

const driverName =
    document.getElementById("driverName");

const busNumber =
    document.getElementById("busNumber");

const busRegistration =
    document.getElementById("busRegistration");

const currentOdometer =
    document.getElementById("currentOdometer");

const workDate =
    document.getElementById("workDate");


const morningStatus =
    document.getElementById("morningStatus");

const morningStartOdometer =
    document.getElementById("morningStartOdometer");

const morningStartButton =
    document.getElementById("morningStartButton");

const morningEndArea =
    document.getElementById("morningEndArea");

const morningEndOdometer =
    document.getElementById("morningEndOdometer");

const morningEndButton =
    document.getElementById("morningEndButton");


const eveningStatus =
    document.getElementById("eveningStatus");

const eveningStartOdometer =
    document.getElementById("eveningStartOdometer");

const eveningStartButton =
    document.getElementById("eveningStartButton");

const eveningEndArea =
    document.getElementById("eveningEndArea");

const eveningEndOdometer =
    document.getElementById("eveningEndOdometer");

const eveningEndButton =
    document.getElementById("eveningEndButton");


const dieselOdometer =
    document.getElementById("dieselOdometer");

const dieselLitres =
    document.getElementById("dieselLitres");

const dieselAmount =
    document.getElementById("dieselAmount");

const dieselButton =
    document.getElementById("dieselButton");
const dieselBillPhoto =
    document.getElementById("dieselBillPhoto");

const historyList =
    document.getElementById("historyList");

const logoutButton =
    document.getElementById("logoutButton");

const message =
    document.getElementById("message");


/* =================================
   GLOBAL DATA
================================= */

let currentUser = null;

let driverData = null;

let busData = null;

let busId = null;

let activeRecord = null;
let locationWatchId = null;
let currentLiveLocation = null;

/* =================================
   DATE
================================= */

const today =
    new Date();

workDate.value =
    formatDateInput(today);


/* =================================
   AUTHENTICATION
================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.replace(
                "../index.html"
            );

            return;
        }


        currentUser =
            user;


        try {

            const userRef =
                doc(
                    db,
                    "users",
                    user.uid
                );


            const userSnapshot =
                await getDoc(
                    userRef
                );


            if (
                !userSnapshot.exists()
            ) {

                await signOut(auth);

                window.location.replace(
                    "../index.html"
                );

                return;
            }


            driverData =
                userSnapshot.data();


            /*
             * Must be a driver.
             */

            if (
                driverData.role !==
                "driver"
            ) {

                window.location.replace(
                    "../waiting/"
                );

                return;
            }


            /*
             * Must be approved.
             */

            if (
                driverData.status !==
                "approved"
            ) {

                window.location.replace(
                    "../waiting/"
                );

                return;
            }


            /*
             * Must have a bus.
             */

            if (
                !driverData.assignedBusId
            ) {

                window.location.replace(
                    "../waiting/"
                );

                return;
            }


            busId =
                driverData.assignedBusId;


            await loadDriver();


        } catch (error) {

            console.error(
                "DRIVER AUTH ERROR:",
                error
            );

            showError(
                "Unable to load your driver account."
            );

        }

    }
);


/* =================================
   LOAD DRIVER + BUS
================================= */

async function loadDriver() {

    driverName.textContent =
        driverData.name ||
        "Driver";


    const busRef =
        doc(
            db,
            "buses",
            busId
        );


    const busSnapshot =
        await getDoc(
            busRef
        );


    if (
        !busSnapshot.exists()
    ) {

        showError(
            "Your assigned bus could not be found."
        );

        return;
    }


    busData =
        busSnapshot.data();


    busNumber.textContent =
        busData.busNumber ||
        "BUS";


    busRegistration.textContent =
        busData.registrationNumber ||
        "Registration not available";


    currentOdometer.textContent =
        formatNumber(
            busData.currentOdometer ??
            busData.startingOdometer ??
            0
        ) + " KM";


    /*
     * Load existing incomplete record
     * for the selected date.
     */

    await loadActiveRecord();


    await loadHistory();

}


/* =================================
   DATE CHANGE
================================= */

workDate.addEventListener(
    "change",
    async () => {

        resetTripUI();

        await loadActiveRecord();

        await loadHistory();

    }
);


/* =================================
   LOAD ACTIVE RECORD
================================= */

async function loadActiveRecord() {

    activeRecord =
        null;


    try {

        const recordsRef =
            collection(
                db,
                "driverRecords"
            );


        const q =
            query(
                recordsRef,

                where(
                    "driverId",
                    "==",
                    currentUser.uid
                ),

                where(
                    "busId",
                    "==",
                    busId
                ),

                where(
                    "selectedDate",
                    "==",
                    workDate.value
                ),

                where(
                    "completed",
                    "==",
                    false
                ),

                orderBy(
                    "createdAt",
                    "desc"
                ),

                limit(1)
            );


        const snapshot =
            await getDocs(q);


        if (
            snapshot.empty
        ) {

            resetTripUI();

            return;
        }


        const recordSnapshot =
            snapshot.docs[0];


        activeRecord = {

            id:
                recordSnapshot.id,

            ...recordSnapshot.data()

        };


        updateTripUI();


    } catch (error) {

        /*
         * If there is no Firestore index yet,
         * the page should still work for a
         * new record.
         */

        console.error(
            "ACTIVE RECORD ERROR:",
            error
        );

        resetTripUI();

    }

}
/* =========================================
   START LIVE LOCATION
========================================= */

function startLiveLocation() {

    if (!navigator.geolocation) {

        showError(
            "Location is not supported on this device."
        );

        return;

    }

    if (locationWatchId !== null) {

        navigator.geolocation.clearWatch(
            locationWatchId
        );

    }


    locationWatchId =
        navigator.geolocation.watchPosition(

            async (position) => {

                const latitude =
                    position.coords.latitude;

                const longitude =
                    position.coords.longitude;

                const accuracy =
                    position.coords.accuracy;

                const speed =
                    position.coords.speed;


                currentLiveLocation = {

                    latitude,
                    longitude,
                    accuracy,
                    speed

                };


                console.log(
                    "LIVE LOCATION:",
                    currentLiveLocation
                );


                /*
                 * Save location to the active
                 * driver record.
                 */

                if (
                    activeRecord &&
                    activeRecord.id
                ) {

                    try {

                        await updateDoc(

                            doc(
                                db,
                                "driverRecords",
                                activeRecord.id
                            ),

                            {

                                liveLocation: {

                                    latitude:
                                        latitude,

                                    longitude:
                                        longitude,

                                    accuracy:
                                        accuracy,

                                    speed:
                                        speed || 0,

                                    updatedAt:
                                        serverTimestamp()

                                }

                            }

                        );

                    } catch (error) {

                        console.error(
                            "LOCATION SAVE ERROR:",
                            error
                        );

                    }

                }

            },


            (error) => {

                console.error(
                    "LOCATION ERROR:",
                    error
                );


                if (
                    error.code ===
                    error.PERMISSION_DENIED
                ) {

                    showError(
                        "Location permission was denied. Please allow location access."
                    );

                }

                else if (
                    error.code ===
                    error.POSITION_UNAVAILABLE
                ) {

                    showError(
                        "Unable to get your current location."
                    );

                }

                else if (
                    error.code ===
                    error.TIMEOUT
                ) {

                    showError(
                        "Location request timed out. Trying again..."
                    );

                }

            },


            {

                enableHighAccuracy: true,

                maximumAge: 5000,

                timeout: 15000

            }

        );

}


/* =========================================
   STOP LIVE LOCATION
========================================= */

function stopLiveLocation() {

    if (
        locationWatchId !== null
    ) {

        navigator.geolocation.clearWatch(
            locationWatchId
        );

        locationWatchId = null;

    }

}

/* =================================
   MORNING START
================================= */

morningStartButton.addEventListener(
    "click",
    async () => {

        if (!busData) {

            showError(
                "Bus information is not loaded."
            );

            return;
        }


        morningStartButton.disabled =
            true;


        try {

            /*
             * IMPORTANT:
             * No odometer is entered here.
             *
             * We automatically use the
             * bus's current odometer.
             */

            const startOdometer =
                Number(
                    busData.currentOdometer ??
                    busData.startingOdometer ??
                    0
                );


            const recordData = {

                driverId:
                    currentUser.uid,

                driverName:
                    driverData.name || "",

                busId:
                    busId,

                busNumber:
                    busData.busNumber || "",

                selectedDate:
                    workDate.value,

                morningStartOdometer:
                    startOdometer,

                morningStartAt:
                    serverTimestamp(),

                morningEndOdometer:
                    null,

                morningEndAt:
                    null,

                eveningStartOdometer:
                    null,

                eveningStartAt:
                    null,

                eveningEndOdometer:
                    null,

                eveningEndAt:
                    null,

                completed:
                    false,

                createdAt:
                    serverTimestamp()

            };


            const reference =
                await addDoc(
                    collection(
                        db,
                        "driverRecords"
                    ),
                    recordData
                );


            activeRecord = {

                id:
                    reference.id,

                ...recordData,

                morningStartOdometer:
                    startOdometer

            };


            morningStartOdometer.textContent =
                formatNumber(
                    startOdometer
                ) + " KM";


            morningStatus.textContent =
                "IN PROGRESS";

            morningStatus.className =
                "status active";


            morningStartButton.style.display =
                "none";


            morningEndArea.classList.remove(
                "hidden"
            );


            showSuccess(
                "Morning pickup started."
            );

startLiveLocation();
            
        } catch (error) {

            console.error(
                "MORNING START ERROR:",
                error
            );

            morningStartButton.disabled =
                false;

            showError(
                "Unable to start morning pickup."
            );

        }

    }
);


/* =================================
   MORNING END
================================= */

morningEndButton.addEventListener(
    "click",
    async () => {

        const value =
            Number(
                morningEndOdometer.value
            );


        if (
            !Number.isFinite(value) ||
            value < 0
        ) {

            showError(
                "Enter a valid morning odometer."
            );

            return;
        }


        if (!activeRecord) {

            showError(
                "No active morning record."
            );

            return;
        }


        const start =
            Number(
                activeRecord.morningStartOdometer
            );


        if (
            value < start
        ) {

            showError(
                "Morning ending odometer cannot be lower than the starting odometer."
            );

            return;
        }


        morningEndButton.disabled =
            true;


        try {

            const recordRef =
                doc(
                    db,
                    "driverRecords",
                    activeRecord.id
                );


            await updateDoc(
                recordRef,
                {

                    morningEndOdometer:
                        value,

                    morningEndAt:
                        serverTimestamp(),

                    morningDistance:
                        value - start

                }
            );


            /*
             * Update bus current odometer.
             *
             * Evening starting odometer
             * will automatically use this.
             */

            const busRef =
                doc(
                    db,
                    "buses",
                    busId
                );


            await updateDoc(
                busRef,
                {

                    currentOdometer:
                        value,

                    odometerUpdatedAt:
                        serverTimestamp()

                }
            );


            busData.currentOdometer =
                value;


            currentOdometer.textContent =
                formatNumber(
                    value
                ) + " KM";


            activeRecord.morningEndOdometer =
                value;


            morningStatus.textContent =
                "COMPLETED";

            morningStatus.className =
                "status complete";


            morningEndArea.classList.add(
                "hidden"
            );


            eveningStartOdometer.textContent =
                formatNumber(
                    value
                ) + " KM";


            eveningStartButton.disabled =
                false;


            showSuccess(
                "Morning pickup completed."
            );


            await loadHistory();


        } catch (error) {

            console.error(
                "MORNING END ERROR:",
                error
            );

            morningEndButton.disabled =
                false;

            showError(
                "Unable to save morning odometer."
            );

        }

    }
);


/* =================================
   EVENING START
================================= */

eveningStartButton.addEventListener(
    "click",
    async () => {

        if (!activeRecord) {

            showError(
                "Complete morning pickup first."
            );

            return;

        }


        if (
            activeRecord.morningEndOdometer ==
            null
        ) {

            showError(
                "Morning odometer must be entered first."
            );

            return;

        }


        eveningStartButton.disabled =
            true;


        try {

            const eveningStart =
                Number(
                    activeRecord.morningEndOdometer
                );


            const recordRef =
                doc(
                    db,
                    "driverRecords",
                    activeRecord.id
                );


            await updateDoc(
                recordRef,
                {

                    eveningStartOdometer:
                        eveningStart,

                    eveningStartAt:
                        serverTimestamp()

                }
            );


            activeRecord.eveningStartOdometer =
                eveningStart;


            eveningStartOdometer.textContent =
                formatNumber(
                    eveningStart
                ) + " KM";


            eveningStatus.textContent =
                "IN PROGRESS";

            eveningStatus.className =
                "status active";


            eveningStartButton.style.display =
                "none";


            eveningEndArea.classList.remove(
                "hidden"
            );


            showSuccess(
                "Evening pickup started."
            );


        } catch (error) {

            console.error(
                "EVENING START ERROR:",
                error
            );

            eveningStartButton.disabled =
                false;

            showError(
                "Unable to start evening pickup."
            );

        }

    }
);


/* =================================
   EVENING END
================================= */

eveningEndButton.addEventListener(
    "click",
    async () => {

        const value =
            Number(
                eveningEndOdometer.value
            );


        if (
            !Number.isFinite(value) ||
            value < 0
        ) {

            showError(
                "Enter a valid evening odometer."
            );

            return;

        }


        if (!activeRecord) {

            showError(
                "No active record."
            );

            return;

        }


        const start =
            Number(
                activeRecord.eveningStartOdometer
            );


        if (
            value < start
        ) {

            showError(
                "Evening ending odometer cannot be lower than the starting odometer."
            );

            return;

        }


        eveningEndButton.disabled =
            true;


        try {

            const recordRef =
                doc(
                    db,
                    "driverRecords",
                    activeRecord.id
                );


            await updateDoc(
                recordRef,
                {

                    eveningEndOdometer:
                        value,

                    eveningEndAt:
                        serverTimestamp(),

                    eveningDistance:
                        value - start,

                    totalDistance:
                        (
                            Number(
                                activeRecord.morningEndOdometer
                            ) -
                            Number(
                                activeRecord.morningStartOdometer
                            )
                        ) +
                        (
                            value -
                            Number(
                                activeRecord.eveningStartOdometer
                            )
                        ),

                    completed:
                        true,

                    completedAt:
                        serverTimestamp()

                }
            );


            /*
             * Update bus current odometer.
             */

            const busRef =
                doc(
                    db,
                    "buses",
                    busId
                );


            await updateDoc(
                busRef,
                {

                    currentOdometer:
                        value,

                    odometerUpdatedAt:
                        serverTimestamp()

                }
            );


            busData.currentOdometer =
                value;


            currentOdometer.textContent =
                formatNumber(
                    value
                ) + " KM";


            activeRecord.eveningEndOdometer =
                value;


            activeRecord.completed =
                true;


            eveningStatus.textContent =
                "COMPLETED";

            eveningStatus.className =
                "status complete";


            eveningEndArea.classList.add(
                "hidden"
            );


            eveningStartButton.style.display =
                "";


            eveningStartButton.disabled =
                true;


            /*
             * Clear active record so the
             * driver can start another
             * test record for the same date.
             */

            activeRecord =
                null;


            showSuccess(
                "Evening pickup completed and odometer saved."
            );


            await loadHistory();


        } catch (error) {

            console.error(
                "EVENING END ERROR:",
                error
            );

            eveningEndButton.disabled =
                false;

            showError(
                "Unable to save evening odometer."
            );

        }

    }
);


/* =================================
   DIESEL
================================= */

dieselButton.addEventListener(
    "click",
    async () => {

        const odometer =
            Number(
                dieselOdometer.value
            );

        const litres =
            Number(
                dieselLitres.value
            );

        const amount =
            Number(
                dieselAmount.value
            );


        if (
            !Number.isFinite(odometer) ||
            odometer < 0
        ) {

            showError(
                "Enter the diesel-point odometer."
            );

            return;

        }


        if (
            !Number.isFinite(litres) ||
            litres <= 0
        ) {

            showError(
                "Enter diesel litres."
            );

            return;

        }


        if (
            !Number.isFinite(amount) ||
            amount < 0
        ) {

            showError(
                "Enter diesel cost."
            );

            return;

        }


        dieselButton.disabled =
            true;

try {

    /* ===============================
       CHECK DIESEL BILL PHOTO
    =============================== */

    const photoFile =
        dieselBillPhoto.files[0];

    if (!photoFile) {

        showError(
            "Please upload the diesel bill photo."
        );

        dieselButton.disabled = false;

        return;
    }


    /* ===============================
       UPLOAD PHOTO TO FIREBASE STORAGE
    =============================== */

    const fileExtension =
        photoFile.name
            .split(".")
            .pop();

    const fileName =
        `${currentUser.uid}_${busId}_${Date.now()}.${fileExtension}`;


    const storageRef =
        ref(
            storage,
            `dieselBills/${busId}/${fileName}`
        );


    await uploadBytes(
        storageRef,
        photoFile
    );


    const billPhotoUrl =
        await getDownloadURL(
            storageRef
        );


    /* ===============================
       SAVE DIESEL RECORD
    =============================== */

    await addDoc(
        collection(
            db,
            "dieselRecords"
        ),
        {

            driverId:
                currentUser.uid,

            driverName:
                driverData.name || "",

            busId:
                busId,

            busNumber:
                busData.busNumber || "",

            selectedDate:
                workDate.value,

            odometer:
                odometer,

            litres:
                litres,

            amount:
                amount,

            billPhotoUrl:
                billPhotoUrl,

            createdAt:
                serverTimestamp()
        }
    );

            dieselOdometer.value =
                "";

            dieselLitres.value =
                "";

            dieselAmount.value =
                "";


            showSuccess(
                "Diesel entry saved."
            );


        } catch (error) {

            console.error(
                "DIESEL ERROR:",
                error
            );

            showError(
                "Unable to save diesel entry."
            );

        } finally {

            dieselButton.disabled =
                false;

        }

    }
);


/* =================================
   HISTORY
================================= */

async function loadHistory() {

    historyList.innerHTML =
        `<div class="empty">Loading history...</div>`;


    try {

        const recordsQuery =
            query(
                collection(
                    db,
                    "driverRecords"
                ),

                where(
                    "driverId",
                    "==",
                    currentUser.uid
                ),

                where(
                    "busId",
                    "==",
                    busId
                ),

                orderBy(
                    "createdAt",
                    "desc"
                ),

                limit(10)
            );


        const snapshot =
            await getDocs(
                recordsQuery
            );


        if (
            snapshot.empty
        ) {

            historyList.innerHTML =
                `<div class="empty">No trip records yet.</div>`;

            return;

        }


        historyList.innerHTML =
            "";


        snapshot.forEach(
            (recordSnapshot) => {

                const record =
                    recordSnapshot.data();


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "history-card";


                const morningDistance =
                    record.morningDistance ??
                    0;


                const eveningDistance =
                    record.eveningDistance ??
                    0;


                const totalDistance =
                    record.totalDistance ??
                    (
                        Number(
                            morningDistance
                        ) +
                        Number(
                            eveningDistance
                        )
                    );


                card.innerHTML = `

                    <div class="history-date">
                        ${escapeHTML(
                            record.selectedDate ||
                            "--"
                        )}
                    </div>

                    <div class="history-row">

                        <div class="history-item">
                            <span>
                                MORNING
                            </span>

                            <strong>
                                ${formatNumber(
                                    morningDistance
                                )} KM
                            </strong>
                        </div>


                        <div class="history-item">
                            <span>
                                EVENING
                            </span>

                            <strong>
                                ${formatNumber(
                                    eveningDistance
                                )} KM
                            </strong>
                        </div>


                        <div class="history-item">
                            <span>
                                TOTAL
                            </span>

                            <strong>
                                ${formatNumber(
                                    totalDistance
                                )} KM
                            </strong>
                        </div>

                    </div>
                `;


                historyList.appendChild(
                    card
                );

            }
        );


    } catch (error) {

        console.error(
            "HISTORY ERROR:",
            error
        );


        historyList.innerHTML =
            `<div class="empty">
                History will appear here after records are saved.
            </div>`;

    }

}


/* =================================
   UPDATE TRIP UI
================================= */

function updateTripUI() {

    if (!activeRecord) {

        resetTripUI();

        return;

    }


    const morningStart =
        activeRecord.morningStartOdometer;


    morningStartOdometer.textContent =
        formatNumber(
            morningStart
        ) + " KM";


    morningStartButton.style.display =
        "none";


    if (
        activeRecord.morningEndOdometer ==
        null
    ) {

        morningStatus.textContent =
            "IN PROGRESS";

        morningStatus.className =
            "status active";


        morningEndArea.classList.remove(
            "hidden"
        );


        return;

    }


    morningStatus.textContent =
        "COMPLETED";

    morningStatus.className =
        "status complete";


    morningEndArea.classList.add(
        "hidden"
    );


    eveningStartOdometer.textContent =
        formatNumber(
            activeRecord.morningEndOdometer
        ) + " KM";


    eveningStartButton.disabled =
        false;


    if (
        activeRecord.eveningStartOdometer ==
        null
    ) {

        return;

    }


    eveningStartOdometer.textContent =
        formatNumber(
            activeRecord.eveningStartOdometer
        ) + " KM";


    eveningStartButton.style.display =
        "none";


    eveningStatus.textContent =
        "IN PROGRESS";

    eveningStatus.className =
        "status active";


    eveningEndArea.classList.remove(
        "hidden"
    );

}


/* =================================
   RESET UI
================================= */

function resetTripUI() {

    activeRecord =
        null;


    morningStatus.textContent =
        "NOT STARTED";

    morningStatus.className =
        "status pending";


    eveningStatus.textContent =
        "NOT STARTED";

    eveningStatus.className =
        "status pending";


    morningStartOdometer.textContent =
        formatNumber(
            busData?.currentOdometer ??
            busData?.startingOdometer ??
            0
        ) + " KM";


    eveningStartOdometer.textContent =
        "--";


    morningStartButton.style.display =
        "";


    morningStartButton.disabled =
        false;


    morningEndArea.classList.add(
        "hidden"
    );


    eveningStartButton.style.display =
        "";


    eveningStartButton.disabled =
        true;


    eveningEndArea.classList.add(
        "hidden"
    );

}


/* =================================
   DATE FORMAT
================================= */

function formatDateInput(
    date
) {

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


    return `${year}-${month}-${day}`;

}


/* =================================
   NUMBER
================================= */

function formatNumber(
    value
) {

    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return "0";

    }


    return number.toLocaleString(
        "en-IN",
        {
            maximumFractionDigits: 2
        }
    );

}


/* =================================
   SUCCESS
================================= */

function showSuccess(
    text
) {

    message.textContent =
        text;

    message.className =
        "message success";


    setTimeout(
        () => {

            message.classList.add(
                "hidden"
            );

        },
        3000
    );

}


/* =================================
   ERROR
================================= */

function showError(
    text
) {

    message.textContent =
        text;

    message.className =
        "message error";


    setTimeout(
        () => {

            message.classList.add(
                "hidden"
            );

        },
        4000
    );

}


/* =================================
   HTML SAFETY
================================= */

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


/* =================================
   LOGOUT
================================= */

logoutButton.addEventListener(
    "click",
    async () => {

        try {

            await signOut(
                auth
            );


            window.location.replace(
                "../index.html"
            );


        } catch (error) {

            console.error(
                "LOGOUT ERROR:",
                error
            );

        }

    }
);
