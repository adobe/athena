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
const glob = require('glob');
const L = require('list/methods');

// project
const {
  isFunctionalTest,
  isSuite,
  isFunctionalSuite,
  isFixture,
  isPerformanceTest,
  isPerformancePattern,
  isPerformanceRun,
  makeLogger,
} = require('../utils');

const FunctionalSuiteEntity = require('../entities/functionalSuiteEntity');
const {ChakramTest} = require('../entities/testEntity');
const FixtureEntity = require('../entities/fixtureEntity');
const PerformanceTestEntity = require('../entities/performanceTestEntity');
const PerformancePatternEntity = require('../entities/performancePatternEntity');
const PerformanceRunEntity = require('../entities/performanceRunEntity');

const log = makeLogger();
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
    this.testFiles = [];
    this.entities = L.list();

    this._parseEntities();
  }

  // public

  addEntity = (entity) => {
    this.entities.add(entity);
  };

  getSuiteBy = (attribute, value) => {
    // let foundSuite = null;
    //
    // const onlyEntitiesByAttribute = (e) => {
    //   return isSuite(e) && e.config[attribute] === value;
    // };
    //
    // const foundSuites = this.filterEntities(onlyEntitiesByAttribute);
    //
    // if (foundSuites.length) {
    //   foundSuite = foundSuites[0];
    // }
    //
    // return foundSuite;


  };

  /**
   * Returns all functional suites
   * @return {List<A>} The functional suites.
   */
  getAllFunctionalSuites = () => {
    const functionalSuites = L.filter((entity) => {
      return entity.constructor.name === 'FunctionalSuiteEntity';
    }, this.entities);

    console.log(functionalSuites);

    return functionalSuites;
  };

  getFunctionalSuitesBy = (attribute, value) => {
    const functionalSuites = this.getAllFunctionalSuites();

    // console.log(L.toArray(functionalSuites));
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

  getIndieTests = () => {
    const entities = this.entities;
    const indieTests = L.filter((entity) => {
      return isFunctionalTest(entity) && entity.hasNoSuiteRefs();
    }, entities);

    console.log(indieTests);

    // console.log(L.toArray(indieTests));
    // console.log(this.entities);

    return indieTests;
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
        .filter(isFunctionalSuite)
        .map((suite) => new FunctionalSuiteEntity(
            suite.name,
            suite.entityPath,
            suite.config
        ));

    this.entities = this.entities.append(
        L.from(onlyFunctionalSuites)
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
        .map((perfRun) => new PerformanceRunEntity(
            perfRun.name,
            perfRun.entityPath,
            perfRun.config
        ));

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
        .map((filePath) => new TestFile(filePath));
  };

  /**
   * Parses all functional test entities. It initially parses all functional test suites,
   * continues with the independent tests and finally it attaches all functional test
   * entities that provide any suite references, to that specific suite.
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
      const ChakramTestEntity = new ChakramTest(
          testName,
          testPath,
          testConfig
      );

      // Independent functional test entity.
      if (ChakramTestEntity.hasNoSuiteRefs()) {
        this.entities = L.append(
            ChakramTestEntity,
            this.entities
        );

        continue;
      }

      // // Attach this test to its particular suite.
      // const testSuiteRefs = ChakramTestEntity.getSuiteRefs();
      //
      // // Iterate over all suiteRef(s) specified by this test and attach the test.
      // for (const suiteRef of testSuiteRefs) {
      //   const FunctionalSuite = this.getFunctionalSuitesBy('name', suiteRef);
      //
      //   if (!FunctionalSuite) {
      //     log.warn(`${functionalLogFormat} Could not find the suite "${suiteRef}" ` +
      //       `referenced in "${testName}".`);
      //
      //     continue;
      //   }
      //
      //   FunctionalSuite.addTest(ChakramTestEntity);
      // }
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
    this._config = null;
    this._fileData = null;
    this._path = null;
    this._name = null;

    if (!filePath) {
      throw new Error(`When instantiating a new TestFile, you must provide a filePath.`);
    }

    try {
      this._config = jsYaml.safeLoad(fs.readFileSync(filePath, 'utf-8'));
      this._fileData = path.parse(filePath);
    } catch (error) {
      log.error(`Could not parse test file.\n${error}`);
    }

    this._path = filePath;
    this._name = this._fileData.base;
  }

  /**
   * Returns the name of this particular test.
   * @return {string} The name of the test file.
   */
  getName = () => {
    return this._name;
  };

  /**
   * Returns the file path of this particular test.
   * @return {string} The file path of the test file.
   */
  getPath = () => {
    return this._path;
  };

  /**
   * Returns the config of this particular test.
   * @return {object} The parsed configuration file of the test file.
   */
  getConfig = () => {
    return this._config;
  };

  /**
   * Returns the parsed file data of this particular test returned
   * from path.parse().
   * @return {object} The parsed data of this particular test file.
   */
  getFileData = () => {
    return this._fileData;
  };
}

module.exports = EntityManager;
