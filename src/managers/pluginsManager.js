/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

// node
const path = require('path');
const fs = require('fs');
const _require = require('child_process');
const execSync = _require.execSync;

// external
const {isArray, pullAll, uniq} = require('lodash');
const detective = require('detective');

// project
const {
  makeLogger,
  makeContainer,
  startSpinner,
  getPackageInstallCommand,
} = require('../utils');


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
    this.settings = settings;

    this.entityManager = entityManager;

    this._parseFixtures();
  }

  // public

    addFilter = (name, cb, priority) => {
      this.filters.add(new Filter(name, cb, priority));
    };

    doFilter = (name, ...values) => {
      const filter = this.filters.entries.filter((f) => f.name === name)[0];

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
      const noFixturesAvailable = !this.fixtures.entries.length;
      const entityFixturesMissing = !entity || !entity.config || !entity.config.fixtures;

      if (noFixturesAvailable || entityFixturesMissing) {
        return;
      }

      // todo: get all parent suite fixtures.

      const finalRequire = [];

      for (const fixture of this.fixtures.entries) {
        const entityRequiresFixture = entity.config.fixtures.indexOf(fixture.config.name) !== -1;

        // todo: if it's in global scope, and already included, skip.
        // todo: if it's a test and its parent suite already included it, skip.

        if (entityRequiresFixture) {
          const fixturePath = path.resolve(this.settings.testsDir, fixture.getSourcePath());
          finalRequire.push(`const ${fixture.config.name} = require("${fixturePath}");`);
        }
      }

      return finalRequire.join('');
    };

    _parseFixtures = () => {
      const fixtures = this.entityManager.getAllFixtures(true);
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
      const pkg = JSON.parse(fs.readFileSync('package.json'));

      if (pkg && pkg.dependencies) {
        installedPackages = Object.keys(pkg.dependencies);
      }

      try {
        const fp = fixture.getModulePath();
        const content = fs.readFileSync(fp, 'utf-8');

        packages = detective(content, {
          parse: {
            sourceType: 'module',
          },
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
      for (const module of usedPackages) {
        const [packageName] = module;
        const [cmd, manager] = getPackageInstallCommand(packageName);
        const spinner = startSpinner(`Installing "${packageName}" using ${manager} ...\n`);

        try {
          execSync(cmd, {encoding: 'utf8'});
          this.log.success(`Successfully installed "${packageName}".`);
        } catch (error) {
          this.log.error(error);
        } finally {
          spinner.stop();
        }
      }
    };
}

module.exports = PluginsManager;
