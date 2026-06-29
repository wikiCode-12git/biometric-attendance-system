console.log("REPORT.JS LOADED");

document.addEventListener("DOMContentLoaded", function () {

    console.log("DOM Ready");

    // ==========================
    // GET HTML ELEMENTS
    // ==========================

    const statusBox = document.getElementById("js-summaryStatus");
    const searchInput = document.getElementById("js-searchSummary");
    const totalStudentsEl = document.getElementById("js-totalStudents");
    const presentTodayEl = document.getElementById("js-presentToday");
    const attendanceRateEl = document.getElementById("js-attendanceRate");
    const summaryList = document.getElementById("js-summaryList");

    console.log(statusBox);
    console.log(searchInput);
    console.log(totalStudentsEl);
    console.log(presentTodayEl);
    console.log(attendanceRateEl);
    console.log(summaryList);

    let allStudents = [];

    // ==========================
    // STATUS MESSAGE
    // ==========================

    function setStatus(message, type = "info") {

        statusBox.innerText = message;

        statusBox.classList.remove("success");
        statusBox.classList.remove("error");

        if (type === "success") {
            statusBox.classList.add("success");
        }

        if (type === "error") {
            statusBox.classList.add("error");
        }

    }

    // ==========================
    // BADGE COLOUR
    // ==========================

    function badgeColor(percent) {

        if (percent >= 90) {
            return "#16a34a";
        }

        if (percent >= 75) {
            return "#eab308";
        }

        if (percent >= 50) {
            return "#f97316";
        }

        return "#dc2626";

    }

    // ==========================
    // RENDER STUDENTS
    // ==========================

    function renderStudents(students) {

        console.log("renderStudents()");
        console.log(students);

        summaryList.innerHTML = "";

        if (!students || students.length === 0) {

            summaryList.innerHTML = `
                <div class="message-box">
                    No matching student found.
                </div>
            `;

            return;

        }

        students.sort((a, b) => b.attendance_percentage - a.attendance_percentage);

        students.forEach(student => {

            console.log("Rendering:", student);

            const card = document.createElement("div");

            card.className = "summary-item";

            const percent = Number(student.attendance_percentage) || 0;

            let remark = "Poor";

            if (percent >= 90) {
                remark = "Excellent";
            } else if (percent >= 75) {
                remark = "Good";
            } else if (percent >= 50) {
                remark = "Fair";
            }

            card.innerHTML = `

                <div class="summary-header">

                    <div>

                        <h3>${student.name}</h3>

                        <p>${student.matric_no}</p>

                        <p>${student.department}</p>

                    </div>

                    <div
                        class="summary-percentage"
                        style="color:${badgeColor(percent)}">

                        ${percent}%

                        <br>

                        <small>${remark}</small>

                    </div>

                </div>

                <div class="progress-container">

                    <div
                        class="progress-bar"
                        style="
                            width:${percent}%;
                            background:${badgeColor(percent)};
                        ">
                    </div>

                </div>

                <div class="summary-footer">

                    Present

                    <strong>${student.present_days}</strong>

                    day(s)

                </div>

            `;

            summaryList.appendChild(card);

            console.log("Card Added");

        });

    }

    // ==========================
    // LOAD SUMMARY
    // ==========================

    async function loadSummary() {

        try {

            setStatus("Loading attendance summary...");

            const response = await fetch("/attendance-summary");

            console.log("HTTP Status:", response.status);

            const text = await response.text();

            console.log("SERVER RESPONSE:");
            console.log(text);

            if (!response.ok) {
                throw new Error(text);
            }

            const data = JSON.parse(text);

            console.log("Parsed Data:", data);

            totalStudentsEl.innerText = data.total_students;
            presentTodayEl.innerText = data.present_today;
            attendanceRateEl.innerText = data.attendance_rate + "%";

            allStudents = data.students || [];

            console.log("Students array:", allStudents);

            renderStudents(allStudents);

            console.log("Rendering Finished");

            setStatus(
                "Attendance summary loaded successfully.",
                "success"
            );

        }

        catch (err) {

            console.error(err);

            setStatus(
                "Failed to load attendance summary.",
                "error"
            );

        }

    }

    // ==========================
    // SEARCH
    // ==========================

    searchInput.addEventListener("input", function () {

        const query = searchInput.value.toLowerCase();

        const filtered = allStudents.filter(student =>

            student.name.toLowerCase().includes(query) ||

            student.matric_no.toLowerCase().includes(query)

        );

        renderStudents(filtered);

    });

    // ==========================
    // START
    // ==========================

    loadSummary();

});