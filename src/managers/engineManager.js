const {ChakramEngine, AutocannonEngine} = require("./../engines");

class EngineManager {
    constructor(
        settings,
        pluginManager,
        entityManager
    ) {
        this.settings = settings;
        this.pluginManager = pluginManager;
        this.entityManager = entityManager;

        // Initialize the Chakram engine.
        this.chakramEngine = new ChakramEngine(
            this.settings,
            this.entityManager,
            this.pluginManager
        );

        // Initialize the Autocannon engine.
        this.autoCannonEngine = new AutocannonEngine(
            this.settings,
            this.entityManager,
            this.pluginManager
        );

        return [this.autoCannonEngine, this.chakramEngine];
    }
}

module.exports = EngineManager;