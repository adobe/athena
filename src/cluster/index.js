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

const {makeLogger} = require("./../utils");

const log = makeLogger();

class Cluster {
    constructor(settings) {
        this.settings = settings;

        // props
        this.manager = null;
        this.agent = null;


        this.addr = null;
        this.agents = [];

        log.debug(`Initializing new Athena cluster...`);
    }

    // public

    init = () => {
        this.manager = new ManagerNode(this.settings);
    };

    join = () => {
        // todo: not implemented
    };

    isManager = () => {
        return this.manager !== null;
    };

    isAgent = () => {
        return this.agent !== null;
    };
}

class GenericNode {
    constructor(settings) {
        this.settings = settings;

        this._enumerableProps = [
            "_id",
            "_name"
        ];
        this._id = null;
        this._name = null;

        this.setID(this._generateUUID());
        this.setName(this._generateNodeName());
    }

    setID = (id) => {
        this._id = id;
    };

    getId = () => {
        return this._id;
    };

    setName = (name) => {
        this._name = name;
    };

    getName = () => {
        return this._name;
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
    constructor(settings) {
        super(settings);

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
            const port = await getPort({port: getPort.makeRange(5000, 5999)});

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

        log.info(`Athena cluster successfully initiated: current node (${this.getId()}) is now a manager.
        
        👋 Hello! My name is "${this.getName()}" and I was assigned to manage this Athena cluster!
        
        To add more workers to this cluster, run the following command:
        athena cluster --join --token ${accessToken} ${addr}:${port}`);
    };

    _handleNewAgentConnection = (sock) => {
        const Agent = new AgentNode(this.settings);
        Agent.setSock(sock);
        this.agents.push(Agent);
        const {remoteAddress, remotePort} = sock;
        log.info(`New Athena agent connected: ${remoteAddress}:${remotePort}!`);

        sock.on('data', this._handleIncomingAgentData);
        sock.on('close', (data) => {
            this._handleRemoveAgent(data, sock)
        });
    };

    _handleIncomingAgentData = (data) => {
        // todo: not implemented
    };

    _handleRemoveAgent = (data, sock) => {
        let index = this.agents.findIndex(function (agent) {
            const agentSock = agent.getSock();
            return agentSock.remoteAddress === sock.remoteAddress && agentSock.remotePort === sock.remotePort;
        });

        if (index !== -1) {
            this.agents.splice(index, 1);
        }

        log.warn(`Closed connection with Athena agent: ${sock.remoteAddr}:${sock.remotePort}!`);
    };
}

class AgentNode extends GenericNode {
    constructor() {
        super()

        // props
        this._sock = null;
    }

    setSock = (sock) => {
        this._sock = sock;
    };

    getSock = () => {
        return this._sock;
    };
}

module.exports = Cluster;