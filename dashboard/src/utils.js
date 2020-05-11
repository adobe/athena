import rp from 'request-promise';

// Environment Vars
// ---
// REACT_APP_API_PROTO
// REACT_APP_API_URL
// REACT_APP_API_PORT

export const getBaseURL = () => {
    const API_PROTO = process.env.REACT_APP_API_PROTO || "http"
    const API_URL = process.env.REACT_APP_API_URL || "localhost"
    const API_PORT = process.env.REACT_APP_API_PORT || "5000"

    return `${API_PROTO}://${API_URL}:${API_PORT}`;
}

export const request = (endpoint = '/', options = {}) => {
    const baseURL = getBaseURL();

    const defaultOpts = {
        method: 'GET',
        uri: `${baseURL}${endpoint}`
    }

    return rp({
        ...defaultOpts,
        ...options
    });
}