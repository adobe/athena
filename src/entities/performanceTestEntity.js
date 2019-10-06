const Entity = require("./entity"),
    {ENTITY_TYPES} = require('./../enums');

class PerformanceTestEntity extends Entity {
    constructor(name, path, config) {
        super(name, path, config);

        this.perfPatterns = [];

        this.setType(ENTITY_TYPES.PERFORMANCE_TEST);
        this.validate();
    }

    addPatterns = (pattern) => {
        this.perfPatterns.push(pattern);
    };

    hasPerfPatterns = () => {
        return Boolean(this.perfPatterns.length);
    };
}

module.exports = PerformanceTestEntity;