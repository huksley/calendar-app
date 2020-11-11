const jwt = require('jsonwebtoken')

// Get auth header value
exports.checkToken = (req, res, next) => {
  const bearerHeader = req.headers['authorization']
  if (typeof bearerHeader !== 'undefined') {
    req.token = bearerHeader.split(' ')[1]
    next()
  } else {
    res.sendStatus(403)
  }
}

// Verify token validity and attach token data as request attribute
exports.verifyToken = (req, res) => {
  return new Promise(resolve => {
    jwt.verify(req.token, process.env.SESSION_SECRET, (err, data) => {
      if (err) {
        res.sendStatus(403)
      } else {
        return resolve(data)
      }
    })
  })
}

// Issue Token
exports.signToken = (payload, req, res) => {
  return new Promise(resolve => {
    jwt.sign(payload, process.env.SESSION_SECRET, { expiresIn: '365 day' }, (err, token) => {
      if (err) {
        res.sendStatus(500)
      } else {
        return resolve(token)
      }
    })
  })
}
