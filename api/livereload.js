const livereload = require('livereload')
const logger = require('./lib/logger')

const server = livereload.createServer({
  extraExts: ['ejs']
})

server.watch([__dirname + '/public', __dirname + '/views'])

server.server.once('connection', () => {
  setTimeout(() => {
    logger.info('Reloading page')
    server.refresh('/')
  }, 100)
})

global.livereload = true
