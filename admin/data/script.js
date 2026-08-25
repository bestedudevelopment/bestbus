import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "../../core/firebase.js";


/* =========================================
   ELEMENTS
========================================= */

const collectionSelect =
    document.getElementById(
        "collectionSelect"
    );

const loadDocumentsButton =
    document.getElementById(
        "loadDocuments"
    );

const documentsSection =
    document.getElementById(
        "documentsSection"
    );

const documentsList =
    document.getElementById(
        "documentsList"
    );

const documentCount =
    document.getElementById(
        "documentCount"
    );

const searchInput =
    document.getElementById(
        "searchInput"
    );

const editorSection =
    document.getElementById(
        "editorSection"
    );

const editorTitle =
    document.getElementById(
        "editorTitle"
    );

const documentId =
    document.getElementById(
        "documentId"
    );

const fieldsContainer =
    document.getElementById(
        "fieldsContainer"
    );

const saveButton =
    document.getElementById(
        "saveButton"
    );

const cancelButton =
    document.getElementById(
        "cancelButton"
    );

const message =
    document.getElementById(
        "message"
    );


/* =========================================
   STATE
========================================= */

let currentUser = null;

let currentCollection = "";

let documents = [];

let selectedDocument = null;


/* =========================================
   AUTH
========================================= */

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

        } catch (error) {

            console.error(error);

            showMessage(
                error.message,
                true
            );

        }

    }
);


/* =========================================
   ADMIN CHECK
========================================= */

async function checkAdmin() {

    const userRef =
        doc(
            db,
            "users",
            currentUser.uid
        );

    const snap =
        await getDoc(
            userRef
        );


    if (!snap.exists()) {

        throw new Error(
            "Admin profile not found."
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


/* =========================================
   LOAD COLLECTION
========================================= */

loadDocumentsButton.addEventListener(
    "click",
    loadCollection
);


async function loadCollection() {

    currentCollection =
        collectionSelect.value;


    if (!currentCollection) {

        showMessage(
            "Select a collection first.",
            true
        );

        return;

    }


    documentsList.innerHTML =
        `<div class="empty">Loading...</div>`;


    documentsSection.classList.remove(
        "hidden"
    );


    editorSection.classList.add(
        "hidden"
    );


    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    currentCollection
                )
            );


        documents =
            snapshot.docs.map(
                item => ({

                    id:
                        item.id,

                    ...item.data()

                })
            );


        documentCount.textContent =
            `${documents.length} records`;


        renderDocuments(
            documents
        );


    } catch (error) {

        console.error(
            error
        );


        documentsList.innerHTML =
            `<div class="empty">
                Unable to load data.
            </div>`;


        showMessage(
            error.message,
            true
        );

    }

}


/* =========================================
   RENDER DOCUMENTS
========================================= */

function renderDocuments(
    list
) {

    if (!list.length) {

        documentsList.innerHTML =
            `<div class="empty">
                No records found.
            </div>`;

        return;

    }


    documentsList.innerHTML =
        list
            .map(
                renderDocument
            )
            .join("");


    document
        .querySelectorAll(
            ".document-item"
        )
        .forEach(item => {

            item.addEventListener(
                "click",
                () => {

                    const id =
                        item.dataset.id;

                    const selected =
                        documents.find(
                            x =>
                                x.id === id
                        );


                    openEditor(
                        selected
                    );

                }
            );

        });

}


/* =========================================
   DOCUMENT CARD
========================================= */

function renderDocument(
    item
) {

    const title =
        getDisplayTitle(
            item
        );


    const subtitle =
        getDisplaySubtitle(
            item
        );


    return `

        <div
            class="document-item"
            data-id="${escapeHTML(
                item.id
            )}"
        >

            <div class="document-main">

                <div class="document-title">
                    ${escapeHTML(
                        title
                    )}
                </div>

                <div class="document-subtitle">
                    ${escapeHTML(
                        subtitle
                    )}
                </div>

            </div>

            <div class="document-arrow">
                →
            </div>

        </div>

    `;

}


/* =========================================
   SEARCH
========================================= */

searchInput.addEventListener(
    "input",
    () => {

        const text =
            searchInput.value
                .trim()
                .toLowerCase();


        if (!text) {

            renderDocuments(
                documents
            );

            return;

        }


        const filtered =
            documents.filter(
                item =>
                    JSON.stringify(
                        item
                    )
                    .toLowerCase()
                    .includes(text)
            );


        renderDocuments(
            filtered
        );

    }
);


/* =========================================
   OPEN EDITOR
========================================= */

function openEditor(
    item
) {

    if (!item) {
        return;
    }


    selectedDocument =
        item;


    editorSection.classList.remove(
        "hidden"
    );


    editorTitle.textContent =
        getDisplayTitle(
            item
        );


    documentId.textContent =
        item.id;


    fieldsContainer.innerHTML =
        "";


    Object
        .entries(item)
        .forEach(
            ([key, value]) => {

                /*
                 * Firestore document ID
                 * cannot be edited here.
                 */

                if (key === "id") {
                    return;
                }


                fieldsContainer.appendChild(
                    createField(
                        key,
                        value
                    )
                );

            }
        );


    editorSection.scrollIntoView({
        behavior: "smooth"
    });

}


/* =========================================
   CREATE FIELD
========================================= */

