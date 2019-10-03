// external
const {isFunction} = require("lodash"),
    format = require("string-format");

// project
const {COMMANDS} = require("./enums"),
    {makeLogger, getCliArgs, getParsedSettings} = require("./utils"),
    {EntityManager, EngineManager, PluginsManager, ScaffoldManager} = require("./managers");

format.extend(String.prototype, {});

class Athena {
    constructor(options) {
        this.log = makeLogger();
        this.settings = getParsedSettings(options);
        this._maybeHandleScaffolding();
        this.entityManager = new EntityManager(this.settings);
        this.pluginManager = new PluginsManager(this.settings, this.entityManager);
        new EngineManager(this.settings, this.pluginManager, this.entityManager);
    }

    // private

    _maybeHandleScaffolding = () => {
        let scaffoldCommandUsed = false;
        const scaffold = new ScaffoldManager(this.settings);
        const cliArgs = getCliArgs();

        const handleScaffoldCommand = (command) => {
            const commandName = `handle${command.substr(0, 1).toUpperCase() + command.slice(1)}`;

            if (typeof scaffold[commandName] === "undefined") {
                this.log.debug(`Could not handle the "${command}" scaffolding command.`);
                return;
            }

            if (isFunction(scaffold[commandName])) {
                this.log.debug(`Scaffolding: Handling command "${commandName}".`)
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

exports = module.exports = Athena;