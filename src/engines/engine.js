

const {makeLogger} = require("./../utils");

class Engine {
    constructor(settings, entityManager, pluginManager, taxonomy, name, engine) {
        this.entityManager = entityManager;
        this.pluginManager = pluginManager;
        this.settings = settings;
        this.taxonomy = taxonomy;
        this.name = name;
        this.engine = engine;
        this.log = makeLogger();
        this.entities = [];
    }

    run = () => {
        throw new Error(`${this.name} engine not implementing run method!`);
    };

    hasTests = () => {
        return this.entities.length > 0;
    };
}

module.exports = Engine;