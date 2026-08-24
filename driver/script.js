import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    addDoc,
    updateDoc,
    orderBy,
    limit,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "../core/firebase.js";


/* =====================================================
   ELEMENTS
===================================================== */

const driverNameEl =
    document.getElementById("driverName");

const busNumberEl =
    document.getElementById("busNumber");

const busRegistrationEl =
    document.getElementById("busRegistration");

const currentOdometerEl =
    document.getElementById("currentOdometer");

const workDateEl =
    document.getElementById("workDate");


const morningStatusEl =
    document.getElementById("morningStatus");

const morningStartOdometerEl =
    document.getElementById("morningStartOdometer");

const morningStartButton =
    document.getElementById("morningStartButton");

const morningEndArea =
    document.getElementById("morningEndArea");

const morningEndOdometer =
    document.getElementById("morningEndOdometer");

const morningEndButton =
    document.getElementById("morningEndButton");


const eveningStatusEl =
    document.getElementById("eveningStatus");

const eveningStartOdometerEl =
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


const historyList =
    document.getElementById("historyList");

const logoutButton =
    document.getElementById("logoutButton");

const messageEl =
    document.getElementById("message");


/* =====================================================
   STATE
===================================================== */

let currentUser = null;
let currentDriver = null;
let currentBus = null;
let currentRecord = null;


/* =====================================================
   START
===================================================== */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "../login/";

            return;
        }


        currentUser = user;


        try {

            await loadDriver();

            await loadAssignedBus();

            setDefaultDate();

            await loadSelectedDate();

            await loadHistory();


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

        }

    }
);


/* =====================================================
   LOAD DRIVER
===================================================== */

async function loadDriver() {

    /*
     * First try:
     *
     * drivers document containing uid
     */

    const driverQuery =
        query(
            collection(db, "drivers"),
            where(
                "uid",
                "==",
                currentUser.uid
            )
        );


    const snapshot =
        await getDocs(
            driverQuery
        );


    if (!snapshot.empty) {

        const driverDoc =
            snapshot.docs[0];

        currentDriver = {
            id: driverDoc.id,
            ...driverDoc.data()
        };

    } else {

        /*
         * Fallback:
         * drivers/{Firebase UID}
         */

        const driverRef =
            doc(
                db,
                "drivers",
                currentUser.uid
            );

        const driverSnap =
            await getDoc(
                driverRef
            );


        if (!driverSnap.exists()) {

            throw new Error(
                "Driver profile not found."
            );

        }


        currentDriver = {

            id:
                driverSnap.id,

            ...driverSnap.data()

        };

    }


    driverNameEl.textContent =
        `Welcome ${
            currentDriver.name ||
            currentUser.displayName ||
            "Driver"
        }`;

}


/* =====================================================
   LOAD ASSIGNED BUS
===================================================== */

async function loadAssignedBus() {

    const busesSnapshot =
        await getDocs(
            collection(
                db,
                "buses"
            )
        );


    let foundBus = null;


    busesSnapshot.forEach(
        busDoc => {

            const bus =
                busDoc.data();


            const assignedDriver =
                bus.assignedDriverId ||
                bus.driverId ||
                bus.driverUid;


            /*
             * Match either:
             *
             * driver document ID
             * OR Firebase Auth UID
             */

            if (
                assignedDriver ===
                currentDriver.id
                ||
                assignedDriver ===
                currentUser.uid
            ) {

                foundBus = {

                    id:
                        busDoc.id,

                    ...bus

                };

            }

        }
    );


    if (!foundBus) {

        throw new Error(
            "No bus is currently assigned to you."
        );

    }


    currentBus =
        foundBus;


    busNumberEl.textContent =
        currentBus.busNumber ||
        currentBus.name ||
        currentBus.number ||
        "BUS";


    busRegistrationEl.textContent =
        currentBus.registrationNumber ||
        currentBus.registrationNo ||
        "--";


    await loadCurrentOdometer();

}


/* =====================================================
   DEFAULT DATE
===================================================== */

