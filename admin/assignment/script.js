import {
    collection,
    getDocs,
    doc,
    getDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth,
    db
} from "../core/firebase.js";


/* =====================================================
   ELEMENTS
===================================================== */

const assignedList =
    document.getElementById("assignedList");

const driverList =
    document.getElementById("driverList");

const busList =
    document.getElementById("busList");

const assignedCount =
    document.getElementById("assignedCount");

const driverCount =
    document.getElementById("driverCount");

const busCount =
    document.getElementById("busCount");

const assignPanel =
    document.getElementById("assignPanel");

const selectedDriver =
    document.getElementById("selectedDriver");

const selectedBus =
    document.getElementById("selectedBus");

const assignButton =
    document.getElementById("assignButton");

const message =
    document.getElementById("message");


/* =====================================================
   STATE
===================================================== */

let drivers = [];

let buses = [];

let selectedDriverId = null;

let selectedBusId = null;


/* =====================================================
   AUTHENTICATION
   SAME PATTERN AS YOUR WORKING ADMIN DASHBOARD
===================================================== */

onAuthStateChanged(
    auth,
    async (user) => {

        console.log(
            "AUTH USER:",
            user
        );

        if (!user) {

            window.location.replace(
                "../login/"
            );

            return;
        }


        try {

            /*
             * Load logged-in admin profile
             */

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


            console.log(
                "ADMIN PROFILE:",
                userSnapshot.exists()
                    ? userSnapshot.data()
                    : "NOT FOUND"
            );


            if (
                !userSnapshot.exists()
            ) {

                throw new Error(
                    "Your users profile does not exist."
                );

            }


            const userData =
                userSnapshot.data();


            if (
                userData.role !== "admin"
            ) {

                throw new Error(
                    "This account is not an administrator."
                );

            }


            /*
             * Now load actual data
             */

            await loadData();

        } catch (error) {

            console.error(
                "ADMIN ASSIGNMENT ERROR:",
                error
            );


            showMessage(
                error.message ||
                "Unable to load assignment data.",
                true
            );

        }

    }
);


/* =====================================================
   LOAD DATA
===================================================== */

async function loadData() {

    console.log(
        "LOADING USERS + BUSES..."
    );


    showLoading();


    try {

        /*
         * EXACTLY LIKE YOUR EXISTING
         * ADMIN DASHBOARD
         */

        const usersSnapshot =
            await getDocs(
                collection(
                    db,
                    "users"
                )
            );


        console.log(
            "USERS FOUND:",
            usersSnapshot.size
        );


        const busesSnapshot =
            await getDocs(
                collection(
                    db,
                    "buses"
                )
            );


        console.log(
            "BUSES FOUND:",
            busesSnapshot.size
        );


        /*
         * Convert users
         */

        drivers = [];


        usersSnapshot.forEach(
            snapshot => {

                const data =
                    snapshot.data();


                if (
                    data.role === "driver"
                ) {

                    drivers.push({

                        id:
                            snapshot.id,

                        ...data

                    });

                }

            }
        );


        /*
         * Convert buses
         */

        buses = [];


        busesSnapshot.forEach(
            snapshot => {

                buses.push({

                    id:
                        snapshot.id,

                    ...snapshot.data()

                });

            }
        );


        console.log(
            "DRIVERS:",
            drivers
        );


        console.log(
            "BUSES:",
            buses
        );


        renderAssigned();

        renderDrivers();

        renderBuses();

        resetSelection();


    } catch (error) {

        console.error(
            "FIRESTORE ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Firestore could not load the data.",
            true
        );


        assignedList.innerHTML = `
            <div class="empty">
                <strong>Unable to load data</strong>
                <br><br>
                ${escapeHTML(
                    error.message ||
                    "Unknown Firestore error"
                )}
            </div>
        `;

        driverList.innerHTML = "";

        busList.innerHTML = "";

    }

}


/* =====================================================
   CURRENT ASSIGNMENTS
===================================================== */

function renderAssigned() {

    const assigned =
        drivers.filter(
            driver =>
                driver.assignedBusId
        );


    assignedCount.textContent =
        assigned.length;


    if (
        assigned.length === 0
    ) {

        assignedList.innerHTML = `
            <div class="empty">
                No drivers are currently assigned.
            </div>
        `;

        return;

    }


    assignedList.innerHTML = "";


    assigned.forEach(
        driver => {

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


/* =====================================================
   AVAILABLE DRIVERS
===================================================== */

function renderDrivers() {

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


/* =====================================================
   AVAILABLE BUSES
===================================================== */

function renderBuses() {

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


/* =====================================================
   SELECT DRIVER
===================================================== */

function selectDriver(
    id
) {

    selectedDriverId =
        id;


    document
        .querySelectorAll(
            "#driverList .selection-item"
        )
        .forEach(
            item => {

                item.classList.toggle(
                    "selected",
                    item.dataset.id ===
                    id
                );

            }
        );


    updateSelection();

}


/* =====================================================
   SELECT BUS
===================================================== */

function selectBus(
    id
) {

    selectedBusId =
        id;


    document
        .querySelectorAll(
            "#busList .selection-item"
        )
        .forEach(
            item => {

                item.classList.toggle(
                    "selected",
                    item.dataset.id ===
                    id
                );

            }
        );


    updateSelection();

}


/* =====================================================
   SELECTION UI
===================================================== */

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


/* =====================================================
   ASSIGN
===================================================== */

assignButton.addEventListener(
    "click",
    async () => {

        if (
            !selectedDriverId ||
            !selectedBusId
        ) {

            return;

        }


        try {

            assignButton.disabled =
                true;

            assignButton.textContent =
                "ASSIGNING...";


            /*
             * Read fresh documents
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
                    "Driver does not exist."
                );

            }


            if (
                !busSnapshot.exists()
            ) {

                throw new Error(
                    "Bus does not exist."
                );

            }


            const driver =
                driverSnapshot.data();


            const bus =
                busSnapshot.data();


            if (
                driver.assignedBusId
            ) {

                throw new Error(
                    "Driver is already assigned."
                );

            }


            if (
                bus.assignedDriverId ||
                bus.driverId
            ) {

                throw new Error(
                    "Bus is already assigned."
                );

            }


            /*
             * ATOMIC FIRESTORE UPDATE
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
                `${driver.name || "Driver"} assigned to ${bus.busNumber || "bus"}.`,
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

            assignButton.disabled =
                false;

            assignButton.textContent =
                "ASSIGN BUS";

        }

    }
);


/* =====================================================
   DEASSIGN
===================================================== */

async function deassign(
    driverId,
    busId
) {

    const confirmed =
        window.confirm(
            "Are you sure you want to deassign this bus?"
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


        const batch =
            writeBatch(db);


        batch.update(
            driverRef,
            {

                assignedBusId:
                    null

            }
        );


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
            "Bus deassigned successfully.",
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


/* =====================================================
   RESET
===================================================== */

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


/* =====================================================
   LOADING
===================================================== */

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


/* =====================================================
   MESSAGE
===================================================== */

function showMessage(
    text,
    isError
) {

    message.textContent =
        text;

    message.className =
        isError
            ? "message error"
            : "message success";

}


/* =====================================================
   ESCAPE
===================================================== */

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
