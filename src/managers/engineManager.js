const ChakramEngine = require("./../engines/chakramEngine"),
    AutocannonEngine = require("./../engines/autocannonEngine"); // todo: handle this as well.

class EngineManager {
    constructor(settings, pluginManager, entityManager) {
        this.settings = settings;
        this.pluginManager = pluginManager;
        this.entityManager = entityManager;

        // todo: manage engines dynamically
        // todo: check engine flags (--performance, --functional)

        this.chakramEngine = new ChakramEngine(
            this.settings,
            this.entityManager,
            this.pluginManager
        );

        this.chakramEngine.run();
    }
}

module.exports = EngineManager;