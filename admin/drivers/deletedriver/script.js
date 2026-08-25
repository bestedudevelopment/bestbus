import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    getDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "../../../core/firebase.js";


const driversList =
    document.getElementById(
        "driversList"
    );

const driverCount =
    document.getElementById(
        "driverCount"
    );

const searchInput =
    document.getElementById(
        "searchInput"
    );

const message =
    document.getElementById(
        "message"
    );


let currentUser = null;

let drivers = [];


/* =========================
   AUTH
========================= */

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            window.location.href =
                "../../../login/";

            return;

        }

        currentUser = user;

        try {

            await checkAdmin();

            await loadDrivers();

        } catch (error) {

            console.error(error);

            showMessage(
                error.message ||
                "Unable to load drivers.",
                true
            );

        }

    }
);


/* =========================
   ADMIN CHECK
========================= */

async function checkAdmin() {

    const ref =
        doc(
            db,
            "users",
            currentUser.uid
        );

    const snap =
        await getDoc(ref);


    if (!snap.exists()) {

        await signOut(auth);

        window.location.href =
            "../../../login/";

        throw new Error(
            "Admin account not found."
        );

    }


    const data =
        snap.data();


    if (
        data.role !== "admin"
    ) {

        await signOut(auth);

        window.location.href =
            "../../../login/";

        throw new Error(
            "Admin access required."
        );

    }

}


/* =========================
   LOAD DRIVERS
========================= */

async function loadDrivers() {

    driversList.innerHTML =
        `<div class="empty">
            Loading drivers...
        </div>`;


    const snapshot =
        await getDocs(
            collection(
                db,
                "users"
            )
        );


    drivers =
        snapshot.docs
            .map(
                item => ({
                    id: item.id,
                    ...item.data()
                })
            )
            .filter(
                item =>
                    item.role === "driver"
            );


    driverCount.textContent =
        `${drivers.length} drivers`;


    renderDrivers(
        drivers
    );

}


/* =========================
   RENDER
========================= */

function renderDrivers(
    list
) {

    if (!list.length) {

        driversList.innerHTML =
            `<div class="empty">
                No drivers found.
            </div>`;

        return;

    }


    driversList.innerHTML =
        list
            .map(
                renderDriver
            )
            .join("");


    document
        .querySelectorAll(
            ".delete-button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    deleteDriver(
                        button.dataset.id,
                        button.dataset.name
                    );

                }
            );

        });

}


/* =========================
   DRIVER CARD
========================= */

function renderDriver(
    driver
) {

    const name =
        driver.name ||
        "Unnamed Driver";


    const phone =
        driver.phone ||
        driver.contactNumber ||
        "No contact number";


    const assignedBus =
        driver.assignedBusId;


    const initials =
        getInitials(
            name
        );


    if (assignedBus) {

        return `

            <div class="driver-item">

                <div class="driver-avatar">
                    ${escapeHTML(
                        initials
                    )}
                </div>


                <div class="driver-info">

                    <div class="driver-name">
                        ${escapeHTML(
                            name
                        )}
                    </div>

                    <div class="driver-phone">
                        ${escapeHTML(
                            phone
                        )}
                    </div>

                    <div class="driver-bus assigned">
                        🚌 Bus Assigned
                    </div>

                </div>


                <button
                    class="assigned-button"
                    disabled
                >
                    DEASSIGN FIRST
                </button>

            </div>

        `;

    }


    return `

        <div class="driver-item">

            <div class="driver-avatar">
                ${escapeHTML(
                    initials
                )}
            </div>


            <div class="driver-info">

                <div class="driver-name">
                    ${escapeHTML(
                        name
                    )}
                </div>

                <div class="driver-phone">
                    ${escapeHTML(
                        phone
                    )}
                </div>

                <div class="driver-bus free">
                    ✓ No Bus Assigned
                </div>

            </div>


            <button
                class="delete-button"
                data-id="${escapeHTML(
                    driver.id
                )}"
                data-name="${escapeHTML(
                    name
                )}"
            >
                DELETE
            </button>

        </div>

    `;

}


/* =========================
   DELETE
========================= */

async function deleteDriver(
    driverId,
    driverName
) {

    const confirmed =
        confirm(
            `Delete "${driverName}"?\n\n` +
            `This will remove the driver's ` +
            `profile from the users collection.\n\n` +
            `This action cannot be undone.`
        );


    if (!confirmed) {
        return;
    }


    try {

        const ref =
            doc(
                db,
                "users",
                driverId
            );


        const snap =
            await getDoc(ref);


        if (!snap.exists()) {

            showMessage(
                "Driver no longer exists.",
                true
            );

            await loadDrivers();

            return;

        }


        const driver =
            snap.data();


        /*
         * Final safety check.
         */

        if (
            driver.assignedBusId &&
            String(
                driver.assignedBusId
            ).trim() !== ""
        ) {

            showMessage(
                "Deassign this driver first.",
                true
            );

            return;

        }


        await deleteDoc(
            ref
        );


        showMessage(
            `${driverName} deleted successfully.`
        );


        await loadDrivers();


    } catch (error) {

        console.error(
            "Delete driver:",
            error
        );


        showMessage(
            "Unable to delete driver: " +
            error.message,
            true
        );

    }

}


/* =========================
   SEARCH
========================= */

searchInput.addEventListener(
    "input",
    () => {

        const search =
            searchInput.value
                .trim()
                .toLowerCase();


        if (!search) {

            renderDrivers(
                drivers
            );

            return;

        }


        const filtered =
            drivers.filter(
                driver => {

                    const name =
                        String(
                            driver.name ||
                            ""
                        )
                        .toLowerCase();


                    const phone =
                        String(
                            driver.phone ||
                            driver.contactNumber ||
                            ""
                        )
                        .toLowerCase();


                    return (
                        name.includes(
                            search
                        ) ||
                        phone.includes(
                            search
                        )
                    );

                }
            );


        renderDrivers(
            filtered
        );

    }
);


/* =========================
   BACK
========================= */

document
    .getElementById(
        "backButton"
    )
    .addEventListener(
        "click",
        () => {

            window.location.href =
                "../";

        }
    );


/* =========================
   LOGOUT
========================= */

document
    .getElementById(
        "logoutButton"
    )
    .addEventListener(
        "click",
        async () => {

            await signOut(
                auth
            );

            window.location.href =
                "../../../login/";

        }
    );


/* =========================
   HELPERS
========================= */

function getInitials(
    name
) {

    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(
            x =>
                x[0]
        )
        .join("")
        .toUpperCase();

}


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


function showMessage(
    text,
    error = false
) {

    message.textContent =
        text;

    message.className =
        "message" +
        (
            error
                ? " error"
                : " success"
        );

    message.classList.remove(
        "hidden"
    );


    setTimeout(
        () => {

            message.classList.add(
                "hidden"
            );

        },
        3500
    );

}
