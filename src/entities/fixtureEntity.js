const Entity = require("./entity");

const {ENTITY_TYPES} = require('./../enums');

class FixtureEntity extends Entity {
    constructor(name, path, config) {
        super(name, path, config);
        this.type = ENTITY_TYPES.FIXTURE;
    }
}

module.exports = FixtureEntity;