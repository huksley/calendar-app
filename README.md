# Desktop Calendar

Based on electron (and nativefier) wraps Google Calendar as a native calendar app.

### Features

* MacOS X build
* Notifications for upcoming events
* Badge with upcoming events counter (next 4 hours)

### Installing

Download ready made package from **Releases** or build locally

* Clone repo
* npm install
* ./build-macosx.sh

### Cloud service

This project contains API service in api/ folder. This API creates persistent API KEY with Google OAuth2 api to fetch upcoming events to display in the badge.
If you don't want to use badge counter, do not connect to the api.

### Links 

* https://github.com/jiahaog/nativefier
* (C) calendar-interface-symbol-tool.png icon made by https://www.flaticon.com/authors/freepik from www.flaticon.com

