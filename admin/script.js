const splash =
    document.getElementById("splash");

const adminPage =
    document.getElementById("adminPage");

const busList =
    document.getElementById("busList");

const totalBuses =
    document.getElementById("totalBuses");

const totalDrivers =
    document.getElementById("totalDrivers");


/* =========================
   SPLASH
========================= */

setTimeout(() => {

    splash.classList.add(
        "hide"
    );

    adminPage.classList.add(
        "show"
    );

}, 2000);


/* =========================
   TEMPORARY DASHBOARD DATA
========================= */

const buses = [

    {
        id: "test-bus-1",

        number: "TEST BUS 1",

        registration:
            "KA 35 AB 1234",

        currentOdometer:
            12300,

        odometerUpdated:
            "22 Aug 2026",

        dieselLitres:
            30,

        dieselCost:
            2850,

        dieselOdometer:
            12100,

        dieselUpdated:
            "21 Aug 2026"
    },


    {
        id: "test-bus-2",

        number: "TEST BUS 2",

        registration:
            "KA 35 CD 5678",

        currentOdometer:
            12640,

        odometerUpdated:
            "22 Aug 2026",

        dieselLitres:
            32,

        dieselCost:
            3040,

        dieselOdometer:
            12450,

        dieselUpdated:
            "20 Aug 2026"
    }

];


const drivers = [
    "Test Driver 1",
    "Test Driver 2"
];


/* =========================
   COUNTERS
========================= */

totalBuses.textContent =
    buses.length;

totalDrivers.textContent =
    drivers.length;


/* =========================
   BUS CARDS
========================= */

function renderBuses() {

    busList.innerHTML = "";


    buses.forEach(
        (bus) => {

            const card =
                document.createElement(
                    "article"
                );

            card.className =
                "bus-card";


            card.innerHTML = `

                <div class="bus-top">

                    <div>

                        <div class="bus-name">
                            ${bus.number}
                        </div>

                        <div class="bus-registration">
                            ${bus.registration}
                        </div>

                    </div>

                    <a
                        href="../bus-details/?id=${bus.id}"
                        class="view-button"
                    >
                        VIEW →
                    </a>

                </div>


                <div class="bus-info">

                    <div class="info-item">

                        <span>
                            LAST ODOMETER
                        </span>

                        <strong>
                            ${bus.currentOdometer.toLocaleString("en-IN")}
                            KM
                        </strong>

                        <small>
                            ${bus.odometerUpdated}
                        </small>

                    </div>


                    <div class="info-item">

                        <span>
                            LAST DIESEL
                        </span>

                        <strong>
                            ${bus.dieselLitres} L
                        </strong>

                        <small>
                            ${bus.dieselUpdated}
                        </small>

                    </div>


                    <div class="info-item">

                        <span>
                            DIESEL DETAILS
                        </span>

                        <strong>
                            ₹${bus.dieselCost.toLocaleString("en-IN")}
                        </strong>

                        <small>
                            Odo ${bus.dieselOdometer.toLocaleString("en-IN")} KM
                        </small>

                    </div>

                </div>

            `;


            busList.appendChild(
                card
            );

        }
    );

}


renderBuses();
