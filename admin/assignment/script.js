import {
    collection,
    getDocs,
    doc,
    getDoc,
    writeBatch
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



/* =========================================================
   ELEMENTS
========================================================= */

const assignedList =
    document.getElementById(
        "assignedList"
    );

const driverList =
    document.getElementById(
        "driverList"
    );

const busList =
    document.getElementById(
        "busList"
    );

const assignedCount =
    document.getElementById(
        "assignedCount"
    );

const driverCount =
    document.getElementById(
        "driverCount"
    );

const busCount =
    document.getElementById(
        "busCount"
    );

const assignPanel =
    document.getElementById(
        "assignPanel"
    );

const selectedDriver =
    document.getElementById(
        "selectedDriver"
    );

const selectedBus =
    document.getElementById(
        "selectedBus"
    );

const assignButton =
    document.getElementById(
        "assignButton"
    );

const message =
    document.getElementById(
        "message"
    );



/* =========================================================
   STATE
========================================================= */

let drivers = [];

let buses = [];

let selectedDriverId = null;

let selectedBusId = null;



/* =========================================================
   AUTH
========================================================= */

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

                return;

            }


            await loadData();

        } catch (error) {

            console.error(
                "ASSIGNMENT AUTH ERROR:",
                error
            );

            showMessage(
                error.message ||
                "Unable to verify administrator.",
                true
            );

        }

    }
);



/* =========================================================
   LOAD FIRESTORE
========================================================= */

async function loadData() {

    try {

        showLoading();


        const [
            usersSnapshot,
            busesSnapshot
        ] = await Promise.all([

            getDocs(
                collection(
                    db,
                    "users"
                )
            ),

            getDocs(
                collection(
                    db,
                    "buses"
                )
            )

        ]);


        /*
         * ALL USERS WITH ROLE DRIVER
         *
         * We intentionally DO NOT filter
         * active == true here because you asked
         * to see all drivers.
         */

        drivers =
            usersSnapshot.docs
                .filter(
                    snapshot =>
                        snapshot.data().role ===
                        "driver"
                )
                .map(
                    snapshot => ({

                        id:
                            snapshot.id,

                        ...snapshot.data()

                    })
                );


        /*
         * ALL BUSES
         */

        buses =
            busesSnapshot.docs
                .map(
                    snapshot => ({

                        id:
                            snapshot.id,

                        ...snapshot.data()

                    })
                );


        renderAssigned();

        renderDrivers();

        renderBuses();

        resetSelection();

    } catch (error) {

        console.error(
            "FIRESTORE LOAD ERROR:",
            error
        );

        assignedList.innerHTML = `
            <div class="empty">
                Unable to load assignment data.
                <br><br>
                ${escapeHTML(
                    error.message
                )}
            </div>
        `;

        driverList.innerHTML = "";

        busList.innerHTML = "";

    }

}



/* =========================================================
   ASSIGNED
========================================================= */

function renderAssigned() {

    /*
     * Driver assignment is considered
     * assigned when assignedBusId exists.
     */

    const assignedDrivers =
        drivers.filter(
            driver =>
                driver.assignedBusId
        );


    assignedCount.textContent =
        assignedDrivers.length;


    if (
        assignedDrivers.length === 0
    ) {

        assignedList.innerHTML = `
            <div class="empty">
                No drivers are currently assigned.
            </div>
        `;

        return;

    }


    assignedList.innerHTML = "";


    assignedDrivers.forEach(
        driver => {

            /*
             * Find the bus from driver's
             * assignedBusId.
             */

            const bus =
                buses.find(
                    item =>
                        item.id ===
                        driver.assignedBusId
                );


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "assignment-card";


            card.innerHTML = `

                <div>

                    <div class="driver-name">
                        ${escapeHTML(
                            driver.name ||
                            "Unnamed Driver"
                        )}
                    </div>

                    <div class="driver-info">
                        ${escapeHTML(
                            driver.phone ||
                            driver.email ||
                            "No contact"
                        )}
                    </div>

                </div>


                <div class="assignment-arrow">
                    →
                </div>


                <div>

                    <div class="bus-name">
                        ${escapeHTML(
                            bus?.busNumber ||
                            "Bus not found"
                        )}
                    </div>

                    <div class="bus-info">
                        ${escapeHTML(
                            bus?.registrationNumber ||
                            ""
                        )}
                    </div>

                </div>


                <button
                    type="button"
                    class="deassign-button"
                    data-driver-id="${driver.id}"
                    data-bus-id="${driver.assignedBusId}"
                >
                    DEASSIGN
                </button>

            `;


            assignedList.appendChild(
                card
            );

        }
    );


    document
        .querySelectorAll(
            ".deassign-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        deassign(
                            button.dataset.driverId,
                            button.dataset.busId
                        );

                    }
                );

            }
        );

}



