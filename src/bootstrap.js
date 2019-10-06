// external
const {isFunction} = require("lodash"),
    format = require("string-format");

// project
const {COMMANDS} = require("./enums"),
    {log, getCliArgs, getParsedSettings} = require("./utils"),
    {EntityManager, EngineManager, PluginsManager, ScaffoldManager} = require("./managers");

format.extend(String.prototype, {});

class Atena {
    constructor(options) { // settings !!!
        this.settings = getParsedSettings(options);
        this.cluster = null;

        // Initialize the entity and plugins managers as tests and plugins
        // should be parsed either way and loaded in memory.
        this.entityManager = new EntityManager(this.settings);
        this.pluginManager = new PluginsManager(this.settings, this.entityManager);

        // Initialize the engine manager.
        const [AutocannonEngine, ChakramEngine] = new EngineManager(
            this.settings,
            this.pluginManager,
            this.entityManager
        );

        const requiredCommands = (...commands) => {
            return this.settings._.every(cmd => commands.indexOf(cmd) !== -1);
        };

        const shouldInitCluster = requiredCommands("cluster") && this.settings.init;
        const shouldJoinCluster = requiredCommands("cluster") && this.settings.join;
        const shouldRunTests = requiredCommands("run");
        const shouldPrintPerformanceTree = requiredCommands("preview") && this.settings.performance;
        const shouldPrintFunctionalTree = requiredCommands("preview") && this.settings.functional;

        if (shouldInitCluster || shouldJoinCluster) {
            const Cluster = require("./cluster");
            this.cluster = new Cluster(this.settings);
        }

        if (shouldPrintPerformanceTree) {
            log.debug(`Pretty printing performance tests dependency chain...`);
            // todo: not implemented

            return;
        }

        if (shouldPrintFunctionalTree) {
            log.debug(`Pretty printing functional tests dependency chain...`);
            // todo: not implemented

            return;
        }

        if (shouldInitCluster) {
            this.cluster.init();

            return;
        }

        if (shouldJoinCluster) {
            this.cluster.join();

            return;
        }

        if (shouldRunTests) {
            const {functional, performance} = this.settings;
            const shouldRunOnlyFunctionalTests = functional && !performance && ChakramEngine.hasTests();
            const shouldRunOnlyPerformanceTests = performance && !functional && AutocannonEngine.hasTests();

            if (shouldRunOnlyFunctionalTests) {
                log.debug(`⚙️ Running only functional tests...`);
                return ChakramEngine.run();
            }

            if (shouldRunOnlyPerformanceTests) {
                log.debug(`⚡️ Running only performance tests...`);
                return AutocannonEngine.run();
            }
        }
    }

    runPerformanceTests = () => {

    };

    runFunctionalTests = () => {

    };

    // private

    // todo: this should be handled separately by a scaffold manager.
    _maybeHandleScaffolding = () => {
        let scaffoldCommandUsed = false;
        const scaffold = new ScaffoldManager(this.settings);
        const cliArgs = getCliArgs();

        const handleScaffoldCommand = (command) => {
            const commandName = `handle${command.substr(0, 1).toUpperCase() + command.slice(1)}`;

            if (typeof scaffold[commandName] === "undefined") {
                log.debug(`Could not handle the "${command}" scaffolding command.`);
                return;
            }

            if (isFunction(scaffold[commandName])) {
                log.debug(`Scaffolding: Handling command "${commandName}".`)
                scaffoldCommandUsed = true;
                scaffold[commandName]();
            }
        };

        for (const COMMAND of Object.keys(COMMANDS)) {
            const ACTION = COMMANDS[COMMAND];

            if (cliArgs[ACTION]) {
                handleScaffoldCommand(ACTION);
            }
        }

        if (scaffoldCommandUsed) {
            process.exit(0);
        }
    };
}

exports = module.exports = Atena;