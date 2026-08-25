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
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "../../core/firebase.js";


let currentUser = null;
let currentDriver = null;
let currentBus = null;

let selectedType = "service";
let selectedPriority = "normal";
let selectedRepairType = "service";

let selectedRepairTicket = null;


const driverName =
    document.getElementById("driverName");

const busName =
    document.getElementById("busName");

const busNumber =
    document.getElementById("busNumber");

const problem =
    document.getElementById("problem");

const reportsList =
    document.getElementById("reportsList");

const repairSection =
    document.getElementById("repairSection");

const repairTicketInfo =
    document.getElementById("repairTicketInfo");

const repairDescription =
    document.getElementById("repairDescription");

const partFields =
    document.getElementById("partFields");

const partName =
    document.getElementById("partName");

const partCost =
    document.getElementById("partCost");

const labourCost =
    document.getElementById("labourCost");

const totalCost =
    document.getElementById("totalCost");


/* =========================
   LOGIN
========================= */

onAuthStateChanged(auth, async user => {

    if (!user) {

        window.location.href =
            "../../login/";

        return;
    }

    currentUser = user;

    try {

        await loadDriver();
        await loadBus();
        await loadReports();

    } catch (error) {

        console.error(error);

        showMessage(
            error.message ||
            "Unable to load Tools.",
            true
        );

    }

});


/* =========================
   DRIVER
========================= */

async function loadDriver() {

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
            "Driver account not found."
        );

    }

    const data = snap.data();

    if (data.role !== "driver") {

        await signOut(auth);

        throw new Error(
            "Driver access required."
        );

    }

    if (
        data.status &&
        data.status !== "approved"
    ) {

        await signOut(auth);

        throw new Error(
            "Driver account is not approved."
        );

    }

    currentDriver = {
        id: snap.id,
        ...data
    };

    driverName.textContent =
        data.name || "Driver";

}


/* =========================
   BUS
========================= */

async function loadBus() {

    const busId =
        currentDriver.assignedBusId;

    if (!busId) {

        throw new Error(
            "No bus is assigned to you."
        );

    }

    const ref =
        doc(
            db,
            "buses",
            busId
        );

    const snap =
        await getDoc(ref);

    if (!snap.exists()) {

        throw new Error(
            "Assigned bus was not found."
        );

    }

    currentBus = {
        id: snap.id,
        ...snap.data()
    };

    busName.textContent =
        currentBus.name ||
        currentBus.busNumber ||
        currentBus.number ||
        "Assigned Bus";

    busNumber.textContent =
        currentBus.registrationNumber ||
        currentBus.registrationNo ||
        currentBus.registration ||
        "";

}


/* =========================
   PROBLEM TYPE
========================= */

document
    .querySelectorAll(".choice")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(".choice")
                    .forEach(x =>
                        x.classList.remove("active")
                    );

                button.classList.add("active");

                selectedType =
                    button.dataset.type;

            }
        );

    });


/* =========================
   PRIORITY
========================= */

document
    .querySelectorAll(".priority button")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".priority button"
                    )
                    .forEach(x =>
                        x.classList.remove("active")
                    );

                button.classList.add("active");

                selectedPriority =
                    button.dataset.priority;

            }
        );

    });


/* =========================
   SUBMIT PROBLEM
========================= */

document
    .getElementById("submitProblem")
    .addEventListener(
        "click",
        submitProblem
    );


async function submitProblem() {

    const text =
        problem.value.trim();

    if (!text) {

        showMessage(
            "Enter the problem first.",
            true
        );

        return;
    }

    try {

        const button =
            document.getElementById(
                "submitProblem"
            );

        button.disabled = true;

        button.textContent =
            "SUBMITTING...";


        await addDoc(

            collection(
                db,
                "maintenanceTickets"
            ),

            {

                driverUid:
                    currentUser.uid,

                driverId:
                    currentDriver.id,

                driverName:
                    currentDriver.name || "",


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


                problem:
                    text,

                problemType:
                    selectedType,

                priority:
                    selectedPriority,


                status:
                    "reported",

                repairSubmitted:
                    false,


                reportedAt:
                    serverTimestamp(),

                createdAt:
                    serverTimestamp()

            }

        );


        problem.value = "";

        showMessage(
            "Problem reported successfully."
        );

        await loadReports();


    } catch (error) {

        console.error(error);

        showMessage(
            "Unable to submit problem.",
            true
        );

    }


    document.getElementById(
        "submitProblem"
    ).disabled = false;

    document.getElementById(
        "submitProblem"
    ).textContent =
        "SUBMIT PROBLEM";

}


/* =========================
   LOAD REPORTS
========================= */

async function loadReports() {

    reportsList.innerHTML =
        "Loading...";


    const q =
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


    const snap =
        await getDocs(q);


    const reports =
        snap.docs
            .map(x => ({
                id: x.id,
                ...x.data()
            }))
            .sort(
                (a, b) =>
                    getSeconds(b.createdAt) -
                    getSeconds(a.createdAt)
            );


    if (!reports.length) {

        reportsList.innerHTML = `
            <div class="ticket">
                No problems reported yet.
            </div>
        `;

        return;

    }


    reportsList.innerHTML =
        reports
            .map(renderTicket)
            .join("");


    /*
     * Find first solved ticket
     * that still needs repair details.
     */

    const pendingRepair =
        reports.find(
            x =>
                x.status === "solved" &&
                x.repairSubmitted !== true
        );


    if (pendingRepair) {

        openRepairForm(
            pendingRepair
        );

    } else {

        repairSection.classList.add(
            "hidden"
        );

    }

}


