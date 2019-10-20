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

const net = require("net");

const {uniqueNamesGenerator} = require("unique-names-generator"),
    getPort = require("get-port"),
    nanoid = require('nanoid');

const {makeLogger} = require("./../utils"),
    {makeMessage} = require("./commands"),
    Storage = require("./../storage");

const log = makeLogger();
const storage = new Storage();

const COMMANDS = {
    // Intra-Cluster

    // Manager -> Agents
    REQ_RUN_PERF: "REQ_RUN_PERF",
    REQ_RUN_FUNC: "REQ_RUN_FUNC",

    REQ_REPORT: "REQ_REPORT",
    REQ_STATUS: "REQ_STATUS",

    // Agent(s) -> Manager
    RES_REPORT: "RES_REPORT",
    RES_STATUS: "RES_STATUS",

    REQ_PROC_JOB_RES: "REQ_PROC_JOB_RES"
};

const AGENT_STATUS = {
    READY: "READY",
    BUSY: "BUSY",
    ERROR: "ERROR"
};

const JOB_STATUS = {
    FINISHED: "FINISHED",
    PENDING: "PENDING",
    UNSTABLE: "UNSTABLE"
};

class Cluster {
    constructor(athena) {
        this.athena = athena;
        this.settings = this.athena.getSettings();

        // props
        this.manager = null;
        this.agent = null;

        this.addr = null;
        this.agents = [];
    }

    // public

    init = () => {
        this.manager = new ManagerNode(this.athena, this.settings);
        process.on("message", this._handleCallCommand);
    };

    join = () => {
        this.agent = new AgentNode(this.athena, this.settings);
        this.agent.joinCluster();
    };

    _handleCallCommand = (command) => {
        if (!command || !command.type) {
            log.warn(`Could not parse the command!`);
        }

        log.info(`Handling the "${command.type}" command.`);

        switch (command.type) {
            case COMMANDS.REQ_RUN_PERF:
                log.info(`Delegating a new performance job to the cluster...`);
                this._clusterRunPerformance();
                break;
            case COMMANDS.REQ_RUN_FUNC:
                log.info(`Delegating a new functional job to the cluster...`);
                break;
            case COMMANDS.REQ_REPORT:
                log.info(`Requesting the last job report from all agents...`);
                break;
            case COMMANDS.REQ_STATUS:
                log.info(`Requesting the status of all agents...`);
                break;
        }
    };

    _clusterRunPerformance = () => {
        log.info(`Preparing performance test data...`);

        // create the perf job
        const PerfJob = new PerformanceJob();
        const perfJobData = this.athena.getPerformanceTests();
        PerfJob.setData(perfJobData);

        log.success(`Performance test data ready!`);
        log.info(`Delegating new cluster performance job...`);

        // send the perf tests to all workers
        this.manager.delegateClusterCommand(
            COMMANDS.REQ_RUN_PERF,
            PerfJob.describe()
        );

        log.success(`👍 Successfully delegated a new performance job to the cluster!`);
    }
}

class GenericNode {
    constructor(settings) {
        this.settings = settings;

        this._enumerableProps = [
            "_id",
            "_name",
            "_status"
        ];
        this._id = null;
        this._name = null;
        this._status = null;

        this.setID(this._generateUUID());
        this.setName(this._generateNodeName());
    }

    setID = (id) => {
        this._id = id;
    };

    getID = () => {
        return this._id;
    };

    setName = (name) => {
        this._name = name;
    };

    getName = () => {
        return this._name;
    };

    setStatus = (status) => {
        this._status = status;
    };

    describe = () => {
        const description = {};
        this._enumerableProps.forEach(p => {
            let idx = p;
            if (p.charAt(0) === '_') {
                idx = p.slice(1, p.length);
            }

            description[idx] = this[p];
        });

        return description;
    };

    // private

    _generateNodeName = () => {
        const newNodeName = uniqueNamesGenerator({
            length: 2,
            separator: '-'
        });

        while (this._isNameUsed(newNodeName)) {
            this._generateNodeName();
        }

        return newNodeName;
    };

