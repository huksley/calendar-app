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

if (IFRAME && API_TOKEN) {
    window.top.postMessage(JSON.stringify({
        source: IFRAME,
        action: "token",
        token: API_TOKEN
    }))
}