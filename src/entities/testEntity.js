const Entity = require("./entity"),
    {ENTITY_TYPES} = require('./../enums');

class TestEntity extends Entity {
    constructor(name, path, config) {
        super(name, path, config);
        this.type = ENTITY_TYPES.TEST;
    }
}

module.exports = TestEntity;