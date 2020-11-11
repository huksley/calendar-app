'use strict';

(async function () {
    // Taken from https://greasyfork.org/en/scripts/395743-streamline-google-calendar-html/code

    function ftch(method, url, set) {
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
            if (set) {
                set(oReq)
            }
            oReq.send();
        })
    }

    let API_TOKEN = undefined;

    (function () {
        const rootElementExpression = '//div[@aria-label="Main drawer"]'
        const drawerExpression = '//div[@aria-label="Main drawer"]'

        async function waitForExpression(expr, seconds) {
            seconds = seconds || 10
            let grid = document.evaluate(expr, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            const startTime = new Date().getTime()
            while (grid === null) {
                await new Promise(resolve => setTimeout(resolve, 200));
                grid = document.evaluate(expr, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (new Date().getTime() - startTime > seconds * 1000) {
                    return undefined
                }
            }
            return grid
        }

        async function createIcon() {
            waitForExpression(rootElementExpression).then(grid => {
                if (grid) {
                    grid.style.marginLeft = 0
                    waitForExpression(drawerExpression).then(burger => {
                        const holder = burger.parentElement
                        holder.removeChild(burger)
                        const tree = document.createElement("div")
                        tree.setAttribute("aria-label", "Main drawer")
                        const button = document.createElement("button")
                        button.innerHTML = "Set token"
                        button.addEventListener("click", () => {
                            if (API_TOKEN === undefined) {
                                API_TOKEN = localStorage.getItem("API_TOKEN")
                            }

                            if (API_TOKEN === null) {
                                const iframe = document.createElement("iframe");
                                const id = "session-" + new Date().getTime()

                                iframe.onload = function () {
                                    console.log("The iframe is loaded");
                                };

                                iframe.onerror = function () {
                                    console.log("Something wrong happened");
                                };

                                iframe.id = id
                                iframe.width = "750"
                                iframe.height = "650"
                                iframe.style = "position: absolute; top: 0px; bottom: 0px; margin: auto; z-index: 9999"
                                iframe.src = "http://localhost:3000/?view=login-iframe&amp;id=" + id;
                                document.body.appendChild(iframe);

                                window.addEventListener("message", event => {
                                    const data = JSON.parse(event.data)
                                    if (data.source === id && data.action === "token") {
                                        API_TOKEN = data.token
                                        document.localStorage.setItem("API_TOKEN", API_TOKEN)
                                        document.body.removeChild(iframe)
                                    }
                                })
                            }
                        })
                        tree.appendChild(button)
                        holder.appendChild(tree)
                    })
                }
            })
        }

        createIcon()
    })()

    function updateCounter() {
        if (!navigator.onLine) {
            document.title = "Google Calendar"
            window.setTimeout(() => {
                updateCounter()
            }, 5 * 1000)
            return
        }

        if (API_TOKEN !== undefined && API_TOKEN !== "") {
            ftch("GET", "https://calendar.ruslan.org/api/calendar/upcoming", req => {
                req.setRequestHeader("Authorization", "Bearer " + API_TOKEN)
            }).then(json => {
                document.title = "Google Calendar (" + json.count + ")"
                window.setTimeout(() => {
                    updateCounter()
                }, 60 * 1000)
            }).catch(error => {
                console.warn(error)
                API_TOKEN = undefined
                localStorage.setItem("API_TOKEN", undefined)
            })
        }
    }

    updateCounter();

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