const cluster = require("cluster"),
    numCPUs = require("os").cpus().length,
    pid = process.pid;

const autocannon = require('autocannon');

const Engine = require("./engine"),
    {TAXONOMIES, ENGINES} = require("./../enums"),
    {makeLogger, isPerformanceTest, isPerformancePattern, removeEmpty} = require("./../utils");

const log = makeLogger();

class AutocannonEngine extends Engine {
    constructor(settings, entityManager, pluginManager) {
        super(
            settings,
            entityManager,
            pluginManager,
            TAXONOMIES.PERFORMANCE,
            ENGINES.AUTOCANNON,
            autocannon
        );

        const perfEntities = this.entityManager.getAllBy(
            "engine",
            this.name
        );

        this.entities = perfEntities.map(this._deepParseEntities);
    }

    run = () => {
        const finalConfig = this.getPerformanceTests();
        const engine = autocannon(finalConfig, this._handleTestFinish);

        process.once("SIGINT", () => {
            engine.stop();
        });

        autocannon.track(engine, {
            renderProgressBar: true
        });
    };

    getPerformanceTests = () => {
        // todo: add support for multiple tests.
        const perfTest = this.entities[0];
        const perfPattern = perfTest.perfPatterns[0];
        const perfRun = perfPattern.perfRuns[0];

        // merge config
        // todo: do this recursively
        const perfTestConfig = removeEmpty(perfTest.config.config || {});
        const perfPatternConfig = removeEmpty(perfPattern.config.config || {});
        const perfRunConfig = removeEmpty(perfRun.config.config || {});

        return {
            ...perfTestConfig,
            ...perfPatternConfig,
            ...perfRunConfig
        };
    };

    _getTestConfig = (test) => { // todo: flatten test object
        // todo: test this approach
        const conf = {};

        function setConfProperty(propName) {
            if (test && test.config && test.config.config[propName]) {
                conf[propName] = test.config.config[propName];
            }
        }

        const expectedProps = [
            "url",
            "socketPath",
            "connections",
            "duration",
            "amount",
            "timeout",
            "pipelining",
            "bailout",
            "method",
            "title",
            "body",
            "headers",
            "maxConnectionRequests",
            "connectionRate",
            "overallRate",
            "reconnectRate",
            "requests",
            "idReplacement",
            "forever",
            "servername",
            "excludeErrorStats"
        ];

        expectedProps.forEach(setConfProperty);

        return conf;
    };

    _handleTestFinish = (error, results) => {
        if (error) {
            console.error(`There was a problem while running the performance test!\n${error}`);
        }

        // console.info(`The test has finished! Here are the results:\n${JSON.stringify(results, null, 1)}`);
    };

    _deepParseEntities = (entity) => {
        entity.setTaxonomy(this.taxonomy);

        // todo: flatten the config
        if (isPerformanceTest(entity) && entity.hasPerfPatterns()) {
            entity.perfPatterns = entity.perfPatterns.map(this._deepParseEntities);

            return entity;
        }

        if (isPerformancePattern(entity) && entity.hasPerfRuns()) {
            entity.perfRuns = entity.perfRuns.map(this._deepParseEntities);

            return entity;
        }

        return entity;
    }
}

module.exports = AutocannonEngine;