// node
const path = require("path"),
    {isArray} = require("lodash");

// project
const {makeLogger, makeContainer} = require("../utils");

// todo: load dynamically
const customPlugin = require("./../../examples/plugins/generatedPlugin");

// todo: move filter class in separate file
class Filter {
    constructor(name, cb, priority) {
        this.name = name;
        this.cb = cb;
        this.priority = priority; // todo: not implemented.
    }
}

class PluginsManager {
    constructor(settings, entityManager) {
        this.plugins = makeContainer();
        this.fixtures = makeContainer();
        this.filters = makeContainer();
        this.log = makeLogger();

        this.fixtures.add(...entityManager.getAllFixtures());

        // todo: parse plugins dynamically
        customPlugin(this);
    }

    // public

    addFilter = (name, cb, priority) => {
        this.filters.add(new Filter(name, cb, priority));
    };

    doFilter = (name, ...values) => {
        const filter = this.filters.entries.filter(f => f.name === name)[0];

        if (values.length === 1) {
            [values] = values;
        }

        if (!filter) {
            if (isArray(values)) {
                return values[0]; // discard extra args
            }

            return values;
        }

        if (!isArray(values)) {
            return filter.cb(values);
        }

        // todo: check cb & values length
        return filter.cb.apply(null, Array.prototype.slice.call(values));
    };

    maybeInjectFixtures = (entity, global = false) => {
        const context = global ? "global" : entity.config.name;
        const fixtures = this.fixtures.entries.filter(f => f.config.context === context);
        // todo: validate fixture

        return fixtures.map(f => `const ${f.config.config.exposes} = require("${path.resolve("examples", f.config.config.path)}");`).join('');
    };
}

module.exports = PluginsManager;
