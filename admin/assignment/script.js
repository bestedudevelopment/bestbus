import {
    auth,
    db
} from "../../firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const driverSelect =
    document.getElementById("driverSelect");

const busSelect =
    document.getElementById("busSelect");

const assignForm =
    document.getElementById("assignForm");

const assignmentList =
    document.getElementById("assignmentList");

const assignmentCount =
    document.getElementById("assignmentCount");


let drivers = [];

let buses = [];



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

            const userSnap =
                await getDoc(userRef);


            if (
                !userSnap.exists() ||
                userSnap.data().role !== "admin"
            ) {

                window.location.replace(
                    "../../waiting/index.html"
                );

                return;

            }


            await loadData();

        } catch (error) {

            console.error(
                "Authentication error:",
                error
            );

            alert(
                "Unable to load assignment page."
            );

        }

    }
);



/* =========================================================
   LOAD DATA
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


        drivers = [];

        buses = [];


        driversSnapshot.forEach(
            (item) => {

                const data =
                    item.data();


                /*
                    Only driver accounts.
                */

                if (
                    data.role === "driver"
                ) {

                    drivers.push({

                        id: item.id,

                        ...data

                    });

                }

            }
        );


        busesSnapshot.forEach(
            (item) => {

                buses.push({

                    id: item.id,

                    ...item.data()

                });

            }
        );


        populateDrivers();

        populateBuses();

        renderAssignments();

    } catch (error) {

        console.error(
            "Loading error:",
            error
        );

        assignmentList.innerHTML = `
            <div class="empty">
                Unable to load assignments.
            </div>
        `;

    }

}



/* =========================================================
   POPULATE DRIVERS
========================================================= */

function populateDrivers() {

    driverSelect.innerHTML = `
        <option value="">
            Select driver
        </option>
    `;


    const availableDrivers =
        drivers.filter(
            driver =>
                !driver.assignedBusId
        );


    availableDrivers.forEach(
        driver => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                driver.id;


            option.textContent =
                driver.name ||
                driver.fullName ||
                driver.email ||
                "Unnamed Driver";


            driverSelect.appendChild(
                option
            );

        }
    );


    if (
        availableDrivers.length === 0
    ) {

        driverSelect.innerHTML = `
            <option value="">
                No available drivers
            </option>
        `;

    }

}



/* =========================================================
   POPULATE BUSES
========================================================= */

function populateBuses() {

    busSelect.innerHTML = `
        <option value="">
            Select available bus
        </option>
    `;


    const availableBuses =
        buses.filter(
            bus =>
                !bus.assignedDriverId
        );


    availableBuses.forEach(
        bus => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                bus.id;


            option.textContent =
                bus.busNumber ||
                bus.registrationNumber ||
                bus.registration ||
                bus.name ||
                "Unnamed Bus";


            busSelect.appendChild(
                option
            );

        }
    );


    if (
        availableBuses.length === 0
    ) {

        busSelect.innerHTML = `
            <option value="">
                No available buses
            </option>
        `;

    }

}



/* =========================================================
   ASSIGN
========================================================= */

assignForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const driverId =
            driverSelect.value;

        const busId =
            busSelect.value;


        if (
            !driverId ||
            !busId
        ) {

            alert(
                "Please select both a driver and a bus."
            );

            return;

        }


        const driver =
            drivers.find(
                item =>
                    item.id === driverId
            );


        const bus =
            buses.find(
                item =>
                    item.id === busId
            );


        if (!driver || !bus) {

            alert(
                "Driver or bus not found."
            );

            return;

        }


        try {

            /*
                Save assignment on driver
            */

            await updateDoc(
                doc(
                    db,
                    "users",
                    driverId
                ),
                {

                    assignedBusId:
                        busId,

                    assignedBusNumber:
                        bus.busNumber ||
                        bus.registrationNumber ||
                        bus.registration ||
                        bus.name ||
                        ""

                }
            );


            /*
                Save assignment on bus
            */

            await updateDoc(
                doc(
                    db,
                    "buses",
                    busId
                ),
                {

                    assignedDriverId:
                        driverId,

                    assignedDriverName:
                        driver.name ||
                        driver.fullName ||
                        driver.email ||
                        ""

                }
            );


            alert(
                "Bus assigned successfully."
            );


            await loadData();


            assignForm.reset();

        } catch (error) {

            console.error(
                "Assignment error:",
                error
            );

            alert(
                "Unable to assign bus."
            );

        }

    }
);



/* =========================================================
   CURRENT ASSIGNMENTS
========================================================= */

function renderAssignments() {

    const assignments =
        buses.filter(
            bus =>
                bus.assignedDriverId
        );


    assignmentCount.textContent =
        assignments.length;


    if (
        assignments.length === 0
    ) {

        assignmentList.innerHTML = `
            <div class="empty">
                No buses are currently assigned.
            </div>
        `;

        return;

    }


    assignmentList.innerHTML = "";


    assignments.forEach(
        bus => {

            const driver =
                drivers.find(
                    item =>
                        item.id ===
                        bus.assignedDriverId
                );


            const driverName =
                bus.assignedDriverName ||
                driver?.name ||
                driver?.fullName ||
                driver?.email ||
                "Unknown Driver";


            const busName =
                bus.busNumber ||
                bus.registrationNumber ||
                bus.registration ||
                bus.name ||
                "Unnamed Bus";


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "assignment-card";


            card.innerHTML = `

                <div class="assignment-main">

                    <div class="assignment-driver">
                        ${escapeHTML(driverName)}
                    </div>

                    <div class="assignment-bus">
                        Bus: ${escapeHTML(busName)}
                    </div>

                    <span class="assignment-status">
                        ASSIGNED
                    </span>

                </div>


                <button
                    class="deassign-btn"
                    data-bus-id="${bus.id}"
                    data-driver-id="${bus.assignedDriverId}"
                >
                    DEASSIGN
                </button>

            `;


            assignmentList.appendChild(
                card
            );

        }
    );


    document
        .querySelectorAll(".deassign-btn")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        deassignBus(
                            button.dataset.busId,
                            button.dataset.driverId
                        );

                    }
                );

            }
        );

}



/* =========================================================
   DEASSIGN
========================================================= */

async function deassignBus(
    busId,
    driverId
) {

    const confirmed =
        confirm(
            "Are you sure you want to deassign this bus?"
        );


    if (!confirmed) {

        return;

    }


    try {

        /*
            Remove bus from driver
        */

        await updateDoc(
            doc(
                db,
                "users",
                driverId
            ),
            {

                assignedBusId: null,

                assignedBusNumber: null

            }
        );


        /*
            Remove driver from bus
        */

        await updateDoc(
            doc(
                db,
                "buses",
                busId
            ),
            {

                assignedDriverId: null,

                assignedDriverName: null

            }
        );


        alert(
            "Bus deassigned successfully."
        );


        await loadData();

    } catch (error) {

        console.error(
            "Deassign error:",
            error
        );

        alert(
            "Unable to deassign bus."
        );

    }

}



/* =========================================================
   HTML SAFETY
========================================================= */

function escapeHTML(
    value
) {

    return String(value)
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