function setDefaultDate() {

    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            today.getDate()
        ).padStart(2, "0");


    workDateEl.value =
        `${year}-${month}-${day}`;

}


/* =====================================================
   DATE CHANGE
===================================================== */

workDateEl.addEventListener(
    "change",
    async () => {

        resetScreen();

        await loadSelectedDate();

    }
);


/* =====================================================
   LOAD SELECTED DATE
===================================================== */

async function loadSelectedDate() {

    if (
        !workDateEl.value ||
        !currentBus ||
        !currentDriver
    ) {

        return;

    }


    const selectedDate =
        workDateEl.value;


    currentRecord = null;


    /*
     * Find existing record for:
     *
     * driver + bus + operation date
     */

    const q =
        query(
            collection(
                db,
                "driverRecords"
            ),

            where(
                "driverId",
                "==",
                currentDriver.id
            ),

            where(
                "busId",
                "==",
                currentBus.id
            ),

            where(
                "operationDate",
                "==",
                selectedDate
            ),

            limit(1)
        );


    const snapshot =
        await getDocs(q);


    if (
        !snapshot.empty
    ) {

        const recordDoc =
            snapshot.docs[0];


        currentRecord = {

            id:
                recordDoc.id,

            ...recordDoc.data()

        };


        displayExistingRecord();

    } else {

        /*
         * New date
         */

        prepareNewDate();

    }


    /*
     * Starting odometer is based
     * on previous available record.
     */

    await setAutomaticStartingOdometer();

}


/* =====================================================
   NEW DATE
===================================================== */

function prepareNewDate() {

    morningStatusEl.textContent =
        "NOT STARTED";

    morningStatusEl.className =
        "status pending";


    eveningStatusEl.textContent =
        "NOT STARTED";

    eveningStatusEl.className =
        "status pending";


    morningStartOdometerEl.textContent =
        "--";


    eveningStartOdometerEl.textContent =
        "--";


    morningEndArea.classList.add(
        "hidden"
    );

    eveningEndArea.classList.add(
        "hidden"
    );


    morningStartButton.disabled =
        false;


    morningEndButton.disabled =
        false;


    eveningStartButton.disabled =
        true;


    eveningEndButton.disabled =
        false;

}


/* =====================================================
   DISPLAY EXISTING RECORD
===================================================== */

function displayExistingRecord() {

    const record =
        currentRecord;


    /*
     * MORNING
     */

    if (
        record.morningStartOdometer !==
        undefined &&
        record.morningStartOdometer !==
        null
    ) {

        morningStartOdometerEl.textContent =
            `${formatNumber(
                record.morningStartOdometer
            )} KM`;

    }


    if (
        record.morningEndOdometer !==
        undefined &&
        record.morningEndOdometer !==
        null
    ) {

        morningEndArea.classList.remove(
            "hidden"
        );

        morningEndOdometer.value =
            record.morningEndOdometer;


        morningStatusEl.textContent =
            "COMPLETED";

        morningStatusEl.className =
            "status complete";


        morningStartButton.disabled =
            true;

        morningEndButton.disabled =
            true;


    } else if (
        record.morningStartOdometer !==
        undefined
    ) {

        morningEndArea.classList.remove(
            "hidden"
        );


        morningStatusEl.textContent =
            "IN PROGRESS";

        morningStatusEl.className =
            "status active";


        morningStartButton.disabled =
            true;

        morningEndButton.disabled =
            false;

    }


    /*
     * EVENING
     */

    if (
        record.eveningStartOdometer !==
        undefined &&
        record.eveningStartOdometer !==
        null
    ) {

        eveningStartOdometerEl.textContent =
            `${formatNumber(
                record.eveningStartOdometer
            )} KM`;

    }


    if (
        record.eveningEndOdometer !==
        undefined &&
        record.eveningEndOdometer !==
        null
    ) {

        eveningEndArea.classList.remove(
            "hidden"
        );

        eveningEndOdometer.value =
            record.eveningEndOdometer;


        eveningStatusEl.textContent =
            "COMPLETED";

        eveningStatusEl.className =
            "status complete";


        eveningStartButton.disabled =
            true;

        eveningEndButton.disabled =
            true;

    } else if (
        record.eveningStartOdometer !==
        undefined
    ) {

        eveningEndArea.classList.remove(
            "hidden"
        );


        eveningStatusEl.textContent =
            "IN PROGRESS";

        eveningStatusEl.className =
            "status active";


        eveningStartButton.disabled =
            true;

        eveningEndButton.disabled =
            false;

    }


    /*
     * EVENING CAN ONLY START
     * AFTER MORNING IS COMPLETE
     */

    if (
        record.morningEndOdometer !==
        undefined &&
        record.morningEndOdometer !==
        null &&
        record.eveningStartOdometer ===
        undefined
    ) {

        eveningStartButton.disabled =
            false;

    }


    /*
     * DIESEL
     */

    if (
        record.diesel
    ) {

        dieselOdometer.value =
            record.diesel.odometer ||
            "";

        dieselLitres.value =
            record.diesel.litres ||
            "";

        dieselAmount.value =
            record.diesel.amount ||
            "";

    }

}


