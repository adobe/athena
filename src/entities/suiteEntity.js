const Entity = require("./entity"),
    {ENTITY_TYPES} = require("./../enums");

class SuiteEntity extends Entity {
    constructor(name, path, config) {
        super(name, path, config);
        this.type = ENTITY_TYPES.SUITE;
        this.tests = [];
    }

    addTest = (test) => {
        this.tests.push(test);
    };
}

module.exports = SuiteEntity;