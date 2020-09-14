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

const fs = require('fs');

// external
const autocannon = require('autocannon');

// project
const Engine = require('./engine');
const {TAXONOMIES, ENGINES} = require('./../enums');
const L = require('list/methods');

const {
    makeLogger,
    isPerformanceTest,
    isPerformancePattern,
    removeEmpty
} = require('./../utils');

class AutocannonEngine extends Engine {
  constructor(settings, entityManager, pluginManager) {
    super(
        settings,
        entityManager,
        pluginManager,
        TAXONOMIES.PERFORMANCE,
        ENGINES.AUTOCANNON,
        autocannon
    );

    this.entities = L.toArray(this.entityManager.getAllPerformanceSuites());
  }

    run = (testsConfig = null, cb = null) => {
      if (!testsConfig) {
        testsConfig = {
          url: 'http://localhost:9191/',
          connections: 100,
          duration: 30,
          requests: [
            {
              method: 'GET',
              path: '/test-optional-token',
              headers: testOptionalTokenHeaders,
            },
            {
              method: 'GET',
              path: '/mandatory-service-token',
              headers: mandatoryServiceTokenHeaders
            }
          ]
        }
      }

      if (!cb) {
        cb = this._handleTestFinish;
      }

      // Temporary stats map.
      // Used by the custom PoC code to compute the x-rvt time percentiles.
      // TODO: Delete me.
      const tempStats = {
          rvt: []
      }

      const stats = {
        responses: 0,
        errors: 0,
        timeouts: 0,
        rpsCount: 0,
        statuses: {},
        resIncrMap: [],
        rpsMap: [],
      };

      // TODO: Delete me.
      if (testsConfig.pocTest) {
          stats.rvt = [];
      }

      const engine = autocannon(testsConfig, (err, results) => {
        cb(err, results, stats);
      });

      process.once('SIGINT', () => {
        engine.stop();
      });

      const _incrResponses = (res, status, resBytes, resData) => {
        // TODO: Delete me.
        if (testsConfig.pocTest) {
            const xrvtidx = res.resData[0].headers.headers.indexOf("x-rvt");
            const rvt = xrvtidx != -1 ? res.resData[0].headers.headers[xrvtidx + 1] : 0;

            tempStats.rvt.push(rvt);
        }

        if (!stats.statuses[status]) {
          stats.statuses[status] = 0
        } 

        stats.statuses[status]++;
        stats.responses++;
        stats.rpsCount++;
      };

      const _incrErrors = (error) => {
        // console.log(error)
        stats.errors++;
        stats.rpsCount++;
        // todo: handle request timeout based on error
      };

      engine.on('response', _incrResponses);

      let clients = 0;

      engine.on('request', (client) => {
        clients++
        console.log(`This is client: ${clients}`);
        eval(testsConfig.hooks.onRequest);
      })


      // engine.on('body', (body) => {
        // console.log(body.toString())
      // })
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

        // TODO: Delete me.
        if (testsConfig.pocTest) {
            // Take a snapshot of xrvt every 1s
            const perc = percentile([95, 97, 99], tempStats.rvt);
            stats.rvt.push({
                p1: parseInt(perc[0]), // p95
                p2: parseInt(perc[1]), // p97
                p3: parseInt(perc[2]), // p99
                a: parseInt(tempStats.rvt.reduce((avg, value, _, { length }) =>
                    (parseInt(avg) + parseInt(value) / length), 0)), // avg
                d: now                 // date
            });

            // clean up the rvt map
            tempStats.rvt = [];
        }

        stats.rpsCount = 0;
      }, 1000);


      engine.on('done', function(results) {
        console.log(results)
        console.log(stats)
        delete stats.rpsCount;
        clearInterval(interval);
      });

      autocannon.track(engine, {
        renderProgressBar: true,
      });
    };

    getPerformanceTests = () => {
      // todo: add support for multiple tests.
      const perfTest = this.entities[0];
      const perfPattern = perfTest.perfPatterns[0];
      const perfRun = perfPattern.perfRuns[0];
      // merge config
      // todo: do this recursively

      const perfTestConfig = removeEmpty(perfTest.config.config || {});
      const perfPatternConfig = removeEmpty(perfPattern.config.config || {});
      const perfRunConfig = removeEmpty(perfRun.config.config || {});

      const perfTests = {
        ...perfTestConfig,
        ...perfPatternConfig,
        ...perfRunConfig,
      };

      return perfTests;
    };

    _getTestConfig = (test) => { // todo: flatten test object
      // todo: test this approach
      const conf = {};

      function setConfProperty(propName) {
        if (test && test.config && test.config.config[propName]) {
          conf[propName] = test.config.config[propName];
        }
      }

      const expectedProps = [
        'url',
        'socketPath',
        'connections',
        'duration',
        'amount',
        'timeout',
        'pipelining',
        'bailout',
        'method',
        'title',
        'body',
        'headers',
        'maxConnectionRequests',
        'connectionRate',
        'overallRate',
        'reconnectRate',
        'requests',
        'idReplacement',
        'forever',
        'servername',
        'excludeErrorStats',
      ];

      expectedProps.forEach(setConfProperty);

      return conf;
    };

    _handleTestFinish = (error, results) => {
      if (error) {
        console.error(`There was a problem while running the performance test!\n${error}`);
      }
    };
}

module.exports = AutocannonEngine;
