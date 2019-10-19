/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

// Node
const fs = require("fs"),
    path = require("path"),
    os = require("os");

// External
const chalk = require("chalk").default,
    argv = require("yargs").argv,
    AstParser = require("acorn-loose"),
    Joi = require("@hapi/joi"),
    {isUndefined, remove} = require("lodash"),
    ora = require("ora"),
    yargs = require("yargs");

// Project
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

    logger.success = (...m) => console.log(chalk.green(`✔ SUCCESS: `), ...m);
    logger.warn = (...m) => console.log(chalk.yellow(`☢️ WARN: `), ...m);
    logger.info = (...m) => console.log(chalk.blue(`💬 INFO: `), ...m);

    logger.error = (...m) => {
        console.log(chalk.red(`🚫 ERROR: `), ...m);
        process.exit(1);
    };

    logger.debug = (...m) => {
        if (yargs.argv.debug) {
            console.log(chalk.gray(`🐛 DEBUG: `), ...m);
        }
    };

    return logger;
}

exports.makeLogger = makeLogger;
exports.log = log;

/**
 * Returns the CLI arguments, if any.
 * @returns {commander.CommanderStatic | commander}
 */
// function getCliArgs() {
//     program
//         .description(CONFIG.DESCRIPTION)
//         .version(CONFIG.VERSION)
//         .option('-t, --tests-path <path>', 'Specify the tests path.')
//         .option('-D, --debug', 'Enable debug logging.')
//         .option('-p, --make-plugin <name>', 'Scaffold a new plugin.')
//         .option('-t, --make-test', 'Scaffold a new test.')
//         .option('-g, --grep <regex>', 'Run only specific tests.')
//         .option('-b, --bail', 'Fail fast after the first test failure.')
//         .option('-P, --performance', 'run performance tests')
//         .option('-F, --functional', 'run functional tests')
//         .parse(process.argv);
//
//     return program;
// }

function getCliArgs() {
    return {};
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

    // Get half of the available CPUs
    defaults.cpusLength = Math.floor(os.cpus().length / 2);

    if (options.performance) {
        options.functional = false;
    }

    const final = {...defaults, ...cliArgs, ...options};

    return final;
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
        this.remove = (el) => remove(this.entries, (el) => el === el);

        return this;
    }

    return new Container();
};

exports.validateSchema = (entity) => { // 'Entity' type.
    const skipSchemaValidation = true; // todo: take this from args
    if (skipSchemaValidation) {
        return
    }

    const entityConf = entity.getConfig();
    const entityType = entity.getType();
    const schema = schemas[entityType];

    let validationResult = null;

    try {
        validationResult = Joi.validate(entityConf, schema);
    } catch (error) {
        throw new Error(`${error} inside "${entity.getFileName()}"`);
    }

    return validationResult;
};

exports.startSpinner = (message) => {
    const spinner = ora();
    spinner.text = message;
    spinner.start();

    return spinner;
};

exports.getPackageInstallCommand = (packageName) => {
    let manager = 'npm';

    if (argv.yarn) {
        manager = 'yarn';
    }

    let command = null;

    if (manager === 'npm') {
        command = `npm install ${packageName} --save`;
    } else if (manager === 'yarn') {
        command = `yarn add ${packageName}`;
    }

    return [command, manager];
};

// Removed empty properties from an object.
exports.removeEmpty = obj =>
    Object.keys(obj)
        .filter(k => obj[k] != null)
        .reduce(
            (newObj, k) =>
                typeof obj[k] === "object"
                    ? {...newObj, [k]: removeEmpty(obj[k])}
                    : {...newObj, [k]: obj[k]},
            {}
        );

// todo: factory? adjust enums to uppercase first though
exports.isSuite = (entity) => entity && entity.config && entity.config.type === ENTITY_TYPES.SUITE;
exports.isTest = (entity) => entity && entity.config && entity.config.type === ENTITY_TYPES.TEST;
exports.isFixture = (entity) => entity && entity.config && entity.config.type === ENTITY_TYPES.FIXTURE;

// todo: deprecated, remove this
exports.isSingleTest = (entity) => entity.data && entity.data.type !== "spec";

exports.isPerformanceRun = (entity) => entity && entity.config && entity.config.type === "perfRun";
exports.isPerformanceTest = (entity) => entity && entity.config && entity.config.type === "perfTest";
exports.isPerformancePattern = (entity) => entity && entity.config && entity.config.type === "perfPattern";
