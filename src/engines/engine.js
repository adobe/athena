

const {makeLogger} = require("./../utils");

class Engine {
    constructor(settings, entityManager, pluginManager) {
        this.entityManager = entityManager;
        this.pluginManager = pluginManager;
        this.settings = settings;
        this.log = makeLogger();
        this.entities = [];
    }

    run = () => {
        throw new Error("Engine not implementing run method!");
    };

    hasTests = () => {
        return this.entities.length > 0;
    };
}

module.exports = Engine;