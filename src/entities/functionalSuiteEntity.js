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

// External
const {
  isArray
} = require('lodash');

// Project
const Entity = require('./entity');
const {
  ENTITY_TYPES
} = require('./../enums');

/**
 * The main functional suite entity class.
 */
class FunctionalSuiteEntity extends Entity {
  /**
   * Creates a new functional suite instance.
   * @param {string} name The name of the suite.
   * @param {string} path The path of the suite definition file.
   * @param {object} config The configuration object defined inside the definition file.
   */
  constructor(name, path, config) {
    super(name, path, config);

    this._tests = []; // The list of tests referenced by this suite.
    this._suites = []; // The list of sub-suites referenced by this suite.

    this.setType(ENTITY_TYPES.SUITE);
    this.validate();
  }

  /**
   * Adds a new test to the suite entity.
   * @param {FunctionalTestEntity} test The test entity.
   */
  addTest = (test) => {
    this._tests.push(test);
  };

  addSuite = (suite) => {
    this._suites.push(suite);
  }

  /**
   * Returns the list of associated functional test instances.
   * @return {Array} The list of associated functional test instances.
   */
  getTests = () => {
    return this._tests;
  };

  getSuites = () => {
    return this._suites;
  }

  /**
   * Checks whether the suite has any functional test references.
   * @return {boolean} True if the suite has any functional test references,
   * false otherwise.
   */
  hasTestRefs = () => {
    const suiteConfig = this.getConfig();
    return suiteConfig.tests &&
      isArray(suiteConfig.tests) &&
      suiteConfig.tests.length;
  };

  hasSuiteRefs = () => {
    const suiteConfig = this.getConfig();

    return suiteConfig.suites && isArray(suiteConfig.suites) && suiteConfig.suites.length;
  };

  /**
   * Returns the list of tests referenced by this suite.
   * @return {Array} The list of tests referenced by this suite.
   */
  getTestsRefs = () => {
    return this.getConfig().tests;
  }

  getSuitesRefs = () => {
    return {
        suites: this.getConfig().suites,
        skips: this.getConfig().skips
    };
  }
}

module.exports = FunctionalSuiteEntity;