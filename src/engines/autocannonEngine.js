const autocannon = require('autocannon');

const {TAXONOMIES, ENGINES} = require("./../enums"),
    {makeLogger, isPerformanceScenario} = require("./../utils");

class AutocannonEngine {
    constructor(settings, entityManager, pluginManager) {
        // parse all performance tests
        this._autoCannon = autocannon;
        this.entityManager = entityManager;
        this.pluginManager = pluginManager;
        this.settings = settings;
        this.log = makeLogger();
        this.name = ENGINES.AUTOCANNON;
        this.taxonomy = TAXONOMIES.PERFORMANCE;

        // parse and register entities
        this.entities = this.entityManager
            .getAllBy("engine", this.name) // todo: naive query as plugins/fixtures may be included as well if the engine property is mistakenly provided.
            .map(this._deepParseEntities)
            .filter(e => e !== undefined) // todo: fix this
            .map(this._registerEntities); // todo: map only once dummy
    }

    _deepParseEntities = (e) => {
        if (isPerformanceScenario(e)) {
            e.setTaxonomy(this.taxonomy);
            e.setContext();
            return e;
        }
    };

    run = () => {
        console.log("running performance tests...");
        // todo: not implemented
    };
}

module.exports = AutocannonEngine;