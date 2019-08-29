// Node dependencies.
const path = require("path"),
    fs = require("fs");

// External dependencies.
const jsYaml = require("js-yaml"),
    Mocha = require("mocha"),
    {xor, isUndefined, findIndex, find, isFunction} = require("lodash"),
    toSource = require("tosource");

// Project dependencies.
const CONFIG = require("./config"),
    {makeLogger, getCliArgs, isSingleTest, parseAstExpressions} = require("./utils"),
    {TYPES, COMMANDS, CONTEXTS, PLUGIN_TYPES} = require("./enums"),
    ScaffoldManager = require("./scaffoldManager");

class Atena {
    constructor(options) {
        this.cliArgs = getCliArgs();        // CLI arguments passed via commander.
        this.options = {};                  // Options object during initialization.
        this.specs = [];                    // Collection of all available suites.
        this.tests = [];                    // Collection of remaining "hanging" tests.
        this.registeredSuites = [];         // Registered test suites.

        this.mocha = new Mocha();
        this.log = makeLogger(this.cliArgs);

        this.setOptions(options)
            .handleScaffolding()
            .overrideDefaultMethods()
            .parseTestFiles()
            .registerTestSuites()
            .runTestSuites();
    }

    /**
     * PUBLIC
     */

    handleScaffolding = () => {
        let scaffoldCommandUsed = false;
        const scaffold = new ScaffoldManager(this.options);

        // Handles a scaffold command.
        const handleScaffoldCommand = (command) => {
            const commandName = `handle${command.substr(0, 1).toUpperCase() + command.slice(1)}`;

            if (typeof scaffold[commandName] === "undefined") {
                this.log.debug(`Could not handle the "${command}" scaffolding command.`);
                return;
            }

            if (isFunction(scaffold[commandName])) {
                this.log.debug(`Scaffolding: Handling command "${commandName}".`)
                scaffoldCommandUsed = true;
                scaffold[commandName]();
            }
        };

        for (const COMMAND of Object.keys(COMMANDS)) {
            const ACTION = COMMANDS[COMMAND];

            if (this.cliArgs[ACTION]) {
                handleScaffoldCommand(ACTION);
            }
        }

        // Check whether any scaffolding command was used
        // and exit the process earlier.
        if (scaffoldCommandUsed) {
            process.exit(0);
        }

        return this;
    };

    runTestSuites = () => {
        const {grep, bail} = this.options;

        // Check whether any grep pattern was used.
        if (grep) {
            this.log.debug(`Grep pattern enabled. Running only tests that match the "${grep}" pattern.`);
            this.mocha.grep(grep);
        }

        // Check whether bail mode has been enabled.
        if (bail) {
            this.log.debug("Bailing mode enabled. Will fail fast after the first test failure.");
            this.mocha.bail(bail);
        }

        this.mocha.run((fail) => {
            process.exitCode = fail ? 1 : 0
        });

        return this;
    };

    parseTestFiles = () => {
        const testFiles = [];

        // Parse each test file.
        for (let testFileName of fs.readdirSync(this.options.testsDirPath)) {
            const testFile = {};

            testFile.filename = testFileName;
            testFile.path = path.resolve(this.options.testsDirPath, testFileName);

            // Skip directories.
            if (fs.lstatSync(testFile.path).isDirectory()) {
                continue;
            }

            testFile.fileData = path.parse(testFile.path);
            testFile.data = jsYaml.safeLoad(fs.readFileSync(testFile.path), 'utf-8');

            testFiles.push(testFile);
        }

        // Parse specs
        this.specs = testFiles.filter(t => t.data && t.data.type === TYPES.SPEC);

        // Parse plugins.
        this.plugins = testFiles.filter(t => t.data && t.data.type === TYPES.PLUGIN);

        // Parse test files that belong to certain suites.
        xor(testFiles, this.specs, this.plugins).forEach(this._parseSingleTest);

        return this;
    };