/* =========================================================
   ALL DRIVERS
========================================================= */

function renderDrivers() {

    /*
     * Only UNASSIGNED drivers are selectable.
     *
     * Assigned drivers remain visible in
     * Current Assignments above.
     */

    const available =
        drivers.filter(
            driver =>
                !driver.assignedBusId
        );


    driverCount.textContent =
        available.length;


    if (
        available.length === 0
    ) {

        driverList.innerHTML = `
            <div class="empty">
                All drivers are currently assigned.
            </div>
        `;

        return;

    }


    driverList.innerHTML = "";


    available.forEach(
        driver => {

            const item =
                document.createElement(
                    "button"
                );


            item.type =
                "button";


            item.className =
                "selection-item";


            item.dataset.id =
                driver.id;


            item.innerHTML = `

                <div class="selection-main">

                    <span class="selection-name">
                        ${escapeHTML(
                            driver.name ||
                            "Unnamed Driver"
                        )}
                    </span>

                    <span class="selection-info">
                        ${escapeHTML(
                            driver.phone ||
                            driver.email ||
                            "No contact"
                        )}
                    </span>

                </div>


                <span class="selection-status">
                    AVAILABLE
                </span>

            `;


            item.addEventListener(
                "click",
                () => {

                    selectDriver(
                        driver.id
                    );

                }
            );


            driverList.appendChild(
                item
            );

        }
    );

}



/* =========================================================
   ALL BUSES
========================================================= */

function renderBuses() {

    /*
     * A bus is available when it has
     * no assignedDriverId.
     *
     * We also check driverId because
     * older bus records/code in your
     * project use that field.
     */

    const available =
        buses.filter(
            bus =>
                !bus.assignedDriverId &&
                !bus.driverId
        );


    busCount.textContent =
        available.length;


    if (
        available.length === 0
    ) {

        busList.innerHTML = `
            <div class="empty">
                All buses are currently assigned.
            </div>
        `;

        return;

    }


    busList.innerHTML = "";


    available.forEach(
        bus => {

            const item =
                document.createElement(
                    "button"
                );


            item.type =
                "button";


            item.className =
                "selection-item";


            item.dataset.id =
                bus.id;


            item.innerHTML = `

                <div class="selection-main">

                    <span class="selection-name">
                        ${escapeHTML(
                            bus.busNumber ||
                            "Unnamed Bus"
                        )}
                    </span>

                    <span class="selection-info">
                        ${escapeHTML(
                            bus.registrationNumber ||
                            bus.registrationNo ||
                            "No registration"
                        )}
                    </span>

                </div>


                <span class="selection-status">
                    AVAILABLE
                </span>

            `;


            item.addEventListener(
                "click",
                () => {

                    selectBus(
                        bus.id
                    );

                }
            );


            busList.appendChild(
                item
            );

        }
    );

}



/* =========================================================
   SELECT DRIVER
========================================================= */

async function selectDriver(
    driverId
) {

    const driver =
        drivers.find(
            item =>
                item.id ===
                driverId
        );


    if (!driver) {
        return;
    }


    /*
     * Fresh Firestore check.
     *
     * This prevents an old page from
     * accidentally assigning a driver
     * who has already been assigned.
     */

    try {

        const snapshot =
            await getDoc(
                doc(
                    db,
                    "users",
                    driverId
                )
            );


        if (
            snapshot.exists()
        ) {

            const fresh =
                snapshot.data();


            if (
                fresh.assignedBusId
            ) {

                const bus =
                    buses.find(
                        item =>
                            item.id ===
                            fresh.assignedBusId
                    );


                showMessage(
                    `${
                        fresh.name ||
                        "This driver"
                    } is already assigned to ${
                        bus?.busNumber ||
                        "another bus"
                    }. Deassign first.`,
                    true
                );


                await loadData();

                return;

            }

        }

    } catch (error) {

        showMessage(
            "Unable to check driver assignment.",
            true
        );

        return;

    }


    selectedDriverId =
        driverId;


    document
        .querySelectorAll(
            "#driverList .selection-item"
        )
        .forEach(
            item => {

                item.classList.toggle(
                    "selected",
                    item.dataset.id ===
                    driverId
                );

            }
        );


    updateSelection();

}



