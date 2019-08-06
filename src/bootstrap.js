const path = require("path"),
    fs = require("fs"),
    jsYaml = require("js-yaml"),
    Mocha = require("mocha"),
    {xor, isUndefined, findIndex, find, isFunction} = require("lodash"),
    toSource = require("tosource");

const CONFIG = require("./config");
const {makeLogger, getCliArgs} = require("./utils");
const {TYPES} = require("./enums");
const ScaffoldManager = require("./scaffoldManager");

class Atena {
    constructor(options) {
        this.cliArgs = getCliArgs();        // CLI arguments passed via commander.
        this.options = {};                  // Options object during initialization.
        this.specs = [];                    // Collection of all available suites.
        this.tests = [];                    // Collection of remaining "hanging" tests.
        this.registeredSuites = [];         // Registered test suites.

        this.mocha = new Mocha();
        this.log = makeLogger(this.cliArgs);

        this.checkNodeVersion()
            .setOptions(options)
            .handleScaffolding()
            .overrideDefaultMethods()
            .parseTestFiles()
            .registerTestSuites()
            .runTestSuites();
    }

    /**
     * PUBLIC
     */

    checkNodeVersion = () => {
        const [major, minor] = process.versions.node.split('.').map(parseFloat);

        if (major < 7 || (major === 7 && minor <= 5)) {
            this.log.error(`Atena requires Node 7.6 or greater!`);
            process.exit();
        }

        return this;
    };

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
                scaffold[commandName]();
                scaffoldCommandUsed = true
            }
        };

        // Handle the `makePlugin` scaffold command.
        if (this.cliArgs.makePlugin) {
            handleScaffoldCommand("makePlugin");
        }

        // Check whether any scaffolding command was used and exit the
        // process earlier.
        if (scaffoldCommandUsed) {
            process.exit(0);
        }

        return this;
    };

    runTestSuites = () => {
        this.mocha.run((fail) => {
            process.exitCode = fail ? 1 : 0
        });

        return this;
    };

    parseTestFiles = () => {
        const _testFiles = fs.readdirSync(this.options.testsDirPath);
        const testFiles = [];

        // Parse each test file.
        for (let testFileName of _testFiles) {
            const testFile = {};

            testFile.filename = testFileName;
            testFile.path = path.resolve(this.options.testsDirPath, testFileName);

            // Skip directories.
            if (fs.lstatSync(testFile.path).isDirectory())
                continue;

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

        // Register specs
        this.specs.forEach(($data) => {
            const fileName = `${$data.fileData.name}.atena.js`;

            // Define the entity context.
            const $entityContext = Object.create(null);
            $entityContext.toString = function () {
                return generateEntityContext(maybeAsTestSuite(withTestCases($data)))
            };

            // Register the new suite.
            registeredSuites.push({fileName, $data, $entity: $entityContext});

            // Register the file with Mocha.
            mocha.addFile(fileName);
        });

        // TODO: Register individual tests.

        function generateEntityContext([$entity, $testSuite]) {
            // TODO: Generate dependencies dynamically.
            return `
                const assert = require('assert').ok,
                    chakram = require('chakram'),
                    expect = chakram.expect;

                   ${$testSuite}
            `;
        }

        function maybeAsTestSuite([$entity, $testCases]) {
            // Maybe wrap the test cases into a test suite.
            if (!$entity.data.type === "spec")
                return [$entity, $testCases];

            const $testSuite = `
                describe("${$entity.data.name} [v${$entity.data.version}]", function() {
                    ${$testCases}
                });`;

            return [$entity, $testSuite];
        }

        function withTestCases($entity) {
            const generateAssertions = (test) => {
                // TODO: Check whether the scenario is missing, or any of the given, when or then stages is missing.
                return `
                    ${test.data.scenario.given}
                    ${test.data.scenario.when}
                    ${test.data.scenario.then}
                `;
            };

            const generateTestCase = (test) => {
                const {name, version} = test.data;
                return `
                    it("${name} [v${version}]", function() {
                        ${generateAssertions(test)}
                    });`;
            };

            return [$entity, $entity.tests.map(generateTestCase).join("\n")];
        }

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