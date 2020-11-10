const events = document.getElementById("upcomingEvents")
if (events) {
    events.innerHTML = "..."
    fetch("api/calendar/upcoming", {
        method: "GET",
        mode: 'cors',
        headers: {
            "Accept": "application/json",
            "Authorization": "Bearer " + API_TOKEN
        }
    }).then(response => response.json()).then(json => {
        events.innerHTML = json.count + "<br>" + json.events.map(e => e.summary + "<br>").join("")
    }).catch(error => console.warn(error))
}