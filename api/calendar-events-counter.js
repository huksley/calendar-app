// Client ID and API key from the Developer Console
var CLIENT_ID = undefined
var API_KEY = undefined

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = "https://www.googleapis.com/auth/calendar.readonly"

/**
 *  On load, called to load the auth2 library and API client library.
 */
function handleClientLoad() {
    gapi.load('client:auth2', initClient);
}

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
function initClient() {
    if (!CLIENT_ID) {
        CLIENT_ID = localStorage.getItem("GOOGLE_CLIENT_ID")
    }

    if (!CLIENT_ID) {
        CLIENT_ID = prompt("Enter Client id")
        if (CLIENT_ID) {
            localStorage.setItem("GOOGLE_CLIENT_ID", CLIENT_ID)
        }
    }

    if (!API_KEY) {
        API_KEY = localStorage.getItem("GOOGLE_API_KEY")
    }

    /*
    if (!API_KEY) {
        API_KEY = prompt("Enter API key")
        if (API_KEY) {
            localStorage.setItem("GOOGLE_API_KEY", API_KEY)
        }
    }
    */

    gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
    }).then(function () {
        // Listen for sign-in state changes.
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

        // Handle the initial sign-in state.
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    }, function (error) {
        console.warn("initClient", error.message, JSON.stringify(error, null, 2));
    }).catch(error => {
        console.warn("initClient", error.message, JSON.stringify(error, null, 2));
    })
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus(isSignedIn) {
    if (isSignedIn) {
        try {
            listUpcomingEvents();
        } catch (error) {
            console.warn("updateSigninStatus", error.message, JSON.stringify(error, null, 2));
        }
    } else {
        handleAuthClick()
    }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick(event) {
    gapi.auth2.getAuthInstance().signIn();
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick(event) {
    gapi.auth2.getAuthInstance().signOut();
}

let listFailures = 0
let listFailuresThreshold = 10

/**
 * Print the summary and start datetime/date of the next ten events in
 * the authorized user's calendar. If no events are found an
 * appropriate message is printed.
 */
function listUpcomingEvents() {
    const hours = 4
    new Promise(async resolve => {
        let notifyEvents = 0
        await gapi.client.calendar.calendarList.list().then(response => {
            const cals = response.result.items
            cals.forEach(async cal => {
                console.info("Calendar", cal.id)
                gapi.client.calendar.freebusy.query({
                    timeMin: (new Date(Date.now())).toISOString(),
                    timeMax: (new Date(Date.now() + 3600000 * hours)).toISOString(),
                    items: [{ id: cal.id }]
                }).then(response => {
                    if (response && response.result &&
                        response.result.calendars &&
                        response.result.calendars[cal.id]) {
                        const busy = response.result.calendars[cal.id].busy
                        console.info("Busy for", cal.id, busy)
                        if (busy) {
                            notifyEvents += busy.length
                            document.title = "Google Calendar (" + busy.length + ")"
                        }
                    }
                }).catch(error => {
                    console.warn("freebusy.query", error.message, JSON.stringify(error, null, 2));
                    listFailures++
                })
            })
        }).catch(error => {
            console.warn("calendarList.list", error.message, JSON.stringify(error, null, 2));
            listFailures++
        })
    })

    if (listFailures < listFailuresThreshold) {
        window.setInterval(listUpcomingEvents, 1 * 60000)
    }
}

var tag = document.createElement('script');
tag.src = "https://apis.google.com/js/api.js";
tag.setAttribute('defer', '');
tag.setAttribute('async', '')
tag.onload = handleClientLoad
document.body.appendChild(tag)
