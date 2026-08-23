import {
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth,
    db
} from "../../core/firebase.js";


const totalDrivers =
    document.getElementById("totalDrivers");

const pendingDrivers =
    document.getElementById("pendingDrivers");

const approvedDrivers =
    document.getElementById("approvedDrivers");

const pendingList =
    document.getElementById("pendingList");

const approvedList =
    document.getElementById("approvedList");


/* =================================
   ADMIN AUTH
================================= */

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

            const adminRef =
                doc(
                    db,
                    "users",
                    user.uid
                );


            const adminSnapshot =
                await getDoc(
                    adminRef
                );


            if (
                !adminSnapshot.exists() ||
                adminSnapshot.data().role !== "admin"
            ) {

                await signOut(auth);

                window.location.replace(
                    "../../index.html"
                );

                return;

            }


            await loadDrivers();


        } catch (error) {

            console.error(
                "ADMIN CHECK ERROR:",
                error
            );

            await signOut(auth);

            window.location.replace(
                "../../index.html"
            );

        }

    }
);


/* =================================
   LOAD DRIVERS
================================= */

async function loadDrivers() {

    try {

        const usersSnapshot =
            await getDocs(
                collection(
                    db,
                    "users"
                )
            );


        const busesSnapshot =
            await getDocs(
                collection(
                    db,
                    "buses"
                )
            );


        const buses = [];


        busesSnapshot.forEach(
            (snapshot) => {

                buses.push({
                    id: snapshot.id,
                    ...snapshot.data()
                });

            }
        );


        const drivers = [];


        usersSnapshot.forEach(
            (snapshot) => {

                const data =
                    snapshot.data();


                if (
                    data.role === "driver"
                ) {

                    drivers.push({
                        id: snapshot.id,
                        ...data
                    });

                }

            }
        );


        const pending =
            drivers.filter(
                driver =>
                    driver.status === "pending"
            );


        const approved =
            drivers.filter(
                driver =>
                    driver.status === "approved"
            );


        totalDrivers.textContent =
            drivers.length;


        pendingDrivers.textContent =
            pending.length;


        approvedDrivers.textContent =
            approved.length;


        renderPending(
            pending,
            buses
        );


        renderApproved(
            approved,
            buses
        );


    } catch (error) {

        console.error(
            "LOAD DRIVERS ERROR:",
            error
        );


        pendingList.innerHTML = `
            <div class="empty">
                Unable to load driver information.
            </div>
        `;

    }

}


/* =================================
   RENDER PENDING
================================= */

function renderPending(
    drivers,
    buses
) {

    pendingList.innerHTML = "";


    if (
        drivers.length === 0
    ) {

        pendingList.innerHTML = `
            <div class="empty">
                No drivers waiting for approval.
            </div>
        `;

        return;

    }


    drivers.forEach(
        (driver) => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "driver-card";


            card.innerHTML = `

                <div>

                    <div class="driver-name">
                        ${escapeHTML(
                            driver.name ||
                            "Unnamed Driver"
                        )}
                    </div>

                    <div class="driver-email">
                        ${escapeHTML(
                            driver.email ||
                            "No email"
                        )}
                    </div>

                    <div class="driver-meta">

                        <div class="meta">
                            STATUS:
                            <strong>
                                PENDING
                            </strong>
                        </div>

                    </div>

                </div>


                <div class="approval-area">

                    <select
                        class="bus-select"
                        data-driver-id="${driver.id}"
                    >

                        <option value="">
                            Select available bus
                        </option>

                    </select>


                    <button
                        class="approve-btn"
                        data-driver-id="${driver.id}"
                    >
                        APPROVE & ASSIGN BUS
                    </button>

                </div>

            `;


            const select =
                card.querySelector(
                    ".bus-select"
                );


            addAvailableBuses(
                select,
                buses
            );


            const button =
                card.querySelector(
                    ".approve-btn"
                );


            button.addEventListener(
                "click",
                () => {

                    approveDriver(
                        driver.id,
                        select,
                        button
                    );

                }
            );


            pendingList.appendChild(
                card
            );

        }
    );

}


