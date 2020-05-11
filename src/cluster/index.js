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

const net = require('net');
const fs = require('fs');
const path = require('path');

const {uniqueNamesGenerator} = require('unique-names-generator');
const uuid = require('nanoid');
const nanoidGenerate = require('nanoid/generate');
const Koa = require('koa');
const KoaHelmet = require('koa-helmet');
const KoaRouter = require('koa-router');
const KoaAsyncValidator = require('koa-async-validator');
const KoaJSON = require('koa-json');
const KoaCors = require('@koa/cors');

const jsYaml = require('js-yaml');
const request = require('request');
const KoaBodyparser = require('koa-bodyparser');

const {makeLogger} = require('./../utils');
const {makeMessage} = require('./commands');
const Storage = require('./../storage');
const StorageRepository = require('./../storage/repository');
const log = makeLogger();
const storage = new Storage();

const NANOID_ALPHA = `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890`;

function nanoid() {
  return nanoidGenerate(NANOID_ALPHA, 20);
}

const RESPONSES = {
  K8S_NI_AGENT: {
    START_RUN: {
      status: 200,
      message: "Started running the provided tests configuration!"
    }
  }
}

const COMMANDS = {
  // Intra-Cluster Manager -> Agents
  REQ_RUN_PERF: 'REQ_RUN_PERF',
  REQ_RUN_FUNC: 'REQ_RUN_FUNC',

  REQ_REPORT: 'REQ_REPORT',
  REQ_STATUS: 'REQ_STATUS',

  // Agent(s) -> Manager
  RES_REPORT: 'RES_REPORT',
  RES_STATUS: 'RES_STATUS',

  REQ_PROC_JOB_RES: 'REQ_PROC_JOB_RES'
};

const AGENT_STATUS = {
  READY: 'READY',
  BUSY: 'BUSY',
  ERROR: 'ERROR'
};

const JOB_STATUS = {
  FINISHED: 'FINISHED',
  PENDING: 'PENDING',
  UNSTABLE: 'UNSTABLE'
};

class Cluster {
  constructor(athena) {
    this.athena = athena;
    this.settings = this
      .athena
      .getSettings();

    // props
    this.manager = null;
    this.agent = null;
    this.addr = null;
    this.agents = [];
  }

  // public
  init = () => {
    this.manager = new ManagerNode(
      this.athena,
      this.settings,
      this.k8sManager
    );

    process.on('message', this._handleCallCommand);
  };

  joinCluster = () => {
    this._initAgentNode();
    this
      .agent
      .joinCluster();
  };

  joinNonInteractive = () => {
    this._initAgentNode();
    this
      .agent
      .joinNonInteractive();
  }

  _initAgentNode = () => {
    this.agent = new AgentNode(this.athena, this.settings);

    return true;
  }

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
    const PerfJob = new PerformanceJob();
    const perfJobData = this.athena.getPerformanceTests();
    PerfJob.setData(perfJobData);
    log.info(`Delegating new cluster performance job...`);
    this.manager.delegateClusterCommand(COMMANDS.REQ_RUN_PERF, PerfJob.describe());
    log.success(`👍 Successfully delegated a new performance job to the cluster!`);
  }
}

