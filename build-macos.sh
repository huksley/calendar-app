#!/bin/bash

npx nativefier --name "Google Calendar" \
    --single-instance \
    --inject style.css \
    --inject script.js \
    --verbose \
    --darwin-dark-mode-support \
    --icon google-calendar.png \
    --counter \
    --bounce \
    --internal-urls "(calendar\.google\.*?)|(calendar\.ruslan\.org)|(localhost:3000)|(accounts\.google\.com)" \
    https://calendar.google.com
