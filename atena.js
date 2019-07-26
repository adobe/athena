
var pathModule = require('path');
var assert = require('assert').ok;

const registerdSuites = {};

module.constructor.prototype.require = function (path) {

    if(pathModule.extname(path) == ".atena") {
        return registerdSuites[pathModule.basename(path)]();
    }

    var self = this;
    assert(typeof path === 'string', 'path must be a string');
    assert(path, 'missing path');

    try {
        return self.constructor._load(path, self);
    } catch (err) {
        // if module not found, we have nothing to do, simply throw it back.
        if (err.code === 'MODULE_NOT_FOUND') {
            throw err;
        }
        // resolve the path to get absolute path
        path = pathModule.resolve(__dirname, path)

        // Write to log or whatever
        console.log('Error in file: ' + path);
    }
}
const Mocha = require('mocha');
const mocha = new Mocha();

registerdSuites["testing.atena"] = function() {
    const chakram = require('chakram');
    const expect = chakram.expect;
    chakram.addProperty("true", function(object){
        assert(object, true);
    });

    describe('hope', function() {
        it('shodld be ok', function() {
            return expect(true).to.be.true;
        })
    });
};

mocha.addFile("testing.atena");
mocha.run(function(failures) {
    process.exitCode = failures ? 1 : 0;  // exit with non-zero status if there were failures
});
