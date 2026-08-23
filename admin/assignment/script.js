import {
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    db,
    auth
} from "../../firebase-config.js";



/* =========================================================
   ELEMENTS
========================================================= */

const assignedList =
    document.getElementById(
        "assignedList"
    );

const unassignedDrivers =
    document.getElementById(
        "unassignedDrivers"
    );

const unassignedBuses =
    document.getElementById(
        "unassignedBuses"
    );

const assignedCount =
    document.getElementById(
        "assignedCount"
    );

const selectionSummary =
    document.getElementById(
        "selectionSummary"
    );

const selectedDriverName =
    document.getElementById(
        "selectedDriverName"
    );

const selectedBusName =
    document.getElementById(
        "selectedBusName"
    );

const assignBtn =
    document.getElementById(
        "assignBtn"
    );

const message =
    document.getElementById(
        "message"
    );



/* =========================================================
   DATA
========================================================= */

let allDrivers = [];

let allBuses = [];

let selectedDriverId = null;

let selectedBusId = null;



/* =========================================================
   AUTH
========================================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.replace(
                "../../index.html"
            );

            return;

        }


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
                !userSnapshot.exists() ||
                userSnapshot.data().role !== "admin"
            ) {

                window.location.replace(
                    "../../waiting/"
                );

                return;

            }


            await loadData();

        } catch (error) {

            console.error(
                "ADMIN CHECK ERROR:",
                error
            );

            showMessage(
                "Unable to verify admin account.",
                true
            );

        }

    }
);



/* =========================================================
   LOAD ALL DRIVERS + BUSES
========================================================= */