/* =================================
   AVAILABLE BUSES
================================= */

function addAvailableBuses(
    select,
    buses
) {

    buses.forEach(
        (bus) => {

            /*
             * Already assigned bus
             * must not appear.
             */

            if (
                bus.assignedDriverId
            ) {

                return;

            }


            /*
             * Only active buses.
             */

            if (
                bus.status &&
                bus.status !== "active"
            ) {

                return;

            }


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                bus.id;


            option.textContent =
                `${bus.busNumber || "Unnamed Bus"}${
                    bus.registrationNumber
                        ? " — " + bus.registrationNumber
                        : ""
                }`;


            select.appendChild(
                option
            );

        }
    );

}


/* =================================
   APPROVE DRIVER
================================= */

async function approveDriver(
    driverId,
    select,
    button
) {

    const busId =
        select.value;


    if (!busId) {

        alert(
            "Please select a bus."
        );

        return;

    }


    button.disabled =
        true;

    button.textContent =
        "APPROVING...";


    try {

        /*
         * Re-check driver.
         */

        const driverRef =
            doc(
                db,
                "users",
                driverId
            );


        const driverSnapshot =
            await getDoc(
                driverRef
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
            driver.status === "approved"
        ) {

            throw new Error(
                "This driver is already approved."
            );

        }


        /*
         * Re-check bus.
         *
         * This prevents the same bus
         * from being assigned twice.
         */

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

            throw new Error(
                "Selected bus does not exist."
            );

        }


        const bus =
            busSnapshot.data();


        if (
            bus.assignedDriverId
        ) {

            throw new Error(
                "This bus has already been assigned."
            );

        }


        /*
         * APPROVE DRIVER
         */

        await updateDoc(
            driverRef,
            {

                status:
                    "approved",

                assignedBusId:
                    busId,

                approvedAt:
                    serverTimestamp()

            }
        );


        /*
         * ASSIGN BUS
         */

        await updateDoc(
            busRef,
            {

                assignedDriverId:
                    driverId,

                assignedDriverName:
                    driver.name || ""

            }
        );


        /*
         * Reload everything.
         */

        await loadDrivers();


    } catch (error) {

        console.error(
            "APPROVAL ERROR:",
            error
        );


        alert(
            error.message ||
            "Unable to approve driver."
        );


        button.disabled =
            false;

        button.textContent =
            "APPROVE & ASSIGN BUS";

    }

}


/* =================================
   APPROVED DRIVERS
================================= */

function renderApproved(
    drivers,
    buses
) {

    approvedList.innerHTML = "";


    if (
        drivers.length === 0
    ) {

        approvedList.innerHTML = `
            <div class="empty">
                No approved drivers yet.
            </div>
        `;

        return;

    }


    drivers.forEach(
        (driver) => {

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
                "driver-card approved-card";


            card.innerHTML = `

                <div>

                    <div class="driver-name">
                        ${escapeHTML(
                            driver.name ||
                            "Unnamed Driver"
                        )}
                    </div>

                    <div class="driver-email">
                        ${escapeHTML(
                            driver.email ||
                            "No email"
                        )}
                    </div>

                    <div class="driver-meta">

                        <div class="meta">
                            STATUS:
                            <strong>
                                APPROVED
                            </strong>
                        </div>

                        <div class="meta">
                            BUS:
                            <strong>
                                ${escapeHTML(
                                    bus?.busNumber ||
                                    "Not assigned"
                                )}
                            </strong>
                        </div>

                    </div>

                </div>


                <div>

                    <span class="approved-badge">
                        ACTIVE DRIVER
                    </span>

                </div>

            `;


            approvedList.appendChild(
                card
            );

        }
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
