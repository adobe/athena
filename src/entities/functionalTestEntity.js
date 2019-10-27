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

const TestEntity = require('./testEntity');
const {isString} = require('lodash');

/**
 * Class method used to create a new functional test entity.
 */
class FunctionalTestEntity extends TestEntity {
  /**
   * Creates a new functional test entity instance.
   * @param {string} name The name.
   * @param {string} path The file path.
   * @param {object} config The configuration object.
   */
  constructor(name, path, config) {
    super(name, path, config);

    // Handle the case where the suiteRef is a singular reference.
    if (isString(config.suiteRef)) {
      this.config.suiteRef = [config.suiteRef];
    }
  }

  /**
   * Gets the number of suites this test is referencing.
   * @return {number} The number of suites referenced.
   */
  getSuitesCount = () => {
    if (this.config &&
        this.config.suiteRef &&
        this.config.suiteRef.length) {
      return this.config.suiteRef.length;
    }

    return 0;
  };

  /**
   * Checks whether this functional test has any suites referenced.
   * @return {boolean} True if the test has any suites referenced, false otherwise.
   */
  hasNoSuiteRefs = () => {
    return this.getSuitesCount() === 0;
  };

  /**
   * Returns the name of this particular test entity.
   * @return {string} The name of the test.
   */
  getName = () => {
    return this.name;
  };
}

module.exports = FunctionalTestEntity;
