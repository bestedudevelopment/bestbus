import {
    collection,
    getDocs,
    addDoc,
    query,
    where,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth,
    db
} from "../core/firebase.js";


/* =================================
   ELEMENTS
================================= */

const driverForm =
    document.getElementById(
        "driverForm"
    );

const driverName =
    document.getElementById(
        "driverName"
    );

const driverEmail =
    document.getElementById(
        "driverEmail"
    );

const busSelect =
    document.getElementById(
        "busSelect"
    );

const saveButton =
    document.getElementById(
        "saveButton"
    );

const message =
    document.getElementById(
        "message"
    );


/* =================================
   ADMIN AUTH CHECK
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

                await auth.signOut();

                window.location.replace(
                    "../index.html"
                );

                return;
            }


            const userData =
                userSnapshot.data();


            if (
                userData.role !== "admin"
            ) {

                await auth.signOut();

                window.location.replace(
                    "../index.html"
                );

                return;
            }


            /*
             * Admin verified.
             * Load buses.
             */

            await loadAvailableBuses();


        } catch (error) {

            console.error(
                "ADMIN CHECK ERROR:",
                error
            );

            await auth.signOut();

            window.location.replace(
                "../index.html"
            );

        }

    }
);


/* =================================
   LOAD AVAILABLE BUSES
================================= */

async function loadAvailableBuses() {

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "buses"
                )
            );


        busSelect.innerHTML = `
            <option value="">
                Select an available bus
            </option>
        `;


        let availableCount = 0;


        snapshot.forEach(
            (busSnapshot) => {

                const bus =
                    busSnapshot.data();


                /*
                 * Ignore inactive buses.
                 */

                if (
                    bus.status &&
                    bus.status !== "active"
                ) {

                    return;
                }


                /*
                 * If a bus already has
                 * an assigned driver,
                 * DO NOT show it.
                 */

                if (
                    bus.assignedDriverId
                ) {

                    return;
                }


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    busSnapshot.id;


                option.textContent =
                    `${bus.busNumber || "Unnamed Bus"} — ${
                        bus.registrationNumber ||
                        "No registration"
                    }`;


                busSelect.appendChild(
                    option
                );


                availableCount++;

            }
        );


        if (
            availableCount === 0
        ) {

            busSelect.innerHTML = `
                <option value="">
                    No available buses
                </option>
            `;

            saveButton.disabled =
                true;

        }


    } catch (error) {

        console.error(
            "BUS LOAD ERROR:",
            error
        );


        busSelect.innerHTML = `
            <option value="">
                Unable to load buses
            </option>
        `;

        showError(
            "Unable to load buses from Firestore."
        );

    }

}


/* =================================
   CREATE DRIVER PROFILE
================================= */

driverForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        hideMessage();


        const name =
            driverName.value
                .trim();


        const email =
            driverEmail.value
                .trim()
                .toLowerCase();


        const busId =
            busSelect.value;


        /* =========================
           VALIDATION
        ========================= */

        if (!name) {

            showError(
                "Enter the driver name."
            );

            return;
        }


        if (!email) {

            showError(
                "Enter the driver email."
            );

            return;
        }


        if (!busId) {

            showError(
                "Select an available bus."
            );

            return;
        }


        saveButton.disabled =
            true;

        saveButton.textContent =
            "CREATING PROFILE...";


        try {

            /* =========================
               DUPLICATE EMAIL CHECK
            ========================= */

            const emailQuery =
                query(
                    collection(
                        db,
                        "drivers"
                    ),
                    where(
                        "email",
                        "==",
                        email
                    )
                );


            const existingDriver =
                await getDocs(
                    emailQuery
                );


            if (
                !existingDriver.empty
            ) {

                throw new Error(
                    "A driver profile with this email already exists."
                );

            }


            /* =========================
               RE-CHECK BUS
            =========================
            
             * This is important.
             *
             * Another admin could have
             * assigned the bus after this
             * page loaded.
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
                    "Selected bus no longer exists."
                );

            }


            const bus =
                busSnapshot.data();


            if (
                bus.assignedDriverId
            ) {

                throw new Error(
                    "This bus has already been assigned to another driver."
                );

            }


            if (
                bus.status &&
                bus.status !== "active"
            ) {

                throw new Error(
                    "This bus is not active."
                );

            }


            /* =========================
               CREATE DRIVER PROFILE
            ========================= */

            const driverData = {

                name:
                    name,

                email:
                    email,

                authUid:
                    null,

                assignedBusId:
                    busId,

                status:
                    "pending",

                createdAt:
                    serverTimestamp(),

                createdBy:
                    auth.currentUser.uid

            };


            const driverReference =
                await addDoc(
                    collection(
                        db,
                        "drivers"
                    ),
                    driverData
                );


            /* =========================
               ASSIGN BUS
            ========================= */

            await updateDoc(
                busRef,
                {

                    assignedDriverId:
                        driverReference.id,

                    assignedDriverName:
                        name

                }
            );


            /* =========================
               SUCCESS
            ========================= */

            showSuccess(
                "Driver profile created successfully."
            );


            driverForm.reset();


            /*
             * Refresh the bus list.
             *
             * The assigned bus will
             * disappear immediately.
             */

            await loadAvailableBuses();


        } catch (error) {

            console.error(
                "CREATE DRIVER ERROR:",
                error
            );


            showError(
                error.message ||
                "Unable to create driver profile."
            );

        } finally {

            saveButton.disabled =
                false;

            /*
             * If there are no buses,
             * keep button disabled.
             */

            if (
                busSelect.options.length <= 1 &&
                !busSelect.value
            ) {

                saveButton.disabled =
                    true;

            }


            saveButton.textContent =
                "CREATE DRIVER PROFILE";

        }

    }
);


/* =================================
   ERROR
================================= */

function showError(
    text
) {

    message.classList.remove(
        "success"
    );

    message.classList.remove(
        "hidden"
    );

    message.textContent =
        text;

}


/* =================================
   SUCCESS
================================= */

function showSuccess(
    text
) {

    message.classList.add(
        "success"
    );

    message.classList.remove(
        "hidden"
    );

    message.textContent =
        text;

}


/* =================================
   HIDE MESSAGE
================================= */

function hideMessage() {

    message.classList.remove(
        "success"
    );

    message.classList.add(
        "hidden"
    );

    message.textContent =
        "";

}
