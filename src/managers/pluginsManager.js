// node
const path = require("path"),
    fs = require("fs"),
    _require = require("child_process"),
    execSync = _require.execSync;

// external
const {isArray} = require("lodash"),
    detective = require("detective");

// project
const {
    makeLogger,
    makeContainer,
    startSpinner,
    getPackageInstallCommand
} = require("../utils");

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

        this.entityManager = entityManager;

        this._parseFixtures();

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
        if (!this.fixtures.length) {
            return;
        }

        const context = global ? "global" : entity.config.name;
        const fixtures = this.fixtures.entries.filter(f => f.config.context === context);

        return fixtures.map(f => `const ${f.config.config.exposes} = require("${path.resolve("examples", f.config.config.path)}");`).join('');
    };

    _parseFixtures = () => {
        let fixtures = this.entityManager.getAllFixtures();
        const usedPackages = fixtures.map(this._parseUsedPackages);
        // todo: dedupe used modules.

        if (usedPackages.length) {
            this.log.debug(`Found ${usedPackages.length} used module${usedPackages.length === 1 ? '' : 's'} inside fixtures.`);
            const spinner = startSpinner(`Installing ${usedPackages.length} fixtures module${usedPackages.length === 1 ? '' : 's'} ...`);

            try {
                this._installMissingModules(usedPackages);
            } catch (error) {
                this.log.error(error);
            } finally {
                spinner.stop();
            }
        }

        this.fixtures.add(...fixtures);
    };

    _parseUsedPackages = (fixture) => { // FixtureEntity
        let packages = [];

        try {
            const fp = fixture.getModulePath();
            const content = fs.readFileSync(fp, "utf-8");
            // todo: parse ES6 packages as well
            packages = detective(content, {
                parse: {
                    sourceType: "module"
                }
            });

            packages = packages.filter(this._isValidModule);
        } catch (error) {
            this.log.error(`Could not parse "${fixture.getFileName()}".`, error);
        }

        return packages;
    };

    _isValidModule = (module) => {
        const regex = new RegExp('^([a-z0-9-_]{1,})$');

        return regex.test(module.name);
    };

    _installMissingModules = (usedPackages) => {
        for (let module of usedPackages) {
            const [packageName] = module;
            const spinner = startSpinner(`Installing ${packageName}...`);
            const cmd = getPackageInstallCommand(packageName)

            try {
                execSync(cmd, {encoding: 'utf8'});
                this.log.success(`Successfully installed "${packageName}".`)
            } catch (error) {
                this.log.error(error);
            } finally {
                spinner.stop();
            }
        }
    };


}

module.exports = PluginsManager;
