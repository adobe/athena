const Entity = require("./entity"),
    {ENTITY_TYPES} = require('./../enums');

class PerformancePattern extends Entity {
    constructor(name, path, config) {
        super(name, path, config);
        this.type = ENTITY_TYPES.PATTERN;
    }
}

module.exports = PerformancePattern;