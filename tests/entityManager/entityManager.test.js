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
const expect = require('chai').expect;
const assert = require('assert');
const sinon = require('sinon');

// project
const EntityManager = require('./../../src/managers/entityManager');

describe('EntityManager', function() {
  describe('constructor', function() {
    let EntityManagerStub;

    beforeEach(function() {
      EntityManagerStub = sinon.stub(
          EntityManager.prototype,
          '_parseEntities'
      ).returns(0);
    });

    afterEach(function() {
      EntityManagerStub.restore();
    });

    it('should set the settings', function() {
      const expectedSettings = {expected: true};
      const EntityManagerInstance = new EntityManager(expectedSettings);

      expect(EntityManagerInstance.settings).to.equal(expectedSettings);
    });

    it('should define the pre-parsed entities', function() {
      const EntityManagerInstance = new EntityManager({});

      expect(EntityManagerInstance.preParsedEntities).to.eql([]);
    });

    it('should create a container for the final entities', function() {
      const EntityManagerInstance = new EntityManager({});

      expect(EntityManagerInstance.entities).to.have.property('add');
      expect(EntityManagerInstance.entities).to.have.property('entries');
    });

    it('should attempt to parse all entities', function() {
      const expectedSettings = {expected: true};
      const EntityManagerInstance = new EntityManager(expectedSettings);

      assert(EntityManagerInstance._parseEntities.called);
    });
  });

  describe('_getTestFiles', function() {
    let EntityManagerStub;

    beforeEach(function() {
      EntityManagerStub = sinon.stub(
          EntityManager.prototype,
          '_parseEntities'
      ).returns(0);
    });

    afterEach(function() {
      EntityManagerStub.restore();
    });

    it('should deep search for test files in a given directory', function() {
      const mockSettings = {
        testsDirPath: path.resolve(
            './',
            'tests',
            'entityManager',
            'config',
            'getTestFiles'
        ),
      };
      const EntityManagerInstance = new EntityManager(mockSettings);
      const testFiles = EntityManagerInstance._getTestFiles();

      expect(testFiles).to.be.an('array');
      expect(testFiles.length).to.equal(2);
    });
  });

  describe('_parseEntities', function() {
    // todo: not implemented
  });
});
