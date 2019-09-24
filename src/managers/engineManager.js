const ChakramEngine = require("./../engines/chakramEngine"),
    AutocannonEngine = require("./../engines/autocannonEngine"); // todo: handle this as well.

class EngineManager {
    constructor(settings, pluginManager, entityManager) {
        this.settings = settings;
        this.pluginManager = pluginManager;
        this.entityManager = entityManager;
        this.chakramEngine = new ChakramEngine(
            this.settings,
            this.entityManager,
            this.pluginManager
        );
        this.autoCannonEngine = new AutocannonEngine(
            this.settings,
            this.entityManager,
            this.pluginManager
        );

        const {functional, performance} = this.settings;
        // todo: manage engines dynamically
        // todo: check engine flags (--performance, --functional)
        if(functional) {
            return this.chakramEngine.run();
        }

        if (performance) {
            return this.autoCannonEngine.run();
        }

        this._dynamicStart();
    }

    _dynamicStart = () => {
        //TODO: right now is one after another
        if(this.chakramEngine.hasTests()) {
            this.chakramEngine.run();
        }

        if(this.autoCannonEngine.hasTests()) {
            this.autoCannonEngine.run();
        }
    }

}

module.exports = EngineManager;