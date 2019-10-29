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

const {makeLogger} = require('./../utils');

/**
 * The main Engine class.
 */
class Engine {
  /**
   * Creates a new Engine instance.
   * @param {object} settings The settings object.
   * @param {EntityManager} entityManager The entity manager instance.
   * @param {PluginsManager} pluginManager The plugins manager instance.
   * @param {string} name The engine name.
   * @param {any} engine The engine instance.
   */
  constructor(settings, entityManager, pluginManager, name, engine) {
    this.entityManager = entityManager;
    this.pluginManager = pluginManager;
    this.settings = settings;
    this.name = name;
    this.engine = engine;
    this.log = makeLogger();
    this.entities = [];
  }

    run = () => {
      throw new Error(`${this.name} engine not implementing run method!`);
    };
}

module.exports = Engine;