function createField(
    key,
    value
) {

    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "field";


    const label =
        document.createElement(
            "label"
        );


    label.textContent =
        formatFieldName(
            key
        );


    wrapper.appendChild(
        label
    );


    /*
     * Timestamp
     */

    if (
        value &&
        typeof value === "object" &&
        typeof value.toDate ===
            "function"
    ) {

        const input =
            document.createElement(
                "input"
            );


        input.type =
            "text";

        input.value =
            value
                .toDate()
                .toLocaleString(
                    "en-IN"
                );

        input.disabled =
            true;

        input.className =
            "readonly";

        input.dataset.field =
            key;

        input.dataset.type =
            "timestamp";


        wrapper.appendChild(
            input
        );


        return wrapper;

    }


    /*
     * Boolean
     */

    if (
        typeof value ===
        "boolean"
    ) {

        const select =
            document.createElement(
                "select"
            );


        select.dataset.field =
            key;

        select.dataset.type =
            "boolean";


        select.innerHTML = `

            <option value="true"
                ${value ? "selected" : ""}>
                TRUE
            </option>

            <option value="false"
                ${!value ? "selected" : ""}>
                FALSE
            </option>

        `;


        wrapper.appendChild(
            select
        );


        return wrapper;

    }


    /*
     * Number
     */

    if (
        typeof value ===
        "number"
    ) {

        const input =
            document.createElement(
                "input"
            );


        input.type =
            "number";

        input.value =
            value;

        input.dataset.field =
            key;

        input.dataset.type =
            "number";


        wrapper.appendChild(
            input
        );


        return wrapper;

    }


    /*
     * Objects / arrays
     */

    if (
        typeof value ===
            "object" &&
        value !== null
    ) {

        const textarea =
            document.createElement(
                "textarea"
            );


        textarea.value =
            JSON.stringify(
                value,
                null,
                2
            );


        textarea.dataset.field =
            key;

        textarea.dataset.type =
            "json";


        wrapper.appendChild(
            textarea
        );


        return wrapper;

    }


    /*
     * Normal text
     */

    const input =
        document.createElement(
            "input"
        );


    input.type =
        "text";

    input.value =
        value ?? "";

    input.dataset.field =
        key;

    input.dataset.type =
        "string";


    /*
     * Prevent editing sensitive
     * identity fields accidentally.
     */

    if (
        key === "uid" ||
        key === "createdAt"
    ) {

        input.disabled =
            true;

        input.className =
            "readonly";

    }


    wrapper.appendChild(
        input
    );


    return wrapper;

}


/* =========================================
   SAVE
========================================= */

saveButton.addEventListener(
    "click",
    saveChanges
);


async function saveChanges() {

    if (
        !selectedDocument ||
        !currentCollection
    ) {

        return;

    }


    const confirmed =
        confirm(
            "Save these changes to Firestore?"
        );


    if (!confirmed) {
        return;
    }


    const updates = {};


    const fields =
        fieldsContainer
            .querySelectorAll(
                "[data-field]"
            );


    try {

        fields.forEach(
            field => {

                if (
                    field.disabled
                ) {

                    return;

                }


                const key =
                    field.dataset.field;

                const type =
                    field.dataset.type;


                let value;


                if (
                    type === "number"
                ) {

                    value =
                        Number(
                            field.value
                        );

                } else if (
                    type === "boolean"
                ) {

                    value =
                        field.value ===
                        "true";

                } else if (
                    type === "json"
                ) {

                    value =
                        JSON.parse(
                            field.value
                        );

                } else {

                    value =
                        field.value;

                }


                updates[key] =
                    value;

            }
        );


        saveButton.disabled =
            true;

        saveButton.textContent =
            "SAVING...";


        const ref =
            doc(
                db,
                currentCollection,
                selectedDocument.id
            );


        await updateDoc(
            ref,
            updates
        );


        showMessage(
            "Changes saved successfully."
        );


        /*
         * Update local copy
         */

        selectedDocument =
            {
                ...selectedDocument,
                ...updates
            };


        documents =
            documents.map(
                item =>
                    item.id ===
                    selectedDocument.id
                        ?
                    selectedDocument
                        :
                    item
            );


        renderDocuments(
            documents
        );


    } catch (error) {

        console.error(
            "SAVE ERROR:",
            error
        );


        showMessage(
            "Unable to save changes: " +
            error.message,
            true
        );

    }


    saveButton.disabled =
        false;

    saveButton.textContent =
        "SAVE CHANGES";

}


/* =========================================
   CANCEL
========================================= */

cancelButton.addEventListener(
    "click",
    () => {

        editorSection.classList.add(
            "hidden"
        );

        selectedDocument =
            null;

    }
);


/* =========================================
   BACK
========================================= */

document
    .getElementById("backButton")
    .addEventListener(
        "click",
        () => {

            window.location.href =
                "../";

        }
    );


/* =========================================
   LOGOUT
========================================= */

document
    .getElementById("logoutButton")
    .addEventListener(
        "click",
        async () => {

            await signOut(
                auth
            );

            window.location.href =
                "../../login/";

        }
    );


/* =========================================
   DISPLAY HELPERS
========================================= */

function getDisplayTitle(
    item
) {

    return (
        item.name ||
        item.busNumber ||
        item.number ||
        item.driverName ||
        item.problem ||
        item.title ||
        item.id
    );

}


function getDisplaySubtitle(
    item
) {

    if (
        item.phone
    ) {

        return item.phone;

    }


    if (
        item.registrationNumber
    ) {

        return item.registrationNumber;

    }


    if (
        item.problem
    ) {

        return item.problem;

    }


    if (
        item.busId
    ) {

        return `Bus ID: ${item.busId}`;

    }


    return `ID: ${item.id}`;

}


function formatFieldName(
    key
) {

    return key
        .replace(
            /([A-Z])/g,
            " $1"
        )
        .replace(
            /^./,
            x =>
                x.toUpperCase()
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
    error = false
) {

    message.textContent =
        text;

    message.className =
        "message" +
        (
            error
                ? " error"
                : " success"
        );

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
