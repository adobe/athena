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

// Node
const path = require('path');

// External
const glob = require('glob');
const L = require('list/methods');

// Project
const {
  isFunctionalTest,
  isFunctionalSuite,
  isFixture,
  isPerformanceSuite,
  isPerformancePattern,
  isPerformanceRun,
  makeLogger
} = require('../utils');

// Entities
const FunctionalSuiteEntity = require('../entities/functionalSuiteEntity');
const FunctionalTestEntity = require('../entities/functionalTestEntity');
const FixtureEntity = require('../entities/fixtureEntity');
const PerformanceSuiteEntity = require('../entities/performanceSuiteEntity');
const PerformancePatternEntity = require('../entities/performancePatternEntity');
const PerformanceRunEntity = require('../entities/performanceRunEntity');
const TestFileEntity = require('../entities/testFileEntity');
const {
  only
} = require('joi');

// Log formats
const functionalLogFormat = '[Functional Entity Parsing]';
const performanceLogFormat = '[Performance Entity Parsing]';

/**
 * The main EntityManager class.
 * It parses all functional and performance entities.
 */
class EntityManager {
  /**
   * Creates a new EntityManager instance.
   * @param {object} settings The Athena settings.
   */
  constructor(settings) {
    this.settings = settings;
    this.log = makeLogger();
    this.testFiles = [];
    this.entities = L.list();

    this._parseEntities();
  }

  // public

  /**
   * Returns all functional suites
   * @return {List<FunctionalSuiteEntity>} A list of functional suites.
   */
  getAllFunctionalSuites = () => {
    return L.filter(entity => {
      return entity && entity.constructor.name === 'FunctionalSuiteEntity';
    }, this.entities)
  };

  /**
   * Returns all performance suites.
   * @return {List<PerformanceSuiteEntity>} A list of performance suites.
   */
  getAllPerformanceSuites = () => {
    return L.filter((entity) => {
      return entity && entity.constructor.name === 'PerformanceSuiteEntity';
    }, this.entities);
  };

  /**
   * Returns all fixture entities.
   * @param {boolean} asArray Whether the list should be returned as array,  or not.
   * @return {List/Array} The list or array of found fixtures.
   */
  getAllFixtures = (asArray = false) => {
    var ent = this.entities;

    const allFixtureEntities = L.filter((entity) => {
      return entity && entity.constructor.name === 'FixtureEntity';
    }, this.entities);

    if (asArray) {
      return allFixtureEntities.toArray();
    }

    return allFixtureEntities;
  };

  /**
   * Returns all independent functional tests.
   * @return {List<FunctionalTestEntity>} A list of functional test entities.
   */
  getIndieFunctionalTests = () => {
    return L.filter((entity) => {
      return isFunctionalTest(entity) && entity.hasNoSuiteRefs();
    }, this.entities);
  };

  /**
   * Returns a single functional suite by a given config argument.
   * @param {string} argument The argument to use for comparison.
   * @param {string} value The value to compare against.
   * @return {FunctionalSuiteEntity} A single functional suite if found, null otherwise.
   */
  getFunctionalSuiteBy = (argument, value) => {
    const allFunctionalSuites = this.getAllFunctionalSuites();
    const foundFunctionalSuites = L.filter((functionalSuite) => {
      if (functionalSuite.config[argument]) {
        return functionalSuite.config[argument] === value;
      }

      this
        .log
        .warn(`Attempted to filter functional suites by a given argument ` + `[${argument}] that does not exist!`);
      return false;
    }, allFunctionalSuites);

    return L.first(foundFunctionalSuites);
  };

  // private

  /**
   * Returns a promise with the test files found.
   * @return {Promise<void>} A promise with the found test files.
   * @private
   */
  _getTestFiles() {
    this
      .log
      .debug('Reading all test files...');
    return glob.sync(path.resolve(this.settings.testsDirPath, '**', '*.yaml'), {
      nodir: true
    });
  }

