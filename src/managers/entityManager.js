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
const L = require('list/methods');

// project
const {
  isFunctionalTest,
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
const logFormat = '[Entity Parsing]';

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
    this.testFiles = [];
    this.entities = L.list();

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
        {
          nodir: true,
        });
  }

  /**
     * Filters, parses and instantiates suites.
     * @private
     */
  _parseFunctionalSuites = () => {
    const onlyFunctionalSuites = this.testFiles
        .filter(isSuite)
        .map((suite) => new SuiteEntity(
            suite.name,
            suite.entityPath,
            suite.config
        ));

    this.entities = this.entities.insert(
        this.entities.length,
        ...onlyFunctionalSuites
    );
  };

  /**
     * Filters, parses and instantiates fixtures.
     * @private
     */
  _parseFixtures = () => {
    const onlyFixtures = this.testFiles
        .filter(isFixture)
        .map((fixture) => new FixtureEntity(
            fixture.name,
            fixture.entityPath,
            fixture.config
        ));

    this.entities = this.entities.insert(
        this.entities.length,
        ...onlyFixtures
    );
  };

  /**
     * Filters, parses and instantiates perf runs.
     * @private
     */
  _parsePerfRuns = () => {
    const onlyPerfRuns = this.testFiles
        .filter(isPerformanceRun)
        .map((perfRun) => new PerformanceRunEntity(
            perfRun.name,
            perfRun.entityPath,
            perfRun.config
        ));

    this.entities = this.entities.insert(
        this.entities.length,
        ...onlyPerfRuns
    );
  };

  /**
   * Parses all test files and instantiates intermediary TestFile objects.
   * @private
   */
  _parseAllTestFiles = () => {
    this.testFiles = this._getTestFiles()
        .map((filePath) => new TestFile(filePath));
  };

  _parseFunctionalTests = () => {
    this._parseFunctionalSuites();

    const onlyFunctionalTests = this.testFiles
        .filter(isFunctionalTest);

    for (const functionalTest of onlyFunctionalTests) {
      const {name, path, config} = functionalTest;

      // Instantiate a new functional test entity.
      const ChakramTestEntity = new ChakramTest(
          name,
          path,
          config
      );

      // Independent functional test entity.
      if (ChakramTestEntity.hasNoSuiteRefs()) {
        this.entities = L.insert(
            this.entities.length,
            ChakramTestEntity,
            this.entities
        );

        continue;
      }

      // Attach this test to its particular suite.
      for (const suiteRef of ChakramTestEntity.getSuiteRefs()) {
        const FunctionalSuite = this.getSuiteBy('name', suiteRef);

        if (!FunctionalSuite) {
          const testName = ChakramTestEntity.getName();
          log.warn(`${logFormat} Could not find the suite "${suiteRef}"` +
          `required by "${testName}".`);
          continue;
        }

        FunctionalSuite.addTest(ChakramTestEntity);
      }
    }
  };

  _parsePerformanceTests = () => {
    this._parsePerformanceSuites();

    // todo: parse perf pattens
    // todo: parse perf runs.
  };

  /**
   * Parses all native Athena entities.
   * @private
   */
  _parseEntities() {
    this._parseAllTestFiles();

    this._parseFunctionalTests();
    this._parsePerformanceTests();
    this._parseFixtures();


    this._parseFunctionalSuites();
    this._parseFixtures();
    this._parsePerfRuns();


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


/**
 * The TestFile class.
 * An intermediary TestFile class used while parsing all test files.
 */
class TestFile {
  /**
   * Creates a new TestFile instance.
   * @param {string} filePath The test file's path.
   */
  constructor(filePath) {
    this.config = null;
    this.fileData = null;

    if (!filePath) {
      throw new Error(`When instantiating a new TestFile, you must provide a filePath.`);
    }

    try {
      this.config = jsYaml.safeLoad(fs.readFileSync(filePath, 'utf-8'));
      this.fileData = path.parse(filePath);
    } catch (error) {
      log.error(`Could not parse test file.\n${error}`);
    }
  }
}

module.exports = EntityManager;
