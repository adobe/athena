// node
const fs = require("fs"),
    path = require("path");

// external
const Mocha = require("mocha"),
    {find} = require("lodash"),
    toSource = require("tosource"),
    jsBeautify = require("js-beautify");

// project
const {TAXONOMIES, ENGINES} = require("./../enums"),
    {isSuite, isTest, makeLogger, parseAstExpressions, validateSchema} = require("./../utils");

class ChakramEngine {
    constructor(settings, entityManager, pluginManager) {
        this.engine = new Mocha();
        this.name = ENGINES.CHAKRAM;
        this.taxonomy = TAXONOMIES.FUNCTIONAL;
        this.settings = settings;
        this.entityManager = entityManager;
        this.pluginManager = pluginManager;
        this.log = makeLogger();
        this.nativeMethods = {
            findPath: null,
            readFileSync: null
        };

        this._overrideDefaultMethods();

        // parse and register entities
        this.entities = this.entityManager
            .getAllBy("engine", this.name) // todo: naive query as plugins/fixtures may be included as well if the engine property is mistakenly provided.
            .map(this._deepParseEntities)
            .filter(e => e !== undefined) // todo: fix this
            .map(this._registerEntities); // todo: map only once dummy
    };

    run = () => {
        const {grep, bail} = this.settings;

        if (grep) {
            this.log.debug(`Grep pattern enabled. Running only tests that match the "${grep}" pattern.`);
            this.engine.grep(grep);
        }

        if (bail) {
            this.log.debug("Bailing mode enabled. Will fail fast after the first test failure.");
            this.engine.bail(bail);
        }

        this.engine.run((fail) => {
            process.exitCode = fail ? 1 : 0
        });

        this._destruct();
    };

    _registerEntities = (e) => {
        e.toString = e.getContext;
        e.fileName = `${e.config.name}.atena.js`; // todo: use a setter.
        this.engine.addFile(e.fileName);

        return e;
    };

    _deepParseEntities = (e) => {
        if (isTest(e)) {

            // todo: validate test schema
            const validationResult = validateSchema(e.config);
            
            if (validationResult.error) {
                validationResult.error.details.forEach(err => {
                    console.log(`${e.name}  ${err.message} (path: ${err.path})`)
                });
            }

            e.setTaxonomy(this.taxonomy);
            e.setContext(this._generateTestContext(e));

            return e;
        }

        if (isSuite(e)) {
            // todo: validate suite schema
            const validationResult = validateSchema(e.config);
            if (validationResult.error) {
                validationResult.error.details.forEach(err => {
                    console.log(`${e.name}  ${err.message} (path: ${err.path})`)
                });
            }

            e.setTaxonomy(this.taxonomy);

            if (e.tests.length) {
                e.tests = e.tests.map(this._deepParseEntities);
                const testsCtx = e.tests.map(t => t.getContext());
                const suiteCtx = this._generateSuiteContext(e, testsCtx.join('\n'));
                e.setContext(suiteCtx);
            }

            return e;
        }
    };

    _generateTestContext = (test) => {
        const {name, version, description} = test.config;
        return `it("${name} ${version ? '[v' + version + ']' : ''}${description ? ' - ' + description : ''}", function() {
                    ${this.pluginManager.maybeInjectFixtures(test)}
                    ${this._generateAssertions(test)}
                });`;
    };

    _generateSuiteContext = (suite, testCases) => {
        const {name, version, description} = suite.config;
        return `describe("${name} ${version ? '[v' + version + ']' : ''}${description ? ' - ' + description : ''}", function() {
                    ${this.pluginManager.maybeInjectFixtures(suite)}
                    ${testCases}
                });`;
    };

    _generateAssertions = (test) => {
        if (!test.config || !test.config.scenario) {
            return '';
        }

        const stagesOrder = [
            {
                "stage": "hooks",
                "substage": ["beforeGiven", "before"]
            },  // alias 'before'
            {
                "stage": "scenario",
                "substage": ["given"]
            },   // main stage
            {
                "stage": "hooks",
                "substage": ["beforeWhen"]
            },
            {
                "stage": "scenario",
                "substage": ["when"]
            },         // main stage
            {
                "stage": "hooks",
                "substage": ["beforeThen"]
            },
            {
                "stage": "scenario",
                "substage": ["then"]
            },         // main stage
            {
                "stage": "hooks",
                "substage": ["afterThen", "after"]
            }     // todo: alias 'after'
        ];

        // todo: handle stage rejections properly
        const stages = stagesOrder
            .filter(s =>
                test.config[s.stage] &&
                Object.keys(test.config[s.stage]).some(key => s.substage.includes(key)))
            .map(function _makeContextBoundStage(s) {

                let substage = Object.keys(test.config[s.stage]).filter(key => s.substage.includes(key))[0];
                let stageContent = test.config[s.stage][substage];

                const promiseTpl = `new Promise(function(resolve) {
                                        /* Stage: {substage} */
                                        {stageContent}
                                    }.bind($context))`;

                if (substage === "then") {
                    let parsedStageContent = parseAstExpressions(stageContent)
                        .map(e => e.replace(';', ''))
                        .join(',');

                    stageContent = `resolve(Promise.all([${parsedStageContent}]))`;
                } else {
                    stageContent = `${stageContent} \n resolve();`;
                }

                return promiseTpl.format({ substage, stageContent });
            })
            .join(',');

        return jsBeautify(`return Promise.all([${stages}])`);
    };

    _overrideDefaultMethods = () => {
        // preserve original methods
        this.nativeMethods.readFileSync = fs.readFileSync;
        this.nativeMethods.findPath = module.constructor._findPath;

        // override default methods
        module.constructor._findPath = findPathOverride.bind(this);
        fs.readFileSync = readFileSyncOverride.bind(this);

        function findPathOverride(...args) {
            let fileName = path.basename(args[0]);

            if (fileName.indexOf(".atena.") !== -1) {
                return fileName;
            }

            return this.nativeMethods.findPath(...args);
        }

        function readFileSyncOverride(...args) {
            let fileName = path.basename(args[0]);

            if (fileName.indexOf(".atena.") === -1) {
                return this.nativeMethods.readFileSync(...args);
            }

            const entity = find(this.entities, {fileName})

            if (!entity) {
                throw new Error(`Could not find registered entity (test/suite): "${fileName}".`);
            }

            return `
                const assert = require('assert').ok,
                    chakram = require('chakram'),
                    expect = chakram.expect;
                    
                const $entity = ${toSource(entity)};
                const $context = this; // global context
                                    
                ${this.pluginManager.maybeInjectFixtures(null, true)}
                ${entity.getContext()}`;
        }
    };

    _destruct = () => {
        const {findPath, readFileSync} = this.nativeMethods;
        module.constructor._findPath = findPath;
        fs.readFileSync = readFileSync;
    };
}

module.exports = ChakramEngine;