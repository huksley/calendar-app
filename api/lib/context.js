const devEnv = process.env.NODE_ENV === undefined || process.env.NODE_ENV == 'development'

/**
 * Application static context.
 */
const context = (module.exports.context = {
  env: {
    // Don't add everything, only that is actually needed
    GIT_TAGS: process.env.GIT_TAGS,
    MONGO_URL: process.env.MONGO_URL
  },
  devEnv,
  prodEnv: process.env.NODE_ENV === 'production',
  mode: devEnv ? 'development' : process.env.NODE_ENV,
  shortMode: devEnv
    ? 'dev'
    : process.env.NODE_ENV === 'production'
    ? 'prod'
    : process.env.NODE_ENV === 'staging'
    ? 'stage'
    : process.env.NODE_ENV
})

/**
 * Creates context for current API call, derived from staticContext.
 *
 * @param {object?} req - HTTP API request
 * @returns {typeof context} Context information
 */
module.exports.getContext = function getContext(req) {
  return req
    ? {
        ...context,
        method: req.method,
        url: req.url
      }
    : {
        ...context
      }
}
