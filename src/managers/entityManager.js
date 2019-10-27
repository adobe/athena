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

// external
const glob = require('glob');
const L = require('list/methods');

// project
const {
  isFunctionalTest,
  isFunctionalSuite,
  isFixture,
  isPerformanceSuite,
  isPerformancePattern,
  isPerformanceRun,
  makeLogger,
} = require('../utils');

const FunctionalSuiteEntity = require('../entities/functionalSuiteEntity');
const FunctionalTestEntity = require('../entities/functionalTestEntity');
const FixtureEntity = require('../entities/fixtureEntity');
const PerformanceSuiteEntity = require('../entities/performanceSuiteEntity');
const PerformancePatternEntity = require('../entities/performancePatternEntity');
const PerformanceRunEntity = require('../entities/performanceRunEntity');
const TestFileEntity = require('../entities/testFileEntity');

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
      return L.filter((entity) => {
        return entity && entity.constructor.name === 'FunctionalSuiteEntity';
      }, this.entities);
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

        this.log.warn(`Attempted to filter functional suites by a given argument ` +
                `[${argument}] that does not exist!`);
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
      return glob.sync(
          path.resolve(
              this.settings.testsDirPath, '**', '*.yaml'),
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
          .filter(isFunctionalSuite)
          .map((suite) => {
            const suiteName = suite.getName();
            const suitePath = suite.getPath();
            const suiteConfig = suite.getConfig();

            return new FunctionalSuiteEntity(
                suiteName,
                suitePath,
                suiteConfig
            );
          });

      this.entities = this.entities.append(
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
          .map((fixture) => {
            const fixtureName = fixture.getName();
            const fixturePath = fixture.getPath();
            const fixtureConfig = fixture.getConfig();

            return new FixtureEntity(
                fixtureName,
                fixturePath,
                fixtureConfig
            );
          });

      this.entities = this.entities.append(
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
          .map((perfRun) => {
            const perfRunName = perfRun.getName();
            const perfRunPath = perfRun.getPath();
            const perfRunConfig = perfRun.getConfig();

            return new PerformanceRunEntity(
                perfRunName,
                perfRunPath,
                perfRunConfig
            );
          });

      this.entities = this.entities.append(
          ...onlyPerfRuns
      );
    };

    /**
     * Parses all test files and instantiates intermediary TestFile objects.
     * @private
     */
    _parseAllTestFiles = () => {
      this.testFiles = this._getTestFiles()
          .map((filePath) => new TestFileEntity(filePath));
    };

    /**
     * Parses all functional test entities. It initially parses all
     * functional test suites, continues with the independent tests
     * and finally it attaches all functional test entities that
     * provide any suite references, to that specific suite.
     * @private
     */
    _parseFunctionalTests = () => {
      this._parseFunctionalSuites();

      const onlyFunctionalTests = this.testFiles
          .filter(isFunctionalTest);

      // Parse only functional tests.
      for (const functionalTest of onlyFunctionalTests) {
        const testName = functionalTest.getName();
        const testPath = functionalTest.getPath();
        const testConfig = functionalTest.getConfig();

        // Instantiate a new functional test entity.
        const FunctionalTestInstance = new FunctionalTestEntity(
            testName,
            testPath,
            testConfig
        );

        // Independent functional test entity.
        if (FunctionalTestInstance.hasNoSuiteRefs()) {
          this.entities = L.append(
              FunctionalTestInstance,
              this.entities
          );

          continue;
        }

        // Attach this test to its particular suite.
        const testSuiteRefs = FunctionalTestInstance.getSuiteRefs();

        // Iterate over all suiteRef(s) specified by this test and attach the test.
        for (const suiteRef of testSuiteRefs) {
          const foundFunctionalSuite = this.getFunctionalSuiteBy('name', suiteRef);

          if (!foundFunctionalSuite) {
            this.log.warn(`${functionalLogFormat} Could not find the ` +
                        `"${suiteRef}" referenced in "${testName}".`);

            continue;
          }

          foundFunctionalSuite.addTest(FunctionalTestInstance);
        }
      }
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

      const PerformanceSuiteInstance = new PerformanceSuiteEntity(
          suiteName,
          suitePath,
          suiteConfig
      );

      if (PerformanceSuiteInstance.hasPerfPatternRefs()) {
        const referencedPerfPatterns = PerformanceSuiteInstance.getPerfPatternsRefs();

        const testFiles = this.testFiles;

        const onlyAssociatedPerfPatterns = testFiles.filter((entity) => {
          const entityConfig = entity.getConfig();
          return isPerformancePattern(entity) &&
                    referencedPerfPatterns.indexOf(entityConfig.name) !== -1;
        });

        for (const perfPattern of onlyAssociatedPerfPatterns) {
          const patternName = perfPattern.getName();
          const patternPath = perfPattern.getPath();
          const patternConfig = perfPattern.getConfig();

          const PerformancePatternInstance = new PerformancePatternEntity(
              patternName,
              patternPath,
              patternConfig
          );

          if (PerformancePatternInstance.hasPerfRunsRefs()) {
            const referencedPerfRuns = PerformancePatternInstance.getPerfRunsRefs();

            const onlyAssociatedPerfRuns = this.testFiles.filter((entity) => {
              const entityConfig = entity.getConfig();
              return isPerformanceRun(entity) &&
                            referencedPerfRuns.indexOf(entityConfig.name) !== -1;
            });

            for (const perfRun of onlyAssociatedPerfRuns) {
              const perfRunName = perfRun.getName();
              const perfRunPath = perfRun.getPath();
              const perfRunConfig = perfRun.getConfig();

              const PerformanceRunInstance = new PerformanceRunEntity(
                  perfRunName,
                  perfRunPath,
                  perfRunConfig
              );

              PerformancePatternInstance.addPerformanceRun(PerformanceRunInstance);
            }
          } else {
            this.log.warn(`${performanceLogFormat} The ${patternName} performance ` +
                        `pattern has no performance runs referenced.`);
          }

          PerformanceSuiteInstance.addPerformancePattern(PerformancePatternInstance);
        }
      } else {
        this.log.warn(`${performanceLogFormat} The ${suiteName} performance suite ` +
                `has no performance patterns referenced.`);
      }

      return PerformanceSuiteInstance;
    };

    /**
     * Parses performance tests only.
     * @private
     */
    _parsePerformanceTests = () => {
      const performanceSuites = this.testFiles
          .filter(isPerformanceSuite)
          .map(this._parsePerformanceSuite);

      const performanceSuitesList = L.from(performanceSuites);

      this.entities = this.entities.insertAll(
          this.entities.length,
          performanceSuitesList,
          this.entities
      );
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
