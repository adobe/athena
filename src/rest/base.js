const {makeLogger} = require('../utils');
const log = makeLogger();

class BaseController {
    responsify = (router) => {
        for(let path in this._paths) {
            for(let verb in this._paths[path]) {
                const registerPath = `/${this.name}/${this.version}${path}`;
                router[verb](registerPath, (ctx, next) => {
                    let resp = this._paths[path][verb](ctx, next);
                    ctx.status = 400;
                    let capturableMessage = false;
                    if(resp.hasOwnProperty("status")) {
                        ctx.status = resp.status;
                        capturableMessage = true;
                    }
                    ctx.body = "unimplemented";
                    if(resp.hasOwnProperty("message")) {
                        ctx.body = resp.message;
                        capturableMessage = true;
                    }

                    if(!capturableMessage) {
                        ctx.body = resp || "unimplemented";
                    }

                    try {
                        let stringified = JSON.stringify(ctx.body);
                        ctx.body = stringified;
                        ctx.header["content-type"] = "application/json"
                    } catch {

                    }

                })
                log.info(`Registered ${registerPath} - ${verb.toUpperCase()}`)
            }
        }
    };
}

module.exports = BaseController;