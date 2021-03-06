const logger = require('./lib/logger')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const app = express()
const path = require('path')
const port = process.env.API_PORT || 3000
const { context } = require('./lib/context')
const bodyParser = require('body-parser')
const serverless = require('serverless-http')
const cookieParser = require('cookie-parser')
const nocache = require('nocache')
const session = require('express-session')
const passport = require('passport')
const { google } = require('googleapis')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const token = require('./lib/token')
const MongoDBStore = require('connect-mongodb-session')(session)
const LocalStrategy = require('passport-local').Strategy
const ejs = require('ejs')
const prismic = require('prismic-javascript')
const R = require('ramda')
const Cookies = require('cookies')
prismic.dom = require('prismic-dom')

const prismicUrl = 'https://calendar-desktop.cdn.prismic.io/api/v2'

app.set('view engine', 'ejs')
ejs.rmWhitespace = true
ejs.openDelimiter = '{'
ejs.closeDelimiter = '}'

const url = context.env.MONGO_URL
const mongoUrl = url
  .replace('$MONGO_PASSWORD', process.env.MONGO_PASSWORD)
  .replace('$MONGO_USER', process.env.MONGO_USER)

const content = (() => {
  const l = (process.env.CONTENT || "none==none").split(";")
  const content = {}
  l.forEach(r => {
    const [key, value] = r.split("==")
    content[key] = value
  })
  return content
})();

var store = new MongoDBStore({
  uri: mongoUrl,
  collection: 'CalendarSessions',
  expires: 1000 * 60 * 60 * 24 * 30, // 1 day in milliseconds
  connectionOptions: {
    bufferMaxEntries: 0,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000
  }
})

app.use(
  session({
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET,
    store: store
  })
)

app.use(
  helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: false
  })
)

app.use(
  helmet.referrerPolicy({
    policy: 'origin-when-cross-origin'
  })
)

app.use(passport.initialize())
app.use(passport.session())
app.locals.livereload = !!global.livereload

const baseUrl = process.env.BASE_URL || `http://localhost:${port}`

const allowlist = [
  `http://localhost:${port}`,
  'https://calendar.ruslan.org',
  'https://calendar.google.com'
]

const config = {
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: baseUrl + '/auth/google/callback'
}

// Include request parsers
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())

app.use(
  cors((req, callback) => {
    if (allowlist.indexOf(req.header('Origin')) !== -1) {
      callback(null, { origin: true })
    } else {
      if (req.header('Origin') !== undefined) {
        logger.warn('Blocked origin', req.header('Origin'))
      }
      callback(null, { origin: false })
    }
  })
)

// Mount the static files directory
app.use(express.static(path.join(__dirname, 'public')))

const prismicResolver = doc => {
  if (doc.last_publication_date === null) {
    // Draft preview
    return '/preview?id=' + doc.id + '&uid=' + doc.data.id
  } else {
    return doc.uid === 'home' ? '/' : '/' + doc.uid
  }
}

const prismicPage = (req, res, page, preview) => {
  return new Promise((resolve, reject) => {
    prismic
      .getApi(prismicUrl, prismicResolver)
      .then(api => {
        api
          .query(
            prismic.Predicates.at('my.page.id', page),
            preview
              ? {
                  ref: req.cookies['io.prismic.preview']
                }
              : undefined
          )
          .then(response => {
            const document = R.head(response.results)
            if (document !== undefined) {
              logger.verbose('Got document', document)
              let content = prismic.dom.RichText.asHtml(document.data.content, R.always('/'))
              content = content.replace('http:///', '/')
              content = content.replace('https:///', '/')
              resolve({ content, document })
            } else {
              logger.warn('Cannot find document', page)
              reject(page)
            }
          })
          .catch(error => {
            logger.warn('Failed to get document', error)
            reject(error)
          })
      })
      .catch(error => {
        logger.warn('Failed to init prismic')
        reject(error)
      })
  })
}

