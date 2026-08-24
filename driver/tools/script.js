import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "../../core/firebase.js";



/* ============================================
   ELEMENTS
============================================ */

const driverName =
    document.getElementById(
        "driverName"
    );

const busName =
    document.getElementById(
        "busName"
    );

const busRegistration =
    document.getElementById(
        "busRegistration"
    );

const problem =
    document.getElementById(
        "problem"
    );

const characterCount =
    document.getElementById(
        "characterCount"
    );

const submitButton =
    document.getElementById(
        "submitButton"
    );

const reportsList =
    document.getElementById(
        "reportsList"
    );

const logoutButton =
    document.getElementById(
        "logoutButton"
    );

const backButton =
    document.getElementById(
        "backButton"
    );

const message =
    document.getElementById(
        "message"
    );



/* ============================================
   STATE
============================================ */

let currentUser = null;

let currentDriver = null;

let currentBus = null;

let selectedType =
    "service";

let selectedPriority =
    "normal";



/* ============================================
   AUTH
============================================ */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "../../login/";

            return;

        }


        currentUser =
            user;


        try {

            await loadDriver();

            await loadAssignedBus();

            await loadReports();

        } catch (error) {

            console.error(
                "TOOLS ERROR:",
                error
            );


            showMessage(
                error.message ||
                "Unable to load tools.",
                "error"
            );

        }

    }
);



/* ============================================
   LOAD DRIVER
============================================ */

async function loadDriver() {

    /*
     * EXACT STRUCTURE FROM YOUR FIRESTORE:
     *
     * users/{uid}
     *
     * name
     * phone
     * role
     * status
     * assignedBusId
     */


    const userRef =
        doc(
            db,
            "users",
            currentUser.uid
        );


    const userSnap =
        await getDoc(
            userRef
        );


    if (
        !userSnap.exists()
    ) {

        throw new Error(
            "Driver account was not found."
        );

    }


    const data =
        userSnap.data();


    /*
     * ROLE CHECK
     */

    if (
        data.role !==
        "driver"
    ) {

        await signOut(
            auth
        );


        window.location.href =
            "../../login/";


        throw new Error(
            "Only driver accounts can access Tools."
        );

    }


    /*
     * APPROVAL CHECK
     */

    if (
        data.status &&
        data.status !==
        "approved"
    ) {

        await signOut(
            auth
        );


        window.location.href =
            "../../login/";


        throw new Error(
            "Your driver account is not approved."
        );

    }


    /*
     * DRIVER DATA
     */

    currentDriver = {

        id:
            userSnap.id,

        uid:
            currentUser.uid,

        ...data

    };


    driverName.textContent =
        currentDriver.name ||
        "Driver";

}



/* ============================================
   LOAD ASSIGNED BUS
============================================ */

async function loadAssignedBus() {

    /*
     * THIS IS THE IMPORTANT PART.
     *
     * Firestore screenshot shows:
     *
     * users/{uid}
     * assignedBusId: "5VK..."
     *
     * So we directly open:
     *
     * buses/{assignedBusId}
     */


    const assignedBusId =
        currentDriver.assignedBusId;


    if (
        !assignedBusId
    ) {

        throw new Error(
            "No bus is assigned to your account."
        );

    }


    const busRef =
        doc(
            db,
            "buses",
            assignedBusId
        );


    const busSnap =
        await getDoc(
            busRef
        );


    if (
        !busSnap.exists()
    ) {

        throw new Error(
            "Your assigned bus could not be found."
        );

    }


    currentBus = {

        id:
            busSnap.id,

        ...busSnap.data()

    };


    /*
     * We display only this bus.
     *
     * No dropdown.
     * No bus selection.
     */


    busName.textContent =
        currentBus.name ||
        currentBus.busNumber ||
        currentBus.number ||
        "Assigned Bus";


    busRegistration.textContent =
        currentBus.registrationNumber ||
        currentBus.registrationNo ||
        currentBus.registration ||
        "--";

}



/* ============================================
   PROBLEM TYPE
============================================ */

document
    .querySelectorAll(
        ".type-option"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".type-option"
                        )
                        .forEach(
                            item =>
                                item.classList.remove(
                                    "active"
                                )
                        );


                    button.classList.add(
                        "active"
                    );


                    selectedType =
                        button.dataset.type;

                }
            );

        }
    );



/* ============================================
   PRIORITY
============================================ */

document
    .querySelectorAll(
        ".priority-option"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".priority-option"
                        )
                        .forEach(
                            item =>
                                item.classList.remove(
                                    "active"
                                )
                        );


                    button.classList.add(
                        "active"
                    );


                    selectedPriority =
                        button.dataset.priority;

                }
            );

        }
    );



/* ============================================
   CHARACTER COUNT
============================================ */

problem.addEventListener(
    "input",
    () => {

        characterCount.textContent =
            problem.value.length;

    }
);



/* ============================================
   SUBMIT
============================================ */

