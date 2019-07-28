const chalk = require("chalk").default,
    program = require("commander"),
    CONFIG = require("./config");

/**
 * Creates a logger instance with utility functions.
 */
function makeLogger() {
    const logger = {};

    logger.error = (m) => console.log(chalk.red(`🚫 ERROR: `) + m);
    logger.warn = (m) => console.log(chalk.yellow(`⚠️  WARN: `) + m);
    logger.debug = (m) => console.log(chalk.gray(`🐛 DEBUG: `) + m);
    logger.info = (m) => console.log(chalk.blue(`ℹ️  INFO: `) + m);

    return logger;
}

exports.log = makeLogger();

/**
 * Returns the body of a function as a string.
 *
 * @param f Function The function.
 * @returns {string} The function's body as a string.
 */
exports.getFunctionBodyString = (f) => f.toString().replace(/(?:function)*[\s]*\(.*\)[=>\s]*\{/, "").trim().replace(/.$/, '').trim().replace(/.$/, '');

/**
 * Returns the CLI arguments, if any.
 *
 * @returns {commander.CommanderStatic | commander}
 */
exports.getCliArgs = function () {
    program
        .description(CONFIG.DESCRIPTION)
        .version(CONFIG.VERSION)
        .option('-t, --tests-path <path>', 'specify the tests path')
        .parse(process.argv);

    return program;
};