const logger = require('./logger')
const mongoose = require('mongoose')
const nanoid = require('nanoid')
const { context } = require('./context')

/**
 * @type {DAO}
 */
let dao = null

class DAO {
  /**
   * Create DAO instance.
   *
   * @param {mongoose.Connection} conn - Connection to MongoDB
   */
  constructor(conn) {
    /**
     * Private connection property
     *
     * @type {mongoose.Connection}
     * @public
     */
    this.connection = conn
  }

  model(name, schema) {
    return this.conn.model(name, schema)
  }

  close() {
    logger.verbose('Closing MongoDB connection')
    this.connection.close()
    this.connection = null
    dao = null
  }

  generateId() {
    return nanoid.nanoid(12)
  }
}

/**
 * Initializes data access APIs and models.
 *
 * @returns {Promise<DAO>} DAO with models ready to use
 */
module.exports = {
  create: async function create() {
    const url = context.env.MONGO_URL
    const mongoUrl = url
      .replace('$MONGO_PASSWORD', process.env.MONGO_PASSWORD)
      .replace('$MONGO_USER', process.env.MONGO_USER)

    if (dao === null) {
      logger.verbose('Connecting to ' + mongoUrl)
      const conn = await mongoose.createConnection(mongoUrl, {
        bufferCommands: false,
        bufferMaxEntries: 0,
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false
      })

      dao = new DAO(conn)
      logger.verbose('Created dao', Object.keys(dao))
    }

    return dao
  }
}