/* =====================================================
   AUTOMATIC STARTING ODOMETER
===================================================== */

async function setAutomaticStartingOdometer() {

    if (
        !currentBus ||
        !workDateEl.value
    ) {

        return;

    }


    /*
     * If selected day's record already
     * has readings, don't overwrite.
     */

    if (
        currentRecord
    ) {

        if (
            currentRecord.morningStartOdometer
            !== undefined
        ) {

            currentOdometerEl.textContent =
                `${formatNumber(
                    currentRecord.morningStartOdometer
                )} KM`;

            return;

        }

    }


    /*
     * Find latest previous driver record
     */

    const q =
        query(
            collection(
                db,
                "driverRecords"
            ),

            where(
                "busId",
                "==",
                currentBus.id
            ),

            orderBy(
                "operationDate",
                "desc"
            ),

            limit(20)
        );


    try {

        const snapshot =
            await getDocs(q);


        let previousEnd =
            null;


        for (
            const document of
            snapshot.docs
        ) {

            const data =
                document.data();


            if (
                data.operationDate >=
                workDateEl.value
            ) {

                continue;

            }


            if (
                data.eveningEndOdometer !==
                undefined &&
                data.eveningEndOdometer !==
                null
            ) {

                previousEnd =
                    Number(
                        data.eveningEndOdometer
                    );

                break;

            }


            if (
                data.morningEndOdometer !==
                undefined &&
                data.morningEndOdometer !==
                null
            ) {

                previousEnd =
                    Number(
                        data.morningEndOdometer
                    );

                break;

            }

        }


        if (
            previousEnd !== null
        ) {

            currentOdometerEl.textContent =
                `${formatNumber(
                    previousEnd
                )} KM`;

            morningStartOdometerEl.textContent =
                `${formatNumber(
                    previousEnd
                )} KM`;

        } else {

            /*
             * First-ever record:
             * use bus current odometer
             */

            const busOdometer =
                Number(
                    currentBus.currentOdometer ||
                    currentBus.odometer ||
                    0
                );


            if (
                busOdometer > 0
            ) {

                currentOdometerEl.textContent =
                    `${formatNumber(
                        busOdometer
                    )} KM`;

            } else {

                currentOdometerEl.textContent =
                    "-- KM";

            }

        }

    } catch (error) {

        /*
         * If Firestore index isn't available,
         * fallback to current bus odometer.
         */

        console.warn(
            "Previous odometer lookup:",
            error
        );


        const busOdometer =
            Number(
                currentBus.currentOdometer ||
                currentBus.odometer ||
                0
            );


        currentOdometerEl.textContent =
            busOdometer
                ? `${formatNumber(
                    busOdometer
                  )} KM`
                : "-- KM";

    }

}


/* =====================================================
   MORNING START
===================================================== */

