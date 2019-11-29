const Boom = require("@hapi/boom");
const BaseController = require('./base');

class JobsController extends BaseController{
    constructor(router) {
        super();
        this.name = "jobs";
        this.version = "1.0";
        this._paths = {
            "/performance": {
                "get": this.getAllPerformanceJobs,
                "post": this.createPerformanceJob
            },
            "/performance/:id": {
                "get": this.getPerformanceJob,
                "patch": this.updatePerformanceJob
            },
            "/functional": {
                "get": this.getAllFunctionalJobs,
                "post": this.createFunctionalJob
            },
            "/functional/:id": {
                "get": this.getFunctionalJob
            }
        };

        this.responsify(router);
    };

    getAllFunctionalJobs = (ctx, next) => {

    };

    createFunctionalJob = (ctx, next) => {

    };

    getFunctionalJob = (ctx, next) => {

    };

    getAllPerformanceJobs = (ctx, next) => {
        return Boom.internal("Ciuca implement me");
    };

    createPerformanceJob = (ctx, next) => {
        return {
            "google": "next"
        }
    };

    getPerformanceJob = (ctx, next) => {
        return {
            status: 200,
            message: {
                "gigi": "out"
            }
        }
    };

    updatePerformanceJob = (ctx, next) => {
    };
}


exports.RestController = JobsController;