document.addEventListener("DOMContentLoaded", () => {

    const historyList = document.getElementById("js-historyList");
    const historyStatus = document.getElementById("js-historyStatus");
    const searchInput = document.getElementById("js-historySearch");
    const totalRecords = document.getElementById("js-totalRecords");
    const todayRecords = document.getElementById("js-todayRecords");

    let allHistory = [];

    function setStatus(message, type = "info") {

        historyStatus.innerText = message;

        historyStatus.className = "message-box";

        if(type==="success"){
            historyStatus.classList.add("success");
        }

        if(type==="error"){
            historyStatus.classList.add("error");
        }

    }

    function formatDate(dateString){

        const date = new Date(dateString);

        return date.toLocaleDateString() + " " +
               date.toLocaleTimeString([],{
                    hour:"2-digit",
                    minute:"2-digit"
               });

    }

    function badge(status){

        status=status.toLowerCase();

        if(status==="present"){

            return "status-badge present";

        }

        if(status==="late"){

            return "status-badge late";

        }

        return "status-badge absent";

    }

    function renderHistory(records){

        historyList.innerHTML="";

        if(records.length===0){

            historyList.innerHTML=`
                <div class="message-box">
                    No attendance record found.
                </div>
            `;

            return;
        }

        records.forEach(record=>{

            const card=document.createElement("div");

            card.className="history-item";

            card.innerHTML=`

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
                    <label>Date</label>
                    <span>${formatDate(record.date)}</span>
                </div>

                <div class="history-field">
                    <label>Status</label>

                    <span class="${badge(record.status)}">

                        ${record.status}

                    </span>

                </div>

            `;

            historyList.appendChild(card);

        });

    }

    async function loadHistory(){

        try{

            setStatus("Loading attendance history...");

            const response=await fetch("/attendance-history");

            if(!response.ok){

                throw new Error("Server Error");

            }

            const data=await response.json();

            data.sort((a,b)=>new Date(b.date)-new Date(a.date));

            allHistory=data;

            totalRecords.innerText=data.length;

            const today=new Date().toDateString();

            todayRecords.innerText=data.filter(r=>

                new Date(r.date).toDateString()===today

            ).length;

            renderHistory(allHistory);

            setStatus("Attendance history loaded successfully.","success");

        }

        catch(err){

            console.error(err);

            setStatus("Failed to load attendance history.","error");

        }

    }

    searchInput.addEventListener("input",()=>{

        const keyword=searchInput.value.toLowerCase();

        const filtered=allHistory.filter(record=>{

            return(

                record.name.toLowerCase().includes(keyword)

                ||

                record.matric_no.toLowerCase().includes(keyword)

                ||

                record.department.toLowerCase().includes(keyword)

            );

        });

        renderHistory(filtered);

    });

    loadHistory();

});