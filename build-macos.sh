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
    --user-agent "Mozilla/5.0 (Windows NT 10.0; rv:74.0) Gecko/20100101 Firefox/74.0" \
    --internal-urls "(calendar\.google\.*?)|(calendar\.ruslan\.org)|(localhost:3000)|(accounts\.google\.com)" \
    https://calendar.google.com
