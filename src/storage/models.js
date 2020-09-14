const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Model: Project
const ProjectSchema = new Schema({
    name: String,
    description: String,
    repoUrl: String
}, {
    timestamps: true
});

// Model: Performance Test
const PerformanceTestSchema = new Schema({
    projectId: {
        type: Schema.Types.ObjectId,
        ref: 'ProjectSchema'
    },
    perfRuns: {
        type: Schema.Types.ObjectId,
        ref: 'PerformanceTestRun'
    },
    config: Object // YAML to JSON conversion
}, {
    timestamps: true
});

const PerformanceTestAgentSchema = new Schema({
    agentId: String,
    name: String,
    partialReportsCount: Number,

    // PENDING - waiting
    // READY
    // RUNNING
    // COMPLETED
    // FAILED
    status: String
});

// Model: PerformanceTestRun
const PerformanceTestRunSchema = new Schema({
    testId: {
        type: Schema.Types.ObjectId,
        ref: 'PerformanceTest'
    },

    // The config used to run this perf run. Will be kept for reference only.
    config: Object,

    // One of:
    // PENDING - The job is pending, waiting for all agents to be marked as ready. (Not implemented.) 
    // READY - All agents are ready, starting right now.
    // RUNNING - The job is currently running, all agents are sending traffic.
    // COMPLETED - The job is completed.
    // FAILED - The job failed for some reason.
    status: String,

    agents: {
        type: Schema.Types.ObjectId,
        ref: 'PerformanceAgent'
    },

    // The generated Kibana URL
    reportUrl: String,

    // The amount of reports received from all spawned agents.
    // The job should be marked as a failure if the reports.length
    // is < than config.config.agents after a given timeout.
    reports: Number,
}, {
    timestamps: true
});

const PerformanceTestRunModel = mongoose.model('PerformanceTestRun', PerformanceTestRunSchema);

// Extends Mongoose as we need the atomic operation provided by findAndModify.
// This is mainly used when parsing and counting incoming reports from Athena agents
// in order to avoid concurrency issues. Otherwise, we risk having indefinite pending jobs
// due to improper counted reports.
PerformanceTestRunSchema.statics.findAndModify = function (opts) {
    return this.collection.findAndModify(opts);
};

// Cascade delete PerformanceTestRun(s) for this test.
// TODO! Fix cascade deletes. The deleteOne does not pass the perf test instance.
PerformanceTestSchema.pre('remove', function(next) {   
    console.log(JSON.stringify(next, null, 2));
    // const { _id: deletedPerfTestId } = deletedPerfTest;
    // console.log(`Attempting to delete the perf test runs for testId: ${deletedPerfTestId}`);
    // await PerformanceTestRunModel.deleteMany({ testId: deletedPerfTestId });
});

// Register and export the models.
const ProjectModel = mongoose.model('Project', ProjectSchema);
const PerformanceTestModel = mongoose.model('PerformanceTest', PerformanceTestSchema);
const PerformanceTestAgentModel = mongoose.model('PerformanceAgent', PerformanceTestAgentSchema);

exports.Project = ProjectModel;
exports.PerformanceTest = PerformanceTestModel;
exports.PerformanceTestRun = PerformanceTestRunModel;
exports.PerformanceTestAgent = PerformanceTestAgentModel;