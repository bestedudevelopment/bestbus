import {
    initializeApp,
    deleteApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

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
   AUTHENTICATION
===================================================== */

onAuthStateChanged(
    auth,
    async (user) => {

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


            if (
                !profile ||
                profile.role !== "admin"
            ) {

                window.location.href =
                    "../login/";

                return;
            }


            await loadAvailableBuses();


        } catch (error) {

            console.error(
                "Admin verification error:",
                error
            );


            showError(
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
   LOAD AVAILABLE BUSES
===================================================== */

async function loadAvailableBuses() {

    try {

        assignedBus.innerHTML = `
            <option value="">
                Loading buses...
            </option>
        `;


        const busesQuery =
            query(
                collection(
                    db,
                    "buses"
                ),

                where(
                    "active",
                    "==",
                    true
                )
            );


        const snapshot =
            await getDocs(
                busesQuery
            );


        assignedBus.innerHTML = `
            <option value="">
                Select a bus
            </option>
        `;


        let availableCount = 0;


        snapshot.forEach(
            (busDoc) => {

                const bus =
                    busDoc.data();


                /*
                 * Only buses without a driver
                 * are available.
                 */

                if (
                    bus.driverId
                ) {

                    return;
                }


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    busDoc.id;


                option.textContent =
                    `${bus.busNumber || "BUS"} — ${
                        bus.registrationNumber ||
                        "No registration"
                    }`;


                assignedBus.appendChild(
                    option
                );


                availableCount++;

            }
        );


        if (
            availableCount === 0
        ) {

            assignedBus.innerHTML = `
                <option value="">
                    No buses available
                </option>
            `;

        }


    } catch (error) {

        console.error(
            "Load buses error:",
            error
        );


        assignedBus.innerHTML = `
            <option value="">
                Unable to load buses
            </option>
        `;


        showError(
            "Unable to load available buses."
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
           GET VALUES
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
                "Please enter a temporary password."
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


        /* =============================================
           START LOADING
        ============================================= */

        setLoading(true);


        let secondaryApp = null;


        try {

            /* =========================================
               1. CHECK ADMIN
            ========================================= */

            if (!adminUser) {

                throw new Error(
                    "Admin session has expired. Please login again."
                );

            }


            /* =========================================
               2. CHECK EMAIL ALREADY EXISTS
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
               3. CHECK PHONE
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
               4. CHECK BUS
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
                    "The selected bus no longer exists."
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
               5. CREATE SECONDARY FIREBASE APP
            ========================================= */

            /*
             * This is the important part.
             *
             * The main Firebase Auth session belongs
             * to the ADMIN.
             *
             * We create a SECOND Firebase App so that
             * creating the driver does not replace the
             * admin's login session.
             */

            secondaryApp =
                initializeApp(
                    firebaseConfig,
                    "DriverCreationApp_" +
                    Date.now()
                );


            const secondaryAuth =
                getAuth(
                    secondaryApp
                );


            /* =========================================
               6. CREATE FIREBASE AUTH ACCOUNT
            ========================================= */

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
                "Driver Auth UID:",
                driverUid
            );


            /* =========================================
               7. CREATE FIRESTORE DRIVER PROFILE
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


            /*
             * IMPORTANT:
             *
             * The document ID is the Firebase Auth UID.
             */

            await setDoc(
                doc(
                    db,
                    "users",
                    driverUid
                ),

                driverData
            );


            /* =========================================
               8. UPDATE BUS
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


            /* =========================================
               9. SIGN OUT SECONDARY AUTH
            ========================================= */

            await signOut(
                secondaryAuth
            );


            /* =========================================
               10. SUCCESS
            ========================================= */

            showSuccess(
                `${name} has been created successfully and assigned to ${
                    bus.busNumber || "the selected bus"
                }.`
            );


            /*
             * Admin session is still alive because
             * the driver was created through the
             * secondary Firebase App.
             */

            console.log(
                "Admin UID still:",
                auth.currentUser?.uid
            );


            /* =========================================
               11. CLEAR FORM
            ========================================= */

            form.reset();


            /*
             * Reload available buses because the
             * selected bus is no longer available.
             */

            await loadAvailableBuses();


            /* =========================================
               12. RETURN TO DRIVER LIST
            ========================================= */

            setTimeout(
                () => {

                    window.location.href =
                        "../drivers/";

                },
                1500
            );


        } catch (error) {

            console.error(
                "CREATE DRIVER ERROR:",
                error
            );


            let message =
                "Unable to create driver.";


            /*
             * Firebase error messages
             */

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
                    "Password is too weak. Use at least 6 characters.";

            } else if (
                error.code ===
                "permission-denied"
            ) {

                message =
                    "Firebase denied this operation. Check your Firestore security rules.";

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

            /* =========================================
               DELETE SECONDARY APP
            ========================================= */

            if (
                secondaryApp
            ) {

                try {

                    await deleteApp(
                        secondaryApp
                    );

                } catch (deleteError) {

                    console.error(
                        "Secondary app cleanup error:",
                        deleteError
                    );

                }

            }


            setLoading(false);

        }

    }
);


/* =====================================================
   LOADING UI
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