    _isNameUsed = (name) => {
        return false; // todo: not implemented
    };

    _generateUUID = () => {
        let nodeHashLength = Number(process.env.NODE_HASH_LENGTH);

        if (!nodeHashLength) {
            log.warn(`The "NODE_HASH_LENGTH" environment variable is missing. Using the default value (12).`);
            nodeHashLength = 12;
        }

        return nanoid(nodeHashLength);
    };
}

class ManagerNode extends GenericNode {
    constructor(athena, settings) {
        super(settings);

        this.athena = athena;

        // props
        this._addr = null;
        this._port = null;
        this._socket = null;
        this._accessToken = null;
        this._agents = [];

        // setup
        this.setAddr(this.settings.addr);
        const accessToken = this._generateAccessToken();
        this.setAccessToken(accessToken);

        (async () => {
            const port = await getPort({port: getPort.makeRange(5000, 5100)});

            this.setPort(port);
            this.createTCPServer();
        })();
    }

    _generateAccessToken = () => {
        let hashLength = Number(process.env.TOKEN_HASH_LENGTH);

        if (!hashLength) {
            log.warn(`The "TOKEN_HASH_LENGTH" environment variable is missing. using the default value (64).`);
            hashLength = 64;
        }

        return nanoid(hashLength);
    };

    createTCPServer = () => {
        const addr = this.getAddr();
        const port = this.getPort();

        log.info(`Creating a new Athena cluster on: ${addr}:${port} ...`);
        this._socket = net.createServer();
        this._socket.listen(port, addr, this._handleServerCreated);
        this._socket.on('connection', this._handleNewAgentConnection)
    };

    delegateClusterCommand = (command, data) => {
        // get the TCP server
        const socket = this.getSocket();

        // prepare the message
        const message = makeMessage(command, data);

        // send it to all workers
        const agents = this.getAgents();

        if (!agents.length) {
            log.warn(`Could not delegate command. There are currently no agents in this cluster.`);
            return;
        }

        agents.forEach(agent => {
            const sock = agent.getSocket();
            sock.write(JSON.stringify(message));
        });
    };

    getSocket = () => {
        return this._socket;
    };

    getAddr = () => {
        return this._addr;
    };

    setAddr = (addr) => {
        if (!addr) {
            log.error(`Could not initialize a new Athena cluster as the "--addr" required flag is missing.`);
        }

        this._addr = addr;
    };

    getPort = () => {
        return this._port;
    };

    setPort = (port) => {
        if (!port) {
            log.error(`Could not set port using invalid or missing value.`);
        }

        this._port = port;
    };

    getAccessToken = () => {
        return this._accessToken;
    };

    setAccessToken = (accessToken) => {
        if (!accessToken) {
            log.error(`Could not set access token using invalid or missing value.`);
        }

        this._accessToken = accessToken;
    };

    getAgents = () => {
        return this._agents;
    };

    addAgent = (agent) => {
        this._agents.push(agent);
    };

    _handleServerCreated = () => {
        const accessToken = this.getAccessToken();
        const addr = this.getAddr();
        const port = this.getPort();

        log.info(`Athena cluster successfully initiated: current node (${this.getID()}) is now a manager.
        
        👋 Hello! My name is "${this.getName()}" and I was assigned to manage this Athena cluster!
        
        To add more workers to this cluster, run the following command:
        athena cluster --join --token ${accessToken} ${addr}:${port}`);
    };

    _handleNewAgentConnection = (sock) => {
        (async () => {
            // create and store a new Agent
            const Agent = new AgentNode(this.athena, this.settings);
            Agent.setSocket(sock);
            this.addAgent(Agent);
            const {remoteAddress, remotePort} = sock;
            log.info(`New Athena agent (${Agent.getName()}) connected: ${remoteAddress}:${remotePort}`);
            await storage.storeAgent(Agent.describe());

            // send new agent details to the agent node
            const message = makeMessage(
                "REQ_UPDATE_INFO",
                Agent.describe()
            );
            sock.write(JSON.stringify(message));

            // hook handlers on socket events
            sock.setEncoding("utf8");
            sock.on('data', (message) => {
                this._handleIncomingAgentData(sock, message)
            });
            sock.on("close", data => {
                this._handleRemoveAgent(data, sock);
            });
        })();
    };

