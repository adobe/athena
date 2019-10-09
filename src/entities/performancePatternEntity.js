const Entity = require("./entity"),
    {ENTITY_TYPES} = require('./../enums');

class PerformancePattern extends Entity {
    constructor(name, path, config) {
        super(name, path, config);
        this.perfRuns = [];

        this.setType(ENTITY_TYPES.PATTERN);
        this.validate();
    }

    addPerformanceRun = (perfRun) => {
        this.perfRuns.push(perfRun);
    };

    hasPerfRuns = () => {
        return Boolean(this.perfRuns.length);
    };
}

module.exports = PerformancePattern;