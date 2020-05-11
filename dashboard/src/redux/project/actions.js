import { request } from "./../../utils";

import {
    READ_PROJECTS_REQUEST,
    READ_PROJECTS_SUCCESS,
    READ_PROJECTS_ERROR,
    TOGGLE_PROJECTS_MODAL,          
    CHANGE_PROJECT_NAME,
    CHANGE_PROJECT_DESCRIPTION,
    CHANGE_PROJECT_REPO_NAME,
    READ_SINGLE_PROJECT,
    UPDATE_PERF_JOB_CONTENTS,
    READ_PERF_TESTS_SUCCESS,
    READ_PERF_TEST_RUNS_SUCCESS,
    READ_PERF_TEST_DETAILS_SUCCESS,
    SCHEDULE_PERF_TEST_RUN_SUCCESS,
    READ_SINGLE_PERF_TEST_DETAILS_SUCCESS,
    UPDATE_PERF_TEST
} from "./types"

const noop = () => {}

export const readProjectsRequest = () => {
    return {
        type: READ_PROJECTS_REQUEST
    }
}

export const readProjectsSuccess = projects => {
    return {
        type: READ_PROJECTS_SUCCESS,
        payload: projects
    }
}

export const readProjectsError = error => {
    return {
        type: READ_PROJECTS_ERROR,
        payload: error
    }
}

export const toggleCreateProjectModal = () => {
    return {
        type: TOGGLE_PROJECTS_MODAL
    }
}

export const changeProjectName = (name) => {
    return {
        type: CHANGE_PROJECT_NAME,
        payload: name
    }
}

export const changeProjectDescription = (description) => {
    return {
        type: CHANGE_PROJECT_DESCRIPTION,
        payload: description
    }
}

export const changeProjectGitRepo = (repoName) => {
    return {
        type: CHANGE_PROJECT_REPO_NAME,
        payload: repoName
    }
}

export const readSingleProjectSuccess = (project) => {
    return {
        type: READ_SINGLE_PROJECT,
        payload: project
    }
}

export const readPerfTestsSuccess = (perfTests) => {
    return {
        type: READ_PERF_TESTS_SUCCESS,
        payload: perfTests
    }
}

export const updatePerfJobContents = (contents) => {
    return {
        type: UPDATE_PERF_JOB_CONTENTS,
        payload: contents
    }
}

export const readPerfTestRunsSuccess = (perfRuns) => {
    return {
        type: READ_PERF_TEST_RUNS_SUCCESS,
        payload: perfRuns
    }
}

export const readPerfTestDetailsSuccess = (perfTestDetails) => {
    return {
        type: READ_PERF_TEST_DETAILS_SUCCESS,
        payload: perfTestDetails
    }
}

export const readSinglePerfTestDetailsSuccess = (ptd) => {
    return {
        type: READ_SINGLE_PERF_TEST_DETAILS_SUCCESS,
        payload: ptd
    }
}

export const schedulePerfTestSuccess = (resp) => {
    return {
        type: SCHEDULE_PERF_TEST_RUN_SUCCESS,
        payload: resp
    }
}

export const storeNewPerformanceTest = (testData, projectId) => {
    // TODO: Check project ID.  
    return function(dispatch) {
        // TODO: Start process.
        request(`/api/v1/projects/${projectId}/performance`, {
            method: 'POST',
            body: {
                testData // YAML string, needs to be parsed server side.
            },
            json: true
        })
            .then(response => {
                console.error(`Created a new performance test!`)
                console.log(response);
            })
            .catch(error => {
                console.error(`There was a problem while attempting to store the new perf test!`, error)
            });
    }
}

// Read all projects.
export const readProjects = () => {
    return function(dispatch) {
        dispatch(readProjectsRequest)
        request('/api/v1/projects')
            .then(response => {
                response = JSON.parse(response);
                dispatch(readProjectsSuccess(response.projects))
            })
            .catch(error => {
                console.error(error)
                dispatch(readProjectsError('There was a problem while loading the projects. Please check the logs!'))
            })
    }
}

// Create a new project.
export const storeNewProject = (data) => {
    return function(dispatch) {
        request('/api/v1/projects', {
            method: 'POST',
            body: data,
            json: true
        })
            .then(() => {
                dispatch(readProjects())
            })
            .catch(function(e) {
                console.error(`There was a problem while attempting to store the new project!`)
                console.error(e)
            })
    }
}

