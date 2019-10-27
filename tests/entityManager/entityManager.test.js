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

/* eslint-disable max-len */

// node
const path = require('path');

// external
const expect = require('chai').expect;
const assert = require('assert');
const sinon = require('sinon');
const L = require('list/methods');

// project
const EntityManager = require('./../../src/managers/entityManager');

/**
 * Builds the tests directory path for a given subdirectory.
 * @param {string} finalPath The final path element.
 * @return {string} The final path.
 */
function makeTestsDirPath(finalPath) {
  return path.resolve(
      './',
      'tests',
      'entityManager',
      'config',
      finalPath
  );
}

/**
 * EntityManager._parseEntities stub handlers.
 */

let EntitiesManagerParseEntityStub;

/**
 * Creates handler that stubs the _parseEntities method.
 * @return {Function} The handler function.
 */
function makeStubParseEntitiesHandler() {
  return function() {
    EntitiesManagerParseEntityStub = sinon.stub(
        EntityManager.prototype,
        '_parseEntities'
    ).returns(0);
  };
}

/**
 * Creates a handler that restores the _parseEntities stubbed method.
 * @return {Function} The handler function.
 */
function makeRestoreParseEntitiesHandler() {
  return function() {
    EntitiesManagerParseEntityStub.restore();
  };
}

