// node
const path = require("path"),
    fs = require("fs"),
    _require = require("child_process"),
    execSync = _require.execSync;

// external
const {isArray, pullAll, uniq} = require("lodash"),
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
        const usedPackages = fixtures.map(this._parseUsedPackages).filter(String);

        if (usedPackages.length) {
            const spinner = startSpinner(`Installing ${usedPackages.length} fixtures module${usedPackages.length === 1 ? '' : 's'} ...\n`);

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
        let installedPackages = [];
        const pkg = JSON.parse(fs.readFileSync("package.json"));

        if (pkg && pkg.dependencies) {
            installedPackages = Object.keys(pkg.dependencies);
        }

        try {
            const fp = fixture.getModulePath();
            const content = fs.readFileSync(fp, "utf-8");
            packages = detective(content, {
                parse: {
                    sourceType: "module"
                }
            });

            packages = packages
                .filter(this._isValidPackage)
                .map(this._sanitizePackage);
        } catch (error) {
            this.log.error(`Could not parse "${fixture.getFileName()}".`, error);
        }

        return uniq(pullAll(packages, installedPackages));
    };

    _isValidPackage = (pkg) => {
        const regex = new RegExp('^([a-z0-9-_]{1,})$');

        return regex.test(pkg.name);
    };

    _sanitizePackage = (pkg) => {
        return pkg.split('/')[0]; // remove nested references
    };

    _installMissingModules = (usedPackages) => {
        for (let module of usedPackages) {
            const [packageName] = module;
            const spinner = startSpinner(`Installing ${packageName}...\n`);
            const cmd = getPackageInstallCommand(packageName);

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
