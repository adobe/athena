const Entity = require("./entity");

const {ENTITY_TYPES} = require('./../enums');

class PerformanceRunEntity extends Entity {
    constructor(name, path, config) {
        super(name, path, config);

        this.setType(ENTITY_TYPES.PERFORMANCE_RUN);
        this.validate();
    }
}

module.exports = PerformanceRunEntity;