submitButton.addEventListener(
    "click",
    async () => {

        const description =
            problem.value.trim();


        if (
            !description
        ) {

            showMessage(
                "Please describe the problem.",
                "error"
            );

            problem.focus();

            return;

        }


        if (
            !currentDriver ||
            !currentBus
        ) {

            showMessage(
                "Driver or bus information is not ready.",
                "error"
            );

            return;

        }


        submitButton.disabled =
            true;

        submitButton.textContent =
            "SUBMITTING...";


        try {

            /*
             * NEW COLLECTION:
             *
             * maintenanceTickets
             */


            await addDoc(

                collection(
                    db,
                    "maintenanceTickets"
                ),

                {

                    /* DRIVER */

                    driverUid:
                        currentUser.uid,

                    driverId:
                        currentDriver.id,

                    driverName:
                        currentDriver.name ||
                        "",


                    /* BUS */

                    busId:
                        currentBus.id,

                    busNumber:
                        currentBus.busNumber ||
                        currentBus.name ||
                        currentBus.number ||
                        "",

                    busRegistration:
                        currentBus.registrationNumber ||
                        currentBus.registrationNo ||
                        currentBus.registration ||
                        "",


                    /* PROBLEM */

                    problem:
                        description,

                    problemType:
                        selectedType,

                    priority:
                        selectedPriority,


                    /* STATUS */

                    status:
                        "reported",


                    /* TIME */

                    reportedAt:
                        serverTimestamp(),

                    createdAt:
                        serverTimestamp()

                }

            );


            /*
             * CLEAR FORM
             */

            problem.value =
                "";

            characterCount.textContent =
                "0";


            showMessage(
                "Problem reported successfully.",
                "success"
            );


            await loadReports();


        } catch (error) {

            console.error(
                "SUBMIT ERROR:",
                error
            );


            showMessage(
                "Unable to submit the problem.",
                "error"
            );

        }


        submitButton.disabled =
            false;

        submitButton.textContent =
            "SUBMIT PROBLEM";

    }
);



/* ============================================
   LOAD DRIVER REPORTS
============================================ */

async function loadReports() {

    if (
        !currentUser
    ) {

        return;

    }


    reportsList.innerHTML =
        "Loading...";


    try {

        const reportsQuery =
            query(

                collection(
                    db,
                    "maintenanceTickets"
                ),

                where(
                    "driverUid",
                    "==",
                    currentUser.uid
                )

            );


        const snapshot =
            await getDocs(
                reportsQuery
            );


        const reports =
            snapshot.docs
                .map(
                    item => ({

                        id:
                            item.id,

                        ...item.data()

                    })
                )
                .sort(
                    (a, b) => {

                        const aTime =
                            a.createdAt?.seconds ||
                            0;

                        const bTime =
                            b.createdAt?.seconds ||
                            0;

                        return bTime - aTime;

                    }
                );


        if (
            reports.length === 0
        ) {

            reportsList.innerHTML = `
                <div class="empty">
                    You have not reported
                    any problems yet.
                </div>
            `;

            return;

        }


        reportsList.innerHTML =
            reports
                .slice(
                    0,
                    10
                )
                .map(
                    createReportCard
                )
                .join("");


    } catch (error) {

        console.error(
            "REPORT LOAD ERROR:",
            error
        );


        reportsList.innerHTML = `
            <div class="empty">
                Unable to load reports.
            </div>
        `;

    }

}



/* ============================================
   REPORT CARD
============================================ */

function createReportCard(
    report
) {

    const type =
        report.problemType ===
        "part"
            ?
        "PART REPLACEMENT"
            :
        "SERVICE / REPAIR";


    const status =
        String(
            report.status ||
            "reported"
        )
        .replace(
            /_/g,
            " "
        )
        .toUpperCase();


    return `

        <div class="report">

            <div class="report-top">

                <span class="report-type">
                    ${type}
                </span>

                <span class="report-date">
                    ${formatTimestamp(
                        report.createdAt
                    )}
                </span>

            </div>


            <div class="report-problem">
                ${escapeHTML(
                    report.problem ||
                    ""
                )}
            </div>


            <span class="report-status">
                ${status}
            </span>

        </div>

    `;

}



/* ============================================
   BACK
============================================ */

backButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "../";

    }
);



/* ============================================
   LOGOUT
============================================ */

logoutButton.addEventListener(
    "click",
    async () => {

        try {

            await signOut(
                auth
            );


            window.location.href =
                "../../login/";

        } catch (error) {

            showMessage(
                "Unable to log out.",
                "error"
            );

        }

    }
);



/* ============================================
   HELPERS
============================================ */

function formatTimestamp(
    timestamp
) {

    if (
        !timestamp ||
        !timestamp.toDate
    ) {

        return "JUST NOW";

    }


    const date =
        timestamp.toDate();


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

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
    type = ""
) {

    message.textContent =
        text;

    message.className =
        `message ${type}`;

    message.classList.remove(
        "hidden"
    );


    clearTimeout(
        window.messageTimer
    );


    window.messageTimer =
        setTimeout(
            () => {

                message.classList.add(
                    "hidden"
                );

            },
            3500
        );

}
