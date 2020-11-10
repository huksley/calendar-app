const logger = require("./common/logger");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const fetch = require("node-fetch");
const app = express();
const path = require("path");
const DAO = require("./common/dao");
const port = process.env.API_PORT || 3000;
const { context, getContext } = require("./common/context");
const bodyParser = require("body-parser");
const serverless = require("serverless-http");
const cookieParser = require("cookie-parser");
const nocache = require("nocache");
const session = require('express-session');
const passport = require('passport');
const { google } = require("googleapis")
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const token = require("./common/token")

app.set('view engine', 'ejs');

app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET
}));

app.use(
  helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: false
  })
);

app.use(
  helmet.referrerPolicy({
    policy: "origin-when-cross-origin"
  })
);

app.use(passport.initialize());
app.use(passport.session());

const baseUrl = (process.env.BASE_URL || `http://localhost:${port}`)

const allowlist = [
  `http://localhost:${port}`,
  "https://calendar.ruslan.org",
  "https://calendar.google.com"
];

const config = {
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: baseUrl + "/auth/google/callback"
}

// Include request parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(
  cors((req, callback) => {
    if (allowlist.indexOf(req.header("Origin")) !== -1) {
      callback(null, { origin: true });
    } else {
      callback(null, { origin: false });
    }
  })
);

// Mount the static files directory
app.use(express.static(path.join(__dirname, "public")));

app.get('/', (req, res) => {
  res.render("index", { view: "index", baseUrl, session: req.session })
});

app.get('/auth/success', (req, res) => {
  res.render("index", { view: "user", baseUrl, session: req.session })
});

app.get('/user', (req, res) => {
  res.render("index", { view: "user", baseUrl, session: req.session })
});

app.get('/error', (req, res) => {
  res.render("index", { view: "error", baseUrl, session: req.session })
});

app.get("/api/calendar/upcoming", token.checkToken, (req, res) => {
  token.verifyToken(req, res).then(data => {
    console.info("Token ok", data)

    const credentials = {
      access_token: data.accessToken,
      refresh_token: data.refreshToken
    };

    new Promise((resolve, reject) => {
      var oauth2Client = new google.auth.OAuth2(
        config.clientID,
        config.clientSecret,
        config.callbackURL
      );

      oauth2Client.credentials = credentials
      const hours = 4
      const calendar = google.calendar('v3');
      calendar.events.list({
        auth: oauth2Client,
        calendarId: 'primary',
        timeMin: (new Date(Date.now())).toISOString(),
        timeMax: (new Date(Date.now() + 3600000 * hours)).toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime'
      }).then(result => {
        res.json({
          events: result.data.items,
          count: result.data.items.length
        })
      }).catch(err => reject(err))
    })
  })
});

app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
  cb(null, obj);
});

passport.use(new GoogleStrategy(config,
  function (accessToken, refreshToken, profile, done) {
    logger.info("Logged in to Google", profile.id)
    token.signToken({
      id: profile.id,
      accessToken,
      refreshToken
    }).then(token => {
      profile.token = token
      done(null, profile);
    })
  }
));

app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly'],
    prompt: "consent"
  }));

app.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: baseUrl + '/error'
  }),
  function (req, res) {
    // Successful authentication, redirect success
    res.redirect('/auth/success');
  });

// Disable caching
app.use(nocache());

// Log requests and responses
if (logger.isVerbose) {
  app.use((request, response, next) => {
    const { method, url } = request;
    const __started = new Date().getTime();
    logger.verbose(`--> ${method} ${url}`);
    next();
    const { statusCode } = response;
    const now = new Date().getTime();
    const elapsed = now - __started;
    logger.verbose(`<-- ${statusCode} ${method} ${url} Δ ${elapsed}ms`);
  });
}

app.use(function (err, req, res, _next) {
  logger.error(err.stack, req.headers);
  res.status(500).send({ message: "Internal server error" });
});

// You define error-handling middleware last, after other app.use() and routes calls
app.use((err, _req, res, _next) => {
  const { statusCode, code, message } = err;
  logger.warn("Error", err);
  const httpCode = parseInt(statusCode || code || 500, 10);
  res.status(!isNaN(httpCode) && httpCode > 399 && httpCode < 599 ? httpCode : 500).json({
    statusCode,
    message
  });
});

process.on("beforeExit", code => {
  logger.info("NodeJS exiting", code);
});

process.on("SIGINT", signal => {
  logger.info("Caught interrupt signal", signal);
  process.exit(1);
});

// Do something when AWS lambda started
if (process.env.AWS_EXECUTION_ENV !== undefined) {
  // _HANDLER contains specific invocation handler for this NodeJS instance
  logger.info("AWS Lambda started, handler:", process.env._HANDLER);
} else {
  app.listen(port, () => logger.info(`API Server listening on port ${port}`));
}

const serverlessPromise = serverless(app);

module.exports.serverless = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const serverlessHandler = await serverlessPromise;
  const result = await serverlessHandler(event, context);
  return result;
};
