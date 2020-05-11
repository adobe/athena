// External
import { combineReducers } from "redux";
import { loadingBarReducer } from 'react-redux-loading-bar';

// Project
import projectReducer from "./project/reducer";

export default combineReducers({
    // Project
    project: projectReducer,

    // 3rd party
    loadingBar: loadingBarReducer,
});
