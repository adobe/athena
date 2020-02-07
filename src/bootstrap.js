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
const {isFunction} = require('lodash');
const format = require('string-format');

// project
const {COMMANDS} = require('./enums');
const {log, getCliArgs, getParsedSettings} = require('./utils');
const {
  EntityManager,
  EngineManager,
  PluginsManager,
  ScaffoldManager,
  KubernetesManager
} = require('./managers');

format.extend(String.prototype, {});

class Athena {
  constructor(options) {
    this.settings = getParsedSettings(options);
    this.cluster = null;

    // Initialize the entity and plugins managers as tests and plugins
    // should be parsed either way and loaded in memory.
    this.entityManager = new EntityManager(this.settings);
    this.pluginManager = new PluginsManager(this.settings, this.entityManager);
    this.k8sManager = new KubernetesManager();
    
    // Initialize the engine manager.
    const [AutocannonEngine, ChakramEngine] = new EngineManager(
        this.settings,
        this.pluginManager,
        this.entityManager
    );

    this.autocannon = AutocannonEngine;
    this.chakram = ChakramEngine;
  }

    runPerformanceTests = (perfTests = null, cb = null) => {
      this.autocannon.run(perfTests, cb);
    };

    runFunctionalTests = () => {
      this.chakram.run();
    };

    getSettings = () => {
      return this.settings;
    };

    getPerformanceTests = () => {
      return this.autocannon.getPerformanceTests();
    };

    // private

    // todo: this should be handled separately by a scaffold manager.
    _maybeHandleScaffolding = () => {
      let scaffoldCommandUsed = false;
      const scaffold = new ScaffoldManager(this.settings);
      const cliArgs = getCliArgs();

      const handleScaffoldCommand = (command) => {
        const commandName = command.substr(0, 1).toUpperCase() + command.slice(1);
        const fullCommandName = `handle${commandName}`;

        if (typeof scaffold[fullCommandName] === 'undefined') {
          log.debug(`Could not handle the "${command}" scaffolding command.`);
          return;
        }

        if (isFunction(scaffold[fullCommandName])) {
          log.debug(`Scaffolding: Handling command "${fullCommandName}".`);
          scaffoldCommandUsed = true;
          scaffold[fullCommandName]();
        }
      };

      for (const COMMAND of Object.keys(COMMANDS)) {
        const ACTION = COMMANDS[COMMAND];

        if (cliArgs[ACTION]) {
          handleScaffoldCommand(ACTION);
        }
      }

      if (scaffoldCommandUsed) {
        process.exit(0);
      }
    };
}

exports = module.exports = Athena;