describe('EntityManager', function() {
  describe('constructor', function() {
    beforeEach(makeStubParseEntitiesHandler());
    afterEach(makeRestoreParseEntitiesHandler());

    it('should set the settings', function() {
      const expectedSettings = {expected: true};
      const EntityManagerInstance = new EntityManager(expectedSettings);

      expect(EntityManagerInstance.settings).to.equal(expectedSettings);
    });

    it('should define the pre-parsed entities', function() {
      const EntityManagerInstance = new EntityManager({});

      expect(EntityManagerInstance.entities.length).to.eql(0);
    });

    it('should create a container for the final entities', function() {
      const EntityManagerInstance = new EntityManager({});

      expect(EntityManagerInstance.entities).to.have.property('bits');
      expect(EntityManagerInstance.entities).to.have.property('offset');
      expect(EntityManagerInstance.entities).to.have.property('length');
      expect(EntityManagerInstance.entities).to.have.property('prefix');
      expect(EntityManagerInstance.entities).to.have.property('root');
      expect(EntityManagerInstance.entities).to.have.property('suffix');
    });

    it('should attempt to parse all entities', function() {
      const expectedSettings = {expected: true};
      const EntityManagerInstance = new EntityManager(expectedSettings);

      assert(EntityManagerInstance._parseEntities.called);
    });
  });

  describe('_getTestFiles', function() {
    beforeEach(makeStubParseEntitiesHandler());
    afterEach(makeRestoreParseEntitiesHandler());

    it('should deep search for test files in a given directory', function() {
      const mockSettings = {
        testsDirPath: makeTestsDirPath('getTestFiles'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);
      const testFiles = EntityManagerInstance._getTestFiles();

      expect(testFiles).to.be.an('array');
      expect(testFiles.length).to.equal(2);
    });
  });

  describe('_parseAllTestFiles', function() {
    beforeEach(makeStubParseEntitiesHandler());
    afterEach(makeRestoreParseEntitiesHandler());

    it('should parse all existent test files', function() {
      const mockSettings = {
        testsDirPath: makeTestsDirPath('getTestFiles'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);

      EntityManagerInstance._parseAllTestFiles();

      expect(EntityManagerInstance.testFiles.length).to.equal(2);
    });

    it('should instantiate a new TestFile for each test file', function() {
      const mockSettings = {
        testsDirPath: makeTestsDirPath('getTestFiles'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);

      EntityManagerInstance._parseAllTestFiles();

      const constructorName = EntityManagerInstance.testFiles[0].constructor.name;
      expect(constructorName).to.equal('TestFileEntity');
    });
  });

  describe('_parseFunctionalSuites', function() {
    beforeEach(makeStubParseEntitiesHandler());
    afterEach(makeRestoreParseEntitiesHandler());

    it('should filter and parse only suite types', function() {
      const mockSettings = {
        testsDirPath: makeTestsDirPath('parseFunctionalSuites'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);

      EntityManagerInstance._parseAllTestFiles();
      EntityManagerInstance._parseFunctionalSuites();

      expect(EntityManagerInstance.entities.length).to.equal(1);
      expect(L.first(EntityManagerInstance.entities).config.type).to.equal('suite');
    });
  });

  describe('_parseFixtures', function() {
    beforeEach(makeStubParseEntitiesHandler());
    afterEach(makeRestoreParseEntitiesHandler());

    it('should filter and parse only fixture types', function() {
      const mockSettings = {
        testsDirPath: makeTestsDirPath('parseFixtures'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);

      EntityManagerInstance._parseAllTestFiles();
      EntityManagerInstance._parseFixtures();

      expect(EntityManagerInstance.entities.length).to.equal(1);
      expect(L.first(EntityManagerInstance.entities).config.type).to.equal('fixture');
    });
  });

  describe('getFunctionalSuiteBy', function() {
    it('should return a single functional suite by a given config argument', function() {
      const mockSettings = {
        testsDirPath: makeTestsDirPath('parseFunctionalSuites'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);

      EntityManagerInstance._parseAllTestFiles();
      EntityManagerInstance._parseFunctionalSuites();

      const foundSuite = EntityManagerInstance.getFunctionalSuiteBy('name', 'ccecoSuite');

      expect(foundSuite.name).to.equal('suiteFile.yaml');
      expect(foundSuite.config.name).to.equal('ccecoSuite');
    });

    it('should log a warning if the config argument does not exist', function() {
      const mockSettings = {
        testsDirPath: makeTestsDirPath('parseFunctionalSuites'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);
      const spy = sinon.stub(EntityManagerInstance.log, 'warn').returns(0);

      EntityManagerInstance._parseAllTestFiles();
      EntityManagerInstance._parseFunctionalSuites();

      const foundSuite = EntityManagerInstance.getFunctionalSuiteBy('inexistentPropertyName', 'exampleValue');

      expect(foundSuite).to.equal(undefined);
      assert(spy.called);
    });

    it('should return null if the config argument exists, but no suites were found', function() {
      const mockSettings = {
        testsDirPath: makeTestsDirPath('parseFunctionalSuites'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);

      EntityManagerInstance._parseAllTestFiles();
      EntityManagerInstance._parseFunctionalSuites();

      const foundSuite = EntityManagerInstance.getFunctionalSuiteBy('name', 'inexistentValue');

      expect(foundSuite).to.equal(undefined);
    });
  });

  describe('_parsePerfRuns', function() {
    beforeEach(makeStubParseEntitiesHandler());
    afterEach(makeRestoreParseEntitiesHandler());

    it('should filter and parse only perfRun types', function() {
      const mockSettings = {
        testsDirPath: makeTestsDirPath('parsePerfRuns'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);

      EntityManagerInstance._parseAllTestFiles();
      EntityManagerInstance._parsePerfRuns();

      expect(EntityManagerInstance.entities.length).to.equal(1);
      expect(L.first(EntityManagerInstance.entities).config.type).to.equal('perfRun');
    });
  });

  describe('_parseFunctionalTests', function() {
    beforeEach(makeStubParseEntitiesHandler());
    afterEach(makeRestoreParseEntitiesHandler());

    it('should start by parsing all functional suites first', function() {
      const mockSettings = {
        testsDirPath: makeTestsDirPath('parseFunctionalSuites'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);
      const spy = sinon.spy(EntityManagerInstance, '_parseFunctionalSuites');

      EntityManagerInstance._parseAllTestFiles();
      EntityManagerInstance._parseFunctionalTests();

      assert(spy.called);
    });

    it('should parse independent functional test entities', function() {
      const expectedIndieTestName = 'indie test';
      const mockSettings = {
        testsDirPath: makeTestsDirPath('parseFunctionalTests'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);
      sinon.stub(EntityManagerInstance.log, 'warn').returns(0);

      EntityManagerInstance._parseAllTestFiles();
      EntityManagerInstance._parseFunctionalTests();

      const indieTests = EntityManagerInstance.getIndieFunctionalTests();
      const indieTest = L.first(indieTests);

      expect(indieTests.length).to.equal(1);
      expect(indieTest.config.name).to.equal(expectedIndieTestName);
      expect(indieTest.constructor.name).to.equal('FunctionalTestEntity');
    });

    it('should attempt to attach the functional test to its specified suiteRef', function() {
      const mockSettings = {
        testsDirPath: makeTestsDirPath('parseFunctionalTests'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);
      sinon.stub(EntityManagerInstance.log, 'warn').returns(0);

      EntityManagerInstance._parseAllTestFiles();
      EntityManagerInstance._parseFunctionalTests();

      const functionalSuite = L.first(EntityManagerInstance.getAllFunctionalSuites());
      const functionalSuiteTests = functionalSuite.getTests();

      expect(functionalSuiteTests.length).to.equal(1);
      expect(functionalSuiteTests[0].config.name).to.equal('testWithSuite');
    });

    it('should log a warning message if it could not find its specified suiteRef', function() {
      const mockSettings = {
        testsDirPath: makeTestsDirPath('parseFunctionalTests'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);
      const logWarnSpy = sinon.stub(EntityManagerInstance.log, 'warn').returns(0);

      EntityManagerInstance._parseAllTestFiles();
      EntityManagerInstance._parseFunctionalTests();

      const functionalSuite = L.first(EntityManagerInstance.getAllFunctionalSuites());
      const functionalSuiteTests = functionalSuite.getTests();

      expect(functionalSuiteTests.length).to.equal(1);
      assert(logWarnSpy.called);
    });
  });

  describe('_parsePerformanceTests', function() {
    beforeEach(makeStubParseEntitiesHandler());
    afterEach(makeRestoreParseEntitiesHandler());

    it('should parse all performance suites', function() {
      const mockSettings = {
        testsDirPath: makeTestsDirPath('parsePerformanceTests'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);
      sinon.stub(EntityManagerInstance.log, 'warn').returns(0);

      EntityManagerInstance._parseAllTestFiles();
      EntityManagerInstance._parsePerformanceTests();

      const performanceSuites = EntityManagerInstance.getAllPerformanceSuites();

      expect(performanceSuites.length).to.equal(3);
    });

    it('should parse all performance patterns associated with a perf suite', function() {
      const mockSettings = {
        testsDirPath: makeTestsDirPath('parsePerformanceTests'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);
      sinon.stub(EntityManagerInstance.log, 'warn').returns(0);

      EntityManagerInstance._parseAllTestFiles();
      EntityManagerInstance._parsePerformanceTests();

      const performanceSuite = L.first(EntityManagerInstance.getAllPerformanceSuites());

      expect(performanceSuite.perfPatterns.length).to.equal(1);
      expect(performanceSuite.perfPatterns[0].name).to.equal('perfPatternTest.yaml');
    });

    it('should log a warn message if it could not find an associated perf pattern', function() {
      const mockSettings = {
        testsDirPath: makeTestsDirPath('parsePerformanceTests'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);
      const logWarnSpy = sinon.stub(EntityManagerInstance.log, 'warn').returns(0);

      EntityManagerInstance._parseAllTestFiles();
      EntityManagerInstance._parsePerformanceTests();

      const performanceSuite = L.first(EntityManagerInstance.getAllPerformanceSuites());

      assert(logWarnSpy.called);
      expect(performanceSuite.perfPatterns.length).to.equal(1);
    });

    it('should parse all performance runs associated with a perf pattern', function() {
      const mockSettings = {
        testsDirPath: makeTestsDirPath('parsePerformanceTests'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);
      sinon.stub(EntityManagerInstance.log, 'warn').returns(0);

      EntityManagerInstance._parseAllTestFiles();
      EntityManagerInstance._parsePerformanceTests();

      const performanceSuite = L.first(EntityManagerInstance.getAllPerformanceSuites());

      expect(performanceSuite.perfPatterns.length).to.equal(1);
      expect(performanceSuite.perfPatterns[0].name).to.equal('perfPatternTest.yaml');

      expect(performanceSuite.perfPatterns[0].perfRuns.length).to.equal(1);
      expect(performanceSuite.perfPatterns[0].perfRuns[0].name).to.equal('perfRunTest.yaml');
    });

    it('should log a warn message if a perf pattern has no associated perf runs', function() {
      const mockSettings = {
        testsDirPath: makeTestsDirPath('parsePerformanceTests'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);
      const logWarnSpy = sinon.stub(EntityManagerInstance.log, 'warn').returns(0);

      EntityManagerInstance._parseAllTestFiles();
      EntityManagerInstance._parsePerformanceTests();

      const perfSuites = EntityManagerInstance.getAllPerformanceSuites();
      const perfSuiteWithPatternThatHasNoRuns = L.find((perfSuite) => {
        return perfSuite.name === 'perfSuiteTestWithPatternThatHasNoRuns.yaml';
      }, perfSuites);

      expect(perfSuiteWithPatternThatHasNoRuns.name).to.equal('perfSuiteTestWithPatternThatHasNoRuns.yaml');
      assert(logWarnSpy.called);
    });
  });

  describe('_parseEntities', function() {
    it('should parse all test files', function() {
      const mockSettings = {
        testsDirPath: makeTestsDirPath('parsePerformanceTests'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);
      EntityManagerInstance.log.warn = () => {};
      const spy = sinon.stub(EntityManagerInstance, '_parseAllTestFiles').returns(0);

      EntityManagerInstance._parseEntities();

      assert(spy.called);
    });

    it('should parse all fixtures', function() {
      const mockSettings = {
        testsDirPath: makeTestsDirPath('parsePerformanceTests'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);
      const spy = sinon.stub(EntityManagerInstance, '_parseFixtures').returns(0);
      EntityManagerInstance.log.warn = () => {};

      EntityManagerInstance._parseEntities();

      assert(spy.called);
    });

    it('should parse all functional tests', function() {
      const mockSettings = {
        testsDirPath: makeTestsDirPath('parsePerformanceTests'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);
      const spy = sinon.stub(EntityManagerInstance, '_parseFunctionalTests').returns(0);
      EntityManagerInstance.log.warn = () => {};

      EntityManagerInstance._parseEntities();

      assert(spy.called);
    });

    it('should parse all performance tests', function() {
      const mockSettings = {
        testsDirPath: makeTestsDirPath('parsePerformanceTests'),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);
      const spy = sinon.stub(EntityManagerInstance, '_parsePerformanceTests').returns(0);
      EntityManagerInstance.log.warn = () => {};

      EntityManagerInstance._parseEntities();

      assert(spy.called);
    });
  });
});
