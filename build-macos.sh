#!/bin/bash

npx nativefier --name "Google Calendar" \
    --single-instance \
    --inject style.css \
    --inject script.js \
    --inject app/calendar-events-counter.js \
    --verbose \
    --darwin-dark-mode-support \
    --icon google-calendar.png \
    --counter \
    --bounce \
    --internal-urls "calendar\.google\.*?" \
    https://calendar.google.com

