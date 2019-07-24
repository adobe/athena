var chalk = require("chalk").default;

const log = {}

log.error = (m) => console.log(chalk.red(`🚫 ERROR: `) + m)
log.warn = (m) => console.log(chalk.yellow(`⚠️  WARN: `) + m)
log.debug = (m) => console.log(chalk.gray(`🐛 DEBUG: `) + m)
log.info = (m) => console.log(chalk.blue(`ℹ️  INFO: `) + m)

module.exports = log