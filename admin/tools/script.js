import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    updateDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "../../core/firebase.js";


const openList =
    document.getElementById("openList");

const solvedList =
    document.getElementById("solvedList");

const openCount =
    document.getElementById("openCount");

const solvedCount =
    document.getElementById("solvedCount");


let currentUser = null;


/* =========================
   AUTH
========================= */

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            window.location.href =
                "../../login/";

            return;

        }

        currentUser = user;

        try {

            await checkAdmin();

            await loadTickets();

        } catch (error) {

            console.error(error);

            showMessage(
                error.message ||
                "Unable to load Tools.",
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
            "../../login/";

        throw new Error(
            "Admin access required."
        );

    }

}


/* =========================
   LOAD TICKETS
========================= */

async function loadTickets() {

    openList.innerHTML =
        "Loading...";

    solvedList.innerHTML =
        "Loading...";


    const q =
        query(
            collection(
                db,
                "maintenanceTickets"
            ),
            orderBy(
                "createdAt",
                "desc"
            )
        );


    const snap =
        await getDocs(q);


    const tickets =
        snap.docs.map(
            item => ({
                id: item.id,
                ...item.data()
            })
        );


    const open =
        tickets.filter(
            x =>
                x.status !== "solved"
        );


    const solved =
        tickets.filter(
            x =>
                x.status === "solved"
        );


    openCount.textContent =
        open.length;

    solvedCount.textContent =
        solved.length;


    if (!open.length) {

        openList.innerHTML = `
            <div class="empty">
                No open problems.
            </div>
        `;

    } else {

        openList.innerHTML =
            open
                .map(
                    renderOpenTicket
                )
                .join("");

    }


    if (!solved.length) {

        solvedList.innerHTML = `
            <div class="empty">
                No solved problems yet.
            </div>
        `;

    } else {

        solvedList.innerHTML =
            solved
                .map(
                    renderSolvedTicket
                )
                .join("");

    }


    attachButtons();

}


/* =========================
   OPEN TICKET
========================= */

function renderOpenTicket(ticket) {

    return `

        <div class="ticket">

            <div class="ticket-top">

                <div>

                    <div class="bus">
                        ${escapeHTML(
                            ticket.busNumber ||
                            "BUS"
                        )}
                    </div>

                    <div class="driver">
                        Driver:
                        ${escapeHTML(
                            ticket.driverName ||
                            "Unknown"
                        )}
                    </div>

                </div>

                <div class="date">
                    ${formatDate(
                        ticket.createdAt
                    )}
                </div>

            </div>


            <div class="problem">

                <strong>
                    Problem
                </strong>

                <br><br>

                ${escapeHTML(
                    ticket.problem ||
                    ""
                )}

            </div>


            <span class="priority">

                PRIORITY:
                ${escapeHTML(
                    (
                        ticket.priority ||
                        "normal"
                    ).toUpperCase()
                )}

            </span>


            <div class="actions">

                <button
                    class="solve"
                    data-id="${ticket.id}"
                >
                    ✓ PROBLEM SOLVED
                </button>

                <button
                    class="keep-open"
                    disabled
                >
                    KEEP OPEN
                </button>

            </div>

        </div>

    `;

}


/* =========================
   SOLVED TICKET
========================= */

function renderSolvedTicket(ticket) {

    let repairHTML = "";


    if (
        ticket.repairSubmitted === true
    ) {

        const repairType =
            ticket.repairType === "part"
                ? "PART REPLACEMENT"
                : "SERVICE / REPAIR";


        repairHTML = `

            <div class="repair">

                <div class="repair-row">
                    <span>Repair Type</span>
                    <strong>
                        ${repairType}
                    </strong>
                </div>


                <div class="repair-row">
                    <span>Details</span>
                    <strong>
                        ${escapeHTML(
                            ticket.repairDescription ||
                            "-"
                        )}
                    </strong>
                </div>


                ${
                    ticket.repairType === "part"
                    ?
                    `
                    <div class="repair-row">
                        <span>Part</span>
                        <strong>
                            ${escapeHTML(
                                ticket.partName ||
                                "-"
                            )}
                        </strong>
                    </div>

                    <div class="repair-row">
                        <span>Part Cost</span>
                        <strong>
                            ₹${formatMoney(
                                ticket.partCost
                            )}
                        </strong>
                    </div>
                    `
                    :
                    ""
                }


                <div class="repair-row">
                    <span>Labour</span>
                    <strong>
                        ₹${formatMoney(
                            ticket.labourCost
                        )}
                    </strong>
                </div>


                <div class="total">

                    <span>
                        TOTAL
                    </span>

                    <strong>
                        ₹${formatMoney(
                            ticket.totalCost
                        )}
                    </strong>

                </div>

            </div>

        `;

    } else {

        repairHTML = `

            <div class="repair">

                <span class="priority">
                    WAITING FOR DRIVER
                    REPAIR DETAILS
                </span>

            </div>

        `;

    }


    return `

        <div class="ticket">

            <div class="ticket-top">

                <div>

                    <div class="bus">
                        ${escapeHTML(
                            ticket.busNumber ||
                            "BUS"
                        )}
                    </div>

                    <div class="driver">
                        Driver:
                        ${escapeHTML(
                            ticket.driverName ||
                            "Unknown"
                        )}
                    </div>

                </div>

                <div class="date">
                    ${formatDate(
                        ticket.createdAt
                    )}
                </div>

            </div>


            <div class="problem">

                <strong>
                    Problem
                </strong>

                <br><br>

                ${escapeHTML(
                    ticket.problem ||
                    ""
                )}

            </div>


            <span class="solved-badge">
                ✓ PROBLEM SOLVED
            </span>


            ${repairHTML}

        </div>

    `;

}


/* =========================
   SOLVE BUTTONS
========================= */

function attachButtons() {

    document
        .querySelectorAll(".solve")
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const id =
                        button.dataset.id;


                    const confirmed =
                        confirm(
                            "Mark this problem as solved?"
                        );


                    if (!confirmed) {
                        return;
                    }


                    try {

                        button.disabled =
                            true;

                        button.textContent =
                            "SAVING...";


                        const ref =
                            doc(
                                db,
                                "maintenanceTickets",
                                id
                            );


                        await updateDoc(
                            ref,
                            {

                                status:
                                    "solved",

                                solvedByAdmin:
                                    currentUser.uid,

                                solvedAt:
                                    serverTimestamp(),

                                repairSubmitted:
                                    false

                            }
                        );


                        showMessage(
                            "Problem marked as solved."
                        );


                        await loadTickets();


                    } catch (error) {

                        console.error(
                            error
                        );

                        showMessage(
                            "Unable to update problem.",
                            true
                        );

                    }

                }
            );

        });

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


function formatMoney(value) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-IN"
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

    box.textContent =
        text;

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
        3000
    );

}
