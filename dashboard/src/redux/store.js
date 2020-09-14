// External
import { createStore, applyMiddleware } from "redux";
import thunk from 'redux-thunk';
import logger from 'redux-logger';
import { loadingBarMiddleware } from 'react-redux-loading-bar'

// Project
import rootReducer from "./reducers";

export default createStore(
    rootReducer,
    applyMiddleware(
        loadingBarMiddleware(),
        thunk,
        logger
    )
);