// Read project details.
export const readProjectDetails = (id) => {
    return function(dispatch) {
        console.log(`Fetching project details (project id: ${id})`);
        request(`/api/v1/projects/${id}`)
            .then(project => {
                dispatch(readSingleProjectSuccess(project))
            })
            .catch(e => {
                console.error(`There was a problem while attempting to read the single project details! Please check the console for more details!`)
                console.log(e);
            });
    }
}

// Read perf tests for a given project.
export const readProjectPerfTests = (id) => {
    return function(dispatch) {
        console.log(`Fetching performance tests for project id: ${id}`);
        request(`/api/v1/projects/${id}/performance`)
            .then(res => {
                dispatch(readPerfTestsSuccess(JSON.parse(res).perfTests)) // TODO: fail check
            })
            .catch(e => {
                console.error(`There was a problem while attempting to fetch the performance tests.`);
                console.log(e);
            });
    }
}

// Read perf test details.
export const fetchPerfTestRunsUpdates = (pid, tid) => {
    return function(dispatch) {
        console.log(`Fetching performance test runs. (perf test id: ${tid})`);
        request(`/api/v1/projects/${pid}/performance/${tid}/runs`)
            .then(res => dispatch(readPerfTestRunsSuccess(JSON.parse(res))))
            .catch(e => console.error(`There was a problem while attempting to fetch the performance test runs.\n${e}`));
    }
}

// Read perf runs for a given perf test.
export const fetchPerfTestDetails = (pid, tid) => {
    return function(dispatch) {
        console.log(`Fetching performance test details. (perf test id: ${tid})`);
        request(`/api/v1/projects/${pid}/performance/${tid}`)
            .then(res => dispatch(readPerfTestDetailsSuccess(JSON.parse(res))))
            .catch(e => console.error(`There was a problem while attempting to fetch the performance test details.\n${e}`));
    }   
}

// Read perf runs for a given perf test.
export const fetchSinglePerfTestDetails = (pid, tid) => {
    return function(dispatch) {
        console.log(`Fetching performance test details. (perf test id: ${tid})`);
        request(`/api/v1/projects/${pid}/performance/${tid}`)
            .then(res => dispatch(readSinglePerfTestDetailsSuccess(JSON.parse(res))))
            .catch(e => console.error(`There was a problem while attempting to fetch the performance test details.\n${e}`));
    }   
}

// Schedule a new performance test run.
export const schedulePerfTestRun = (pid, tid) => {
    return function(dispatch) {
        console.log(`Scheduling a new performance test run (perf test id: ${tid})`);
        request(`/api/v1/projects/${pid}/performance/${tid}/schedule`)
            .then(res => dispatch(schedulePerfTestSuccess(JSON.parse(res))))
            .catch(e => console.error(`There was a problem while attempting to schedule a new performance test run.\n${e}`));
    }   
}

export const updatePerformanceTest = (pid, tid, content, cb = noop) => {
    console.log(`Updating an existing perf test (pid: ${pid}, tid: ${tid})`);
    return function(dispatch) {
        request(
            `/api/v1/projects/${pid}/performance/${tid}`,
            {
                method: 'PUT',
                body: content,
                json: true,
            }
        )
        .then(res => {
            cb();
            console.log(`Successfully updated the test!`, res)
        })
        .catch(err => {
            console.error(`There was a problem while trying to update the test...`, err)
        })
    }
}

export const deletePerfTestById = (pid, tid) => {
    return function(dispatch) { // TODO: Use dispatch!
        request(
            `/api/v1/projects/${pid}/performance/${tid}`,
            { method: 'DELETE' }
        )
        .then(res => {
            console.log(`Successfully deleted the test! tid: ${tid}`, res);
        })
        .catch(err => {
            console.error(`There was a problem while attempting to delete the test! tid: ${tid}`, err);
        });
    }
}

export const deleteProjectById = (pid, cb = noop) => {
    return function(dispatch) { // TODO: Use dispatch!
        console.log(`Attempting to delete project pid: ${pid}`);
        request(
            `/api/v1/projects/${pid}`,
            { method: "DELETE" }
        )
        .then(res => {
            console.log(`Successfully deleted the project: pid:${pid}`, res);
            cb();
        })
        .catch(err => {
            console.log(`There was an error while deleting the project pid: ${pid}`, err);
            cb();
        })
    }
}