  /**
   * Filters, parses and instantiates fixtures.
   * @private
   */
  _parseFixtures = () => {
    this
      .log
      .debug('Parsing all fixtures...');

    const onlyFixtures = this
      .testFiles
      .filter(isFixture)
      .map((fixture) => new FixtureEntity(fixture.getName(), fixture.getPath(), fixture.getConfig()));

    onlyFixtures.forEach(function processSingleFixture(f) {
      this.log.debug(`Processing ${f.name} fixture...`);
      this.entities = L.append(f, this.entities);
    }.bind(this));
  };

  /**
   * Filters, parses and instantiates perf runs.
   * @private
   */
  _parsePerfRuns = () => {
    this
      .log
      .debug('Parsing all performance test runs...');

    const onlyPerfRuns = this
      .testFiles
      .filter(isPerformanceRun)
      .map((perfRun) => {
        const perfRunName = perfRun.getName();
        const perfRunPath = perfRun.getPath();
        const perfRunConfig = perfRun.getConfig();

        return new PerformanceRunEntity(perfRunName, perfRunPath, perfRunConfig);
      });

    this.entities = this
      .entities
      .append(...onlyPerfRuns);
  };

  /**
   * Parses all test files and instantiates intermediary TestFile objects.
   * @private
   */
  _parseAllTestFiles = () => {
    this
      .log
      .debug(`Parsing all test files...`);
    const testFiles = this._getTestFiles();

    this.testFiles = testFiles.map((filePath) => new TestFileEntity(filePath));
  };

  /**
   * Parses a single functional suite entity.
   * @param {TestFileEntity} suite A functional suite entity, as a test file.
   * @return {FunctionalSuiteEntity} A new functional suite entity instance,
   * with all referenced tests attached.
   * @private
   */
  _parseFunctionalSuite = (suite) => {
    const suiteName = suite.getName();
    const suitePath = suite.getPath();
    const suiteConfig = suite.getConfig();

    this.log.debug(`Parsing functional suite: ${suiteName} [${suitePath}]`);
    
    const FunctionalSuiteInstance = new FunctionalSuiteEntity(suiteName, suitePath, suiteConfig);


    // Process tests refs.
    if (FunctionalSuiteInstance.hasTestRefs()) {
      this.log.debug(`Parsing functional test references for suite ${suiteName}`);

      // Get suite references.
      const testRefs = FunctionalSuiteInstance.getTestsRefs();

      // Filter all functional tests, specific to this suite only.
      const onlyFunctionalTests = this
        .testFiles
        .filter(isFunctionalTest);

      // Parse only functional tests.
      for (const functionalTest of onlyFunctionalTests) {
        // const testName = functionalTest.getName();
        const testPath = functionalTest.getPath();
        const testConfig = functionalTest.getConfig();

        this.log.debug(`Parsing functional test ${testConfig.name} [${testPath}]`);

        // If this test is not associated with this suite, skip.
        if (testRefs.indexOf(testConfig.name) === -1) {
          continue;
        }

        // Instantiate a new functional test entity.
        const FunctionalTestInstance = new FunctionalTestEntity(testConfig.name, testPath, testConfig);

        // Attach the test to the suite.
        FunctionalSuiteInstance.addTest(FunctionalTestInstance);
      }
    } else {
      this.log.warn(`The "${suiteName}" functional suite has no test references defined.`);
    }

    // Process suites refs.
    if (FunctionalSuiteInstance.hasSuiteRefs()) {
      this.log.debug(`Parsing sub-suite references for suite ${suiteName}`);

      // Get suite references.
      const suiteRefs = FunctionalSuiteInstance.getSuitesRefs();

      // Filter all functional sub-suites, specific to this suite only.
      const onlyFunctionalSuites = this
        .testFiles
        .filter(isFunctionalSuite);

      // Parse only functional tests.
      for (const functionalSuite of onlyFunctionalSuites) {
        // const testName = functionalSuite.getName();
        const testPath = functionalSuite.getPath();
        const suiteConfig = functionalSuite.getConfig();

        this.log.debug(`Parsing functional suite ${suiteConfig.name} [${testPath}]`);

        // If this sub-suite is not associated with this suite, skip.
        if (suiteRefs.indexOf(suiteConfig.name) === -1) {
          continue;
        }

        // Instantiate a new functional suite entity.
        const FunctionalSubsuiteInstance = new FunctionalSuiteEntity(suiteConfig.name, testPath, suiteConfig);

        // Attach the test to the suite.
        FunctionalSuiteInstance.addSuite(FunctionalSubsuiteInstance);
      }
    } else {
      this.log.warn(`The "${suiteName}" functional suite has no suites references defined.`);
    }

    return FunctionalSuiteInstance;
  };

