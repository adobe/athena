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
const percentile = require('percentile');

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

        this.engine = null;

        // this.entities = L.toArray(
            // this.entityManager.getAllPerformanceSuites()
        // );
    }
    
    run = (testsConfig = null, cb = null, callbacks = {}) => {
        var self = this;
        const { before: beforeCb, interval: intervalCb, after: afterCb } = callbacks;

        // Check whether we have a "before" callback and maybe run it.
        if (beforeCb && typeof beforeCb === "function") {
            beforeCb();
        }

        // Setup default test config.
        if (!testsConfig) {
            testsConfig = {
                url: 'https://httpbin.org/headers',
                connections: 1,
                connectionRate: 10,
                duration: 5
            }
        }

        if (!cb) {
            cb = this._handleTestFinish;
        }

        // Temporary stats map.
        // Used by the custom PoC code to compute the x-rvt time percentiles.
        // TODO: Delete me.
        const tempStats = {
            rvt: [],
            responseTimes: []
        }

        let reportsCount = 0;
        const makeEmptyStatsContainer = (ext = {}) => {
            return {
                partialReportsCount: 1,
                responses: 0,
                errors: 0,
                timeouts: 0,
                rpsCount: 0,
                statuses: {
                    '1XX': 0,
                    '2XX': 0,
                    '3XX': 0,
                    '4XX': 0,
                    '5XX': 0,
                },
                responseTimes: [],
                resIncrMap: [],
                rpsMap: [],
                rvt: [],
                ...ext
            }
        }

        let stats = makeEmptyStatsContainer();

        const engine = autocannon(testsConfig, (err, results) => {
            cb(err, results, stats);
        }, (what) => {

        });
        self.engine = engine;

        process.once('SIGINT', () => {
            engine.stop();
        });

        const status_mappings = {
            "1" : "ox", // 1xx
            "2" : "tx", // 2xx
            "3" : "thx", // 3xx
            "4" : "fox", // 4xx
            "5" : "fix", // 5xx
        }

        const _incrResponses = (res, status, resBytes, responseTime) => {
            // TODO: Delete me.
            const xrvtidx = res.resData[0].headers.headers.indexOf("x-rvt");
            const rvt = xrvtidx != -1 ? res.resData[0].headers.headers[xrvtidx + 1] : 0;

            // Store temporary stats.
            tempStats.rvt.push(rvt);
            tempStats.responseTimes.push(responseTime);

            // Store the exact status and increment its count.
            // if (!stats.statuses[status]) {
                // stats.statuses[status] = 0;
            // }

            // stats.statuses[status]++;

            // Also increment responses and the overall rps count.
            stats.responses++;
            stats.rpsCount++;

            // Increment the overall generic status.
            // We're using this for partial reporting since we can't access the
            // final reports until Autocannon is done with the test.

            const status_idx = Number(String(status).charAt(0)) - 1
            if ([1, 2, 3, 4, 5].indexOf(status_idx) !== -1) {
                stats.statuses[`${String(status_idx + 1)}XX`]++
            }
        };

        const _incrErrors = (error) => {
            stats.errors++;
            stats.rpsCount++;
        };

        engine.on('response', _incrResponses);
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

            // TODO: Delete me.
            if (tempStats.rvt.length) {
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

            // If we have any temporary response times, generate percentiles.
            if (tempStats.responseTimes.length) {
                const perc = percentile([95, 97, 99], tempStats.responseTimes);
                stats.responseTimes.push({
                    p1: parseInt(perc[0]), // p95
                    p2: parseInt(perc[1]), // p97
                    p3: parseInt(perc[2]), // p99
                    a: parseInt(tempStats.responseTimes.reduce((avg, value, _, { length }) =>
                        (parseInt(avg) + parseInt(value) / length), 0)), // avg
                    d: now                 // date
                });

                // Clean up the response times map.
                tempStats.responseTimes = [];
            }

            // Send the partial report and reset the stats container.
            stats.partialReportsCount = reportsCount++;
            const partialReport = { ...stats }
            stats = makeEmptyStatsContainer({
                partialReportsCount: reportsCount
            })
            
            // Check whether we have a "before" callback and maybe run it.
            if (intervalCb && typeof intervalCb === "function") {
                intervalCb(partialReport);
            }

            // The line before was already existent
            // stats.rpsCount = 0;
        }.bind(this), 1000);

        engine.on('done', function (results) {
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
