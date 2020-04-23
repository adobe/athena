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

// Model: Performance Test Run
const PerformanceTestRunSchema = new Schema({
    testId: {
        type: Schema.Types.ObjectId,
        ref: 'PerformanceTest'
    },

    // The config used to run this perf run. Will be kept for reference only.
    config: Object,

    // One of:
    // PENDING - The job is pending, waiting for all agents to be marked as ready. (Not implemented.) 
    // RUNNING - The job is currently running, once all agents were reported as ready.
    // COMPLETED - The job is completed.
    // FAILED - The job failed for some reason.
    status: String,

    // The generated Kibana URL
    reportUrl: String,

    // The amount of reports received from all spawned agents.
    // The job should be marked as a failure if the reports.length
    // is < than config.config.agents after a given timeout.
    reports: Number,
}, {
    timestamps: true
});

// Extends Mongoose as we need the atomic operation provided by findAndModify.
// This is mainly used when parsing and counting incoming reports from Athena agents
// in order to avoid concurrency issues. Otherwise, we risk having indefinite pending jobs
// due to improper counted reports.
PerformanceTestRunSchema.statics.findAndModify = function (opts) {
    return this.collection.findAndModify(opts);
};

// Register and export the models.
exports.Project = mongoose.model('Project', ProjectSchema);
exports.PerformanceTest = mongoose.model('PerformanceTest', PerformanceTestSchema);
exports.PerformanceTestRun = mongoose.model('PerformanceTestRun', PerformanceTestRunSchema);