app.get('/preview', (req, res, next) => {
  const { token, documentId, id, uid } = req.query
  if (token === undefined && id !== null) {
    prismicPage(req, res, uid, true)
      .then(page => {
        res.render('index', {
          view: uid,
          baseUrl,
          session: req.session,
          content: page.content
        })
      })
      .catch(next)
  } else {
    prismic
      .getApi(prismicUrl, R.objOf('req')(req))
      .then(api => {
        api
          .getPreviewResolver(token, documentId)
          .resolve(prismicResolver, '/')
          .then(url => {
            const cookies = new Cookies(req, res)
            cookies.set(prismic.previewCookie, token, {
              maxAge: 30 * 60 * 1000,
              path: '/',
              httpOnly: false
            })
            res.redirect(302, url)
          })
          .catch(next)
      })
      .catch(next)
  }
})

app.get('/', (req, res, next) => {
  prismicPage(req, res, 'home')
    .then(page => {
      res.render('index', {
        view: 'index',
        baseUrl,
        session: req.session,
        content: page.content
      })
    })
    .catch(next)
})

const knownPage = /faq|changelog|privacy|tos|feedback|support|tos|sandbox|dashboard/g

const replace = (str) => {
  for (key of Object.keys(content)) {
    const value = content[key]
    str = str.replace(new RegExp("%" + key + "%", "g"), value)
  }
  return str
}

app.get('/:page', (req, res, next) => {
  const page = req.params.page
  if (page.match(knownPage)) {
    prismicPage(req, res, page)
      .then(page => {
        res.render('index', {
          view: req.params.page,
          baseUrl,
          session: req.session,
          content: replace(page.content)
        })
      })
      .catch(next)
  } else {
    next()
  }
})

app.get('/login/:sessionId', (req, res) => {
  req.session.externalSessionId = req.params.sessionId
  res.render('index', { view: 'index', baseUrl, session: req.session })
})

app.get('/callback', (req, res) => {
  res.render('index', { view: 'callback', baseUrl, session: req.session })
})

app.get('/auth/success', (req, res) => {
  res.render('index', { view: 'dashboard', baseUrl, session: req.session })
})

app.get('/user', (req, res) => {
  res.render('index', { view: 'user', baseUrl, session: req.session })
})

app.get('/error', (req, res) => {
  res.render('index', { view: 'error', baseUrl, session: req.session })
})

const calendar = google.calendar('v3')

const STRATEGY = process.env.PASSPORT_STRATEGY || 'local'

function calendarEvents(oauth2Client, calendarId, hours, email) {
  return new Promise((resolve, reject) =>
    calendar.events
      .list({
        auth: oauth2Client,
        calendarId: calendarId,
        timeMin: new Date(Date.now()).toISOString(),
        timeMax: new Date(Date.now() + 3600000 * hours).toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime'
      })
      .then(result => {
        const events = result.data.items
        resolve(
          events
            .filter(event => event.reminders && event.reminders.useDefault)
            .filter(
              event =>
                event.attendees === undefined ||
                // I have not declined
                event.attendees.find(
                  user => user.email === email && user.responseStatus === 'declined'
                ) === undefined
            )
        )
      })
      .catch(error => {
        reject(error)
      })
  )
}

app.get('/api/calendar/upcoming', token.checkToken, (req, res) => {
  token.verifyToken(req, res).then(data => {
    if (STRATEGY === 'local') {
      const events = [
        {
          summary: 'Test event'
        }
      ]
      logger.info('Events for', data.sub, events)
      res.json({
        count: events.length,
        events: events
      })
    }

    if (STRATEGY === 'google') {
      const credentials = {
        access_token: data.accessToken,
        refresh_token: data.refreshToken
      }

      var oauth2Client = new google.auth.OAuth2(
        config.clientID,
        config.clientSecret,
        config.callbackURL
      )

      oauth2Client.credentials = credentials
      const hours = 4

      calendar.calendarList
        .list({
          auth: oauth2Client
        })
        .then(async response => {
          const cals = response.data.items
          logger.info('Calendars for', data.sub)
          const eventsPerCalendar = await Promise.all(
            cals.map(async cal =>
              calendarEvents(oauth2Client, cal.id, hours, data.sub).then(events => ({
                calendarId: cal.id,
                events
              }))
            )
          )
          logger.verbose('Events per calendar', eventsPerCalendar)
          const events = eventsPerCalendar.map(ce => ce.events).flat(1)
          res.json({
            count: events.length,
            events: events
          })
        })
        .catch(error => {
          logger.warn(
            'calendarList.list',
            error.message,
            JSON.stringify(error, null, 2),
            error
          )
        })
    }
  })
})

app.get('/logout', function (req, res) {
  req.session.destroy()
  req.logout()
  res.redirect('/')
})