/* =========================
   TICKET
========================= */

function renderTicket(ticket) {

    const status =
        ticket.status || "reported";

    const label =
        status === "solved"
            ? "PROBLEM SOLVED"
            : "WAITING FOR ADMIN";


    return `

        <div class="ticket">

            <div class="ticket-head">

                <span class="ticket-title">
                    ${escapeHTML(
                        ticket.busNumber ||
                        "Assigned Bus"
                    )}
                </span>

                <span class="ticket-date">
                    ${formatDate(
                        ticket.createdAt
                    )}
                </span>

            </div>

            <div class="ticket-problem">
                ${escapeHTML(
                    ticket.problem || ""
                )}
            </div>

            <span class="status ${status}">
                ${label}
            </span>

        </div>

    `;

}


/* =========================
   OPEN REPAIR FORM
========================= */

function openRepairForm(ticket) {

    selectedRepairTicket =
        ticket;


    repairSection.classList.remove(
        "hidden"
    );


    repairTicketInfo.innerHTML = `

        <div class="repair-info">

            <strong>
                ${escapeHTML(
                    ticket.busNumber ||
                    "Bus"
                )}
            </strong>

            <br><br>

            Problem:

            <br>

            ${escapeHTML(
                ticket.problem || ""
            )}

            <br><br>

            Admin has marked this
            problem as solved.

        </div>

    `;

}


/* =========================
   REPAIR TYPE
========================= */

document
    .querySelectorAll(
        ".repair-choice"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".repair-choice"
                    )
                    .forEach(x =>
                        x.classList.remove(
                            "active"
                        )
                    );

                button.classList.add(
                    "active"
                );

                selectedRepairType =
                    button.dataset.repair;


                if (
                    selectedRepairType ===
                    "part"
                ) {

                    partFields.classList.remove(
                        "hidden"
                    );

                } else {

                    partFields.classList.add(
                        "hidden"
                    );

                    partName.value = "";
                    partCost.value = "0";

                }

                calculateTotal();

            }
        );

    });


/* =========================
   COST CALCULATION
========================= */

partCost.addEventListener(
    "input",
    calculateTotal
);

labourCost.addEventListener(
    "input",
    calculateTotal
);


function calculateTotal() {

    const part =
        selectedRepairType === "part"
            ? Number(partCost.value || 0)
            : 0;

    const labour =
        Number(
            labourCost.value || 0
        );


    const total =
        part + labour;


    totalCost.textContent =
        "₹" +
        total.toLocaleString("en-IN");

}


/* =========================
   SUBMIT REPAIR
========================= */

document
    .getElementById("submitRepair")
    .addEventListener(
        "click",
        submitRepair
    );


async function submitRepair() {

    if (!selectedRepairTicket) {

        return;

    }


    const description =
        repairDescription.value.trim();


    if (!description) {

        showMessage(
            "Enter the repair details.",
            true
        );

        return;

    }


    if (
        selectedRepairType === "part" &&
        !partName.value.trim()
    ) {

        showMessage(
            "Enter the part replaced.",
            true
        );

        return;

    }


    const part =
        selectedRepairType === "part"
            ? Number(partCost.value || 0)
            : 0;


    const labour =
        Number(
            labourCost.value || 0
        );


    const total =
        part + labour;


    try {

        const button =
            document.getElementById(
                "submitRepair"
            );

        button.disabled = true;

        button.textContent =
            "SAVING...";


        const ticketRef =
            doc(
                db,
                "maintenanceTickets",
                selectedRepairTicket.id
            );


        await updateDoc(
            ticketRef,
            {

                repairType:
                    selectedRepairType,

                repairDescription:
                    description,


                partReplaced:
                    selectedRepairType ===
                    "part",

                partName:
                    selectedRepairType ===
                    "part"
                        ? partName.value.trim()
                        : "",

                partCost:
                    part,

                labourCost:
                    labour,

                totalCost:
                    total,


                repairSubmitted:
                    true,

                repairSubmittedBy:
                    currentUser.uid,

                repairSubmittedAt:
                    serverTimestamp()

            }
        );


        showMessage(
            "Repair details saved."
        );


        repairSection.classList.add(
            "hidden"
        );


        selectedRepairTicket =
            null;


        await loadReports();


    } catch (error) {

        console.error(error);

        showMessage(
            "Unable to save repair details.",
            true
        );

    }


    document.getElementById(
        "submitRepair"
    ).disabled = false;

    document.getElementById(
        "submitRepair"
    ).textContent =
        "SUBMIT REPAIR DETAILS";

}


/* =========================
   BACK
========================= */

document
    .getElementById("backButton")
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
    .getElementById("logoutButton")
    .addEventListener(
        "click",
        async () => {

            await signOut(auth);

            window.location.href =
                "../../login/";

        }
    );


/* =========================
   HELPERS
========================= */

function getSeconds(timestamp) {

    return timestamp?.seconds || 0;

}


function formatDate(timestamp) {

    if (!timestamp?.toDate) {

        return "JUST NOW";

    }

    return timestamp
        .toDate()
        .toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

}


function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function showMessage(
    text,
    error = false
) {

    const box =
        document.getElementById(
            "message"
        );

    box.textContent = text;

    box.className =
        "message" +
        (error ? " error" : "");

    box.classList.remove(
        "hidden"
    );

    setTimeout(
        () => {
            box.classList.add(
                "hidden"
            );
        },
        3500
    );

}
