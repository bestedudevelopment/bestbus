import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    auth,
    db
} from "../core/firebase.js";

import {
    getUserProfile
} from "../core/auth.js";


const form =
    document.getElementById("driverForm");

const driverName =
    document.getElementById("driverName");

const driverPhone =
    document.getElementById("driverPhone");

const driverEmail =
    document.getElementById("driverEmail");

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


/* =========================
   AUTH
========================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "../login/";

            return;
        }

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

            loadAvailableBuses();

        } catch (error) {

            console.error(error);

            showError(
                "Unable to verify admin account."
            );
        }
    }
);


/* =========================
   BACK
========================= */

backButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../drivers/";

    }
);


/* =========================
   LOAD BUSES
========================= */

async function loadAvailableBuses() {

    try {

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


        if (snapshot.empty) {

            assignedBus.innerHTML = `
                <option value="">
                    No active buses available
                </option>
            `;

            return;
        }


        for (
            const busDoc
            of snapshot.docs
        ) {

            const bus =
                busDoc.data();


            /*
             * Only show buses which
             * currently have no driver.
             */

            if (
                bus.driverId
            ) {

                continue;
            }


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                busDoc.id;


            option.textContent =
                `${bus.busNumber || "BUS"} — ${
                    bus.registrationNumber || "No registration"
                }`;


            assignedBus.appendChild(
                option
            );
        }


    } catch (error) {

        console.error(
            "Bus loading error:",
            error
        );

        showError(
            "Unable to load available buses."
        );
    }
}


/* =========================
   FORM
========================= */

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
            driverEmail.value.trim();

        const license =
            licenseNumber.value.trim();

        const busId =
            assignedBus.value;


        /* VALIDATION */

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


        if (!busId) {

            showError(
                "Please select a bus."
            );

            assignedBus.focus();

            return;
        }


        setLoading(true);


        try {

            /* =====================
               PHONE DUPLICATE
            ===================== */

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
                    ),
                    where(
                        "role",
                        "==",
                        "driver"
                    )
                );


            const phoneSnapshot =
                await getDocs(
                    phoneQuery
                );


            if (
                !phoneSnapshot.empty
            ) {

                showError(
                    "A driver with this phone number already exists."
                );

                setLoading(false);

                return;
            }


            /* =====================
               CHECK BUS AGAIN
            ===================== */

            const busReference =
                doc(
                    db,
                    "buses",
                    busId
                );


            const busSnapshot =
                await getDocs(
                    query(
                        collection(
                            db,
                            "buses"
                        ),
                        where(
                            "__name__",
                            "==",
                            busId
                        )
                    )
                );


            if (
                busSnapshot.empty
            ) {

                showError(
                    "Selected bus no longer exists."
                );

                setLoading(false);

                return;
            }


            const bus =
                busSnapshot.docs[0].data();


            if (
                bus.driverId
            ) {

                showError(
                    "This bus has already been assigned to another driver."
                );

                setLoading(false);

                await loadAvailableBuses();

                return;
            }


            /* =====================
               CREATE DRIVER PROFILE
            ===================== */

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


            const driverReference =
                await addDoc(
                    collection(
                        db,
                        "users"
                    ),
                    driverData
                );


            /* =====================
               UPDATE BUS
            ===================== */

            await updateDoc(
                busReference,
                {
                    driverId:
                        driverReference.id,

                    updatedAt:
                        serverTimestamp()
                }
            );


            console.log(
                "Driver created:",
                driverReference.id
            );


            showSuccess(
                `${name} has been assigned to ${
                    bus.busNumber || "the selected bus"
                }.`
            );


            setTimeout(
                () => {

                    window.location.href =
                        "../drivers/";

                },
                1000
            );


        } catch (error) {

            console.error(
                "Create driver error:",
                error
            );

            showError(
                error.message ||
                "Unable to create driver."
            );

        } finally {

            setLoading(false);
        }

    }
);


/* =========================
   UI HELPERS
========================= */

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
}


function showSuccess(
    message
) {

    successMessage.textContent =
        message;

    successMessage.classList.remove(
        "hidden"
    );
}
