import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "../../../core/firebase.js";


const driversList =
    document.getElementById(
        "driversList"
    );

const searchInput =
    document.getElementById(
        "searchInput"
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

            driversList.innerHTML = `
                <div class="empty">
                    ${escapeHTML(
                        error.message
                    )}
                </div>
            `;

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

    const snapshot =
        await getDocs(
            collection(
                db,
                "users"
            )
        );


    const driverUsers =
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


    /*
     * Only show drivers
     * who currently have a bus.
     */

    drivers = [];

    for (
        const driver
        of driverUsers
    ) {

        if (
            !driver.assignedBusId
        ) {

            continue;

        }


        let bus = null;


        try {

            const busRef =
                doc(
                    db,
                    "buses",
                    driver.assignedBusId
                );

            const busSnap =
                await getDoc(
                    busRef
                );


            if (
                busSnap.exists()
            ) {

                bus = {
                    id: busSnap.id,
                    ...busSnap.data()
                };

            }

        } catch (error) {

            console.error(
                error
            );

        }


        drivers.push({

            id: driver.id,

            name:
                driver.name ||
                "Driver",

            phone:
                driver.phone ||
                driver.contactNumber ||
                "",

            bus:
                bus

        });

    }


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

        driversList.innerHTML = `
            <div class="empty">
                No drivers with assigned buses.
            </div>
        `;

        return;

    }


    driversList.innerHTML =
        list
            .map(
                driver => {

                    const busName =
                        driver.bus?.busNumber ||
                        driver.bus?.name ||
                        driver.bus?.number ||
                        "Assigned Bus";


                    return `

                        <div class="driver-card">

                            <div class="driver-icon">
                                👤
                            </div>


                            <div class="driver-info">

                                <div class="driver-name">
                                    ${escapeHTML(
                                        driver.name
                                    )}
                                </div>

                                <div class="bus-name">
                                    🚌
                                    ${escapeHTML(
                                        busName
                                    )}
                                </div>

                            </div>


                            ${
                                driver.phone
                                ?
                                `
                                <a
                                    class="call-button"
                                    href="tel:${escapeHTML(
                                        driver.phone
                                    )}"
                                    title="Call Driver"
                                >
                                    📞
                                </a>
                                `
                                :
                                ""
                            }

                        </div>

                    `;

                }
            )
            .join("");

}


/* =========================
   SEARCH
========================= */

searchInput.addEventListener(
    "input",
    () => {

        const text =
            searchInput.value
                .trim()
                .toLowerCase();


        if (!text) {

            renderDrivers(
                drivers
            );

            return;

        }


        const filtered =
            drivers.filter(
                driver => {

                    const name =
                        (
                            driver.name ||
                            ""
                        )
                        .toLowerCase();


                    const bus =
                        (
                            driver.bus?.busNumber ||
                            driver.bus?.name ||
                            driver.bus?.number ||
                            ""
                        )
                        .toLowerCase();


                    return (
                        name.includes(text) ||
                        bus.includes(text)
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
   ESCAPE HTML
========================= */

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