passport.serializeUser(function (user, cb) {
  cb(null, user)
})

passport.deserializeUser(function (obj, cb) {
  cb(null, obj)
})

if (STRATEGY === 'local') {
  passport.use(
    new LocalStrategy(function (username, password, done) {
      logger.info('username', username, 'password', password)
      if (username === 'test' && password === '123') {
        const profile = {
          id: username,
          email: 'test@email.com',
          email_verified: true,
          displayName: 'Tester',
          emails: [
            {
              value: 'test@email.com',
              email_verified: true
            }
          ]
        }
        token
          .signToken({
            id: profile.id,
            sub: profile.email,
            accessToken: 'deadbeef',
            refreshToken: 'beefdead'
          })
          .then(token => {
            profile.token = token
            done(null, profile)
          })
      } else {
        return done(null, false)
      }
    })
  )

  app.get('/auth', (req, res) => res.render('local-login', { baseUrl }))

  app.post(
    '/auth/submit',
    passport.authenticate('local', { failureRedirect: baseUrl + '/error' }),
    function (req, res) {
      res.redirect('/auth/success')
    }
  )
}

if (STRATEGY === 'google') {
  passport.use(
    new GoogleStrategy(
      {
        ...config,
        passReqToCallback: true
      },
      function (req, accessToken, refreshToken, profile, done) {
        logger.info('Logged in to Google', profile.id, profile.emails[0].value)
        token
          .signToken({
            id: profile.id,
            sub: profile.emails[0].value,
            accessToken,
            refreshToken
          })
          .then(token => {
            profile.token = token
            done(null, profile)
          })
      }
    )
  )

  app.get(
    '/auth',
    passport.authenticate('google', {
      // https://developers.google.com/identity/protocols/oauth2/web-server
      scope: [
        'profile',
        'email',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events.readonly'
      ],
      prompt: 'consent',
      accessType: 'offline',
      includeGrantedScopes: true
    })
  )

  app.get(
    '/auth/google/callback',
    passport.authenticate('google', {
      failureRedirect: baseUrl + '/error'
    }),
    function (req, res) {
      // Successful authentication, redirect success
      res.redirect('/auth/success')
    }
  )
}

// Disable caching
app.use(nocache())

// Log requests and responses
if (logger.isVerbose) {
  app.use((request, response, next) => {
    const { method, url } = request
    const __started = new Date().getTime()
    logger.verbose(`--> ${method} ${url}`)
    next()
    const { statusCode } = response
    const now = new Date().getTime()
    const elapsed = now - __started
    logger.verbose(`<-- ${statusCode} ${method} ${url} Δ ${elapsed}ms`)
  })
}

app.use(function (err, req, res, _next) {
  logger.warn(err)
  if (req.headers.accept && req.headers.accept.indexOf('text/html') >= 0) {
    res
      .status(500)
      .send(
        'Internal server error' +
          (global.livereload
            ? '<script async defer src="http://localhost:35729/livereload.js"></script>'
            : '')
      )
  } else {
    res.status(500).send({ message: 'Internal server error' })
  }
})

// You define error-handling middleware last, after other app.use() and routes calls
app.use((err, _req, res, _next) => {
  const { statusCode, code, message } = err
  logger.warn('Error', err)
  const httpCode = parseInt(statusCode || code || 500, 10)
  res.status(!isNaN(httpCode) && httpCode > 399 && httpCode < 599 ? httpCode : 500).json({
    statusCode,
    message
  })
})

process.on('beforeExit', code => {
  logger.verbose('NodeJS exiting', code)
})

process.on('SIGINT', signal => {
  logger.verbose('Caught interrupt signal', signal)
  process.exit(1)
})

// Do something when AWS lambda started
if (process.env.AWS_EXECUTION_ENV !== undefined) {
  // _HANDLER contains specific invocation handler for this NodeJS instance
  logger.verbose('AWS Lambda started, handler:', process.env._HANDLER)
} else {
  app.listen(port, () => logger.info(`API Server listening on port ${port}`))
}

const serverlessPromise = serverless(app, {
  binary: ['image/png', 'image/jpeg', 'image/x-icon']
})

module.exports.serverless = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false
  const serverlessHandler = await serverlessPromise
  const result = await serverlessHandler(event, context)
  return result
}