    setOptions = (options) => {
        const defaults = {};

        defaults.examplesDir = CONFIG.EXAMPLES_DIR;
        defaults.testsDir = this.cliArgs.testsPath;

        if (!fs.existsSync(defaults.testsDir)) {
            if (!isUndefined(defaults.testsDir)) {
                this.log.warn(`The specified tests directory does not exist: (${defaults.testsDir}). Using the example tests instead.`);
            }
            defaults.testsDir = defaults.examplesDir;
        }

        // Define the default plugins directory.
        defaults.pluginsDir = CONFIG.PLUGINS_DIR;

        if (this.cliArgs.pluginsDir) {
            defaults.pluginsDir = this.cliArgs.pluginsDir;
        }

        // Define the proper paths for all the directories defined above.
        defaults.examplesDirPath = path.resolve(__dirname, defaults.examplesDir);
        defaults.testsDirPath = path.resolve(__dirname, defaults.testsDir);
        defaults.pluginsDirPath = path.resolve(__dirname, defaults.testsDir, defaults.pluginsDir);

        this.options = {...this.cliArgs, ...defaults};

        return this;
    };

    overrideDefaultMethods = () => {
        // Preserve original methods.
        const originalReadFileSync = fs.readFileSync;
        const originalFindPath = module.constructor._findPath;

        // Override default _findPath method.
        module.constructor._findPath = (...args) => {
            let fileName = path.basename(args[0]);

            if (fileName.indexOf(".atena.") !== -1) {
                return fileName;
            }

            return originalFindPath(...args);
        };

        // Override default readFileSync
        fs.readFileSync = (...args) => {
            let fileName = path.basename(args[0]);

            if (fileName.indexOf(".atena.") === -1) {
                return originalReadFileSync(...args);
            }

            const suite = find(this.registeredSuites, {fileName});

            if (!suite) {
                throw new Error(`Could not find registered entity (test/suite): "${fileName}".`);
            }

            return `
                let $entity = ${toSource(suite.$data)};            
                ${suite.$entity}
            `;
        };

        return this;
    };

