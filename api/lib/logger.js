/* eslint-disable no-console */

const env = process != undefined && process.env !== undefined ? process.env : {}

// @ts-ignore
if (!console.__logging_enabled) {
  // @ts-ignore
  console.__logging_enabled = true

  const _info = console.info
  const _error = console.error
  const _warn = console.warn
  const _prefix = env.GIT_TAGS || 'dev'

  console.info = (...args) => _info.apply(console, [_prefix, ...args])
  console.error = (...args) => _error.apply(console, [_prefix, ...args])
  console.warn = (...args) => _warn.apply(console, [_prefix, ...args])
}

const fs =
  typeof window === 'object'
    ? {
        writeFileSync: (name, contents) => {
          console.log(name, contents)
        }
      }
    : eval('require("fs")')

module.exports = {
  isAudit: !!env.LOG_AUDIT,
  isVerbose: !!env.LOG_VERBOSE,
  isDump: !!env.LOG_DUMP,
  info: console.info,
  audit: !!env.LOG_AUDIT
    ? (...args) => console.info.apply(console, ['AUDIT', ...args])
    : () => {},
  verbose: !!env.LOG_VERBOSE
    ? (...args) => console.info.apply(console, ['DEBUG', ...args])
    : () => {},
  dump: (filename, contents) => fs.writeFileSync('test/dump/' + filename, contents),
  warn: console.warn,
  error: console.error
}