morningStartButton.addEventListener(
    "click",
    async () => {

        if (
            !currentBus ||
            !currentDriver
        ) {

            return;

        }


        const startingOdometer =
            await getStartingOdometer();


        if (
            startingOdometer === null
        ) {

            showMessage(
                "Starting odometer is not available.",
                "error"
            );

            return;

        }


        morningStartButton.disabled =
            true;


        try {

            if (
                currentRecord
            ) {

                await updateDoc(

                    doc(
                        db,
                        "driverRecords",
                        currentRecord.id
                    ),

                    {

                        morningStartOdometer:
                            startingOdometer,

                        morningStartedAt:
                            serverTimestamp(),

                        updatedAt:
                            serverTimestamp()

                    }

                );

            } else {

                const newRecord =
                    await addDoc(

                        collection(
                            db,
                            "driverRecords"
                        ),

                        {

                            driverId:
                                currentDriver.id,

                            driverUid:
                                currentUser.uid,

                            driverName:
                                currentDriver.name ||
                                currentUser.displayName ||
                                "",

                            busId:
                                currentBus.id,

                            busNumber:
                                currentBus.busNumber ||
                                "",

                            operationDate:
                                workDateEl.value,

                            morningStartOdometer:
                                startingOdometer,

                            morningEndOdometer:
                                null,

                            eveningStartOdometer:
                                null,

                            eveningEndOdometer:
                                null,

                            createdAt:
                                serverTimestamp(),

                            updatedAt:
                                serverTimestamp()

                        }

                    );


                currentRecord = {

                    id:
                        newRecord.id,

                    driverId:
                        currentDriver.id,

                    driverUid:
                        currentUser.uid,

                    driverName:
                        currentDriver.name ||
                        currentUser.displayName ||
                        "",

                    busId:
                        currentBus.id,

                    busNumber:
                        currentBus.busNumber ||
                        "",

                    operationDate:
                        workDateEl.value,

                    morningStartOdometer:
                        startingOdometer,

                    morningEndOdometer:
                        null,

                    eveningStartOdometer:
                        null,

                    eveningEndOdometer:
                        null

                };

            }


            morningStartOdometerEl.textContent =
                `${formatNumber(
                    startingOdometer
                )} KM`;


            morningStatusEl.textContent =
                "IN PROGRESS";

            morningStatusEl.className =
                "status active";


            morningEndArea.classList.remove(
                "hidden"
            );


            showMessage(
                "Morning pickup started.",
                "success"
            );


        } catch (error) {

            console.error(error);

            morningStartButton.disabled =
                false;

            showMessage(
                "Unable to start morning pickup.",
                "error"
            );

        }

    }
);


/* =====================================================
   MORNING END
===================================================== */

morningEndButton.addEventListener(
    "click",
    async () => {

        const value =
            Number(
                morningEndOdometer.value
            );


        if (
            !Number.isFinite(value) ||
            value <= 0
        ) {

            showMessage(
                "Enter a valid morning ending odometer.",
                "error"
            );

            return;

        }


        const start =
            Number(
                currentRecord?.morningStartOdometer
            );


        if (
            value < start
        ) {

            showMessage(
                "Ending odometer cannot be lower than starting odometer.",
                "error"
            );

            return;

        }


        try {

            await updateDoc(

                doc(
                    db,
                    "driverRecords",
                    currentRecord.id
                ),

                {

                    morningEndOdometer:
                        value,

                    morningEndedAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp()

                }

            );


            currentRecord.morningEndOdometer =
                value;


            morningStatusEl.textContent =
                "COMPLETED";

            morningStatusEl.className =
                "status complete";


            morningEndButton.disabled =
                true;


            eveningStartButton.disabled =
                false;


            showMessage(
                "Morning pickup completed.",
                "success"
            );


            await loadCurrentOdometer();


        } catch (error) {

            console.error(error);

            showMessage(
                "Unable to save morning odometer.",
                "error"
            );

        }

    }
);


/* =====================================================
   EVENING START
===================================================== */

