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

const Entity = require('./entity');
const {ENTITY_TYPES} = require('./../enums');

/**
 * Creates a new TestEntity instance.
 */
class TestEntity extends Entity {
  /**
     * Creates a new TestEntity instance.
     * @param {string} name The name.
     * @param {string} path The path.
     * @param {object} config The config object.
     */
  constructor(name, path, config) {
    super(name, path, config);

    this.setType(ENTITY_TYPES.TEST);

    this.validate();
  }
}

module.exports = TestEntity;
