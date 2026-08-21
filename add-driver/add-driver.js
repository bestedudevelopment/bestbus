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


/* =========================================
   ELEMENTS
========================================= */

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


/* =========================================
   STATE
========================================= */

let adminUser = null;


/* =========================================
   SHOW PASSWORD
========================================= */

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


/* =========================================
   BACK
========================================= */

backButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../drivers/";

    }
);


/* =========================================
   AUTH CHECK
========================================= */

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

                showError(
                    "Only administrators can create drivers."
                );

                return;
            }


            await loadAvailableBuses();


        } catch (error) {

            console.error(
                "AUTH ERROR:",
                error
            );


            showError(
                error.message ||
                "Unable to verify administrator."
            );

        }

    }
);


/* =========================================
   LOAD BUSES
========================================= */

async function loadAvailableBuses() {

    console.log(
        "Loading available buses..."
    );


    assignedBus.innerHTML = `
        <option value="">
            Loading buses...
        </option>
    `;


    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "buses"
                )
            );


        console.log(
            "Total buses:",
            snapshot.size
        );


        assignedBus.innerHTML = `
            <option value="">
                Select a bus
            </option>
        `;


        let count =
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
                 * Inactive buses cannot be assigned.
                 */

                if (
                    bus.active === false
                ) {

                    return;
                }


                /*
                 * If driverId exists,
                 * the bus is already assigned.
                 */

                if (
                    bus.driverId
                ) {

                    return;
                }


                const busNumber =
                    bus.busNumber ||
                    "BUS";


                const registration =
                    bus.registrationNumber ||
                    bus.registrationNo ||
                    "";


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    busDocument.id;


                option.textContent =
                    registration
                        ? `${busNumber} — ${registration}`
                        : busNumber;


                assignedBus.appendChild(
                    option
                );


                count++;

            }
        );


        if (
            count === 0
        ) {

            assignedBus.innerHTML = `
                <option value="">
                    No available buses
                </option>
            `;


            busHelp.textContent =
                "All active buses are already assigned or no buses exist.";

        } else {

            busHelp.textContent =
                `${count} bus${
                    count === 1
                        ? ""
                        : "es"
                } available for assignment.`;

        }


    } catch (error) {

        console.error(
            "BUS LOAD ERROR:",
            error
        );


        assignedBus.innerHTML = `
            <option value="">
                Unable to load buses
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


/* =========================================
   CREATE DRIVER
========================================= */

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        hideMessages();


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


        /* =====================================
           VALIDATION
        ===================================== */

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


        let secondaryApp =
            null;


        try {

            /* =================================
               CHECK EMAIL
            ================================= */

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
                    "This email already exists."
                );

            }


            /* =================================
               CHECK PHONE
            ================================= */

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
                    "This phone number already exists."
                );

            }


            /* =================================
               GET BUS
            ================================= */

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
                bus.active === false
            ) {

                throw new Error(
                    "Selected bus is inactive."
                );

            }


            if (
                bus.driverId
            ) {

                throw new Error(
                    "This bus is already assigned."
                );

            }


            /* =================================
               SECONDARY FIREBASE APP
            ================================= */

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


            /* =================================
               CREATE AUTH ACCOUNT
            ================================= */

            console.log(
                "Creating driver account..."
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
                "Driver UID:",
                driverUid
            );


            /* =================================
               CREATE USER DOCUMENT
            ================================= */

            await setDoc(
                doc(
                    db,
                    "users",
                    driverUid
                ),
                {

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

                }
            );


            /* =================================
               ASSIGN DRIVER TO BUS
            ================================= */

            await updateDoc(
                busReference,
                {

                    driverId:
                        driverUid,

                    updatedAt:
                        serverTimestamp()

                }
            );


            /* =================================
               SIGN OUT SECONDARY AUTH
            ================================= */

            await signOut(
                secondaryAuth
            );


            /* =================================
               SUCCESS
            ================================= */

            showSuccess(
                `${name} was created and assigned successfully.`
            );


            form.reset();


            /*
             * Reload bus list.
             */

            await loadAvailableBuses();


            /*
             * Admin remains logged in.
             */

            console.log(
                "Admin:",
                auth.currentUser?.email
            );


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
                    "Invalid email address.";

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
                    "Firebase permission denied.";

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
                        "Firebase cleanup error:",
                        cleanupError
                    );

                }

            }


            setLoading(false);

        }

    }
);


/* =========================================
   LOADING
========================================= */

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


/* =========================================
   MESSAGES
========================================= */

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
