const Entity = require("./entity");
const {ENTITY_TYPES} = require('./../enums');
const {getParsedSettings} = require('./../utils');
const path = require("path"),
    fs = require("fs");

class FixtureEntity extends Entity {
    constructor(name, path, config) {
        super(name, path, config);
        this.type = ENTITY_TYPES.FIXTURE;
    }

    getModulePath = () => {
        const settings = getParsedSettings();
        const {config} = this.config;
        const modulePath = path.resolve(settings.testsDir, config.source);

        if (fs.existsSync(modulePath)) {
            return modulePath;
        }

        return null;
    };

    getSourcePath = () => {
        return this.config.config.source;
    }
}

module.exports = FixtureEntity;