class GenericNode {
  constructor(settings) {
    this.settings = settings;
    this._enumerableProps = ['_id', '_name', '_status'];
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
    this
      ._enumerableProps
      .forEach((p) => {
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
    const newNodeName = uniqueNamesGenerator({length: 2, separator: '-'});

    while (this._isNameUsed(newNodeName)) {
      this._generateNodeName();
    }

    return newNodeName;
  };

  _isNameUsed = (name) => {
    return false;
  };

  _generateUUID = () => {
    let nodeHashLength = Number(process.env.NODE_HASH_LENGTH);

    if (!nodeHashLength) {
      log.warn(`The "NODE_HASH_LENGTH" environment variable is missing. Using the default value (12).`);
      nodeHashLength = 12;
    }

    return nanoid();
  };
}

class ManagerNode extends GenericNode {
  constructor(athena, settings) {
    super(settings);

    this.athena = athena;
    this.jobReportsRetrieved = 0;

    this._addr = null;
    this._port = null;
    this._socket = null;
    this._accessToken = null; 
    this._agents = [];

    this.setAddr(this.settings.addr);
    this.setAccessToken(this._generateAccessToken());

    const _self = this;

    (async() => {
      this.setPort(process.env.API_PORT);

      const AthenaAPI = new Koa();
      const Router = new KoaRouter();

      // ------------------
      // Rest API Endpoints
      // ------------------

      Router.get('/version', async (ctx, next) => {
        ctx.status = 200;
        ctx.body = { version: "1.0.0" }

        await next();
      })

      Router.post('/api/v1/projects', handleCreateNewProject);
      Router.get('/api/v1/projects', handleReadAllProjects);
      Router.get('/api/v1/projects/:projectId', handleReadSingleProject);
      Router.post('/api/v1/projects/:projectId/performance', handleCreatePerformanceTest);
      Router.get('/api/v1/projects/:projectId/performance', handleReadPerformanceTests);
      Router.get('/api/v1/projects/:projectId/performance/:testId', handleReadSinglePerformanceTest);
      Router.get('/api/v1/projects/:projectId/performance/:testId/runs', handleReadSinglePerformanceTestRuns);
      Router.get('/api/v1/projects/:projectId/performance/:testId/schedule', handleSchedulePerformanceTestRun);
      Router.put('/api/v1/projects/:projectId/performance/:testId', handleUpdatePerformanceTest);
      Router.delete('/api/v1/projects/:projectId/performance/:testId', handleDeletePerformanceTest);
      Router.delete('/api/v1/projects/:projectId', handleDeleteSingleProject);
      
      // TODO: Not implemented.
      // Router.put('/api/v1/projects/:projectId', handleUpdateSingleProject);
      // Router.post('/api/v1/projects/:projectId/performance/:testId', handleCreatePerformanceTest);    
      // Router.post('/api/v1/projects/:projectId/performance/:testId/runs', handleCreatePerformanceTestRun); // Schedules a new perf test run.
      // Router.get('/api/v1/projects/:projectId/performance/:testId/runs', handleReadPerformanceTestRuns);

      // ----------------------------
      // Internal / K8S API Endpoints 
      // ----------------------------

      // TODO(nvasile): The following endpoints should be protected from outside access.
      Router.post('/api/v1/k8s/internal/performance/parse-agent-report', _handleProcessAgentReport);
      Router.post('/api/v1/k8s/internal/perf/process-buffered-agent-report', _handleProcessBufferedAgentReport);
      
      async function handleCreateNewProject(ctx, next) {
        // Validate
        ctx.checkBody({
          name: {
            notEmpty: true,
            errorMessage: 'The project name is required!'
          }
        });
        
        let errors = await ctx.validationErrors(true);

        if (errors) {
          ctx.status = 400;
          ctx.body = {
            errors
          };
        } else {
          const { name, description, repoUrl } = ctx.request.body;
          await StorageRepository.createProject({ name, description, repoUrl });

          ctx.status = 201;
          ctx.body = {
            message: `The "${ctx.request.body.name}" project was successfully created!`
          }
        }

        await next();
      }

      // Read all projects.
      async function handleReadAllProjects(ctx, next) {
        const projects = await StorageRepository.readAllProjects();

        ctx.status = 200;
        ctx.body = {
          projects
        }

        await next();
      }

      // Read a single project's details.
      async function handleReadSingleProject(ctx, next) {
        // TODO: Validate params and make sure that projectId is provided, otherwise return error.
        const project = await StorageRepository.readSingleProject(ctx.params.projectId);

        ctx.status = 200;
        ctx.body = {
          project
        }

        await next();
      }

      // Create a single performance test for a single project.
      async function handleCreatePerformanceTest(ctx, next) {
        // TODO: Validate params and make sure that the projectId and the data are provided, otherwise return errors.
        const { projectId } = ctx.params;
        const { testData: yamlTestData } = ctx.request.body;
        let testData;

        try {
          testData = jsYaml.safeLoad(yamlTestData);
        } catch (error) {
          ctx.status = 400;
          ctx.body = {
            error,
            message: "Could not parse the provided test data!"
          };

          await next();
        }

        await StorageRepository.storeSinglePerfTest({projectId, testData});

        ctx.status = 201
        ctx.body = { success: true }

        await next();
      }

      // Read all performance tests for a single project.
      async function handleReadPerformanceTests(ctx, next) {
        const { projectId } = ctx.params;
        const perfTests = await StorageRepository.readAllPerfTests(projectId);
      
        ctx.status = 200;
        ctx.body = {
          perfTests
        }

        await next();
      }

      // Read a single performance test for a single project.
      async function handleReadSinglePerformanceTest(ctx, next) {
        const { testId } = ctx.params;
        let perfTest, perfRuns

        try {
          perfTest = await StorageRepository.readSinglePerfTest(testId);
        } catch (error) {
          ctx.status = 400;
          ctx.body = { error };
        }

        ctx.status = 200;
        ctx.body = perfTest

        await next();
      }

      // Read performance test runs for a single performance test.
      async function handleReadSinglePerformanceTestRuns(ctx, next) {
        const { testId } = ctx.params;
        let perfRuns

        try {
          perfRuns = await StorageRepository.readAllPerfRuns(testId);
        } catch (error) {
          ctx.status = 400;
          ctx.body = { error };
        }

        ctx.status = 200;
        ctx.body = perfRuns

        await next();
      }

      // Schedule a single performance test run inside the cluster.
      async function handleSchedulePerformanceTestRun(ctx, next) {
        const { testId } = ctx.params;
        console.info(`Preparing to schedule a new performance test run for test id: ${testId}`)

        try {
          // Get the perf test definition by id.
          const perfTest = await StorageRepository.readSinglePerfTest(testId);
          const perfJob = await StorageRepository.storeSinglePerfRun(testId, perfTest.config);
          
          // Setup the perf job.
          const { _id: jobId } = perfJob;
          const job = new PerformanceJob(perfTest);
          job.setId(jobId);
          const jobAgentsCount = perfTest.config.resources.agents || 1;

          // Process the non-interactive job config.
          let agentJobConfig = fs.readFileSync(path.resolve(__dirname, 'config/agent-job-config.yaml'), 'utf8');
          agentJobConfig = jsYaml.safeLoad(agentJobConfig);

          // Update the ni-job conf.
          agentJobConfig.metadata.name = `athena-ni-agent-${jobId}`;
          agentJobConfig.metadata.labels = {
            athena_jid: jobId
          }

          const { cpu: resCpu, memory: resMemory } = perfTest.config.resources;
          agentJobConfig.spec.completions = jobAgentsCount;
          agentJobConfig.spec.parallelism = jobAgentsCount;

          agentJobConfig.spec.template.spec.containers[0].resources.limits.cpu = resCpu || "0";
          agentJobConfig.spec.template.spec.containers[0].resources.limits.memory = resMemory || "0"
          
          agentJobConfig.metadata.labels = {
            "app": "athena",
            "type": "ni-agent",
            "jobId": jobId
          };
          agentJobConfig.spec.template.spec.containers[0].command = [
            "node",
            "athena.js",
            "cluster",
            "--join",
            "--foreground",
            "--k8s",
            `--jobId=${jobId}`,
            `--jobConfig="${JSON.stringify(perfTest.config.config)}"` // TODO: fix this
          ]

          // Spawn agents.
          await _self.athena.k8sManager.spawnShortlivedAgents(agentJobConfig, jobAgentsCount);

          ctx.status = 200;
          ctx.body = { message: "success" };

        } catch (error) {
          console.log(error);

          ctx.status = 400;
          ctx.body = { error };
        }

        await next();
      }

      // Run a single performance test by ID. GET:   /api/v1/performance/run/:id
      Router.get('/api/v1/performance/run/:id', async(ctx, next) => {
        // TODO: Get the perf job by ID. Schedule the perf job to run.
        ctx.body = {};

        await next();
      });

      // Post a performance job JSON and schedule it to run. POST:
      // /api/v1/k8s/performance/run
      Router.post('/api/v1/k8s/performance/run', async(ctx, next) => {
        const perfJob = ctx.request.body;
        const perfJobInstance = new PerformanceJob(perfJob);
        const jobId = perfJobInstance.getId();

        // Parse the non-interactive job config yaml file.
        let agentJobConfig = fs.readFileSync(path.resolve(__dirname, 'config/agent-job-config.yaml'), 'utf8');
        agentJobConfig = jsYaml.safeLoad(agentJobConfig);
        const count = perfJob.config.agents || 1;

        agentJobConfig.metadata.name = `athena-ni-agent`;
        agentJobConfig.metadata.labels = {
          "app": "athena",
          "type": "ni-agent",
          "jobId": jobId
        };

        agentJobConfig.spec.completions = count;
        agentJobConfig.spec.parallelism = count;
        agentJobConfig.spec.template.spec.containers[0].command = [
          "node",
          "athena.js",
          "cluster",
          "--join",
          "--foreground",
          "--k8s",
          `--jobId=${jobId}`,
          `--jobConfig="${JSON.stringify(perfJob)}"`
        ]

        this.athena.k8sManager.spawnShortlivedAgents(agentJobConfig, count);

        ctx.body = {
          status: 200,
          message: `Deploying ${count} shortlived Athena agents and attempting to run the tests!`
        };

        await next();
      });

      // Update a performance test for a single project.
      async function handleUpdatePerformanceTest(ctx, next) {
          const updatedData = ctx.request.body;
          const { testId } = ctx.params;

          await StorageRepository.updatePerfTestById(testId, {
            config: updatedData
          });
  
          ctx.status = 200;
          ctx.body = { status: "updated!" }
  
          await next();
      }

      // Delete a performance test for a single project.
      async function handleDeletePerformanceTest(ctx, next) {
        const { testId } = ctx.params;

        await StorageRepository.deletePerformanceTestById(testId);

        ctx.status = 200;
        ctx.body = { status: "perf test deleted!" }

        await next();
      }

      // Delete a single project by ID.
      async function handleDeleteSingleProject(ctx, next) {
        const { projectId } = ctx.params;

        await StorageRepository.deleteProjectById(projectId);

        ctx.status = 200;
        ctx.body = { status: "project deleted!" }

        await next();
      }

      // Update a single project's details.
      async function handleUpdateSingleProject(ctx, next) {
        next();
      }

      // Creates a new performance test run for a single project.
      async function handleCreatePerformanceTestRun(ctx, next) {
        next();
      }

      // Creates a new performance test run for a single project.
      async function handleCreatePerformanceTestRun(ctx, next) {
        next();
      }

      // Reads all performance test runs for a given performance test.
      async function handleReadPerformanceTestRuns(ctx, next) {
        next();
      }

      // Process incoming non-interactive Athena agent's report.
      // TODO(nvasile): Make sure that the incoming max client body size is large enough.
      async function _handleProcessAgentReport(ctx, next) {

        // TODO(nvasile): Try/Catch ;)
        const perfJobResults = ctx.request.body;
        const { id: jobId } = perfJobResults;

        // console.log('---')
        // console.log(JSON.stringify(perfJobResults, null, 2));
        // console.log('---')
        
        log.info(`Attempting to parse incoming agent [${perfJobResults.agent_id}:${perfJobResults.agent_name}] info (non-interactive) for job: ${jobId}!`);
        _self._handleResRunPerf({ data: perfJobResults });
        const perfRun = await StorageRepository.incrPerfRunReports(jobId);

        // Mark the job as complete and prune agents.
        const { agents } = perfRun.config.resources;
        console.log(`agentsCount = ${agents} : perfRun.reports = ${perfRun.reports}`)

        if (perfRun.reports == agents) {          
          perfRun.status = "COMPLETED";
          await perfRun.save();
          await _self.athena.k8sManager.pruneShortlivedAgents(jobId);
        }

        ctx.status = 200;
        ctx.body = {
          status: "success"
        }

        await next();
      }

      // This endpoint processes the incoming agent reports in a buffered way.
      async function _handleProcessBufferedAgentReport(ctx, next) {
        // TODO! Not implemented.
        await next();
      }

      // Returns the available cluster resources.
      async function getClusterInfo() {
        const nodes = await _self.athena.k8sManager.listClusterNodes();
        const pods = await _self.athena.k8sManager.listClusterPods();

        const { body: nodesList } = nodes.response;
        const { body: podsList } = pods.response;

        return {
          nodesList,
          podsList
        }
      }

      // Checks whether the cluster has the appropriate resources available.
      async function resourcesAvailable(cpuNeeded = 1, memoryNeeded = "1Mi") {
        const resources = await getClusterInfo();

        const nodes = resources.nodesList.items.map(node => {
          return {
            name: node.metadata.name,
            arch: node.metadata.labels["beta.kubernetes.io/arch"],
            os: node.metadata.labels["beta.kubernetes.io/os"],
            hostname: node.metadata.labels["kubernetes.io/hostname"],
            role: Object.keys(node.metadata.labels).filter(k => k.indexOf("node-role") !== -1)[0].split('/')[1],
            resources: {
              capacity: node.status.capacity,
              allocatable: node.status.allocatable
            }
          }
        });

        const pods = resources.podsList.items.map(pod => {
          return {
            name: pod.metadata.name,
            namespace: pod.metadata.namespace,
            volumes: pod.spec.volumes.length,
            containers: pod.spec.containers.map(container => {
              return {
                name: container.name,
                resources: container.resources
              }
            }),
            status: pod.status.phase,
          }
        });

        let availableMemoryBytes = nodes.map(n => Number(n.resources.capacity.memory.split('Ki')[0]))
          .reduce((a, b) => a + b, 0) * 1024

        function getPrettyMemSize(memBytes) {
          if (memBytes === 0) {
            return memBytes
          }

          const memSizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
          const memI = parseInt(Math.floor(Math.log(memBytes) / Math.log(1024)), 10);
          
          if (memI === 0) {
            return `${memBytes} ${memSizes[memI]}`;
          }
  
          return `${(memBytes / (1024 ** memI)).toFixed(1)} ${memSizes[memI]}`
        }

        const usedMemoryBytes = resources.podsList.items.map(p => p.spec.containers.map(c => {
          if (!c || !c.resources || !c.resources.limits || !c.resources.limits.memory) return 0;
          const dtm = { Ki: 1000, Mi: 1e+6, Gi: 1e+9 }
          const { memory } = c.resources.limits;
          const u = ['Ki', 'Mi', 'Gi'].filter(u => memory.indexOf(u) !== -1)[0];
          return parseInt(memory.split(u)[0]) * dtm[u];
        })).reduce((a, b) => parseInt(a) + parseInt(b), 0);

        const cpusCount = pods.map(p => {
          return Number(p.containers.map(c => {
            if (c && c.resources && c.resources.limits && c.resources.limits.cpu) {
              const cpu = parseInt(c.resources.limits.cpu);
              return cpu < 50 ? cpu : 0;
            }
            return 0;
          }))
        }).reduce((a, b) => a + b, 0)

        const cluster = {
          nodes: nodes.length,
          resources: {
            available: {
              cpus: nodes.map(n => Number(n.resources.capacity.cpu)).reduce((a, b) => a + b, 0),
              memory: getPrettyMemSize(availableMemoryBytes),
              memBytes: availableMemoryBytes,
              pods: nodes.map(n => Number(n.resources.capacity.pods)).reduce((a, b) => a + b, 0)
            },
            used: {
              cpus: cpusCount,
              memory: getPrettyMemSize(usedMemoryBytes),
              memBytes: usedMemoryBytes,
              pods: pods.length,
            }
          }
        }

        return {
          cluster,
          nodes,
          pods
        };
      }

      // Bootstrap
      AthenaAPI
        .use(KoaHelmet())
        .use(KoaBodyparser())
        .use(KoaAsyncValidator())
        .use(KoaJSON())
        .use(KoaCors({ origin: '*' })) // TODO(nvasile): only in dev mode.
        .use(Router.routes())
        .use(Router.allowedMethods())
        .use(this._APIErrorHandler)
        .on('error', this._handleAPIErrorEvent)
        .listen(process.env.API_PORT, this._handleAPIBootstrap);

      log.info(`Started REST API on port ${process.env.API_PORT}`)
    })();
  }

  _APIErrorHandler = async(ctx, next) => {
    try {
      await next();
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = err.message;
      ctx.app.emit('error', err, ctx);
    }
  }

  _handleAPIErrorEvent = (err, ctx) => {
    console.error(err);
    /* centralized error handling:
     * TODO: ...
     *   console.log error
     *   write error to log file
     *   save error and request information to database if ctx.request match condition
     */
  }

  _handleAPIBootstrap = () => {
    log.info(`Athena manager started listening on ${process.env.API_PORT}!`);
  }

  _generateAccessToken = () => {
    let hashLength = Number(process.env.TOKEN_HASH_LENGTH);

    if (!hashLength) {
      log.warn(`The "TOKEN_HASH_LENGTH" environment variable is missing. using the default value (64).`);
      hashLength = 64;
    }

    return nanoid();
  };

  createTCPServer = () => {
    const addr = this.getAddr();
    const port = this.getPort();

    log.info(`Creating a new Athena cluster on: ${addr}:${port} ...`);
    this._socket = net.createServer();
    this
      ._socket
      .listen(port, addr, this._handleServerCreated);
    this
      ._socket
      .on('connection', this._handleNewAgentConnection);

  };

  delegateClusterCommand = (command, data) => {
    const socket = this.getSocket();
    const message = makeMessage(command, data);
    const agents = this.getAgents();

    if (!agents.length) {
      log.warn(`Could not delegate command. There are currently no agents in this cluster.`);
      return;
    }

    agents.forEach((agent) => {
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
    this
      ._agents
      .push(agent);
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
    (async() => {
      // create and store a new Agent
      const Agent = new AgentNode(this.athena, this.settings);
      Agent.setSocket(sock);
      this.addAgent(Agent);
      const {remoteAddress, remotePort} = sock;
      log.info(`New Athena agent (${Agent.getName()}) connected: ${remoteAddress}:${remotePort}`);
      await storage.storeAgent(Agent.describe());

      // send new agent details to the agent node
      const message = makeMessage('REQ_UPDATE_INFO', Agent.describe());
      sock.write(JSON.stringify(message));

      // hook handlers on socket events
      sock.setEncoding('utf8');
      sock.on('data', (message) => {
        this._handleIncomingAgentData(sock, message);
      });
      sock.on('close', (data) => {
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
      log.warn(`Could not parse incoming agent message!\n${error}`);
      // todo: poll the agent again for the latest job results.
      return;
    }

    // parse incoming message type
    switch (data.type) {
      case 'RES_RUN_PERF':
        this._handleResRunPerf(data);
        break;
      default:
        break;
    }
  };

  _handleResRunPerf = (results) => {
    const data = results.data;
    log.success(`[job_id: ${data.id}] Successfully retrieved new agent report!`);

    this.jobReportsRetrieved++;
    const agentsCount = this
      .getAgents()
      .length;
    const lastAgentInQueue = agentsCount === this.jobReportsRetrieved;

    if (lastAgentInQueue) {
      log.info(`Retrieved the last job report from ${agentsCount} agents!`);
    }

    const actions = [];

    // ac_job // todo: handle this only once !
    actions.push({
      index: {
        _index: 'ac_job'
      }
    }, {
      job_id: data.id,
      created_at: data.created_at,
      updated_at: data.updated_at, // todo: propagate value
    });

    // ac_result_overview
    actions.push({
      index: {
        _index: 'ac_result_overview'
      }
    }, {
      'job_id': data.id,
      'agent_id': data.agent_id,
      'agent_name': data.agent_name,
      'url': data.results.url,
      'responses': data.results.stats.responses,
      'errors': data.results.errors,
      'timeouts': data.results.timeouts,
      'duration': data.results.duration,
      'start': data.results.start,
      'finish': data.results.finish,
      'connections': data.results.connections,
      'pipelining': data.results.pipelining,
      'non2xx': data.results.non2xx,
      '1xx': data.results['1xx'],
      '2xx': data.results['2xx'],
      '3xx': data.results['3xx'],
      '4xx': data.results['4xx'],
      '5xx': data.results['5xx']
    });

    // ac_results_requests
    actions.push({
      index: {
        _index: 'ac_results_requests'
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
        _index: 'ac_results_latency'
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
        _index: 'ac_results_throughput'
      }
    }, {
      job_id: data.id,
      agent_id: data.agent_id,
      agent_name: data.agent_name,
      ...data.results.throughput
    });

    // ac_result_rps
    const pushRpsEntry = (rpsEntry) => {
      actions.push({
        index: {
          _index: 'ac_result_rps'
        }
      }, {
        job_id: data.id,
        agent_id: data.agent_id,
        agent_name: data.agent_name,
        ...rpsEntry
      });
    }

    if (typeof data.results.stats.rpsMap === "object") {
      Object.keys(data.results.stats.rpsMap).map(k => pushRpsEntry(data.results.stats.rpsMap[k]))
    } else if (typeof data.results.stats.rpsMap === "array") {
      data.results.stats.rpsMap.forEach(rpsEntry => pushRpsEntry(rpsEntry));
    } else {
      // noop
    }

    // ac_result_resincr
    const pushResEntry = (resEntry) => {
      actions.push({
        index: {
          _index: 'ac_result_resincr'
        }
      }, {
        job_id: data.id,
        agent_id: data.agent_id,
        agent_name: data.agent_name,
        ...resEntry
      });
    }

    if (typeof data.results.stats.resIncrMap === "object") {
      Object.keys(data.results.stats.resIncrMap).map(k => pushResEntry(data.results.stats.resIncrMap[k]))
    } else if  (typeof data.results.stats.resIncrMap === "array") {
      data.results.stats.resIncrMap.forEach((resEntry) => pushResEntry(resEntry));
    } else {
      // noop
    }

    // store in bulk
    storage.bulk(actions);
  };

  _handleRemoveAgent = (data, sock) => {
    const agents = this.getAgents();
    const index = agents.findIndex(function (agent) {
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

  // Assumed bare metal.
  joinCluster = () => {
    const token = this.settings.token; // todo: auth
    const [host, port] = this.settings.addr.split(':');
    const _self = this;
  };

  joinNonInteractive = () => {
    const perfTest =  JSON.parse(this.settings.jobConfig);
    const _self = this;

    // Try to evaluate any provided hooks.
    if (perfTest.hooks) {
      perfTest.setupClient = function(client) {
        client.on('request', () => {
          if (perfTest.hooks.onRequest) {
            try {
              eval(perfTest.hooks.onRequest);
            } catch (e) {
              log.error(`Could not parse performance test hook [onRequest]:\n${e}`);
            }
          }
        });
      }
    }
  
    this.athena.runPerformanceTests(perfTest, async function (err, results, stats) {
      // check for any errors
      if (err) {
        console.error(`Could not run the job!`, err);
        return;
        // todo: return error message to manager
      }

      results.stats = stats;
      log.success(`Successfully ran the performance test!`);
      log.info(`Attempting to notify the manager about the test results...`);

      const PerfJob = new PerformanceJob(perfTest);
      PerfJob.setResults(results);
      PerfJob.setId(_self.settings.jobId);

      try {
        request.post('http://athena-manager:5000/api/v1/k8s/internal/performance/parse-agent-report', {
          form: {
            agent_id: _self.getID(),
            agent_name: _self.getName(),
            ...PerfJob.describe()
          }
        }, function(err) {
          // todo: hamdle error here
          _process.exit(0);
        })
      } catch (e) {
        console.error(e);
        // ctx.throw(500, 'Could not notify the manager about the tests results.');
      } finally {
        // _process.kill(_process.pid);
      }
    });

    const NonInteractiveAgentAPI = new Koa();
    const Router = new KoaRouter();
    const _process = process;

    NonInteractiveAgentAPI
      .use(KoaHelmet())
      .use(KoaBodyparser({
        formLimit: "50mb",
        jsonLimit: "50mb",
        textLimit: "50mb"
      }))
      .use(KoaJSON())
      .use(Router.routes())
      .use(Router.allowedMethods())
      .use(async(ctx, next) => {
        try {
          await next();
        } catch (err) {
          ctx.status = err.status || 500;
          ctx.body = err.message;
          ctx
            .app
            .emit('error', err, ctx);
        }
      })
      .listen(5000, () => {
        console.log(`The Athena agent is listening in non-interactive mode.`);
      })
  }

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

    log.info(`Preparing to run a new performance job (id: ${perfTest.id}) ...`);

    // run performance tests
    this
      .athena
      .runPerformanceTests(perfTest.data, function (err, results, stats) {
        // check for any errors
        if (err) {
          console.error(`Could not run the job!`, err);
          return;
          // todo: return error message to manager
        }

        results.stats = stats;

        const socket = _self.getSocket();
        log.success(`Successfully ran the performance test!`);

        // prep the test results message
        log.info(`Attempting to notify the manager about the test results...`);
        const PerfJob = new PerformanceJob(perfTest);
        PerfJob.setResults(results);

        const resRunPerfMessage = makeMessage('RES_RUN_PERF', {
          agent_id: _self.getID(),
          agent_name: _self.getName(),
          ...PerfJob.describe()
        });

        // notify
        socket.write(JSON.stringify(resRunPerfMessage), 'utf8', () => {
          log.success(`Successfully sent the test results!`);
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
    if (perfTest.id) 
      this._id = perfTest.id;
    if (perfTest.created_at) 
      this._created_at = perfTest.created_at;
    if (perfTest.updated_at) 
      this._updated_at = perfTest.updated_at;
    if (perfTest.data) 
      this._data = perfTest.data;
    if (perfTest.results) 
      this._results = perfTest.results;
    }
  
  setId = (id) => {
    this._id = id;
  }

  getId = () => {
    return this._id;
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