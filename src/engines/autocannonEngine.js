const autocannon = require('autocannon');

const Engine = require ("./engine");

const {TAXONOMIES, ENGINES} = require("./../enums"),
    {isPerformanceTest} = require("./../utils");

class AutocannonEngine extends Engine {
    constructor(settings, entityManager, pluginManager) {
        super(settings, entityManager, pluginManager, TAXONOMIES.PERFORMANCE, ENGINES.AUTOCANNON, autocannon);
        // parse and register entities
        this.entities = this.entityManager
            .getAllBy("engine", this.name) // todo: naive query as plugins/fixtures may be included as well if the engine property is mistakenly provided.
            .map(this._deepParseEntities)
            .filter(e => e !== undefined) // todo: fix this
            .map(this._registerEntities); // todo: map only once dummy
    }

    _deepParseEntities = (e) => {
        if (isPerformanceTest(e)) {
            e.setTaxonomy(this.taxonomy);
            e.setContext();
            return e;
        }
    };

    _registerEntities = (e) => {
      console.log(this);
      return e;
    };

    run = () => {
        console.log("running performance tests...");
        // todo: not implemented
    };
}

module.exports = AutocannonEngine;