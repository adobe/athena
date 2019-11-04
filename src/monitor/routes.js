const Router = require('@koa/router');
const {Client} = require('@elastic/elasticsearch');

const router = new Router();
const client = new Client({ node: 'http://localhost:9200' });

// Ping
router.get('/ping', (ctx, next) => {
    ctx.response.status = 200;
    ctx.response.body = 'pong\n';
    next();
});

// Routes
const ROUTE = {
    AGENT_STATUS: '/status/:id',
    CLUSTER_STATUS: '/status',
    FUNC_JOB: '/jobs/functional/:id',
    FUNC_JOBS: '/jobs/functional',
    PERF_JOB: '/jobs/performance/:id',
    PERF_JOBS: '/jobs/performance'
};

// ES Indexes
const INDEX = {
    AGENT: 'ac_agent'
};

// Mock
async function init() {
    const status = ['Busy', 'Idle', 'Down'];
    for (let agentIndex = 0; agentIndex < 20; agentIndex++) {
        await client.index({
            index: INDEX.AGENT,
            id: agentIndex + 1,
            body: {
                status: status[agentIndex % 3]
            }
        });
    }
}
//init();

const handleESErr = function (err, ctx) {
    console.log(err);
    if (err.meta.body.error.type.indexOf('index_not_found_exception') > -1) {
        ctx.response.status = 400;
    } else {
        ctx.response.status = 500;
    }
};

// Controllers
const getAgentStatus = async function (ctx, next) {
    const id = ctx.params.id;
    console.log(`Getting Athena Node #${id} status`);
    try {
        const res = await client.get({ id: id, index: INDEX.AGENT }, { ignore: [404] });
        ctx.response.status = res.statusCode;
        if (res.body.found) {
            ctx.response.body = res.body._source;
        }
    } catch (err) {
        handleESErr(err, ctx);
    }
    next();
};

const getClusterStatus = async function (ctx, next) {
    console.log(`Getting Athena Cluster status`);
    try {
        const res = await client.search({ index: INDEX.AGENT, size: 20 });
        ctx.response.status = 200;
        ctx.response.body = res.body.hits.hits.map(entry => entry._source);
    } catch (err) {
        handleESErr(err, ctx);
    }
    next();
};

// Todo
const getFunctionalJob = function (ctx, next) {
    console.log(`Getting details of Athena Functional Job # ${ctx.params.id}`);
    ctx.response.status = 200;
    next();
};

const getFunctionalJobs = function (ctx, next) {
    console.log(`Getting details of all running Athena Functional Jobs`);
    ctx.response.status = 200;
    next();
};

const createFunctionalJob = function (ctx, next) {
    console.log(`Creating a new Athena Functional Job`);
    ctx.response.status = 200;
    next();
};

const getPerformanceJob = function (ctx, next) {
    console.log(`Getting details of Athena Performance Job # ${ctx.params.id}`);
    ctx.response.status = 200;
    next();
};

const getPerformanceJobs = function (ctx, next) {
    console.log(`Getting details of all running Athena Performance Jobs`);
    ctx.response.status = 200;
    next();
};

const createPerformanceJob = function (ctx, next) {
    console.log(`Creating a new Athena Performance Job`);
    ctx.response.status = 200;
    next();
};

router.get(ROUTE.AGENT_STATUS, getAgentStatus);

router.get(ROUTE.CLUSTER_STATUS, getClusterStatus);

router.get(ROUTE.FUNC_JOB, getFunctionalJob);
router.get(ROUTE.FUNC_JOBS, getFunctionalJobs);
router.post(ROUTE.FUNC_JOBS, createFunctionalJob);

router.get(ROUTE.PERF_JOB, getPerformanceJob);
router.get(ROUTE.PERF_JOBS, getPerformanceJobs);
router.post(ROUTE.PERF_JOBS, createPerformanceJob);

exports.router = router;
