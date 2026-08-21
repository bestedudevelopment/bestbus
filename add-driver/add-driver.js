import {
    initializeApp,
    deleteApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
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


/* =====================================================
   STATE
===================================================== */

let adminUser = null;


/* =====================================================
   ADMIN AUTH CHECK
===================================================== */

onAuthStateChanged(
    auth,
    async (user) => {

        console.log(
            "AUTH USER:",
            user
        );

        if (!user) {

            window.location.href =
                "../login/";

            return;
        }

        adminUser = user;

        try {

            const profile =
                await getUserProfile(
                    user.uid
                );

            console.log(
                "ADMIN PROFILE:",
                profile
            );


            if (
                !profile ||
                profile.role !== "admin"
            ) {

                window.location.href =
                    "../login/";

                return;
            }


            console.log(
                "ADMIN VERIFIED"
            );


            /*
             * Load buses only after
             * admin verification succeeds.
             */

            await loadAvailableBuses();


        } catch (error) {

            console.error(
                "ADMIN VERIFICATION ERROR:",
                error
            );

            showError(
                error.message ||
                "Unable to verify admin account."
            );

        }

    }
);


/* =====================================================
   BACK BUTTON
===================================================== */

backButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../drivers/";

    }
);


/* =====================================================
   LOAD BUSES
===================================================== */

async function loadAvailableBuses() {

    console.log(
        "================================"
    );

    console.log(
        "START: LOADING BUSES"
    );

    console.log(
        "================================"
    );


    assignedBus.innerHTML = `
        <option value="">
            Loading buses...
        </option>
    `;


    try {

        console.log(
            "Firestore DB:",
            db
        );


        /*
         * IMPORTANT:
         * We intentionally do NOT filter
         * by active here.
         *
         * First we want to confirm that
         * the website can actually read
         * the buses collection.
         */

        const busesReference =
            collection(
                db,
                "buses"
            );


        console.log(
            "BUS COLLECTION:",
            busesReference
        );


        const snapshot =
            await getDocs(
                busesReference
            );


        console.log(
            "BUS SNAPSHOT:",
            snapshot
        );


        console.log(
            "NUMBER OF BUSES:",
            snapshot.size
        );


        /*
         * Clear loading option.
         */

        assignedBus.innerHTML = `
            <option value="">
                Select a bus
            </option>
        `;


        /* =============================================
           NO BUSES
        ============================================= */

        if (
            snapshot.empty
        ) {

            console.warn(
                "NO BUS DOCUMENTS FOUND"
            );


            assignedBus.innerHTML = `
                <option value="">
                    No buses found
                </option>
            `;


            return;
        }


        let availableCount = 0;


        /* =============================================
           LOOP BUSES
        ============================================= */

        snapshot.forEach(
            (busDocument) => {

                const bus =
                    busDocument.data();


                console.log(
                    "--------------------------------"
                );


                console.log(
                    "BUS DOCUMENT ID:",
                    busDocument.id
                );


                console.log(
                    "BUS DATA:",
                    bus
                );


                /*
                 * Treat missing active field
                 * as active.
                 */

                const isActive =
                    bus.active !== false;


                /*
                 * If driverId exists, the bus
                 * is already assigned.
                 */

                const alreadyAssigned =
                    !!bus.driverId;


                console.log(
                    "ACTIVE:",
                    isActive
                );


                console.log(
                    "ALREADY ASSIGNED:",
                    alreadyAssigned
                );


                /*
                 * Skip inactive buses.
                 */

                if (
                    !isActive
                ) {

                    console.log(
                        "SKIPPING: BUS INACTIVE"
                    );

                    return;
                }


                /*
                 * Skip buses already assigned.
                 */

                if (
                    alreadyAssigned
                ) {

                    console.log(
                        "SKIPPING: BUS ALREADY ASSIGNED"
                    );

                    return;
                }


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    busDocument.id;


                /*
                 * Support multiple possible
                 * field names.
                 */

                const busNumber =
                    bus.busNumber ||
                    bus.number ||
                    bus.busNo ||
                    "BUS";


                const registration =
                    bus.registrationNumber ||
                    bus.registrationNo ||
                    bus.registration ||
                    "";


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


                availableCount++;


                console.log(
                    "BUS ADDED TO DROPDOWN:",
                    option.textContent
                );

            }
        );


        /* =============================================
           NO AVAILABLE BUSES
        ============================================= */

        if (
            availableCount === 0
        ) {

            assignedBus.innerHTML = `
                <option value="">
                    No available buses
                </option>
            `;


            console.warn(
                "BUSES EXIST BUT NONE ARE AVAILABLE"
            );

        } else {

            console.log(
                "AVAILABLE BUSES:",
                availableCount
            );

            console.log(
                "SUCCESS: BUSES LOADED"
            );

        }


    } catch (error) {

        console.error(
            "================================"
        );

        console.error(
            "FIREBASE BUS ERROR"
        );

        console.error(
            error
        );

        console.error(
            "ERROR CODE:",
            error.code
        );

        console.error(
            "ERROR MESSAGE:",
            error.message
        );

        console.error(
            "================================"
        );


        assignedBus.innerHTML = `
            <option value="">
                ERROR - Check Console
            </option>
        `;


        showError(
            error.message ||
            "Unable to load buses."
        );

    }

}


