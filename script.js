"use strict";

(async function () {
  // Taken from https://greasyfork.org/en/scripts/395743-streamline-google-calendar-html/code

  function ftch(method, url, set) {
    return new Promise((resolve, reject) => {
      function reqListener() {
        var data = JSON.parse(this.responseText);
        resolve(data);
      }

      function reqError(err) {
        reject(err);
      }

      var oReq = new XMLHttpRequest();
      oReq.onload = reqListener;
      oReq.onerror = reqError;
      oReq.open(method, url, true);
      if (set) {
        set(oReq);
      }
      oReq.send();
    });
  }

  function parseQuery(str) {
    if (typeof str != "string" || str.length == 0) return {};
    var s = str.split("&");
    var s_length = s.length;
    var bit,
      query = {},
      first,
      second;
    for (var i = 0; i < s_length; i++) {
      bit = s[i].split("=");
      first = decodeURIComponent(bit[0]);
      if (first.length == 0) continue;
      second = decodeURIComponent(bit[1]);
      if (typeof query[first] == "undefined") query[first] = second;
      else if (query[first] instanceof Array) query[first].push(second);
      else query[first] = [query[first], second];
    }
    return query;
  }

  let API_TOKEN = localStorage.getItem("API_TOKEN");

  if (window.location.search.startsWith("?")) {
    let query = parseQuery(window.location.search.substring(1));
    if (
      query.calendarApiToken &&
      query.externalSessionId &&
      query.externalSessionId === localStorage.getItem("EXTERNAL_SESSION_ID")
    ) {
      API_TOKEN = query.calendarApiToken;
      localStorage.setItem("API_TOKEN", API_TOKEN);
    }
  }

  const rootElementExpression = '//div[@role="grid"][@jscontroller]';
  const drawerExpression = '//div[@aria-label="Main drawer"]';

  const BASE_URL = "https://calendar.ruslan.org"; //  "http://localhost:3000"

  async function waitForExpression(expr, seconds) {
    seconds = seconds || 10;
    let grid = document.evaluate(
      expr,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
    const startTime = new Date().getTime();
    while (grid === null) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      grid = document.evaluate(
        expr,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      if (new Date().getTime() - startTime > seconds * 1000) {
        return undefined;
      }
    }
    return grid;
  }

  async function createIcon() {
    waitForExpression(rootElementExpression).then((grid) => {
      if (grid) {
        grid.style.marginLeft = 0;
        waitForExpression(drawerExpression).then((burger) => {
          const holder = burger.parentElement;
          holder.removeChild(burger);
          const tree = document.createElement("div");
          tree.setAttribute("aria-label", "Main drawer");
          const button = document.createElement("button");
          button.innerHTML = API_TOKEN ? "Connected" : "Connect";
          button.setAttribute("class", "login-button");
          button.addEventListener("click", () => {
            const id = "S" + new Date().getTime();
            localStorage.setItem("EXTERNAL_SESSION_ID", id);
            window.location = BASE_URL + "/login/" + id;
          });
          tree.appendChild(button);
          holder.appendChild(tree);
        });
      }
    });
  }

  createIcon();

  let updateCounterTimer = null;
  let errorCount = 0;
  let errorThreshold = 5;
  let refreshPeriod = 10;
  let offlinePeriod = 5;

  function updateCounter(force) {
    if (!navigator.onLine) {
      document.title = "Google Calendar";
      window.setTimeout(() => {
        updateCounter();
      }, offlinePeriod * 1000);
      return;
    }

    if (force && updateCounterTimer) {
      window.clearTimeout(updateCounterTimer);
    }

    if (API_TOKEN) {
      ftch("GET", BASE_URL + "/api/calendar/upcoming", (req) => {
        req.setRequestHeader("Authorization", "Bearer " + API_TOKEN);
      })
        .then((json) => {
          document.title = "Google Calendar (" + json.count + ")";
          updateCounterTimer = window.setTimeout(() => {
            updateCounter();
          }, refreshPeriod * 1000);
        })
        .catch((error) => {
          console.warn(error);
          errorCount++;
          if (errorCount > errorThreshold) {
            // Too many errors, show Connect button again
            API_TOKEN = undefined;
            localStorage.removeItem("API_TOKEN");
            createIcon();
          } else {
            // Try again
            updateCounterTimer = window.setTimeout(() => {
              updateCounter();
            }, refreshPeriod * 1000);
          }
        });
    }
  }

  updateCounter();

  (function () {
    const __open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, async) {
      console.info("XHR open", method, url);
      this.__url = url;
      this.__method = method;

      this.addEventListener("load", function () {
        this.__response_payload = this.responseText;
        console.info(
          "XHR",
          this.__method,
          this.__url,
          this.__request_payload,
          this.__response_payload
        );
      });

      return __open.apply(this, arguments);
    };

    const __send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (payload, url, async) {
      this.__request_payload = payload;
      return __send.apply(this, arguments);
    };
  })();
})();
