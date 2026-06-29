document.addEventListener("DOMContentLoaded", async () => {

    const totalStudentsEl =
        document.getElementById("js-totalStudents");

    const totalAttendanceEl =
        document.getElementById("js-totalAttendance");

    const presentTodayEl =
        document.getElementById("js-presentToday");

    const attendanceRateEl =
        document.getElementById("js-attendanceRate");

    const recentAttendance =
        document.getElementById("js-recentAttendance");

    const dashboardStatus =
        document.getElementById("js-dashboardStatus");

    const logoutBtn =
        document.getElementById("js-logoutBtn");

    let attendanceChart;

    function setStatus(message, type = "info") {

        dashboardStatus.innerText = message;

        dashboardStatus.className = "message-box";

        if (type === "success") {

            dashboardStatus.classList.add("success");

        }

        if (type === "error") {

            dashboardStatus.classList.add("error");

        }

    }



    async function checkSession() {

        const response =
            await fetch("/admin/session");

        if (!response.ok) {

            window.location.href = "login.html";

            return false;

        }

        return true;

    }



    function formatDate(dateString) {

        const date = new Date(dateString);

        return date.toLocaleDateString() + " " +

            date.toLocaleTimeString([], {

                hour: "2-digit",

                minute: "2-digit"

            });

    }



    function renderRecent(records) {

        if (records.length === 0) {

            recentAttendance.innerHTML = `

                <div class="message-box">

                    No attendance records yet.

                </div>

            `;

            return;

        }



        recentAttendance.innerHTML = "";



        records.forEach(record => {

            const card =
                document.createElement("div");

            card.className = "history-item";

            card.innerHTML = `

                <div class="history-field">

                    <label>Name</label>

                    <span>${record.name}</span>

                </div>

                <div class="history-field">

                    <label>Matric No</label>

                    <span>${record.matric_no}</span>

                </div>

                <div class="history-field">

                    <label>Department</label>

                    <span>${record.department}</span>

                </div>

                <div class="history-field">

                    <label>Status</label>

                    <span class="status-badge ${record.status.toLowerCase()}">

                        ${record.status}

                    </span>

                </div>

                <div class="history-field">

                    <label>Date</label>

                    <span>${formatDate(record.date)}</span>

                </div>

            `;

            recentAttendance.appendChild(card);

        });

    }


    function drawChart(present, absent) {

    const ctx =
        document
        .getElementById("attendanceChart");

    if(attendanceChart){

        attendanceChart.destroy();

    }

    attendanceChart =
        new Chart(ctx, {

            type:"doughnut",

            data:{

                labels:[
                    "Present",
                    "Absent"
                ],

                datasets:[{

                    data:[
                        present,
                        absent
                    ],

                    backgroundColor:[
                        "#22c55e",
                        "#ef4444"
                    ]

                }]

            },

            options:{

                responsive:true,

                plugins:{

                    legend:{

                        position:"bottom"

                    }

                }

            }

        });

}

function renderActivity(records){

    const feed =
        document.getElementById("js-activityFeed");

    feed.innerHTML="";

    if(records.length===0){

        feed.innerHTML=`

            <div class="message-box">

                No recent activity.

            </div>

        `;

        return;

    }

    records.forEach(record=>{

        const item=
            document.createElement("div");

        item.className="activity-item";

        const icon=

            record.status.toLowerCase()==="present"

            ?"✅"

            :

            record.status.toLowerCase()==="late"

            ?"⏰"

            :

            "❌";

        item.innerHTML=`

            <div class="activity-icon">

                ${icon}

            </div>

            <div class="activity-content">

                <h4>${record.name}</h4>

                <p>

                    ${record.matric_no}

                    •

                    ${record.department}

                </p>

                <div class="activity-time">

                    ${record.status}

                    •

                    ${formatDate(record.date)}

                </div>

            </div>

        `;

        feed.appendChild(item);

    });

}
    async function loadDashboard() {

        try {

            setStatus("Loading dashboard...");

            const response =
                await fetch("/admin/dashboard-data");

            if (!response.ok) {

                throw new Error("Unable to load dashboard.");

            }

            const data =
                await response.json();



            totalStudentsEl.innerText =
                data.total_students;

            totalAttendanceEl.innerText =
                data.total_attendance;

            presentTodayEl.innerText =
                data.present_today;

            attendanceRateEl.innerText =
                data.attendance_rate + "%";

            drawChart(

            data.present_today,

            data.absent_today

        );

            renderRecent(data.recent_attendance);
            renderActivity(data.recent_attendance);


            setStatus(

                "Dashboard loaded successfully.",

                "success"

            );

        }

        catch (err) {

            console.error(err);

            setStatus(

                "Failed to load dashboard.",

                "error"

            );

        }

    }



    async function logout() {

        await fetch("/admin/logout", {

            method: "POST"

        });

        window.location.href = "login.html";

    }



    logoutBtn.addEventListener(

        "click",

        logout

    );



    if (await checkSession()) {

        await loadDashboard();



        setInterval(() => {

            loadDashboard();

        }, 30000);

    }

    function updateClock() {

    const now = new Date();

    document.getElementById("js-currentDate").innerText =
        now.toLocaleDateString(undefined, {

            weekday: "long",

            year: "numeric",

            month: "long",

            day: "numeric"

        });

    document.getElementById("js-currentTime").innerText =
        now.toLocaleTimeString([], {

            hour: "2-digit",

            minute: "2-digit",

            second: "2-digit"

        });

}

updateClock();

setInterval(updateClock,1000);

});