// Node dependencies
const fs = require("fs"),
    path = require("path");

// External dependencies.
const chalk = require("chalk").default,
    program = require("commander"),
    AstParser = require("acorn-loose"),
    Joi = require("@hapi/joi"),
    {isUndefined} = require("lodash");

// Project dependencies.
const CONFIG = require("./config"),
    {ENTITY_TYPES} = require("./enums"),
    schemas = require("./schemas"),
    log = makeLogger();

/**
 * Creates a logger instance.
 * @returns object The logger instance.
 */
function makeLogger() {
    const logger = {};
    const cliArgs = getCliArgs();

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
}

exports.makeLogger = makeLogger;

/**
 * Returns the CLI arguments, if any.
 * @returns {commander.CommanderStatic | commander}
 */
function getCliArgs() {
    program
        .description(CONFIG.DESCRIPTION)
        .version(CONFIG.VERSION)
        .option('-t, --tests-path <path>', 'Specify the tests path.')
        .option('-D, --debug', 'Enable debug logging.')
        .option('-p, --make-plugin <name>', 'Scaffold a new plugin.')
        .option('-t, --make-test', 'Scaffold a new test.')
        .option('-g, --grep <regex>', 'Run only specific tests.')
        .option('-b, --bail', 'Fail fast after the first test failure.')
        .option('-P, --performance', 'run performance tests')
        .option('-F, --functional', 'run functional tests')
        .parse(process.argv);

    return program;
}

exports.getCliArgs = getCliArgs;

/**
 * Returns the parsed settings based on the CLI args and defaults set.
 * @returns object The parsed settings.
 */
function getParsedSettings(options = {}) {
    const defaults = {};
    const cliArgs = getCliArgs();

    defaults.examplesDir = CONFIG.EXAMPLES_DIR;
    defaults.basePath = CONFIG.BASEPATH;
    defaults.testsDir = cliArgs.testsPath;
    defaults.performance = false;
    defaults.functional = false;

    // Check whether the specified tests directory exists, otherwise use the default examples.
    if (!fs.existsSync(defaults.testsDir)) {
        if (!isUndefined(defaults.testsDir)) {
            log.warn(`The specified tests directory does not exist: (${defaults.testsDir}). Using the example tests instead.`);
        }
        defaults.testsDir = defaults.examplesDir;
    }

    // Define the default plugins directory.
    defaults.pluginsDir = cliArgs.pluginsDir || CONFIG.PLUGINS_DIR;

    // Define the proper paths for all the directories defined above.
    defaults.examplesDirPath = path.resolve(defaults.basePath, defaults.examplesDir);
    defaults.testsDirPath = path.resolve(defaults.basePath, defaults.testsDir);
    defaults.pluginsDirPath = path.resolve(defaults.basePath, defaults.testsDir, defaults.pluginsDir);
    return {...defaults, ...cliArgs, ...options};
}

exports.getParsedSettings = getParsedSettings;

/**
 * Turns a snake-case string to camelCase.
 * @param str string The string that needs to be converted.
 * @returns string The initial string, converted to camelCase.
 */
const snakeToCamel = (str) => str.replace(
    /([-_][a-z])/g,
    (group) => group.toUpperCase()
        .replace('-', '')
        .replace('_', '')
);

exports.snakeToCamel = snakeToCamel;

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

/**
 * Creates a new empty container.
 * @returns Object An instance of the container.
 */
exports.makeContainer = () => {
    function Container() {
        this.entries = [];
        this.add = (el) => this.entries.push(el);

        return this;
    }

    return new Container();
};

exports.validateSchema = (entity)  => {
    const schema = schemas[`${entity.type}`];
    const validationResult = Joi.validate(entity, schema);
    return validationResult;
};

// todo: factory? adjust enums to uppercase first though
exports.isSuite = (entity) => entity && entity.config && entity.config.type === ENTITY_TYPES.SUITE;
exports.isTest = (entity) => entity && entity.config && entity.config.type === ENTITY_TYPES.TEST;
exports.isFixture = (entity) => entity && entity.config && entity.config.type === ENTITY_TYPES.FIXTURE;

// todo: deprecated, remove this
exports.isSingleTest = (entity) => entity.data && entity.data.type !== "spec";

exports.isPerformanceTest = (entity) => entity && entity.config && entity.config.type === ENTITY_TYPES.PERFORMANCE_TEST;
exports.isPerformancePattern = (entity) => entity && entity.config && entity.config.type === ENTITY_TYPES.PATTERN;
exports.isPerformanceRun = (entity) => entity && entity.config && entity.config.type === ENTITY_TYPES.PERFORMANCE_RUN;