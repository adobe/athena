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
const {isString} = require('lodash');

class TestEntity extends Entity {
  constructor(name, path, config) {
    super(name, path, config);

    this.setType(ENTITY_TYPES.TEST);

    this.validate();
  }
}

class ChakramTest extends TestEntity {
  constructor(name, path, config) {
    super(name, path, config);

    // Handle the case where the suiteRef is a single reference.
    if (isString(config.suiteRef)) {
      this.config.suiteRef = [config.suiteRef];
    }
  }

  getSuitesCount = () => {
    if (this.config &&
        this.config.suiteRef &&
        this.config.suiteRef.length) {
      return this.config.suiteRef.length;
    }

    return 0;
  };

  getSuiteRefs = () => {
    if (this.config && this.config.suiteRef) {
      return this.config.suiteRef;
    }

    // todo: log error
  };

  hasNoSuiteRefs = () => {
    return this.getSuitesCount() === 0;
  };

  getName = () => {
    return this.name;
  };
}

exports.TestEntity = TestEntity;
exports.ChakramTest = ChakramTest;