/* =====================================================
   FORM SUBMIT
===================================================== */

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        hideMessages();


        /* =============================================
           GET FORM VALUES
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
                "Please enter the driver's name."
            );

            driverName.focus();

            return;
        }


        if (!phone) {

            showError(
                "Please enter the driver's phone number."
            );

            driverPhone.focus();

            return;
        }


        if (!email) {

            showError(
                "Please enter the driver's email."
            );

            driverEmail.focus();

            return;
        }


        if (!password) {

            showError(
                "Please enter a password."
            );

            driverPassword.focus();

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
                "Please select a bus."
            );

            assignedBus.focus();

            return;
        }


        setLoading(true);


        let secondaryApp = null;


        try {

            /* =========================================
               VERIFY ADMIN
            ========================================= */

            if (!adminUser) {

                throw new Error(
                    "Admin session not found."
                );

            }


            /* =========================================
               CHECK EMAIL
            ========================================= */

            console.log(
                "Checking existing email..."
            );


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


            const emailSnapshot =
                await getDocs(
                    emailQuery
                );


            if (
                !emailSnapshot.empty
            ) {

                throw new Error(
                    "A user with this email already exists."
                );

            }


            /* =========================================
               CHECK PHONE
            ========================================= */

            console.log(
                "Checking existing phone..."
            );


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


            const phoneSnapshot =
                await getDocs(
                    phoneQuery
                );


            if (
                !phoneSnapshot.empty
            ) {

                throw new Error(
                    "A user with this phone number already exists."
                );

            }


            /* =========================================
               CHECK BUS AGAIN
            ========================================= */

            console.log(
                "Checking selected bus..."
            );


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
                    "Selected bus does not exist."
                );

            }


            const bus =
                busSnapshot.data();


            if (
                bus.driverId
            ) {

                throw new Error(
                    "This bus has already been assigned to another driver."
                );

            }


            /* =========================================
               CREATE SECONDARY FIREBASE APP
            ========================================= */

            console.log(
                "Creating secondary Firebase app..."
            );


            secondaryApp =
                initializeApp(
                    firebaseConfig,
                    "DriverCreation_" +
                    Date.now()
                );


            const secondaryAuth =
                getAuth(
                    secondaryApp
                );


            /* =========================================
               CREATE DRIVER AUTH ACCOUNT
            ========================================= */

            console.log(
                "Creating driver Authentication account..."
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
                "DRIVER AUTH UID:",
                driverUid
            );


            /* =========================================
               CREATE DRIVER FIRESTORE DOCUMENT
            ========================================= */

            console.log(
                "Creating Firestore driver profile..."
            );


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
                "DRIVER FIRESTORE PROFILE CREATED"
            );


            /* =========================================
               ASSIGN DRIVER TO BUS
            ========================================= */

            console.log(
                "Assigning driver to bus..."
            );


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
                "BUS ASSIGNMENT COMPLETE"
            );


            /* =========================================
               SIGN OUT SECONDARY AUTH
            ========================================= */

            await signOut(
                secondaryAuth
            );


            /* =========================================
               SUCCESS
            ========================================= */

            showSuccess(
                `${name} created successfully.`
            );


            console.log(
                "DRIVER CREATED SUCCESSFULLY"
            );


            console.log(
                "ADMIN STILL LOGGED IN:",
                auth.currentUser?.email
            );


            form.reset();


            await loadAvailableBuses();


            setTimeout(
                () => {

                    window.location.href =
                        "../drivers/";

                },
                1500
            );


        } catch (error) {

            console.error(
                "================================"
            );

            console.error(
                "CREATE DRIVER ERROR"
            );

            console.error(
                error
            );

            console.error(
                "ERROR CODE:",
                error.code
            );

            console.error(
                "ERROR MESSAGE:",
                error.message
            );

            console.error(
                "================================"
            );


            let message =
                "Unable to create driver.";


            if (
                error.code ===
                "auth/email-already-in-use"
            ) {

                message =
                    "This email is already registered.";

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
                    "Firebase permission denied. Check Firestore Rules.";

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

                } catch (cleanupError) {

                    console.error(
                        "Secondary app cleanup error:",
                        cleanupError
                    );

                }

            }


            setLoading(false);

        }

    }
);


/* =====================================================
   LOADING
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
