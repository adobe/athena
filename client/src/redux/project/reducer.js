import {
    READ_PROJECTS_SUCCESS,
    READ_PROJECTS_REQUEST,
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
    READ_SINGLE_PERF_TEST_DETAILS_SUCCESS
} from "./types";

const initialState = {
    loading: {
        projects: false,
        perfTests: false,
    },
    modalVisible: false,
    modalProjectName: '',
    modalProjectDescription: '',
    modalProjectRepoName: '',
    projects: [],
    error: '',
    managePerfTestContents: '',
    currentProject: {
        instance: null,
        perfTests: [],
        funcTests: [],
    },
    
    // ---
    // TODO(nvasile): Should be cleared on each route change.
    // ---

    // Single pages state.
    single: {

        // Single perf test.
        perfTest: {
            data: null,
            perfRuns: []
        }
    }
}

const reducer = (state = initialState, action) => {
    switch (action.type) {
        case READ_PROJECTS_SUCCESS:
            return {
                ...state,
                projects: action.payload
            }

        case READ_PROJECTS_REQUEST:
            const rpr_state = {
                ...state
            }

            rpr_state.loading.projects = true;

            return rpr_state;

        case READ_PROJECTS_ERROR:
            return {
                ...state,
                projects: action.payload
            }

        case TOGGLE_PROJECTS_MODAL:
            return {
                ...state,
                modalVisible: !state.modalVisible
            }

        case CHANGE_PROJECT_DESCRIPTION:
            return {
                ...state,
                modalProjectDescription: action.payload
            }
            
        case CHANGE_PROJECT_NAME:
            return {
                ...state,
                modalProjectName: action.payload
            }

        case CHANGE_PROJECT_REPO_NAME:
            return {
                ...state,
                modalProjectRepoName: action.payload
            }

        case READ_SINGLE_PROJECT:
            const rsp_state = {
                ...state
            }

            rsp_state.currentProject.instance = JSON.parse(action.payload).project; // TODO: Fail check

            return rsp_state;

        case UPDATE_PERF_JOB_CONTENTS:
            return {
                ...state,
                managePerfTestContents: action.payload
            }
        
        case READ_PERF_TESTS_SUCCESS:
            const rpts_state = {
                ...state
            }

            rpts_state.currentProject.perfTests = action.payload;

            return rpts_state;

        case READ_PERF_TEST_RUNS_SUCCESS:
            const rptrs_state = {
                ...state
            };

            rptrs_state.single.perfTest.perfRuns = action.payload;

            return rptrs_state;

        case READ_PERF_TEST_DETAILS_SUCCESS:
            const rptds_state = {
                ...state
            }

            rptds_state.single.perfTest.data = action.payload;

            return rptds_state

        case READ_SINGLE_PERF_TEST_DETAILS_SUCCESS:
            return {
                ...state,
                managePerfTestContents: action.payload
            }

        default:
            return state;
    }
}

export default reducer;