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
const fs = require('fs');
const path = require('path');

// external
const jsYaml = require('js-yaml');
const {isString} = require('lodash');
const glob = require('glob');

// project
const {
  makeContainer,
  isTest,
  isSuite,
  isFixture,
  isPerformanceTest,
  isPerformancePattern,
  isPerformanceRun,
  makeLogger,
} = require('../utils');

const SuiteEntity = require('../entities/suiteEntity');
const {ChakramTest} = require('../entities/testEntity');
const FixtureEntity = require('../entities/fixtureEntity');
const PerformanceTestEntity = require('../entities/performanceTestEntity');
const PerformancePatternEntity = require('../entities/performancePatternEntity');
const PerformanceRunEntity = require('../entities/performanceRunEntity');

const log = makeLogger();

/**
 * The EntityManager class.
 */
class EntityManager {
  /**
   * Creates a new EntityManager instance.
   * @param {object} settings The Athena settings.
   */
  constructor(settings) {
    this.settings = settings;
    this.preParsedEntities = [];
    this.entities = makeContainer();

    this._parseEntities();
  }

  // public

  addEntity = (entity) => {
    this.entities.add(entity);
  };

  getSuiteBy = (attribute, value) => {
    let foundSuite = null;

    const onlyEntitiesByAttribute = (e) => {
      return isSuite(e) && e.config[attribute] === value;
    };

    const foundSuites = this.filterEntities(onlyEntitiesByAttribute);

    if (foundSuites.length) {
      foundSuite = foundSuites[0];
    }

    return foundSuite;
  };

  // todo: fix undefined returns
  getAllBy = (attribute, value) => {
    return this.filterEntities(function(e) {
      if (e.config && e.config[attribute] && e.config[attribute] === value) {
        return e;
      }
    });
  };

  getAllFixtures = () => {
    return this.filterEntities(isFixture);
  };

  filterEntities = (predicate) => {
    return this.entities.entries.filter(predicate);
  };

  // private

  /**
   * Returns a promise with the test files found.
   * @return {Promise<void>} A promise with the found test files.
   * @private
   */
  _getTestFiles() {
    return glob.sync(
        path.resolve(
            this.settings.testsDirPath, '**', '*'),
        {nodir: true});
  }

  /**
   * Parses all Athena entities.
   * @private
   */
  _parseEntities() {
    const testFiles = this._getTestFiles();

    // Filter suites and instantiate them.
    this.preParsedEntities.push(
        testFiles.filter(isSuite).map((suite) => new SuiteEntity(
            suite.name,
            suite.entityPath,
            suite.config
        ))
    );

    // Filter fixtures and instantiate them.
    this.preParsedEntities.push(
        testFiles.filter(isFixture).map((fixture) => new FixtureEntity(
            fixture.name,
            fixture.entityPath,
            fixture.config
        ))
    );

    // Filter performance runs and instantiate them.
    this.preParsedEntities.push(
        testFiles.filter(isPerformanceRun).map((perfRun) => new PerformanceRunEntity(
            perfRun.name,
            perfRun.entityPath,
            perfRun.config
        ))
    );


    const {testsDirPath} = this.settings;
    const entitiesList = fs.readdirSync(testsDirPath); // todo: check first and throw
    const entities = [];

    // parse all entities
    for (const entityFileName of entitiesList) {
      const entity = {};
      entity.name = entityFileName;
      entity.path = path.resolve(testsDirPath, entity.name);

      // skip directories
      if (fs.lstatSync(entity.path).isDirectory()) {
        continue;
      }

      // parse config
      entity.config = jsYaml.safeLoad(
          fs.readFileSync(entity.path),
          'utf-8'
      );

      entities.push(entity);
      const {name, path: entityPath, config} = entity;


      // todo: for functional tests, suites are parsed first and the
      // tests are then associated. this is not the case for performance
      // tests where the dependency chain is handled backwards. maybe we
      // should follow a more consistent pattern in order to avoid any
      // confusion.

      // parse suites
      if (isSuite(entity)) {
        this.entities.add(new SuiteEntity(
            name,
            entityPath,
            config
        ));
      }

      // parse fixtures
      if (isFixture(entity)) {
        this.entities.add(new FixtureEntity(
            name,
            entityPath,
            config
        ));
      }

      // parse performance runs
      if (isPerformanceRun(entity)) {
        this.entities.add(new PerformanceRunEntity(
            name,
            entityPath,
            config
        ));
      }
    }

    // parse functional tests
    for (const entity of entities) {
      if (!isTest(entity)) {
        continue;
      }

      let {suiteRef} = entity.config;
      const {name, path: entityPath, config} = entity;
      const testEntity = new ChakramTest(name, entityPath, config);

      // test as indie entity
      if (!suiteRef) {
        this.addEntity(testEntity);
        continue;
      }

      if (isString(suiteRef)) {
        suiteRef = [suiteRef];
      }

      suiteRef.forEach((suiteName) => {
        const suite = this.getSuiteBy('name', suiteName);

        if (!suite) {
          log.warn(`[Entity Parsing] Could not find the suite "${suiteName}" required by "${testEntity.config.name}".`);
          return;
        }

        suite.addTest(testEntity);
      });
    }

    // parse performance patterns
    for (const entity of entities) {
      if (!isPerformancePattern(entity)) {
        continue;
      }

      const {name, path: entityPath, config} = entity;
      const {mix} = config;

      const performancePatternEntity = new PerformancePatternEntity(
          name,
          entityPath,
          config
      );

      if (mix.length > 0) {
        mix.forEach((perfRunRef) => {
          // todo: handle versioning as well.

          const onlyAssociatedPerfRuns = (e) => {
            return isPerformanceRun(e) &&
                            e.config.name === perfRunRef.ref;
          };

          const foundEntity = this.filterEntities(onlyAssociatedPerfRuns)[0];

          if (foundEntity) {
            performancePatternEntity.addPerformanceRun(foundEntity);
            this.entities.remove(foundEntity); // cleanup
          } else {
            // todo: log
          }
        });
      }

      this.entities.add(performancePatternEntity);
    }

    // parse performance scenarios
    for (const entity of entities) {
      if (!isPerformanceTest(entity)) {
        continue;
      }

      const {name, path: entityPath, config} = entity;
      const {pattern} = config.scenario;

      const performanceTestEntity = new PerformanceTestEntity(
          name,
          entityPath,
          config
      );

      // Parse performance patterns associated with the performance test.
      if (pattern && pattern.length > 0) {
        pattern.forEach((perfPattern) => {
          // todo: handle versioning as well.

          const onlyAssociatedPerfPatterns = (e) => {
            return isPerformancePattern(e) &&
                            e.config.name === perfPattern.ref;
          };

          // Parse performance patterns.
          const foundPerfPatternEntity = this.filterEntities(onlyAssociatedPerfPatterns)[0];

          if (foundPerfPatternEntity) {
            // todo: add all of them, not just one?
            performanceTestEntity.addPatterns(foundPerfPatternEntity);
            this.entities.remove(foundPerfPatternEntity); // cleanup
          } else {
            // todo: log
          }
        });
      }

      this.entities.add(performanceTestEntity);
    }
  };
}

module.exports = EntityManager;
