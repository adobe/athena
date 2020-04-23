import rp from 'request-promise';

export const request = (endpoint = '/', options = {}) => {
    const baseURL = 'http://localhost:5000';

    const defaultOpts = {
        method: 'GET',
        uri: `${baseURL}${endpoint}`
    }

    return rp({
        ...defaultOpts,
        ...options
    });
}