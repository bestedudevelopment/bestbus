import {
    initializeApp,
    deleteApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db,
    firebaseConfig
} from "../core/firebase.js";

import {
    getUserProfile
} from "../core/auth.js";


/* =====================================================
   ELEMENTS
===================================================== */

const form =
    document.getElementById("driverForm");

const driverName =
    document.getElementById("driverName");

const driverPhone =
    document.getElementById("driverPhone");

const driverEmail =
    document.getElementById("driverEmail");

const driverPassword =
    document.getElementById("driverPassword");

const licenseNumber =
    document.getElementById("licenseNumber");

const assignedBus =
    document.getElementById("assignedBus");

const busHelp =
    document.getElementById("busHelp");

const saveButton =
    document.getElementById("saveButton");

const saveText =
    document.getElementById("saveText");

const spinner =
    document.getElementById("spinner");

const errorMessage =
    document.getElementById("errorMessage");

const successMessage =
    document.getElementById("successMessage");

const backButton =
    document.getElementById("backButton");

const togglePassword =
    document.getElementById("togglePassword");


/* =====================================================
   STATE
===================================================== */

let adminUser = null;


/* =====================================================
   PASSWORD SHOW / HIDE
===================================================== */

togglePassword.addEventListener(
    "click",
    () => {

        if (
            driverPassword.type ===
            "password"
        ) {

            driverPassword.type =
                "text";

            togglePassword.textContent =
                "HIDE";

        } else {

            driverPassword.type =
                "password";

            togglePassword.textContent =
                "SHOW";

        }

    }
);


/* =====================================================
   BACK
===================================================== */

backButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../drivers/";

    }
);


/* =====================================================
   ADMIN AUTH
===================================================== */

onAuthStateChanged(
    auth,
    async (user) => {

        console.log(
            "AUTH CHECK:",
            user
        );


        if (!user) {

            window.location.href =
                "../login/";

            return;
        }


        adminUser =
            user;


        try {

            const profile =
                await getUserProfile(
                    user.uid
                );


            console.log(
                "CURRENT PROFILE:",
                profile
            );


            if (
                !profile ||
                profile.role !== "admin"
            ) {

                showError(
                    "Only administrators can create drivers."
                );

                return;
            }


            await loadAvailableBuses();


        } catch (error) {

            console.error(
                "ADMIN CHECK ERROR:",
                error
            );


            showError(
                error.message ||
                "Unable to verify administrator."
            );

        }

    }
);


/* =====================================================
   LOAD AVAILABLE BUSES
===================================================== */

