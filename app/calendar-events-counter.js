// Client ID and API key from the Developer Console
var CLIENT_ID = 'CLIENT_ID_HERE';
var API_KEY = 'API_KEY_HERE';

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = "https://www.googleapis.com/auth/calendar.readonly " +
    "https://www.googleapis.com/auth/calendar.events.readonly";

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
        console.warn(JSON.stringify(error, null, 2));
    });
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus(isSignedIn) {
    if (isSignedIn) {
        listUpcomingEvents();
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
                gapi.client.calendar.events.list({
                    'calendarId': cal.id,
                    'timeMin': (new Date(Date.now())).toISOString(),
                    'timeMax': (new Date(Date.now() + 3600000 * hours)).toISOString(),
                    'showDeleted': false,
                    'singleEvents': true,
                    'maxResults': 10,
                    'orderBy': 'startTime'
                }).then(function (response) {
                    var events = response.result.items;
                    console.info('Upcoming events for ' + cal.id);
                    let found = 0

                    if (events.length > 0) {
                        for (i = 0; i < events.length; i++) {
                            var event = events[i];
                            var when = event.start.dateTime;
                            if (!when) {
                                when = event.start.date;
                            }
                            const remind = event.reminders ? event.reminders.useDefault : undefined
                            console.info(event.summary + ' (' + when + ', ' + remind + ')')
                            if (remind) {
                                found++
                            }
                        }
                    } else {
                        console.info('No upcoming events found for ' + cal.id);
                    }

                    notifyEvents += found
                    document.title = "Google Calendar (" + notifyEvents + ")"
                })


            })
        })
    })
}

var tag = document.createElement('script');
tag.src = "https://apis.google.com/js/api.js";
tag.setAttribute('defer', '');
tag.setAttribute('async', '')
tag.onload = handleClientLoad
document.body.appendChild(tag)
