const Boom = require("@hapi/boom");
const BaseController = require('./base');

class ClusterController extends BaseController{
    constructor(router) {
        super();
        this.name = "cluster";
        this.version = "1.0";
        this._paths = {
            "": {
                "get": this.getClusterDetails
            },
            "/agent/:id": {
                "get": this.getClusterAgentDetails
            },
        };

        this.responsify(router);
    }

    getClusterDetails = () => {

    };

    getClusterAgentDetails = () => {

    };
}

exports.RestController = ClusterController;