async function loadAvailableBuses() {

    console.log(
        "===================================="
    );

    console.log(
        "STARTING BUS LOAD"
    );

    console.log(
        "===================================="
    );


    assignedBus.innerHTML = `
        <option value="">
            Loading buses...
        </option>
    `;


    try {

        /*
         * IMPORTANT:
         *
         * We read the entire buses collection first.
         * We don't use "where active == true"
         * because your existing bus documents may
         * not have the active field.
         */

        const busesCollection =
            collection(
                db,
                "buses"
            );


        console.log(
            "BUS COLLECTION:",
            busesCollection
        );


        const snapshot =
            await getDocs(
                busesCollection
            );


        console.log(
            "BUS COUNT:",
            snapshot.size
        );


        assignedBus.innerHTML = `
            <option value="">
                Select a bus
            </option>
        `;


        if (
            snapshot.empty
        ) {

            assignedBus.innerHTML = `
                <option value="">
                    No buses found
                </option>
            `;


            busHelp.textContent =
                "No buses exist in Firestore yet.";


            console.warn(
                "BUS COLLECTION IS EMPTY"
            );


            return;
        }


        let availableBuses =
            0;


        snapshot.forEach(
            (busDocument) => {

                const bus =
                    busDocument.data();


                console.log(
                    "BUS:",
                    busDocument.id,
                    bus
                );


                /*
                 * Missing active field =
                 * treat as active.
                 */

                const active =
                    bus.active !== false;


                /*
                 * If driverId exists,
                 * bus is already assigned.
                 */

                const assigned =
                    !!bus.driverId;


                if (!active) {

                    console.log(
                        "Skipping inactive bus:",
                        busDocument.id
                    );

                    return;
                }


                if (assigned) {

                    console.log(
                        "Skipping assigned bus:",
                        busDocument.id
                    );

                    return;
                }


                const busNumber =
                    bus.busNumber ||
                    bus.busNo ||
                    bus.number ||
                    "BUS";


                const registration =
                    bus.registrationNumber ||
                    bus.registrationNo ||
                    bus.registration ||
                    "";


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    busDocument.id;


                if (
                    registration
                ) {

                    option.textContent =
                        `${busNumber} — ${registration}`;

                } else {

                    option.textContent =
                        busNumber;

                }


                assignedBus.appendChild(
                    option
                );


                availableBuses++;


                console.log(
                    "ADDED BUS:",
                    option.textContent
                );

            }
        );


        if (
            availableBuses === 0
        ) {

            assignedBus.innerHTML = `
                <option value="">
                    No available buses
                </option>
            `;


            busHelp.textContent =
                "All active buses are already assigned to drivers.";


        } else {

            busHelp.textContent =
                `${availableBuses} bus${
                    availableBuses === 1
                        ? ""
                        : "es"
                } available for assignment.`;

        }


        console.log(
            "AVAILABLE BUSES:",
            availableBuses
        );


    } catch (error) {

        console.error(
            "===================================="
        );

        console.error(
            "BUS LOAD FAILED"
        );

        console.error(
            "CODE:",
            error.code
        );

        console.error(
            "MESSAGE:",
            error.message
        );

        console.error(
            error
        );

        console.error(
            "===================================="
        );


        assignedBus.innerHTML = `
            <option value="">
                Error loading buses
            </option>
        `;


        busHelp.textContent =
            "Firebase could not read the buses collection.";


        showError(
            error.message ||
            "Unable to load buses."
        );

    }

}


