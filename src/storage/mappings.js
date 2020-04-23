const storageClients = require('./clients');
const {makeLogger} = require('./../utils');

const log = makeLogger();
const client = storageClients.elastic;

const INDEXES = {
    AC_JOB: 'ac_job',
    AC_RESULT_OVERVIEW: 'ac_result_overview',
    AC_RESULT_RESINCR: 'ac_result_resincr',
    AC_RESULT_RPS: 'ac_result_rps',
    AC_RESULTS_REQUESTS: 'ac_results_requests',
    AC_RESULTS_THROUGHPUT: 'ac_results_throughput',
    AC_RESULTS_LATENCY: 'ac_results_latency'
}

// Mappings.
const MAPPINGS = {}

MAPPINGS[INDEXES.AC_JOB] = {
    index: INDEXES.AC_JOB,
    body: {
        properties: {
            created_at: { type: "date" },
            updated_at: { type: "date" },
            job_id: { type: "text" }
        }
    }
}

MAPPINGS[INDEXES.AC_RESULT_OVERVIEW] = {
    index: INDEXES.AC_RESULT_OVERVIEW,
    body: {
        properties: {
            "1xx": { type: "integer" },
            "2xx": { type: "integer" },
            "3xx": { type: "integer" },
            "4xx": { type: "integer" },
            "5xx": { type: "integer" },
            agent_id: { type: "text" },
            agent_name: { type: "text" },
            connections: { type: "integer" },
            duration: { type: "integer" },
            errors: { type: "integer" },
            finish: { type: "date" },
            job_id: { type: "text" },
            non2xx: { type: "integer" },
            pipelining: { type: "integer" },
            responses: { type: "integer" },
            start: { type: "date" },
            timeouts: { type: "integer" },
            url: { type: "text" }
        }
    }
}

MAPPINGS[INDEXES.AC_RESULT_RESINCR] = {
    index: INDEXES.AC_RESULT_RESINCR,
    body: {
        properties: {
            agent_id: { type: "text" },
            agent_name: { type: "text" },
            count: { type: "integer" },
            date: { type: "date" },
            job_id: { type: "text" }
        }
    }
}

MAPPINGS[INDEXES.AC_RESULT_RPS] = {
    index: INDEXES.AC_RESULT_RPS,
    body: {
        properties: {
            agent_id: { type: "text" },
            agent_name: { type: "text" },
            count: { type: "integer" },
            date: { type: "date" },
            job_id: { type: "text" }
        }
    }
}


MAPPINGS[INDEXES.AC_RESULTS_REQUESTS] = {
    index: INDEXES.AC_RESULTS_REQUESTS,
    body: {
        properties: {
            agent_id: { type: "text" },
            agent_name: { type: "text" },
            average: { type: "float" },
            max: { type: "integer" },
            mean: { type: "float" },
            p0_001: { type: "float" },
            p0_01: { type: "float" },
            p0_01: { type: "float" },
            p0_1: { type: "float" },
            p1: { type: "float" },
            p10: { type: "float" },
            p25: { type: "float" },
            p2_5: { type: "float" },
            p50: { type: "float" },
            p75: { type: "float" },
            p90: { type: "float" },
            p97_5: { type: "float" },
            p99: { type: "float" },
            p99_9: { type: "float" },
            p99_99: { type: "float" },
            p99_999: { type: "float" },
            stddev: { type: "float" },
            total: { type: "integer" },
            job_id: { type: "text" }
        }
    }
}

MAPPINGS[INDEXES.AC_RESULTS_THROUGHPUT] = {
    index: INDEXES.AC_RESULTS_THROUGHPUT,
    body: {
        properties: {
            agent_id: { type: "text" },
            agent_name: { type: "text" },
            average: { type: "float" },
            job_id: { type: "text" },
            max: { type: "integer" },
            mean: { type: "float" },
            min: { type: "integer" },
            p0_001: { type: "float" },
            p0_01: { type: "float" },
            p0_01: { type: "float" },
            p0_1: { type: "float" },
            p1: { type: "float" },
            p10: { type: "float" },
            p25: { type: "float" },
            p2_5: { type: "float" },
            p50: { type: "float" },
            p75: { type: "float" },
            p90: { type: "float" },
            p97_5: { type: "float" },
            p99: { type: "float" },
            p99_9: { type: "float" },
            p99_99: { type: "float" },
            p99_999: { type: "float" },
            stddev: { type: "float" },
            total: { type: "integer" }

        }
    }
}

MAPPINGS[INDEXES.AC_RESULTS_LATENCY] = {
    index: INDEXES.AC_RESULTS_LATENCY,
    body: {
        properties: {
            agent_id: { type: "text" },
            agent_name: { type: "text" },
            average: { type: "float" },
            job_id: { type: "text" },
            max: { type: "integer" },
            mean: { type: "float" },
            min: { type: "integer" },
            p0_001: { type: "float" },
            p0_01: { type: "float" },
            p0_01: { type: "float" },
            p0_1: { type: "float" },
            p1: { type: "float" },
            p10: { type: "float" },
            p25: { type: "float" },
            p2_5: { type: "float" },
            p50: { type: "float" },
            p75: { type: "float" },
            p90: { type: "float" },
            p97_5: { type: "float" },
            p99: { type: "float" },
            p99_9: { type: "float" },
            p99_99: { type: "float" },
            p99_999: { type: "float" },
            stddev: { type: "float" },
        }
    }
}

const getMappingForIndex = (index) => {
    return MAPPINGS[index];
}

const makeResolver = (message = null, callback) => {
    return function(error, resp) {
        if (error && typeof error !== null) {
            log.error(error)
            return;
        }

        if (message) {
            log.info(message);
        }

        if (callback && typeof callback === 'function') {
            callback();
        }
    }
}

const maybePutMappingForIndex = (index, callback) => {
    client.indices.getMapping({index},
    function (error,response) {  
        let error_type;

        try {
            error_type = error.meta.body.error.type
            if (error_type === "index_not_found_exception") {
                log.info(`The ${index} does not exist. Attempting to create it and define its mapping as well.`);
                client.indices.create({index: index}, makeResolver(`The ${index} was successfully created!`, () => {
                    client.indices.putMapping(getMappingForIndex(index), makeResolver(`The mapping for the ${index} was successfully created.`));
                }));

                return;
            }

        } catch (e) {
            // Not handling the error is indended here due to: error_type = error.meta.body.error.type inside the try block.
            log.debug(`The [${index}] index already exists, and probably its mapping as well.`);
        }

        // The index provided exists at this point.
        if (callback && typeof callback === 'function') {
            callback();
        }
    });
}

module.exports = () => {
    // Make sure to update indices only once.
    maybePutMappingForIndex(INDEXES.AC_JOB);
    maybePutMappingForIndex(INDEXES.AC_RESULT_OVERVIEW);
    maybePutMappingForIndex(INDEXES.AC_RESULT_RESINCR);
    maybePutMappingForIndex(INDEXES.AC_RESULT_RPS);
    maybePutMappingForIndex(INDEXES.AC_RESULTS_REQUESTS);
    maybePutMappingForIndex(INDEXES.AC_RESULTS_THROUGHPUT);
    maybePutMappingForIndex(INDEXES.AC_RESULTS_LATENCY);
}