async function loadData() {

    try {

        const [
            driversSnapshot,
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


        allDrivers = [];

        allBuses = [];


        /* =========================
           DRIVERS
        ========================= */

        driversSnapshot.forEach(
            (snapshot) => {

                const data =
                    snapshot.data();


                if (
                    data.role === "driver"
                ) {

                    allDrivers.push({

                        id:
                            snapshot.id,

                        ...data

                    });

                }

            }
        );


        /* =========================
           BUSES
        ========================= */

        busesSnapshot.forEach(
            (snapshot) => {

                allBuses.push({

                    id:
                        snapshot.id,

                    ...snapshot.data()

                });

            }
        );


        renderAssigned();

        renderUnassignedDrivers();

        renderUnassignedBuses();

        clearSelection();

    } catch (error) {

        console.error(
            "LOAD ASSIGNMENT ERROR:",
            error
        );

        showMessage(
            "Unable to load drivers and buses.",
            true
        );

    }

}



/* =========================================================
   CURRENT ASSIGNMENTS
========================================================= */

function renderAssigned() {

    const assignedDrivers =
        allDrivers.filter(
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
                No current assignments.
            </div>
        `;

        return;

    }


    assignedList.innerHTML = "";


    assignedDrivers.forEach(
        (driver) => {

            const bus =
                allBuses.find(
                    item =>
                        item.id ===
                        driver.assignedBusId
                );


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "assignment-card";


            const driverName =
                driver.name ||
                "Unnamed Driver";


            const driverInfo =
                driver.phone ||
                driver.email ||
                "Driver";


            const busName =
                bus?.busNumber ||
                "Bus not found";


            const registration =
                bus?.registrationNumber ||
                "";


            card.innerHTML = `

                <div>

                    <div class="driver-name">
                        ${escapeHTML(driverName)}
                    </div>

                    <div class="driver-details">
                        ${escapeHTML(driverInfo)}
                    </div>

                </div>


                <div class="arrow">
                    →
                </div>


                <div>

                    <div class="bus-name">
                        ${escapeHTML(busName)}
                    </div>

                    <div class="bus-registration">
                        ${escapeHTML(registration)}
                    </div>

                </div>


                <button
                    class="deassign-btn"
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
            ".deassign-btn"
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
   UNASSIGNED DRIVERS
========================================================= */

function renderUnassignedDrivers() {

    const availableDrivers =
        allDrivers.filter(
            driver =>
                !driver.assignedBusId
        );


    if (
        availableDrivers.length === 0
    ) {

        unassignedDrivers.innerHTML = `
            <div class="empty">
                All drivers are assigned.
            </div>
        `;

        return;

    }


    unassignedDrivers.innerHTML = "";


    availableDrivers.forEach(
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

                <div class="selection-item-main">

                    <span class="selection-item-name">
                        ${escapeHTML(
                            driver.name ||
                            "Unnamed Driver"
                        )}
                    </span>

                    <span class="selection-item-info">
                        ${escapeHTML(
                            driver.phone ||
                            driver.email ||
                            "Driver"
                        )}
                    </span>

                </div>

                <span class="selection-item-status">
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


            unassignedDrivers.appendChild(
                item
            );

        }
    );

}



/* =========================================================
   UNASSIGNED BUSES
========================================================= */

function renderUnassignedBuses() {

    const availableBuses =
        allBuses.filter(
            bus =>
                !bus.assignedDriverId
        );


    if (
        availableBuses.length === 0
    ) {

        unassignedBuses.innerHTML = `
            <div class="empty">
                All buses are assigned.
            </div>
        `;

        return;

    }


    unassignedBuses.innerHTML = "";


    availableBuses.forEach(
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

                <div class="selection-item-main">

                    <span class="selection-item-name">
                        ${escapeHTML(
                            bus.busNumber ||
                            "Unnamed Bus"
                        )}
                    </span>

                    <span class="selection-item-info">
                        ${escapeHTML(
                            bus.registrationNumber ||
                            "Registration not available"
                        )}
                    </span>

                </div>

                <span class="selection-item-status">
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


            unassignedBuses.appendChild(
                item
            );

        }
    );

}



/* =========================================================
   SELECT DRIVER
========================================================= */

function selectDriver(
    driverId
) {

    const driver =
        allDrivers.find(
            item =>
                item.id ===
                driverId
        );


    if (!driver) {
        return;
    }


    /*
     * Protection:
     * If assigned, don't allow
     * another assignment.
     */

    if (
        driver.assignedBusId
    ) {

        const bus =
            allBuses.find(
                item =>
                    item.id ===
                    driver.assignedBusId
            );


        showMessage(
            `${driver.name || "This driver"} is already assigned to ${
                bus?.busNumber || "another bus"
            }. Deassign first to assign another bus.`,
            true
        );

        return;

    }


    selectedDriverId =
        driverId;


    document
        .querySelectorAll(
            "#unassignedDrivers .selection-item"
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


    updateSummary();

}



/* =========================================================
   SELECT BUS
========================================================= */

function selectBus(
    busId
) {

    const bus =
        allBuses.find(
            item =>
                item.id ===
                busId
        );


    if (!bus) {
        return;
    }


    /*
     * Protection:
     * If assigned, show current
     * driver and don't allow it.
     */

    if (
        bus.assignedDriverId
    ) {

        const driver =
            allDrivers.find(
                item =>
                    item.id ===
                    bus.assignedDriverId
            );


        showMessage(
            `${bus.busNumber || "This bus"} is already assigned to ${
                driver?.name || "another driver"
            }. Deassign first to assign this bus.`,
            true
        );

        return;

    }


    selectedBusId =
        busId;


    document
        .querySelectorAll(
            "#unassignedBuses .selection-item"
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


    updateSummary();

}



/* =========================================================
   UPDATE SUMMARY
========================================================= */

function updateSummary() {

    const driver =
        allDrivers.find(
            item =>
                item.id ===
                selectedDriverId
        );


    const bus =
        allBuses.find(
            item =>
                item.id ===
                selectedBusId
        );


    if (
        !driver &&
        !bus
    ) {

        selectionSummary.classList.add(
            "hidden"
        );

        assignBtn.disabled =
            true;

        return;

    }


    selectionSummary.classList.remove(
        "hidden"
    );


    selectedDriverName.textContent =
        driver?.name ||
        "Select driver";


    selectedBusName.textContent =
        bus?.busNumber ||
        "Select bus";


    assignBtn.disabled =
        !driver ||
        !bus;

}



/* =========================================================
   ASSIGN
========================================================= */

assignBtn.addEventListener(
    "click",
    async () => {

        if (
            !selectedDriverId ||
            !selectedBusId
        ) {

            return;

        }


        const driver =
            allDrivers.find(
                item =>
                    item.id ===
                    selectedDriverId
            );


        const bus =
            allBuses.find(
                item =>
                    item.id ===
                    selectedBusId
            );


        if (!driver || !bus) {

            return;

        }


        /*
         * FINAL SAFETY CHECK
         */

        if (
            driver.assignedBusId
        ) {

            showMessage(
                "This driver is already assigned. Deassign first.",
                true
            );

            return;

        }


        if (
            bus.assignedDriverId
        ) {

            showMessage(
                "This bus is already assigned. Deassign first.",
                true
            );

            return;

        }


        assignBtn.disabled =
            true;

        assignBtn.textContent =
            "ASSIGNING...";


        try {

            /*
             * Update DRIVER
             */

            await updateDoc(
                doc(
                    db,
                    "users",
                    selectedDriverId
                ),
                {

                    assignedBusId:
                        selectedBusId,

                    status:
                        "approved"

                }
            );


            /*
             * Update BUS
             */

            await updateDoc(
                doc(
                    db,
                    "buses",
                    selectedBusId
                ),
                {

                    assignedDriverId:
                        selectedDriverId

                }
            );


            showMessage(
                `${driver.name || "Driver"} assigned to ${
                    bus.busNumber || "bus"
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
                error?.message ||
                "Unable to assign bus.",
                true
            );

        } finally {

            assignBtn.textContent =
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
        allDrivers.find(
            item =>
                item.id ===
                driverId
        );


    const bus =
        allBuses.find(
            item =>
                item.id ===
                busId
        );


    const confirmed =
        confirm(
            `Deassign ${
                driver?.name || "this driver"
            } from ${
                bus?.busNumber || "this bus"
            }?`
        );


    if (!confirmed) {

        return;

    }


    try {

        /*
         * Remove bus from driver
         */

        await updateDoc(
            doc(
                db,
                "users",
                driverId
            ),
            {

                assignedBusId:
                    null

            }
        );


        /*
         * Remove driver from bus
         */

        await updateDoc(
            doc(
                db,
                "buses",
                busId
            ),
            {

                assignedDriverId:
                    null

            }
        );


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
            error?.message ||
            "Unable to deassign bus.",
            true
        );

    }

}



/* =========================================================
   CLEAR SELECTION
========================================================= */

function clearSelection() {

    selectedDriverId =
        null;

    selectedBusId =
        null;

    selectionSummary.classList.add(
        "hidden"
    );

    assignBtn.disabled =
        true;

}



/* =========================================================
   MESSAGE
========================================================= */

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



/* =========================================================
   HTML ESCAPE
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