/* =====================================================
   CREATE DRIVER
===================================================== */

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        hideMessages();


        /* =============================================
           VALUES
        ============================================= */

        const name =
            driverName.value.trim();


        const phone =
            driverPhone.value.trim();


        const email =
            driverEmail.value
                .trim()
                .toLowerCase();


        const password =
            driverPassword.value;


        const license =
            licenseNumber.value.trim();


        const busId =
            assignedBus.value;


        /* =============================================
           VALIDATION
        ============================================= */

        if (!name) {

            showError(
                "Enter the driver's name."
            );

            driverName.focus();

            return;
        }


        if (!phone) {

            showError(
                "Enter the driver's phone number."
            );

            driverPhone.focus();

            return;
        }


        if (!email) {

            showError(
                "Enter the driver's email."
            );

            driverEmail.focus();

            return;
        }


        if (
            password.length < 6
        ) {

            showError(
                "Password must contain at least 6 characters."
            );

            driverPassword.focus();

            return;
        }


        if (!busId) {

            showError(
                "Select a bus."
            );

            assignedBus.focus();

            return;
        }


        if (!adminUser) {

            showError(
                "Administrator session not found."
            );

            return;
        }


        setLoading(true);


        let secondaryApp = null;


        try {

            /* =========================================
               CHECK EMAIL IN FIRESTORE
            ========================================= */

            const emailQuery =
                query(
                    collection(
                        db,
                        "users"
                    ),
                    where(
                        "email",
                        "==",
                        email
                    )
                );


            const emailResults =
                await getDocs(
                    emailQuery
                );


            if (
                !emailResults.empty
            ) {

                throw new Error(
                    "This email already exists in the system."
                );

            }


            /* =========================================
               CHECK PHONE
            ========================================= */

            const phoneQuery =
                query(
                    collection(
                        db,
                        "users"
                    ),
                    where(
                        "phone",
                        "==",
                        phone
                    )
                );


            const phoneResults =
                await getDocs(
                    phoneQuery
                );


            if (
                !phoneResults.empty
            ) {

                throw new Error(
                    "This phone number already exists."
                );

            }


            /* =========================================
               GET BUS
            ========================================= */

            const busReference =
                doc(
                    db,
                    "buses",
                    busId
                );


            const busSnapshot =
                await getDoc(
                    busReference
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
                bus.driverId
            ) {

                throw new Error(
                    "This bus has already been assigned."
                );

            }


            /* =========================================
               CREATE SECONDARY APP
            ========================================= */

            console.log(
                "Creating secondary Firebase app..."
            );


            secondaryApp =
                initializeApp(
                    firebaseConfig,
                    "DriverApp_" +
                    Date.now()
                );


            const secondaryAuth =
                getAuth(
                    secondaryApp
                );


            /* =========================================
               CREATE AUTH ACCOUNT
            ========================================= */

            console.log(
                "Creating Firebase Auth account..."
            );


            const credential =
                await createUserWithEmailAndPassword(
                    secondaryAuth,
                    email,
                    password
                );


            const driverUser =
                credential.user;


            const driverUid =
                driverUser.uid;


            console.log(
                "DRIVER UID:",
                driverUid
            );


            /* =========================================
               CREATE USER PROFILE
            ========================================= */

            const driverData = {

                name:
                    name,

                phone:
                    phone,

                email:
                    email,

                licenseNumber:
                    license,

                role:
                    "driver",

                assignedBusId:
                    busId,

                active:
                    true,

                createdAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()

            };


            await setDoc(
                doc(
                    db,
                    "users",
                    driverUid
                ),
                driverData
            );


            console.log(
                "DRIVER PROFILE CREATED"
            );


            /* =========================================
               UPDATE BUS
            ========================================= */

            await updateDoc(
                busReference,
                {

                    driverId:
                        driverUid,

                    updatedAt:
                        serverTimestamp()

                }
            );


            console.log(
                "BUS ASSIGNED"
            );


            /* =========================================
               SIGN OUT SECONDARY ACCOUNT
            ========================================= */

            await signOut(
                secondaryAuth
            );


            /* =========================================
               SUCCESS
            ========================================= */

            showSuccess(
                `${name} has been created successfully.`
            );


            console.log(
                "DRIVER CREATED"
            );


            console.log(
                "ADMIN STILL LOGGED IN:",
                auth.currentUser?.email
            );


            form.reset();


            /*
             * Reload buses.
             */

            await loadAvailableBuses();


            /*
             * Go back to Drivers page.
             */

            setTimeout(
                () => {

                    window.location.href =
                        "../drivers/";

                },
                1500
            );


        } catch (error) {

            console.error(
                "===================================="
            );

            console.error(
                "CREATE DRIVER ERROR"
            );

            console.error(
                error
            );

            console.error(
                "CODE:",
                error.code
            );

            console.error(
                "MESSAGE:",
                error.message
            );

            console.error(
                "===================================="
            );


            let message =
                "Unable to create driver.";


            if (
                error.code ===
                "auth/email-already-in-use"
            ) {

                message =
                    "This email is already registered in Firebase Authentication.";

            } else if (
                error.code ===
                "auth/invalid-email"
            ) {

                message =
                    "Please enter a valid email address.";

            } else if (
                error.code ===
                "auth/weak-password"
            ) {

                message =
                    "Password must contain at least 6 characters.";

            } else if (
                error.code ===
                "permission-denied"
            ) {

                message =
                    "Firebase permission denied. Check Firestore Security Rules.";

            } else if (
                error.message
            ) {

                message =
                    error.message;

            }


            showError(
                message
            );


        } finally {

            if (
                secondaryApp
            ) {

                try {

                    await deleteApp(
                        secondaryApp
                    );

                } catch (error) {

                    console.warn(
                        "Secondary Firebase cleanup failed:",
                        error
                    );

                }

            }


            setLoading(false);

        }

    }
);


/* =====================================================
   LOADING STATE
===================================================== */

function setLoading(
    loading
) {

    saveButton.disabled =
        loading;


    saveText.classList.toggle(
        "hidden",
        loading
    );


    spinner.classList.toggle(
        "hidden",
        !loading
    );

}


/* =====================================================
   MESSAGES
===================================================== */

function hideMessages() {

    errorMessage.classList.add(
        "hidden"
    );

    successMessage.classList.add(
        "hidden"
    );

}


function showError(
    message
) {

    errorMessage.textContent =
        message;

    errorMessage.classList.remove(
        "hidden"
    );

    successMessage.classList.add(
        "hidden"
    );

}


function showSuccess(
    message
) {

    successMessage.textContent =
        message;

    successMessage.classList.remove(
        "hidden"
    );

    errorMessage.classList.add(
        "hidden"
    );

}
