const Entity = require("./entity"),
    {ENTITY_TYPES} = require('./../enums');

class TestEntity extends Entity {
    constructor(name, path, config) {
        super(name, path, config);

        this.setType(ENTITY_TYPES.TEST);

        this.validate();
    }
}

class ChakramTest extends TestEntity {
    constructor(name, path, config) {
        super(name, path, config);
    }
}

exports.TestEntity = TestEntity;
exports.ChakramTest = ChakramTest;