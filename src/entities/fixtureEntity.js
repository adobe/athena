// node
const path = require("path"),
    fs = require("fs");

// project
const Entity = require("./entity"),
    {ENTITY_TYPES} = require('./../enums'),
    {getParsedSettings} = require('./../utils');

class FixtureEntity extends Entity {
    constructor(name, path, config) {
        super(name, path, config);

        this.setType(ENTITY_TYPES.FIXTURE);
        this.validate();
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