    _handleIncomingAgentData = (sock, message) => {
        // parse data
        let data = null;

        try {
            data = JSON.parse(message);
        } catch (e) {
            log.warn(`Could not parse incoming agent message!`);

            return;
        }

        // parse incoming message type
        switch (data.type) {
            case "RES_RUN_PERF":
                this._handleResRunPerf(data);
                break;
            default:
                break;
        }
    };

    _handleResRunPerf = (results) => {
        const data = results.data;
        log.success(`Successfully retrieved new agent data [job_id ${data.id}]!`);

        const actions = [];

        // ac_job // todo: handle this only once !!! not per agent!!!
        actions.push({
            index: {
                _index: "ac_job",
            }
        }, {
            job_id: data.id,
            created_at: data.created_at,
            updated_at: data.updated_at // todo: propagate value
        });

        // ac_result_overview
        actions.push({
            index: {
                _index: "ac_result_overview"
            }
        }, {
            job_id: data.id,
            agent_id: data.agent_id,
            agent_name: data.agent_name,
            url: data.results.url,
            responses: data.results.stats.responses,
            errors: data.results.errors,
            timeouts: data.results.timeouts,
            duration: data.results.duration,
            start: data.results.start,
            finish: data.results.finish,
            connections: data.results.connections,
            pipelining: data.results.pipelining,
            non2xx: data.results.non2xx,
            "1xx": data.results["1xx"],
            "2xx": data.results["2xx"],
            "3xx": data.results["3xx"],
            "4xx": data.results["4xx"],
            "5xx": data.results["5xx"]
        });

        // ac_results_requests
        actions.push({
            index: {
                _index: "ac_results_requests"
            }
        }, {
            job_id: data.id,
            agent_id: data.agent_id,
            agent_name: data.agent_name,
            ...data.results.requests
        });

        // ac_results_latency
        actions.push({
            index: {
                _index: "ac_results_latency"
            }
        }, {
            job_id: data.id,
            agent_id: data.agent_id,
            agent_name: data.agent_name,
            ...data.results.latency
        });

        // ac_results_throughput
        actions.push({
            index: {
                _index: "ac_results_throughput"
            }
        }, {
            job_id: data.id,
            agent_id: data.agent_id,
            agent_name: data.agent_name,
            ...data.results.throughput
        });

        // ac_result_rps
        data.results.stats.rpsMap.forEach(rpsEntry => {
            actions.push({
                index: {
                    _index: "ac_result_rps"
                }
            }, {
                job_id: data.id,
                agent_id: data.agent_id,
                agent_name: data.agent_name,
                ...rpsEntry
            });
        });

        // ac_result_resincr
        data.results.stats.resIncrMap.forEach(resEntry => {
            actions.push({
                index: {
                    _index: "ac_result_resincr"
                }
            }, {
                job_id: data.id,
                agent_id: data.agent_id,
                agent_name: data.agent_name,
                ...resEntry
            })
        });

        // store in bulk
        storage.bulk(actions);
    };

    _handleRemoveAgent = (data, sock) => {
        const agents = this.getAgents();
        let index = agents.findIndex(function (agent) {
            const agentSock = agent.getSocket();
            return agentSock.remoteAddress === sock.remoteAddress && agentSock.remotePort === sock.remotePort;
        });

        const agent = agents[index];
        storage.deleteAgentById(agent.getID());

        if (index !== -1) {
            agents.splice(index, 1);
        }

        log.warn(`Closed connection with Athena agent (${agent.getName()}): ${sock.remoteAddress}:${sock.remotePort}!`);
    };
}

class AgentNode extends GenericNode {
    constructor(athena, settings) {
        super();

        this.athena = athena;
        this.settings = settings;

        // props
        this._socket = null;

        log.info(`Initializing myself as a new Agent: [id: ${this.getID()}] [name: ${this.getName()}]!`);
    }

    setSocket = (sock) => {
        this._socket = sock;
    };

    getSocket = () => {
        return this._socket;
    };

