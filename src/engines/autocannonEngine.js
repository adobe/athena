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
const Engine = require("./engine"),
    {TAXONOMIES, ENGINES} = require("./../enums"),
    {makeLogger, isPerformanceTest, isPerformancePattern, removeEmpty} = require("./../utils");

const log = makeLogger();

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

        const perfEntities = this.entityManager.getAllBy(
            "engine",
            this.name
        );

        this.entities = perfEntities.map(this._deepParseEntities);
    }

    run = (testsConfig = null, cb = null) => {
        if (!testsConfig) {
            testsConfig = this.getPerformanceTests();
        }

        if (!cb) {
            cb = this._handleTestFinish;
        }

        let stats = {
            responses: 0,
            errors: 0,
            timeouts: 0,
            rpsCount: 0,
            resIncrMap: [],
            rpsMap: []
        };

        const engine = autocannon(testsConfig, (err, results) => {
            cb(err, results, stats);
        });

        process.once("SIGINT", () => {
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

        engine.on("response", _incrResponses);
        engine.on("reqError", _incrErrors);

        const interval = setInterval(function () {
            const now = new Date().toJSON();

            stats.resIncrMap.push({
                count: stats.responses,
                date: now
            });

            stats.rpsMap.push({
                count: stats.rpsCount,
                date: now
            });

            stats.rpsCount = 0;
        }, 1000);

        engine.on('done', function (results) {
            delete stats.rpsCount;
            clearInterval(interval);
        });

        autocannon.track(engine, {
            renderProgressBar: true
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

        return {
            ...perfTestConfig,
            ...perfPatternConfig,
            ...perfRunConfig
        };
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
            "url",
            "socketPath",
            "connections",
            "duration",
            "amount",
            "timeout",
            "pipelining",
            "bailout",
            "method",
            "title",
            "body",
            "headers",
            "maxConnectionRequests",
            "connectionRate",
            "overallRate",
            "reconnectRate",
            "requests",
            "idReplacement",
            "forever",
            "servername",
            "excludeErrorStats"
        ];

        expectedProps.forEach(setConfProperty);

        return conf;
    };

    _handleTestFinish = (error, results) => {
        if (error) {
            console.error(`There was a problem while running the performance test!\n${error}`);
        }

        console.log(results);
    };

    _deepParseEntities = (entity) => {
        entity.setTaxonomy(this.taxonomy);

        // todo: flatten the config
        if (isPerformanceTest(entity) && entity.hasPerfPatterns()) {
            entity.perfPatterns = entity.perfPatterns.map(this._deepParseEntities);

            return entity;
        }

        if (isPerformancePattern(entity) && entity.hasPerfRuns()) {
            entity.perfRuns = entity.perfRuns.map(this._deepParseEntities);

            return entity;
        }

        return entity;
    }
}

module.exports = AutocannonEngine;