eveningStartButton.addEventListener(
    "click",
    async () => {

        if (
            !currentRecord
        ) {

            showMessage(
                "Complete morning pickup first.",
                "error"
            );

            return;

        }


        if (
            currentRecord.morningEndOdometer
            === undefined ||
            currentRecord.morningEndOdometer
            === null
        ) {

            showMessage(
                "Complete morning pickup first.",
                "error"
            );

            return;

        }


        const startingOdometer =
            Number(
                currentRecord.morningEndOdometer
            );


        try {

            await updateDoc(

                doc(
                    db,
                    "driverRecords",
                    currentRecord.id
                ),

                {

                    eveningStartOdometer:
                        startingOdometer,

                    eveningStartedAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp()

                }

            );


            currentRecord.eveningStartOdometer =
                startingOdometer;


            eveningStartOdometerEl.textContent =
                `${formatNumber(
                    startingOdometer
                )} KM`;


            eveningStatusEl.textContent =
                "IN PROGRESS";

            eveningStatusEl.className =
                "status active";


            eveningStartButton.disabled =
                true;


            eveningEndArea.classList.remove(
                "hidden"
            );


            showMessage(
                "Evening pickup started.",
                "success"
            );


        } catch (error) {

            console.error(error);

            showMessage(
                "Unable to start evening pickup.",
                "error"
            );

        }

    }
);


/* =====================================================
   EVENING END
===================================================== */

eveningEndButton.addEventListener(
    "click",
    async () => {

        const value =
            Number(
                eveningEndOdometer.value
            );


        if (
            !Number.isFinite(value) ||
            value <= 0
        ) {

            showMessage(
                "Enter a valid evening ending odometer.",
                "error"
            );

            return;

        }


        const start =
            Number(
                currentRecord?.eveningStartOdometer
            );


        if (
            value < start
        ) {

            showMessage(
                "Ending odometer cannot be lower than starting odometer.",
                "error"
            );

            return;

        }


        try {

            await updateDoc(

                doc(
                    db,
                    "driverRecords",
                    currentRecord.id
                ),

                {

                    eveningEndOdometer:
                        value,

                    eveningEndedAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp()

                }

            );


            currentRecord.eveningEndOdometer =
                value;


            eveningStatusEl.textContent =
                "COMPLETED";

            eveningStatusEl.className =
                "status complete";


            eveningEndButton.disabled =
                true;


            await loadCurrentOdometer();

            await loadHistory();


            showMessage(
                "Evening pickup completed.",
                "success"
            );


        } catch (error) {

            console.error(error);

            showMessage(
                "Unable to save evening odometer.",
                "error"
            );

        }

    }
);


/* =====================================================
   GET STARTING ODOMETER
===================================================== */

async function getStartingOdometer() {

    /*
     * Existing record
     */

    if (
        currentRecord?.morningStartOdometer
        !== undefined &&
        currentRecord?.morningStartOdometer
        !== null
    ) {

        return Number(
            currentRecord.morningStartOdometer
        );

    }


    /*
     * Search previous records.
     */

    try {

        const snapshot =
            await getDocs(

                query(
                    collection(
                        db,
                        "driverRecords"
                    ),

                    where(
                        "busId",
                        "==",
                        currentBus.id
                    ),

                    orderBy(
                        "operationDate",
                        "desc"
                    ),

                    limit(20)
                )

            );


        for (
            const document of
            snapshot.docs
        ) {

            const record =
                document.data();


            if (
                record.operationDate >=
                workDateEl.value
            ) {

                continue;

            }


            if (
                record.eveningEndOdometer
                !== undefined &&
                record.eveningEndOdometer
                !== null
            ) {

                return Number(
                    record.eveningEndOdometer
                );

            }

        }

    } catch (error) {

        console.warn(
            "Previous record search failed:",
            error
        );

    }


    /*
     * Fallback to bus current odometer.
     */

    const busOdometer =
        Number(
            currentBus.currentOdometer ||
            currentBus.odometer ||
            0
        );


    if (
        busOdometer > 0
    ) {

        return busOdometer;

    }


    return null;

}


/* =====================================================
   CURRENT ODOMETER
===================================================== */

