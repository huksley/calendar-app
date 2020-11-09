(async function () {
    'use strict';

    // Taken from https://greasyfork.org/en/scripts/395743-streamline-google-calendar-html/code

    var grid = document.evaluate('//div[@role="grid"][@jscontroller]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    while (grid === null) {
        await new Promise(r => setTimeout(r, 500));
        grid = document.evaluate('//div[@role="grid"][@jscontroller]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }
    grid.style.marginLeft = 0; // Normally there's a small margin to the left where the hamburger menu opens up

    var xpathQueries = [
        '//div[@aria-label="Main drawer"]', // Hamburger menu button
        '//div[@aria-label="Toggle side panel"]' // Button in the bottom right to open the side panel with Tasks and Keep
    ];

    /*
        '//button[@aria-label="Create"]', // Button with cross to create an event
        '//xxdiv[@aria-label="Support"]/../../../..', // Div with search, support and config buttons
        '//xxdiv[@aria-label="Previous period"]', // Button to move a month back
        '//xxdiv[@aria-label="Next period"]', // Button to move a month forward
        '//xxdiv[starts-with(@aria-label, "Today")]/../..', // Button to jump to today
        '//xxstar[@aria-label="Google apps"]/../..', // Button with 3x3 dots to open Google Apps menu
        '//xxspan[contains(text(), "")]', // Arrow next to the week/month selector
        */

    var query;
    var selectedElement;
    for (query of xpathQueries) {
        console.log(query);
        selectedElement = null;
        selectedElement = document.evaluate(query, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        while (selectedElement === null) {
            await new Promise(r => setTimeout(r, 500));
            selectedElement = document.evaluate(query, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        }
        selectedElement.style.display = "none";
    }

    function ftch(method, url) {
        return new Promise((resolve, reject) => {
            function reqListener() {
                var data = JSON.parse(this.responseText);
                resolve(data)
            }

            function reqError(err) {
                reject(err)
            }

            var oReq = new XMLHttpRequest();
            oReq.onload = reqListener;
            oReq.onerror = reqError;
            oReq.open(method, url, true);
            oReq.send();
        })
    }

    (function () {
        const __open = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url, async) {
            console.info("XHR open", method, url)
            this.__url = url
            this.__method = method

            this.addEventListener('load', function () {
                this.__response_payload = this.responseText
                console.info("XHR", this.__method, this.__url, this.__request_payload, this.__response_payload)
            })

            return __open.apply(this, arguments);
        }

        const __send = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function (payload, url, async) {
            this.__request_payload = payload
            return __send.apply(this, arguments);
        }
    })()
})();