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

// Node
const path = require("path"),
    fs = require("fs");

// External
const pm2 = require('pm2'),
    yargs = require("yargs"),
    dotenv = require("dotenv");

// Project
const {getParsedSettings, log} = require("./src/utils"),
    Athena = require("./src/bootstrap"),
    commands = require("./src/cluster/commands");

dotenv.config();

process.on('uncaughtException', function (error) {
    log.error(error);
});

// Properties
let athena = null,
    cluster = null,
    settings = null,
    should = {},
    _process = process;

// Constants
const APP_NAME = "athena";

// CLI commands and flags.
let options = yargs
    .options({
        "debug": {
            alias: "D",
            describe: "enable debug mode",
            type: "boolean"
        }
    })
    .command("run", "manage Athena tests", {
        "tests": {
            alias: "t",
            describe: "the tests directory [functional, performance]",
            type: "string"
        },
        "grep": {
            alias: "g",
            describe: "run only specific tests [functional]",
            type: "string"
        },
        "bail": {
            alias: "b",
            describe: "fail fast after the first test failure [functional]",
            type: "boolean"
        },
        "functional": {
            alias: "f",
            describe: "run functional tests",
            type: "boolean",
            default: true
        },
        "performance": {
            alias: "p",
            describe: "run only performance tests",
            type: "boolean",
            default: false
        },
        "cluster": {
            describe: "run the tests inside the cluster [performance]",
            type: "boolean",
            default: false
        }
    })
    .command("cluster", "manage an Athena cluster", {
        "addr": {
            alias: "a",
            describe: "the cluster manager's address",
            type: "string"
        },
        "token": {
            alias: "T",
            describe: "the cluster's access token",
            type: "string"
        },
        "init": {
            alias: "i",
            describe: "initiate a new Athena cluster",
            type: "boolean"
        },
        "join": {
            alias: "j",
            describe: "join an Athena cluster",
            type: "boolean"
        },
        "foreground": {
            describe: "whether to run the cluster in foreground (internal)",
            type: "boolean",
            default: false
        },
        "run": {
            describe: "", // todo:
            type: "boolean"
        }
    })
    .command("preview", "pretty print the structure of a tests suite", {
        "performance": {
            describe: "the performance tests tree view",
            type: Boolean,
            default: false
        },
        "functional": {
            describe: "the functional tests tree view",
            type: Boolean,
            default: false
        }
    })
    .help()
    .version()
    .argv;

settings = getParsedSettings(options);

/**
 * Checks whether the provided commands were used.
 * @param commands {String} The list of commands.
 * @returns {Boolean} True if the provided commands were used, false otherwise.
 */
const requiredCommands = (...commands) => {
    return settings._.every(cmd => commands.indexOf(cmd) !== -1);
};

// Define conditions.
should.initClusterInForeground = requiredCommands("cluster") && settings.init && settings.foreground;
should.initClusterInBackground = requiredCommands("cluster") && settings.init && !settings.foreground;
should.joinCluster = requiredCommands("cluster") && settings.join;
should.joinClusterInForeground = should.joinCluster && settings.foreground;
should.initCluster = should.initClusterInBackground || should.initClusterInForeground || should.joinCluster;
should.delegateClusterCommand = requiredCommands("cluster") && settings.run;
should.runFunctionalTests = requiredCommands("run") && settings.functional;
should.runPerformanceTests = requiredCommands("run") && settings.performance;
should.runTests = should.runFunctionalTests || should.runPerformanceTests;
should.initAthena = should.initCluster || should.runTests;

