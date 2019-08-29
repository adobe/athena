// External dependencies.
const chalk = require("chalk").default,
    program = require("commander"),
    fs = require("fs"),
    AstParser = require("acorn-loose");

// Project dependencies.
const CONFIG = require("./config");

/**
 * Creates a logger instance.
 * @param cliArgs object The command line arguments.
 * @returns object The logger instance.
 */
exports.makeLogger = (cliArgs) => {
    const logger = {};

    logger.success = (...m) => console.log(chalk.green(`✅ SUCCESS: `), ...m);
    logger.error = (...m) => console.log(chalk.red(`🚫 ERROR: `), ...m);
    logger.warn = (...m) => console.log(chalk.yellow(`⚠️  WARN: `), ...m);
    logger.info = (...m) => console.log(chalk.blue(`ℹ️  INFO: `), ...m);

    logger.debug = (...m) => {
        if (cliArgs.debug) {
            console.log(chalk.gray(`🐛 DEBUG: `), ...m);
        }
    };

    return logger;
};

/**
 * Returns the CLI arguments, if any.
 * @returns {commander.CommanderStatic | commander}
 */
exports.getCliArgs = function () {
    program
        .description(CONFIG.DESCRIPTION)
        .version(CONFIG.VERSION)
        .option('-t, --tests-path <path>', 'Specify the tests path.')
        .option('-D, --debug', 'Enable debug logging.')
        .option('-p, --make-plugin <name>', 'Scaffold a new plugin.')
        .option('-t, --make-test', 'Scaffold a new test.')
        .option('-g, --grep <regex>', 'Run only specific tests.')
        .option('-b, --bail', 'Fail fast after the first test failure.')
        .option('-v, --version <number>', 'The suite or test version number to run.') // TODO: Not implemented.
        .parse(process.argv);

    return program;
};

/**
 * Turns a snake-case string to camelCase.
 * @param str string The string that needs to be converted.
 * @returns string The initial string, converted to camelCase.
 */
exports.snakeToCamel = (str) => str.replace(
    /([-_][a-z])/g,
    (group) => group.toUpperCase()
        .replace('-', '')
        .replace('_', '')
);

/**
 * Synchronously checks whether a directory path exists; if not, creates it.
 * @param path string The path.
 */
exports.maybeCreateDirSync = (path) => {
    try {
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
        }
    } catch (e) {
        console.error(`Could not create directory "${path}" due to the following error: \n`, e);
    }
};

/**
 * Returns an array of found expressions within a script.
 * @param script String The script.
 * @returns Array The array of found expressions. An empty array, if none are found.
 */
exports.parseAstExpressions = (script) => {
    const ast = AstParser.parse(script);
    if (!ast.body || !script) return [];

    return ast.body.map(e => script.substring(e.start, e.end)) || [];
};

exports.isSingleTest = (entity) => {
    return entity.data && entity.data.type !== "spec";
};