const net = require("net");

const {uniqueNamesGenerator} = require("unique-names-generator"),
    getPort = require("get-port"),
    nanoid = require('nanoid');

const {makeLogger} = require("./../utils"),
    {makeMessage} = require("./commands");

const log = makeLogger();

const COMMANDS = {
    // Manager -> Agents
    RUN_PERF: "RUN_PERF",
    RUN_FUNC: "RUN_FUNC",
    REQ_REPORT: "REQ_REPORT",
    REQ_STATUS: "REQ_STATUS",

    // Agent(s) -> Manager
    PROC_REPORT: "PROC_REPORT",
    PROC_STATUS: "PROC_STATUS",
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
        this.manager = new ManagerNode(this.settings);
        process.on("message", this._handleCallCommand);
    };

    join = () => {
        this.agent = new AgentNode(this.settings);

        console.log(`Joining...`);

        this.agent.joinCluster();
    };

    isManager = () => {
        return this.manager !== null;
    };

    isAgent = () => {
        return this.agent !== null;
    };

    _handleCallCommand = (command) => {
        if (!command || !command.type) {
            log.warn(`Could not parse the command!`);
        }

        log.info(`Handling the "${command.type}" command.`);

        switch (command.type) {
            case COMMANDS.RUN_PERF:
                log.info(`Delegating a new performance job to the cluster...`);
                this._clusterRunPerformance();
                break;
            case COMMANDS.RUN_FUNC:
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
        // get all perf tests from the entity manager.
        let perfTests = this.athena.getPerformanceTests();

        // serialize them.
        perfTests = JSON.stringify(perfTests);

        // delegate cluster command.
        this.manager.delegateClusterCommand(COMMANDS.RUN_PERF, perfTests);
    }
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
            sock.write(message);
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

        log.info(`Athena cluster successfully initiated: current node (${this.getId()}) is now a manager.
        
        👋 Hello! My name is "${this.getName()}" and I was assigned to manage this Athena cluster!
        
        To add more workers to this cluster, run the following command:
        athena cluster --join --token ${accessToken} ${addr}:${port}`);
    };

    _handleNewAgentConnection = (sock) => {
        const Agent = new AgentNode(this.settings);
        Agent.setSocket(sock);
        this.addAgent(Agent);
        const {remoteAddress, remotePort} = sock;
        log.info(`New Athena agent connected: ${remoteAddress}:${remotePort}!`);
        sock.setEncoding("utf8");
        sock.on('data', this._handleIncomingAgentData);
        sock.on("close", data => {
            this._handleRemoveAgent(data, sock);
        });
    };

    _handleIncomingAgentData = (data) => {
        console.log(data);
    };

    _handleRemoveAgent = (data, sock) => {
        const agents = this.getAgents();
        let index = agents.findIndex(function (agent) {
            const agentSock = agent.getSocket();
            return agentSock.remoteAddress === sock.remoteAddress && agentSock.remotePort === sock.remotePort;
        });

        if (index !== -1) {
            agents.splice(index, 1);
        }

        log.warn(`Closed connection with Athena agent: ${sock.remoteAddress}:${sock.remotePort}!`);
    };
}

class AgentNode extends GenericNode {
    constructor(settings) {
        super();

        this.settings = settings;

        // props
        this._socket = null;
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

        // todo: run with PM2
        socket.connect(port, host, function () {
            const status = _self.describe();
            const message = makeMessage(COMMANDS.PROC_STATUS, status);
            socket.write(JSON.stringify(message));
        });

        socket.on('data', (data) => {
            console.log(`Server says: ${data}`);
        });

        socket.on('close', () => {
            console.log(`connection closed`);
        });
    };


}

module.exports = Cluster;