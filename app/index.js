/*  EXPRESS */
const express = require('express');
const app = express();
const session = require('express-session');

app.set('view engine', 'ejs');

app.use(session({
    resave: false,
    saveUninitialized: true,
    secret: 'SECRET'
}));

app.get('/', function (req, res) {
    res.render('auth');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('App listening on port ' + port));

var passport = require('passport');
var userProfile;

app.use(passport.initialize());
app.use(passport.session());

const { google } = require("googleapis")

async function requestCalendar(req) {
    const credentials = {
        access_token: userProfile.accessToken,
        refresh_token: userProfile.refreshToken
    };

    return await new Promise((resolve, reject) => {
        var oauth2Client = new google.auth.OAuth2(
            config.clientID,
            config.clientSecret,
            config.callbackURL
        );

        oauth2Client.credentials = credentials

        var calendar = google.calendar('v3');
        calendar.events.list({
            auth: oauth2Client,
            calendarId: 'primary',
            timeMin: (new Date()).toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime'
        }).then(result => resolve(result)).catch(err => reject(err))
    })
}

app.get('/success', (req, res) => {
    requestCalendar().then(calendar => res.render('success', { user: userProfile, calendar }));
});

app.get('/error', (req, res) => {
    res.render('error', { message: "Error logging in" });
});

passport.serializeUser(function (user, cb) {
    cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
    cb(null, obj);
});

var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

const config = {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
}

passport.use(new GoogleStrategy(config,
    function (accessToken, refreshToken, profile, done) {
        userProfile = profile;
        userProfile.accessToken = accessToken
        userProfile.refreshToken = refreshToken
        return done(null, userProfile);
    }
));

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

app.get('/auth/google',
    passport.authenticate('google', {
        scope: ['profile', 'email',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events.readonly']
    }));

app.get('/auth/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/error'
    }),
    function (req, res) {
        // Successful authentication, redirect success.
        res.redirect('/success');
    });