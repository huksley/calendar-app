const logger = require('./logger')
const mongoose = require('mongoose')
const nanoid = require('nanoid')
const dao = require('./dao')
const R = require('ramda')

/**
 * @class UserSchema
 */
const UserSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => nanoid.nanoid(16)
  },
  email: { type: String, index: true, unique: true },
  updatedAt: Date
})

const UserSchemaProperties = ['email']

const User = {
  find: email =>
    new Promise(resolve => {
      dao.create().then(dao => {
        const User = dao.connection.model('CalendarUser', UserSchema)
        User.find({ email })
          .exec()
          .then(users => {
            if (users.length == 0) {
              resolve(undefined)
            } else if (users.length > 1) {
              logger.warn('Consistency error, found users: ', users.length)
              resolve(R.head(users).toObject())
            } else {
              resolve(R.head(users).toObject())
            }
          })
      })
    }),
  upsert: user => {
    user = R.pick(UserSchemaProperties, user)
    return new Promise(resolve =>
      dao.create().then(dao => {
        const User = dao.connection.model('user', UserSchema)
        User.find({ email: user.email })
          .exec()
          .then(users => {
            if (users.length == 0) {
              logger.verbose('Creating user', user)
              new User({
                ...user,
                updatedAt: new Date()
              })
                .save()
                .then(resolve)
            } else {
              if (users.length > 1) {
                logger.warn('Consistency error, found users: ', users.length)
              }
              const existing = R.head(users)
              if (!R.equals(user, R.pick(UserSchemaProperties, existing))) {
                logger.info(
                  'Updating user',
                  user.email,
                  user,
                  R.pick(UserSchemaProperties, existing.toObject())
                )
                existing
                  .set({
                    ...user,
                    updatedAt: new Date()
                  })
                  .save()
                  .then(resolve)
              } else {
                logger.info('User not changed', user.email)
              }
            }
          })
      })
    )
  }
}

module.exports = {
  User
}
