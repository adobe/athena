const Entity = require("./entity"),
    {ENTITY_TYPES} = require('./../enums');

class TestEntity extends Entity {
    constructor(name, path, config) {
        super(name, path, config);
        this.type = ENTITY_TYPES.TEST;
        this.status = null;
    }
}

class ChakramTest extends TestEntity {
    constructor(name, path, config) {
        super(name, path, config);
    }
}

exports.TestEntity = TestEntity;
exports.ChakramTest = ChakramTest;