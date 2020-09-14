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

// external
const format = require('string-format');

// project
const {getParsedSettings} = require('./utils');
const {EntityManager, EngineManager, PluginsManager, KubernetesManager} = require('./managers');

format.extend(String.prototype, {});

class Athena {
  constructor(options) {
    this.settings = getParsedSettings(options);
    this.cluster = null;

    // Initialize the entity and plugins managers as tests and plugins should be
    // parsed either way and loaded in memory.
    this.entityManager = new EntityManager(this.settings);
    this.pluginManager = new PluginsManager(this.settings, this.entityManager);
    this.k8sManager = new KubernetesManager();

    // [AutocannonEngine, ChakramEngine]
    const [
      FunctionalEngine,
      PerformanceEngine
    ] = new EngineManager(
      this.settings,
      this.pluginManager,
      this.entityManager
    )

    this.PerformanceEngine = PerformanceEngine;
    this.FunctionalEngine = FunctionalEngine;
  }

  runPerformanceTests = (perfTests = null, cb = null, callbacks =  {}) => this
    .PerformanceEngine
    .run(perfTests, cb, callbacks);

  runFunctionalTests = () => this
    .FunctionalEngine
    .run();

  getSettings = () => this.settings;

  getPerformanceTests = () => this
    .PerformanceEngine
    .getPerformanceTests()
}

exports = module.exports = Athena;