async function loadCurrentOdometer() {

    let value = null;


    if (
        currentRecord?.eveningEndOdometer
        !== undefined &&
        currentRecord?.eveningEndOdometer
        !== null
    ) {

        value =
            Number(
                currentRecord.eveningEndOdometer
            );

    }


    if (
        value === null &&
        currentRecord?.morningEndOdometer
        !== undefined &&
        currentRecord?.morningEndOdometer
        !== null
    ) {

        value =
            Number(
                currentRecord.morningEndOdometer
            );

    }


    if (
        value === null
    ) {

        value =
            Number(
                currentBus?.currentOdometer ||
                currentBus?.odometer ||
                0
            );

    }


    currentOdometerEl.textContent =
        value > 0
            ? `${formatNumber(value)} KM`
            : "-- KM";

}


/* =====================================================
   DIESEL
===================================================== */

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
            !odometer ||
            odometer <= 0
        ) {

            showMessage(
                "Enter diesel odometer.",
                "error"
            );

            return;

        }


        if (
            !litres ||
            litres <= 0
        ) {

            showMessage(
                "Enter diesel litres.",
                "error"
            );

            return;

        }


        if (
            !amount ||
            amount <= 0
        ) {

            showMessage(
                "Enter diesel cost.",
                "error"
            );

            return;

        }


        try {

            /*
             * If today's driver record
             * exists, save diesel inside it.
             */

            if (
                currentRecord
            ) {

                await updateDoc(

                    doc(
                        db,
                        "driverRecords",
                        currentRecord.id
                    ),

                    {

                        diesel: {

                            odometer:
                                odometer,

                            litres:
                                litres,

                            amount:
                                amount

                        },

                        updatedAt:
                            serverTimestamp()

                    }

                );


                currentRecord.diesel = {

                    odometer,
                    litres,
                    amount

                };

            } else {

                /*
                 * Diesel can be saved even
                 * before a trip record.
                 */

                const dieselDoc =
                    await addDoc(

                        collection(
                            db,
                            "dieselRecords"
                        ),

                        {

                            driverId:
                                currentDriver.id,

                            driverUid:
                                currentUser.uid,

                            driverName:
                                currentDriver.name ||
                                "",

                            busId:
                                currentBus.id,

                            busNumber:
                                currentBus.busNumber ||
                                "",

                            operationDate:
                                workDateEl.value,

                            odometer:
                                odometer,

                            litres:
                                litres,

                            amount:
                                amount,

                            createdAt:
                                serverTimestamp()

                        }

                    );

            }


            showMessage(
                "Diesel entry saved.",
                "success"
            );


            await loadHistory();


        } catch (error) {

            console.error(
                "DIESEL ERROR:",
                error
            );


            showMessage(
                "Unable to save diesel entry.",
                "error"
            );

        }

    }
);


/* =====================================================
   HISTORY
===================================================== */

async function loadHistory() {

    if (
        !currentDriver ||
        !currentBus
    ) {

        return;

    }


    historyList.innerHTML =
        "Loading...";


    try {

        const snapshot =
            await getDocs(

                query(
                    collection(
                        db,
                        "driverRecords"
                    ),

                    where(
                        "busId",
                        "==",
                        currentBus.id
                    ),

                    limit(50)
                )

            );


        const records = [];


        snapshot.forEach(
            document => {

                const data =
                    document.data();


                records.push({

                    id:
                        document.id,

                    ...data

                });

            }
        );


        /*
         * Sort locally.
         * This avoids requiring another
         * Firestore composite index.
         */

        records.sort(
            (a, b) => {

                return String(
                    b.operationDate || ""
                ).localeCompare(
                    String(
                        a.operationDate || ""
                    )
                );

            }
        );


        const latest =
            records.slice(
                0,
                10
            );


        if (
            latest.length === 0
        ) {

            historyList.innerHTML = `
                <div class="empty">
                    No records yet.
                </div>
            `;

            return;

        }


        historyList.innerHTML =
            latest.map(
                record =>
                    historyCard(
                        record
                    )
            ).join("");


    } catch (error) {

        console.error(
            "HISTORY ERROR:",
            error
        );


        historyList.innerHTML = `
            <div class="empty">
                Unable to load history.
            </div>
        `;

    }

}


