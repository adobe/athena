const path = require("path"),
    fs = require("fs"),
    jsYaml = require("js-yaml"),
    Mocha = require("mocha"),
    _ = require("lodash"),
    toSource = require("tosource");

const CONFIG = require("./config");
const {log, getFunctionBodyString, getCliArgs} = require("./utils");
const {TYPES} = require("./enums");

// Check node version.
// TODO: Naive approach as the destructuring above may crash the process in certain Node versions.
const [major, minor] = process.versions.node.split('.').map(parseFloat);

if (major < 7 || (major === 7 && minor <= 5)) {
    log.error(`Atena requires Node 7.6 or greater! 🔗 Read more: https://node.green/`);
    process.exit();
}

class Atena {
    constructor(options) {
        this.cliArgs = getCliArgs();        // CLI arguments passed via commander.
        this.options = {};                  // Options object during initialization.
        this.specs = [];                    // Collection of all available suites.
        this.tests = [];                    // Collection of remaining "hanging" tests.
        this.registeredSuites = {};         // Registered test suites.
        this.mocha = new Mocha();

        this.setOptions(options)
            .overrideDefaultMethods()
            .parseTestFiles()
            .registerTestSuites()
            .runTestSuites();
    }

    registerTestSuites = () => {
        const registeredSuites = this.registeredSuites;
        const mocha = this.mocha;

        // TODO: Remove duplicated code.
        // TODO: Parse plugins and injext them in the proper context.

        // Register suites
        this.specs.forEach((spec) => {
            let {name: specFileName} = spec.fileData;
            specFileName = `${specFileName}.atena.js`;

            registeredSuites[specFileName] = {};
            registeredSuites[specFileName].$data = spec;
            registeredSuites[specFileName].$suite = (() => { // TODO: Rename $suite to $entity?
                // INJECTED: $suite

                const assert = require('assert').ok,
                    chakram = require('chakram'),
                    expect = chakram.expect;

                describe(`${$suite.data.name} [${$suite.data.version}]`, function () {
                    $suite.tests.forEach((test) => {
                        const {name, description, version} = test.data;
                        it(`${name} [${version}]: ${description}`, function () {
                            // TODO: parse real assertions.
                            return expect(true).to.be.true;
                        });
                    });
                });

            });

            mocha.addFile(specFileName);
        });

        this.tests.forEach((test) => {
            let {name: testFileName} = test.fileData;
            testFileName = `${testFileName}.atena.js`;

            registeredSuites[testFileName] = {};
            registeredSuites[testFileName].$data = test;
            registeredSuites[testFileName].$suite = (() => { // TODO: Rename $suite to $entity?
                // INJECTED: $suite

                const assert = require('assert').ok,
                    chakram = require('chakram'),
                    expect = chakram.expect;

                describe(`${$suite.data.name}: [${$suite.data.version}]`, function () {
                    const {name, description} = $suite.data;
                    it(`${description}`, function () {
                        return expect(true).to.be.true;
                    });
                });

            });

            mocha.addFile(testFileName);
        });

        return this;
    };

    runTestSuites = () => {
        this.mocha.run((fail) => {
            process.exitCode = fail ? 1 : 0
        });

        return this;
    };

    parseTestFiles = () => {
        const testFiles = fs.readdirSync(this.options.testsDirPath).map((testFileName) => {
            const testFile = {};

            testFile.filename = testFileName;
            testFile.path = path.resolve(this.options.testsDirPath, testFileName);
            testFile.fileData = path.parse(testFile.path);
            testFile.data = jsYaml.safeLoad(fs.readFileSync(testFile.path), 'utf-8');

            return testFile;
        });

        // Parse specs
        this.specs = testFiles.filter(t => t.data && t.data.type === TYPES.SPEC);

        // Parse plugins.
        this.plugins = testFiles.filter(t => t.data && t.data.type === TYPES.PLUGIN);

        // Parse test files that belong to certain suites.
        const tests = _.xor(testFiles, this.specs, this.plugins);

        tests.forEach((test) => {
            // Filter out the hanging test files.
            if (!test.data.specRef) {
                this.tests.push(test);
                return;
            }

            // Parse test files, include them in suites.
            const {specRef, name: testName} = test.data;
            let self = this;
            specRef.forEach((specRef) => {
                const specIdx = _.findIndex(self.specs, (s) => s.data.name === specRef);

                // Check whether the specified spec exists.
                if (specIdx === -1) {
                    log.warn(`Could not find spec "${specRef}" for test "${testName}".`);
                    return;
                }

                self.specs[specIdx].tests = self.specs[specIdx].tests || [];
                self.specs[specIdx].tests.push(test);
            });
        });

        return this;
    };

    setOptions = (options) => {
        const defaults = {};

        defaults.examplesDir = CONFIG.EXAMPLES_DIR;
        defaults.testsDir = this.cliArgs.testsPath;

        if (!fs.existsSync(defaults.testsDir)) {
            log.warn(`The specified tests directory does not exist: (${defaults.testsDir}). Using the example tests instead.`);
            defaults.testsDir = defaults.examplesDir;
        }

        defaults.examplesDirPath = path.resolve(__dirname, defaults.examplesDir);
        defaults.testsDirPath = path.resolve(__dirname, defaults.testsDir);

        this.options = Object.assign({}, defaults, options);

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

            let {
                $suite,
                $data
            } = this.registeredSuites[fileName];

            return `${"let $suite = " + toSource($data) + ";"} ${getFunctionBodyString($suite)}`;
        };

        return this;
    };
}

exports = module.exports = Atena;