const Entity = require("./entity");

const {ENTITY_TYPES} = require('./../enums');

class PerformanceRunEntity extends Entity {
    constructor(name, path, config) {
        super(name, path, config);
        this.type = ENTITY_TYPES.PERFORMANCE_RUN;
    }

}

module.exports = PerformanceRunEntity;