/* =====================================================
   HISTORY CARD
===================================================== */

function historyCard(
    record
) {

    const morningDistance =
        calculateDistance(
            record.morningStartOdometer,
            record.morningEndOdometer
        );


    const eveningDistance =
        calculateDistance(
            record.eveningStartOdometer,
            record.eveningEndOdometer
        );


    const totalDistance =
        (
            morningDistance || 0
        ) +
        (
            eveningDistance || 0
        );


    return `

        <div class="history-card">

            <div class="history-date">
                ${formatDate(
                    record.operationDate
                )}
            </div>


            <div class="history-row">

                <div class="history-item">

                    <span>
                        MORNING
                    </span>

                    <strong>
                        ${
                            record.morningEndOdometer
                            !== null &&
                            record.morningEndOdometer
                            !== undefined
                                ?
                            `${formatNumber(
                                record.morningEndOdometer -
                                record.morningStartOdometer
                            )} KM`
                                :
                            "--"
                        }
                    </strong>

                </div>


                <div class="history-item">

                    <span>
                        EVENING
                    </span>

                    <strong>
                        ${
                            record.eveningEndOdometer
                            !== null &&
                            record.eveningEndOdometer
                            !== undefined
                                ?
                            `${formatNumber(
                                record.eveningEndOdometer -
                                record.eveningStartOdometer
                            )} KM`
                                :
                            "--"
                        }
                    </strong>

                </div>


                <div class="history-item">

                    <span>
                        TOTAL
                    </span>

                    <strong>
                        ${
                            totalDistance > 0
                                ?
                            `${formatNumber(
                                totalDistance
                            )} KM`
                                :
                            "--"
                        }
                    </strong>

                </div>

            </div>

        </div>

    `;

}


/* =====================================================
   RESET SCREEN
===================================================== */

function resetScreen() {

    currentRecord = null;


    morningStatusEl.textContent =
        "NOT STARTED";

    morningStatusEl.className =
        "status pending";


    eveningStatusEl.textContent =
        "NOT STARTED";

    eveningStatusEl.className =
        "status pending";


    morningStartOdometerEl.textContent =
        "--";


    eveningStartOdometerEl.textContent =
        "--";


    morningEndOdometer.value =
        "";

    eveningEndOdometer.value =
        "";


    dieselOdometer.value =
        "";

    dieselLitres.value =
        "";

    dieselAmount.value =
        "";


    morningEndArea.classList.add(
        "hidden"
    );

    eveningEndArea.classList.add(
        "hidden"
    );


    morningStartButton.disabled =
        false;

    morningEndButton.disabled =
        false;

    eveningStartButton.disabled =
        true;

    eveningEndButton.disabled =
        false;

}


/* =====================================================
   LOGOUT
===================================================== */

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
                "Unable to log out.",
                "error"
            );

        }

    }
);


/* =====================================================
   HELPERS
===================================================== */

function calculateDistance(
    start,
    end
) {

    if (
        start === undefined ||
        start === null ||
        end === undefined ||
        end === null
    ) {

        return 0;

    }


    const distance =
        Number(end) -
        Number(start);


    return distance > 0
        ? distance
        : 0;

}


function formatNumber(
    value
) {

    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return "--";

    }


    return number.toLocaleString(
        "en-IN",
        {
            maximumFractionDigits: 1
        }
    );

}


function formatDate(
    dateString
) {

    if (!dateString) {

        return "--";

    }


    const parts =
        dateString.split("-");


    if (
        parts.length !== 3
    ) {

        return dateString;

    }


    return `${parts[2]}-${parts[1]}-${parts[0]}`;

}


function showMessage(
    text,
    type = ""
) {

    messageEl.textContent =
        text;

    messageEl.className =
        `message ${type}`;


    messageEl.classList.remove(
        "hidden"
    );


    clearTimeout(
        window.messageTimer
    );


    window.messageTimer =
        setTimeout(
            () => {

                messageEl.classList.add(
                    "hidden"
                );

            },
            3500
        );

}
