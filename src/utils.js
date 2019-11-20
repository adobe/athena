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
const fs = require('fs');
const path = require('path');
const os = require('os');

// External
const chalk = require('chalk');
const argv = require('yargs').argv;
const AstParser = require('acorn-loose');
const Joi = require('@hapi/joi');
const {isUndefined, remove} = require('lodash');
const ora = require('ora');
const yargs = require('yargs');

// Project
const CONFIG = require('./config');
const {ENTITY_TYPES} = require('./enums');
const schemas = require('./schemas');
const log = makeLogger();

/**
 * Creates a logger instance.
 * @return object The logger instance.
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
 * Returns the parsed settings based on the CLI args and defaults set.
 * @return object The parsed settings.
 */
function getParsedSettings(options = {}) {
  const defaults = {};

  defaults.examplesDir = CONFIG.EXAMPLES_DIR;
  defaults.basePath = CONFIG.BASEPATH;
  defaults.testsDir = options.tests || defaults.examplesDir;
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
  defaults.pluginsDir = options.plugins || CONFIG.PLUGINS_DIR;

  // Define the proper paths for all the directories defined above.
  defaults.examplesDirPath = path.resolve(defaults.basePath, defaults.examplesDir);
  defaults.testsDirPath = path.resolve(defaults.basePath, defaults.testsDir);
  defaults.pluginsDirPath = path.resolve(defaults.basePath, defaults.testsDir, defaults.pluginsDir);

  // Get half of the available CPUs
  defaults.cpusLength = Math.floor(os.cpus().length / 2);

  if (options.performance) {
    options.functional = false;
  }

  return {...defaults, ...options};
}

exports.getParsedSettings = getParsedSettings;

/**
 * Turns a snake-case string to camelCase.
 * @param str string The string that needs to be converted.
 * @return string The initial string, converted to camelCase.
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
 * @return Array The array of found expressions. An empty array, if none are found.
 */
exports.parseAstExpressions = (script) => {
  const ast = AstParser.parse(script);
  if (!ast.body || !script) return [];

  return ast.body.map((e) => script.substring(e.start, e.end)) || [];
};

/**
 * Creates a new empty container.
 * @return Object An instance of the container.
 */
exports.makeContainer = () => {
  function Container() {
    this.entries = [];
    this.add = (el) => this.entries.push(el);
    this.remove = (elToRemove) => remove(this.entries, (el) => el === elToRemove);

    return this;
  }

  return new Container();
};

exports.validateSchema = (entity) => { // 'Entity' type.
  const skipSchemaValidation = true; // todo: take this from args
  if (skipSchemaValidation) {
    return;
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

/**
 * Removes all empty properties from an object.
 * @param {object} obj The object.
 * @return {object} The object without empty properties.
 */
function removeEmpty(obj) {
  return Object.keys(obj)
      .filter((k) => obj[k] != null)
      .reduce(
          (newObj, k) =>
                typeof obj[k] === 'object' ?
                    {...newObj, [k]: removeEmpty(obj[k])} :
                    {...newObj, [k]: obj[k]},
          {}
      );
}

exports.removeEmpty = removeEmpty;

/**
 * Decorates a `isEntity` type method to check whether it is operating
 * on a TestFile entity. The returned callback currently accepts only
 * one parameter, however a great improvement would be to support multiple.
 *
 * @param {Function} callback The given callback.
 * @return {Function} The decorated callback function.
 */
function decorateCheckTestFile(callback) {
  /* eslint-disable */
  let currentContext = arguments.callee.toString()
      .substr('function '.length);
  currentContext = currentContext.substr(0, currentContext.indexOf('('));
  /* eslint-enable */

  if (!callback) {
    throw new Error(`A callback is required in ${currentContext}.`);
  }

  return function(entity) {
    const allowedEntityTypes = [
      'TestFileEntity',
      'FunctionalSuiteEntity',
      'FunctionalTestEntity',
      'FixtureEntity',
      'PerformanceTestEntity',
      'PerformancePatternEntity',
      'PerformanceRunEntity',
    ];

    if (allowedEntityTypes.indexOf(entity.constructor.name) === -1) {
      throw new Error(`A TestFile instance is required for this check ` +
          `in ${currentContext}().`);
    }

    return callback(entity);
  };
}

/**
 * Creates a decorated entity type checker based on a given argument.
 *
 * @param {string} argument The argument to check.
 * @param {string} type The value to check the argument againt.
 * @return {boolean} True if the check passed, false otherwise.
 */
function makeDecoratedEntityCheckFunction(argument, type) {
  return decorateCheckTestFile((entity) => {
    const entityConfig = entity.getConfig();

    return entityConfig[argument] === type;
  });
}

/**
 * Checks whether an entity type is a functional suite.
 * @return {boolean} True if the entity is a functional suite, false otherwise.
 */
exports.isFunctionalSuite = makeDecoratedEntityCheckFunction(
    'type',
    ENTITY_TYPES.SUITE
);

/**
 * Checks whether an entity type is a functional test.
 * @return {boolean} True if the entity is a functional test, false otherwise.
 */
exports.isFunctionalTest = makeDecoratedEntityCheckFunction(
    'type',
    ENTITY_TYPES.TEST
);

/**
 * Checks whether an entity type is a fixture.
 * @return {boolean} True if the entity is a fixture, false otherwise.
 */
exports.isFixture = makeDecoratedEntityCheckFunction(
    'type',
    ENTITY_TYPES.FIXTURE
);

/**
 * Checks whether an entity type is a performance suite.
 * @return {boolean} True if the entity is a performance suite, false otherwise.
 */
exports.isPerformanceSuite = makeDecoratedEntityCheckFunction(
    'type',
    ENTITY_TYPES.PERFORMANCE_SUITE
);

/**
 * Checks whether an entity type is a performance pattern.
 * @return {boolean} True if the entity is a performance pattern, false otherwise.
 */
exports.isPerformancePattern = makeDecoratedEntityCheckFunction(
    'type',
    ENTITY_TYPES.PERFORMANCE_PATTERN
);

/**
 * Checks whether an entity type is a performance run.
 * @return {boolean} True if the entity is a performance run, false otherwise.
 */
exports.isPerformanceRun = makeDecoratedEntityCheckFunction(
    'type',
    ENTITY_TYPES.PERFORMANCE_RUN
);