/* =========================================================
   SELECT BUS
========================================================= */

async function selectBus(
    busId
) {

    const bus =
        buses.find(
            item =>
                item.id ===
                busId
        );


    if (!bus) {
        return;
    }


    /*
     * Fresh Firestore check.
     */

    try {

        const snapshot =
            await getDoc(
                doc(
                    db,
                    "buses",
                    busId
                )
            );


        if (
            snapshot.exists()
        ) {

            const fresh =
                snapshot.data();


            if (
                fresh.assignedDriverId ||
                fresh.driverId
            ) {

                let driverName =
                    "another driver";


                const driverId =
                    fresh.assignedDriverId ||
                    fresh.driverId;


                const driver =
                    drivers.find(
                        item =>
                            item.id ===
                            driverId
                    );


                if (driver) {

                    driverName =
                        driver.name ||
                        driverName;

                }


                showMessage(
                    `${
                        fresh.busNumber ||
                        "This bus"
                    } is already assigned to ${
                        driverName
                    }. Deassign first.`,
                    true
                );


                await loadData();

                return;

            }

        }

    } catch (error) {

        showMessage(
            "Unable to check bus assignment.",
            true
        );

        return;

    }


    selectedBusId =
        busId;


    document
        .querySelectorAll(
            "#busList .selection-item"
        )
        .forEach(
            item => {

                item.classList.toggle(
                    "selected",
                    item.dataset.id ===
                    busId
                );

            }
        );


    updateSelection();

}



/* =========================================================
   UPDATE SELECTION
========================================================= */

function updateSelection() {

    const driver =
        drivers.find(
            item =>
                item.id ===
                selectedDriverId
        );


    const bus =
        buses.find(
            item =>
                item.id ===
                selectedBusId
        );


    if (
        !driver &&
        !bus
    ) {

        assignPanel.classList.add(
            "hidden"
        );

        assignButton.disabled =
            true;

        return;

    }


    assignPanel.classList.remove(
        "hidden"
    );


    selectedDriver.textContent =
        driver?.name ||
        "Select driver";


    selectedBus.textContent =
        bus?.busNumber ||
        "Select bus";


    assignButton.disabled =
        !driver ||
        !bus;

}



/* =========================================================
   ASSIGN BUTTON
========================================================= */

assignButton.addEventListener(
    "click",
    async () => {

        if (
            !selectedDriverId ||
            !selectedBusId
        ) {

            return;

        }


        assignButton.disabled =
            true;

        assignButton.textContent =
            "CHECKING...";


        try {

            /*
             * FINAL FRESH CHECK
             */

            const driverRef =
                doc(
                    db,
                    "users",
                    selectedDriverId
                );


            const busRef =
                doc(
                    db,
                    "buses",
                    selectedBusId
                );


            const [
                driverSnapshot,
                busSnapshot
            ] = await Promise.all([

                getDoc(
                    driverRef
                ),

                getDoc(
                    busRef
                )

            ]);


            if (
                !driverSnapshot.exists()
            ) {

                throw new Error(
                    "Driver no longer exists."
                );

            }


            if (
                !busSnapshot.exists()
            ) {

                throw new Error(
                    "Bus no longer exists."
                );

            }


            const driver =
                driverSnapshot.data();


            const bus =
                busSnapshot.data();


            /*
             * DRIVER ALREADY ASSIGNED
             */

            if (
                driver.assignedBusId
            ) {

                throw new Error(
                    `${
                        driver.name ||
                        "Driver"
                    } is already assigned. Deassign first.`
                );

            }


            /*
             * BUS ALREADY ASSIGNED
             *
             * Check both fields because
             * your existing project has
             * both schemas in use.
             */

            if (
                bus.assignedDriverId ||
                bus.driverId
            ) {

                throw new Error(
                    `${
                        bus.busNumber ||
                        "Bus"
                    } is already assigned. Deassign first.`
                );

            }


            assignButton.textContent =
                "ASSIGNING...";


            /*
             * ONE BATCH
             *
             * Driver:
             * assignedBusId = bus document ID
             *
             * Bus:
             * assignedDriverId = driver UID
             *
             * driverId = driver UID
             *
             * The driverId field is maintained
             * for compatibility with the older
             * buses.js in your project.
             */

            const batch =
                writeBatch(db);


            batch.update(
                driverRef,
                {

                    assignedBusId:
                        selectedBusId

                }
            );


            batch.update(
                busRef,
                {

                    assignedDriverId:
                        selectedDriverId,

                    driverId:
                        selectedDriverId

                }
            );


            await batch.commit();


            showMessage(
                `${
                    driver.name ||
                    "Driver"
                } assigned to ${
                    bus.busNumber ||
                    "bus"
                }.`,
                false
            );


            await loadData();

        } catch (error) {

            console.error(
                "ASSIGN ERROR:",
                error
            );


            showMessage(
                error.message ||
                "Unable to assign bus.",
                true
            );

        } finally {

            assignButton.textContent =
                "ASSIGN BUS";

        }

    }
);



