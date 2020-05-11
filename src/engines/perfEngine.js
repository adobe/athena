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
const {
    TAXONOMIES,
    ENGINES
} = require('./../enums');
const L = require('list/methods');

const {
    removeEmpty
} = require('./../utils');

module.exports = class PerformanceEngine extends Engine {
    constructor([settings, pluginManager, entityManager]) {
        super(
            settings,
            pluginManager,
            entityManager,
            TAXONOMIES.PERFORMANCE,
            ENGINES.AUTOCANNON,
            autocannon
        )

        this.entities = L.toArray(
            entityManager.getAllPerformanceSuites()
        );
    }

    run = (testsConfig = null, cb = null) => {
        if (!testsConfig) {
            this.log.error(`No performance test configuration provided for the performance engine!`);
            return;
        }

        if (!cb) {
            cb = this._handleTestFinish;
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

        const engine = autocannon(testsConfig, (err, results) => {
            cb(err, results, stats);
        });

        process.once('SIGINT', () => {
            engine.stop();
        });

        const _incrResponses = (res, status, resBytes, resData) => {
            if (!stats.statuses[status]) {
                stats.statuses[status] = 0
            }

            stats.statuses[status]++;
            stats.responses++;
            stats.rpsCount++;
        };

        const _incrErrors = (error) => {
            stats.errors++;
            stats.rpsCount++;
            // todo: handle request timeout based on error
        };

        engine.on('response', _incrResponses);

        let clients = 0;

        engine.on('request', (client) => {
            clients++
            eval(testsConfig.hooks.onRequest);
        });

        engine.on('reqError', _incrErrors);

        const interval = setInterval(function () {
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


        engine.on('done', function (results) {
            // console.log(results)
            // console.log(stats)
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