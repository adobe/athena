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
const autocannon = require('autocannon');

// project
const Engine = require('./engine');
const {ENGINES} = require('./../enums');
const {
  isPerformanceTest,
  isPerformancePattern,
  removeEmpty,
} = require('./../utils');

/**
 * The main Autocannon engine instance.
 */
class AutocannonEngine extends Engine {
  /**
   * Creates a new Autocannon engine wrapper instance.
   * @param {object} settings The settings object.
   * @param {EntityManager} entityManager An entity manager instance.
   * @param {PluginsManager} pluginManager The plugin manager instance.
   */
  constructor(settings, entityManager, pluginManager) {
    super(
        settings,
        entityManager,
        pluginManager,
        ENGINES.AUTOCANNON,
        autocannon
    );

    this.entities = this.entityManager.getAllPerformanceSuites();
  }

  run = (testsConfig = null, cb = null) => {
    if (!testsConfig) {
      testsConfig = this.getPerformanceTests();
    }

    if (!cb) {
      cb = this._handleTestFinish;
    }

    const stats = {
      responses: 0,
      errors: 0,
      timeouts: 0,
      rpsCount: 0,
      resIncrMap: [],
      rpsMap: [],
    };

    const engine = this.engine(testsConfig, (err, results) => {
      cb(err, results, stats);
    });

    process.once('SIGINT', () => {
      engine.stop();
    });

    const _incrResponses = () => {
      stats.responses++;
      stats.rpsCount++;
    };

    const _incrErrors = (error) => {
      stats.errors++;
      stats.rpsCount++;

      // todo: handle request timeout based on error
    };

    engine.on('response', _incrResponses);
    engine.on('reqError', _incrErrors);

    const interval = setInterval(function() {
      const now = new Date().toJSON();

      stats.resIncrMap.push({
        count: stats.responses,
        date: now,
      });

      stats.rpsMap.push({
        count: stats.rpsCount,
        date: now,
      });

      stats.rpsCount = 0;
    }, 1000);

    engine.on('done', function(results) {
      delete stats.rpsCount;
      clearInterval(interval);
    });

    autocannon.track(engine, {
      renderProgressBar: true,
    });
  };

  // getPerformanceTests = () => {
  //   // todo: add support for multiple tests.
  //   const perfTest = this.entities[0];
  //   const perfPattern = perfTest.perfPatterns[0];
  //   const perfRun = perfPattern.perfRuns[0];
  //
  //   // merge config
  //   // todo: do this recursively
  //
  //   const perfTestConfig = removeEmpty(perfTest.config.config || {});
  //   const perfPatternConfig = removeEmpty(perfPattern.config.config || {});
  //   const perfRunConfig = removeEmpty(perfRun.config.config || {});
  //
  //   const perfTests = {
  //     ...perfTestConfig,
  //     ...perfPatternConfig,
  //     ...perfRunConfig,
  //   };
  //
  //   return perfTests;
  // };

  // _getTestConfig = (test) => { // todo: flatten test object
  //   // todo: test this approach
  //   const conf = {};
  //
  //   function setConfProperty(propName) {
  //     if (test && test.config && test.config.config[propName]) {
  //       conf[propName] = test.config.config[propName];
  //     }
  //   }
  //
  //   const expectedProps = [
  //     'url',
  //     'socketPath',
  //     'connections',
  //     'duration',
  //     'amount',
  //     'timeout',
  //     'pipelining',
  //     'bailout',
  //     'method',
  //     'title',
  //     'body',
  //     'headers',
  //     'maxConnectionRequests',
  //     'connectionRate',
  //     'overallRate',
  //     'reconnectRate',
  //     'requests',
  //     'idReplacement',
  //     'forever',
  //     'servername',
  //     'excludeErrorStats',
  //   ];
  //
  //   expectedProps.forEach(setConfProperty);
  //
  //   return conf;
  // };

  _handleTestFinish = (error, results) => {
    if (error) {
      console.error(`There was a problem while running the performance test!\n${error}`);
    }

    console.log(results);
  };
}

module.exports = AutocannonEngine;
