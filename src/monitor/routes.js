const Router = require('@koa/router');
const router = new Router();

// Ping
router.get('/ping', (ctx, next) => {
    ctx.response.status = 200;
    ctx.response.body = 'pong\n';
    next();
});

// Routes
const ROUTES = {
    AGENT_STATUS: '/status/:id',
    CLUSTER_STATUS: '/status',
    FUNC_JOB: '/jobs/functional/:id',
    FUNC_JOBS: '/jobs/functional',
    PERF_JOB: '/jobs/performance/:id',
    PERF_JOBS: '/jobs/performance'
};

// Controllers
const getAgentStatus = function (ctx, next) {
    console.log(`Getting Athena Node #${ctx.params.id} status`);
    ctx.response.status = 200;
    next();
};

const getClusterStatus = function (ctx, next) {
    console.log(`Getting Athena Cluster status`);
    ctx.response.status = 200;
    next();
};

const getFunctionalJob = function (ctx, next) {
    console.log(`Getting details of Athena Functional Job # ${ctx.params.id}`);
    ctx.response.status = 200;
    ctx.response.body = { id: ctx.params.id, status: "OK" };
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

router.get(ROUTES.AGENT_STATUS, getAgentStatus);

router.get(ROUTES.CLUSTER_STATUS, getClusterStatus);

router.get(ROUTES.FUNC_JOB, getFunctionalJob);
router.get(ROUTES.FUNC_JOBS, getFunctionalJobs);
router.post(ROUTES.FUNC_JOBS, createFunctionalJob);

router.get(ROUTES.PERF_JOB, getPerformanceJob);
router.get(ROUTES.PERF_JOBS, getPerformanceJobs);
router.post(ROUTES.PERF_JOBS, createPerformanceJob);

exports.router = router;