// Iife to avoid process exits.
(function () {
    if (should.initAthena) {
        athena = new Athena(settings);
    }

    if (should.initCluster) {
        const Cluster = require("./src/cluster");
        cluster = new Cluster(athena);
    }

    // command: node athena.js cluster --init --addr <IP>
    if (should.initClusterInBackground) {
        if (!settings.addr) {
            log.error(`The --addr is required when initializing a new Athena cluster.`);
        }

        let args = [
            "cluster",
            "--init",
            `--addr ${settings.addr}`,
            "--foreground"
        ];

        let maybeWatch = false;

        if (settings.debug) {
            args.push("--debug");
            maybeWatch = true;
        }

        log.info(`Preparing to setup a new cluster on "${settings.addr}" ...`);

        pm2.connect(function (err) {
            if (err) {
                console.error(err);
                process.exit(2);
            }

            (async function () {
                const processName = `${APP_NAME}-manager`;
                await pm2.start({
                    name: processName,
                    script: path.resolve(__dirname, "atena.js"),
                    args: args.join(' '),
                    exec_mode: "cluster",
                    instances: 1,
                    watch: maybeWatch,
                    maxRestarts: 0,
                    output: path.resolve(__dirname, "logs", `${processName}-out.log`),
                    error: path.resolve(__dirname, "logs", `${processName}-error.log`),
                }, function (error, res) {
                    if (error) {
                        throw error
                    }

                    pm2.flush(APP_NAME, (err, res) => {
                        if (err) {
                            throw err;
                        }
                    });

                    pm2.describe(0, (err, proc) => {
                        const logFile = proc[0].pm2_env.pm_out_log_path;

                        if (fs.existsSync(logFile)) {
                            fs.unlinkSync(logFile)
                        }

                        setTimeout(() => {
                            if (fs.existsSync(logFile)) {
                                log.info(fs.readFileSync(logFile, "UTF-8"));
                            }

                            pm2.disconnect();
                            process.exit(0);
                        }, 1000);
                    });
                });
            })();
        });

        return;
    }

    // command: node athena.js cluster --init --addr <IP> --foreground
    if (should.initClusterInForeground) {
        cluster.init();

        return;
    }

    // command: node athena.js cluster --join --foreground --token <TOKEN> --addr <IP>:<PORT>
    if (should.joinClusterInForeground) {
        cluster.join();

        return;
    }

    // command: node athena.js cluster --join --token <TOKEN> --addr <IP>:<PORT>
    if (should.joinCluster) {
        if (!settings.token) {
            log.error(`The --token is required when joining a new Athena cluster.`);
        }

        if (!settings.addr) {
            log.error(`The --addr is required when joining a new Athena cluster.`)
        }

        let args = [
            "cluster",
            "--join",
            `--token ${settings.token}`,
            `--addr ${settings.addr}`,
            "--foreground"
        ];

        let maybeWatch = false;

        if (settings.debug) {
            args.push("--debug");
            maybeWatch = true;
        }

        log.info(`Attempting to join a new cluster on "${settings.addr}"...`);

        pm2.connect(function (err) {
            if (err) {
                console.error(err);
                process.exit(2);
            }

            (async function () {
                const processName = `${APP_NAME}-agent`;
                await pm2.start({
                    name: processName,
                    script: path.resolve(__dirname, "atena.js"),
                    args: args.join(' '),
                    exec_mode: "cluster",
                    instances: 1, // todo: instances: settings.cpusLength,
                    watch: maybeWatch,
                    output: path.resolve(__dirname, "logs", `${processName}-out.log`),
                    error: path.resolve(__dirname, "logs", `${processName}-error.log`),
                }, function (error, res) {
                    if (error) {
                        throw error
                    }

                    log.success(`Successfully joined the cluster!`);
                    pm2.disconnect();
                    process.exit(0);
                });
            })();
        });
    }

    // command: node athena.js cluster --run --[performance/functional]
    if (should.delegateClusterCommand) {
        log.info(`Preparing to run a new cluster job...`);
        commands.callClusterCommand("REQ_RUN_PERF");

        return;
    }

    // command: node athena.js --run --performance
    if (should.runPerformanceTests) {
        athena.runPerformanceTests();

        return;
    }

    // command: node athena.js --run --functional
    if (should.runFunctionalTests) {
        athena.runFunctionalTests();
    }
})();

module.exports = Athena;