const Entity = require("./entity");

const {ENTITY_TYPES} = require('./../enums');

class PerformanceTestEntity extends Entity {
    constructor(name, path, config) {
        super(name, path, config);
        this.type = ENTITY_TYPES.PERFORMANCE_TEST;
        this.patterns = [];
    }

    addPatterns = (pattern) => {
        this.patterns.push(pattern);
    }
}

module.exports = PerformanceTestEntity;