    joinCluster = () => {
        const token = this.settings.token; // todo: auth
        const [host, port] = this.settings.addr.split(':');
        const _self = this;

        console.log(`Connecting to ${host}:${port}`);

        const socket = new net.Socket();
        this.setSocket(socket);

        // todo: run with PM2
        socket.connect(port, host, function () {
            _self.setStatus(AGENT_STATUS.READY);
            const status = _self.describe();
            const message = makeMessage(COMMANDS.PROC_STATUS, status);
            socket.write(JSON.stringify(message));
        });

        socket.on('data', (message) => {
            log.info(`😬 Received new data from the manager node!`);
            let data = null;
            try {
                data = JSON.parse(message);
            } catch (error) {
                log.warn(`🤕 Could not parse the incoming data from the manager node!`);
                return;
            }

            log.info(`🤔 Attempting to parse the incoming data from the manager...`);

            // process message type (assuming REQ_REQ_RUN_PERF)
            switch (data.type) {
                case COMMANDS.REQ_RUN_PERF:
                    log.success(`👌 Successfully identified the incoming data as a new performance test job!`);
                    this._handleReqRunPerf(data);
                    break;

                case "REQ_UPDATE_INFO":
                    this._handleReqUpdateInfo(data);
                    break;
                // todo: handle all command types
                default:
                    break;
            }
        });

        socket.on('close', () => {
            log.info(`😔 The agent has closed the connection...`);
        });
    };

    _handleReqUpdateInfo = (message) => {
        const data = message.data;

        // update id
        if (data.id) {
            this.setID(data.id);
            log.info(`Successfully updated my ID to: "${data.id}"!`);
        }

        // update name
        if (data.name) {
            this.setName(data.name);
            log.info(`Successfully updated my name to: "${data.name}"!`);
        }
    };

    _handleReqRunPerf = (message) => {
        const perfTest = message.data;
        const _self = this;

        log.info(`💪 Preparing to run a new performance job (id: ${perfTest.id}) ...`);

        // run performance tests
        this.athena.runPerformanceTests(perfTest.data, function (err, results, stats) {
            // check for any errors
            if (err) {
                console.error(`🤕 Could not run the job!`, err);
                return;
                // todo: return error message to manager
            }

            results.stats = stats;

            const socket = _self.getSocket();
            log.success(`😎 Successfully ran the performance test!`);

            // prep the test results message
            log.info(`😬 Attempting to notify the manager about the test results...`);
            const PerfJob = new PerformanceJob(perfTest);
            PerfJob.setResults(results);

            const resRunPerfMessage = makeMessage(
                "RES_RUN_PERF",
                {
                    agent_id: _self.getID(),
                    agent_name: _self.getName(),
                    ...PerfJob.describe()
                }
            );

            // notify the manager about the test results
            socket.write(JSON.stringify(resRunPerfMessage), "utf8", () => {
                log.success(`😎 Successfully sent the test results!`);
            });
        });
    };
}

class PerformanceJob {
    constructor(perfTest = null) {
        this._id = nanoid();
        this._created_at = new Date().toJSON();
        this._updated_at = new Date().toJSON();
        this._data = null;
        this._results = null;

        if (!perfTest) {
            return;
        }

        // maybe provision
        if (perfTest.id) this._id = perfTest.id;
        if (perfTest.created_at) this._created_at = perfTest.created_at;
        if (perfTest.updated_at) this._updated_at = perfTest.updated_at;
        if (perfTest.data) this._data = perfTest.data;
        if (perfTest.results) this._results = perfTest.results;
    }

    setData = (data) => {
        this._data = data;
    };

    setResults = (results) => {
        this._results = results;
        this.refreshUpdatedAt();
    };

    refreshUpdatedAt = () => {
        this._updated_at = new Date().toJSON();
    };

    describe = (asString = false) => {
        const description = {
            id: this._id,
            created_at: this._created_at,
            updated_at: this._updated_at,
            data: this._data,
            results: this._results
        };

        if (asString) {
            return JSON.stringify(description);
        }

        return description;
    }
}

module.exports = Cluster;