    registerTestSuites = () => {
        const registeredSuites = this.registeredSuites;
        const mocha = this.mocha;

        function registerEntity($data) {
            const fileName = `${$data.fileData.name}.atena.js`;

            // Define the entity context.
            const $entityContext = {};
            $entityContext.toString = () => generateEntityContext(maybeAsTestSuite(withTestCases($data)));

            // Register the new suite.
            registeredSuites.push({fileName, $data, $entity: $entityContext});

            // Register the file with Mocha.
            mocha.addFile(fileName);
        }

        // Register specs and tests.
        [...this.specs, ...this.tests].forEach(registerEntity);


        const generatePluginsRequire = (plugins) => {
            // Assuming that 'plugins' is not empty.
            return plugins.map(p => {
                let {type, path: pluginPath, exposes} = p.data.config;

                if (!type) {
                    this.log.debug(`Plugin Parsing [${p.data.name}]: Plugin "type" missing, assuming "${PLUGIN_TYPES.LIB}".`);
                    type = PLUGIN_TYPES.LIB;
                }

                if (!pluginPath) {
                    this.log.error(`Plugin Parsing [${p.data.name}]: Plugin "path" missing.`);
                    process.exit(0);
                }

                if (!exposes) {
                    this.log.debug(`Plugin Parsing [${p.data.name}]: Plugin "exposes" missing, assuming "${p.data.name}".`);
                    exposes = p.data.name;
                }

                return `const ${exposes} = require("${path.resolve(this.options.testsDirPath, pluginPath)}"); ${"\n"}`;
            }).join("\n");
        };

        const maybeInjectPlugins = ($entity, globalContext = false) => {
            const plugins = []; // Plugins required for the current context.

            // Check whether the current entity provides any data.
            if (!$entity.data || !$entity.data.name) {
                this.log.warn(`Plugin Injection: Attempt to inject plugins failed as the current entity does not provide any data.`);
                return '';
            }

            // Check whether any plugins are parsed.
            if (isUndefined(this.plugins)) {
                this.log.info(`No plugins identified.`);
                return '';
            }

            // Function that checks whether a plugin has already been injected.
            const pluginIsAlreadyInjected = (plugin) => findIndex(plugins, p => p.data.name === plugin.data.name) !== -1;

            // Filter all plugins for this current context.
            for (let idx in this.plugins) {
                let plugin = this.plugins[idx];

                // Check whether the plugin defines any data.
                if (!plugin.data || !plugin.data.name) {
                    this.log.warn(`Plugin Injection: Attempt to load plugin failed as data is missing.`);
                    continue;
                }

                // Continue the loop if the plugin has already been injected.
                if (pluginIsAlreadyInjected(plugin)) {
                    // TODO: Add required context and existing context to log message.
                    this.log.debug(`Plugin Injection: Attempt to load plugin "${plugin.data.name}" failed.`);
                    continue;
                }

                // Check whether the plugin needs to be injected inside the current context (extracted from the entity's data)
                // or whether it should be included inside the global context.
                if (
                    (plugin.data.context === $entity.data.name ||
                        (globalContext && plugin.data.context === CONTEXTS.GLOBAL))
                ) {
                    this.log.debug(`Plugin Injection: Successfully identified plugin "${plugin.data.name}" as required for injection inside the "${plugin.data.context}" context.`);
                    plugins.push(plugin);
                }
            }

            // If there are no plugins required for injection, return early.
            if (!plugins.length) {
                return '';
            }

            // Return the list of plugins that should be injected inside the current context.
            return generatePluginsRequire(plugins);
        };

        const generateEntityContext = ([$entity, $testSuite]) => {
            return `
                const assert = require('assert').ok,
                    chakram = require('chakram'),
                    expect = chakram.expect;
                    
                ${maybeInjectPlugins($entity, true)}
                ${$testSuite}
            `;
        };

        const maybeAsTestSuite = ([$entity, $testCases]) => {
            const { name, type, version } = $entity.data;

            // Maybe wrap the test cases into a test suite.
            if (type !== "spec") {
                return [$entity, $testCases];
            }

            const $testSuite = `
                describe("${name} ${version ? '[v' + version + ']' : ''}", function() {
                    ${maybeInjectPlugins($entity)}
                    ${$testCases}
                });`;

            return [$entity, $testSuite];
        };

        const withTestCases = ($entity) => {
            const generateAssertions = (test) => {
                if (!test.data || !test.data.scenario) return '';
                let { given, when, then } = test.data.scenario;
                then = parseAstExpressions(then).map(e => e.replace(';', '')).join(',');

                return `
                    ${given}
                    ${when}
                    return Promise.all([${then}])`;
            };

            const generateTestCase = (test) => {
                const {name, version} = test.data;
                return `
                    it("${name} ${version ? '[v' + version + ']' : ''}", function() {
                        ${maybeInjectPlugins($entity)}
                        ${generateAssertions(test)}
                    });`;
            };

            if (isSingleTest($entity)) {
                return [$entity, generateTestCase($entity)]
            }

            return [$entity, $entity.tests.map(generateTestCase).join("\n")];
        };

        return this;
    };

    /**
     * PRIVATE
     */

    _parseSingleTest = (test) => {
        // Filter out the hanging test files.
        if (!test.data.specRef) {
            this.tests.push(test);
            return;
        }

        // Parse test files, include them in suites.
        const {specRef} = test.data;

        // Link tests to specRefs
        specRef.forEach((specRef) => {
            this._linkTestsToSpecRefs(specRef, test)
        });
    };

    _linkTestsToSpecRefs = (specRef, test) => {
        const specIdx = findIndex(this.specs, (s) => s.data.name === specRef);

        // Check whether the specified spec exists.
        if (specIdx === -1) {
            this.log.warn(`Could not find spec "${specRef}" for test "${test.data.name}".`);
            return;
        }

        this.specs[specIdx].tests = this.specs[specIdx].tests || [];
        this.specs[specIdx].tests.push(test);
    };
}

exports = module.exports = Atena;