/* =========================================================
   DEASSIGN
========================================================= */

async function deassign(
    driverId,
    busId
) {

    const driver =
        drivers.find(
            item =>
                item.id ===
                driverId
        );


    const bus =
        buses.find(
            item =>
                item.id ===
                busId
        );


    const driverName =
        driver?.name ||
        "this driver";


    const busName =
        bus?.busNumber ||
        "this bus";


    const confirmed =
        window.confirm(
            `Deassign ${driverName} from ${busName}?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const driverRef =
            doc(
                db,
                "users",
                driverId
            );


        const busRef =
            doc(
                db,
                "buses",
                busId
            );


        /*
         * Fresh check:
         * Don't accidentally clear a newer
         * assignment.
         */

        const [
            driverSnapshot,
            busSnapshot
        ] = await Promise.all([

            getDoc(
                driverRef
            ),

            getDoc(
                busRef
            )

        ]);


        if (
            !driverSnapshot.exists() ||
            !busSnapshot.exists()
        ) {

            throw new Error(
                "Driver or bus no longer exists."
            );

        }


        const freshDriver =
            driverSnapshot.data();


        const freshBus =
            busSnapshot.data();


        if (
            freshDriver.assignedBusId &&
            freshDriver.assignedBusId !==
            busId
        ) {

            throw new Error(
                "This driver has already been assigned to another bus."
            );

        }


        if (
            freshBus.assignedDriverId &&
            freshBus.assignedDriverId !==
            driverId
        ) {

            throw new Error(
                "This bus has already been assigned to another driver."
            );

        }


        const batch =
            writeBatch(db);


        /*
         * Remove assignment from driver.
         */

        batch.update(
            driverRef,
            {

                assignedBusId:
                    null

            }
        );


        /*
         * Remove BOTH bus assignment
         * fields for compatibility.
         */

        batch.update(
            busRef,
            {

                assignedDriverId:
                    null,

                driverId:
                    null

            }
        );


        await batch.commit();


        showMessage(
            `${driverName} has been deassigned from ${busName}.`,
            false
        );


        await loadData();

    } catch (error) {

        console.error(
            "DEASSIGN ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Unable to deassign bus.",
            true
        );

    }

}



/* =========================================================
   LOADING
========================================================= */

function showLoading() {

    assignedList.innerHTML = `
        <div class="loading">
            Loading assignments...
        </div>
    `;

    driverList.innerHTML = `
        <div class="loading">
            Loading drivers...
        </div>
    `;

    busList.innerHTML = `
        <div class="loading">
            Loading buses...
        </div>
    `;

}



/* =========================================================
   RESET
========================================================= */

function resetSelection() {

    selectedDriverId =
        null;

    selectedBusId =
        null;

    assignPanel.classList.add(
        "hidden"
    );

    assignButton.disabled =
        true;

}



/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
    text,
    error = false
) {

    message.textContent =
        text;

    message.className =
        error
            ? "message error"
            : "message success";

}



/* =========================================================
   ESCAPE HTML
========================================================= */

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