  /**
   * Parses all functional test entities. It initially parses all
   * functional test suites, continues with the independent tests
   * and finally it attaches all functional test entities that
   * provide any suite references, to that specific suite.
   * @private
   */
  _parseFunctionalTests = () => {
    this
      .log
      .debug('Parsing functional tests...');

    const onlyFunctionalSuites = this
      .testFiles
      .filter(isFunctionalSuite)
      .map(this._parseFunctionalSuite);

    onlyFunctionalSuites.forEach(functionalSuite => {
      this.entities = L.append(functionalSuite, this.entities)
    });
  };

  /**
   * Parses performance suites.
   * @param {object} suite A suite TestEntity.
   * @return {PerformanceSuiteEntity} The parsed performance suite entity.
   * @private
   */
  _parsePerformanceSuite = (suite) => {
    const suiteName = suite.getName();
    const suitePath = suite.getPath();
    const suiteConfig = suite.getConfig();

    const PerformanceSuiteInstance = new PerformanceSuiteEntity(suiteName, suitePath, suiteConfig);

    if (PerformanceSuiteInstance.hasPerfPatternRefs()) {
      const referencedPerfPatterns = PerformanceSuiteInstance.getPerfPatternsRefs();
      const testFiles = this.testFiles;

      const onlyAssociatedPerfPatterns = testFiles.filter((entity) => {
        const entityConfig = entity.getConfig();
        return isPerformancePattern(entity) && referencedPerfPatterns.indexOf(entityConfig.name) !== -1;
      });

      for (const perfPattern of onlyAssociatedPerfPatterns) {
        const patternName = perfPattern.getName();
        const patternPath = perfPattern.getPath();
        const patternConfig = perfPattern.getConfig();

        const PerformancePatternInstance = new PerformancePatternEntity(patternName, patternPath, patternConfig);

        if (PerformancePatternInstance.hasPerfRunsRefs()) {
          const referencedPerfRuns = PerformancePatternInstance.getPerfRunsRefs();

          const onlyAssociatedPerfRuns = this
            .testFiles
            .filter((entity) => {
              const entityConfig = entity.getConfig();
              return isPerformanceRun(entity) && referencedPerfRuns.indexOf(entityConfig.name) !== -1;
            });

          for (const perfRun of onlyAssociatedPerfRuns) {
            const perfRunName = perfRun.getName();
            const perfRunPath = perfRun.getPath();
            const perfRunConfig = perfRun.getConfig();

            const PerformanceRunInstance = new PerformanceRunEntity(perfRunName, perfRunPath, perfRunConfig);

            PerformancePatternInstance.addPerformanceRun(PerformanceRunInstance);
          }
        } else {
          this
            .log
            .warn(`${performanceLogFormat} The ${patternName} performance ` + `pattern has no performance runs referenced.`);
        }

        PerformanceSuiteInstance.addPerformancePattern(PerformancePatternInstance);
      }
    } else {
      this
        .log
        .warn(`${performanceLogFormat} The ${suiteName} performance suite ` + `has no performance patterns referenced.`);
    }

    return PerformanceSuiteInstance;
  };

  /**
   * Parses performance tests only.
   * @private
   */
  _parsePerformanceTests = () => {
    const performanceSuites = this
      .testFiles
      .filter(isPerformanceSuite)
      .map(this._parsePerformanceSuite);

    const performanceSuitesList = L.from(performanceSuites);

    this.entities = this
      .entities
      .insertAll(this.entities.length, performanceSuitesList, this.entities);
  };

  /**
   * Parses all test files, fixtures, functional and performance tests.
   * @private
   */
  _parseEntities() {
    this._parseAllTestFiles();
    this._parseFixtures();
    this._parseFunctionalTests();
    this._parsePerformanceTests();
  }
}

module.exports = EntityManager;