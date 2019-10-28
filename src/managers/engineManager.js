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

const {ChakramEngine, AutocannonEngine} = require('./../engines');

class EngineManager {
  constructor(
      settings,
      pluginManager,
      entityManager
  ) {
    this.settings = settings;
    this.pluginManager = pluginManager;
    this.entityManager = entityManager;

    // Initialize the Chakram engine.
    this.chakramEngine = new ChakramEngine(
        this.settings,
        this.entityManager,
        this.pluginManager
    );

    // Initialize the Autocannon engine.
    this.autoCannonEngine = new AutocannonEngine(
        this.settings,
        this.entityManager,
        this.pluginManager
    );

    return [this.autoCannonEngine, this.chakramEngine];
  }
}

module.exports = EngineManager;
