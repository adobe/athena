const fs = require("fs");
const path = require('path');
const Koa = require('koa');
const Router = require('@koa/router');
const Boom = require('@hapi/boom');
const koaBody = require('koa-body');
const LISTEN_PORT = 9191;

class Server {

    constructor() {
        this._app = new Koa();
        this._router = new Router();
        this._registerControllers();
        this._startServer();
    };

    _startServer = () => {
      this._app
            .use(koaBody())
            .use(this._router.routes())
            .use(this._router.allowedMethods({
                throw: true,
                notImplemented: () => new Boom.notImplemented(),
                methodNotAllowed: () => new Boom.methodNotAllowed()
            }))
            .listen(LISTEN_PORT);
    };

    _registerControllers = () => {
        this._walkDir(path.join(__dirname, "./rest"), this._registerController);
    };

    _registerController = (file) => {
        const {RestController} = require(file);
        if(RestController) {
            new RestController(this._router);
        }
    };

    _walkDir = (dir, fn) => {
        fs.readdirSync(dir).forEach(inode => {
            let inodePath = path.join(dir, inode);
            let isDirectory = fs.statSync(inodePath).isDirectory();
            isDirectory ? this._walkDir(inodePath, fn) :
                fn(inodePath)
        })
    }
}

exports.Server = Server;