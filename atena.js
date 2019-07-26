
var pathModule = require('path');
var fs = require('fs');

const originalReadFileSync = fs.readFileSync;
const originalFindPath = module.constructor._findPath;

module.constructor._findPath = function(...args) {
    let fileName = pathModule.basename(args[0]);
    if(fileName.indexOf(".atena") != -1) {
        return fileName;
    }

    return originalFindPath(...args);
};


fs.readFileSync = function(...args) {
    let fileName = pathModule.basename(args[0]);
    if(fileName.indexOf(".atena") != -1) {
        let stringMockFile = registerdSuites[fileName].toString();
        stringMockFile = stringMockFile.replace(/function[\s]*\(.*\)[\s]*\{/, "").trim().replace(/.$/,'');
        return stringMockFile;
    }
    return originalReadFileSync(...args);
};


const registerdSuites = {};
const Mocha = require('mocha');
const mocha = new Mocha();


//must be encapsulated yet look like real js files
registerdSuites["testing.atena.js"] = (function() {
    var assert = require('assert').ok;
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
});

registerdSuites["testing2.atena.js"] = (function() {
    var assert = require('assert').ok;
    const chakram = require('chakram');
    const expect = chakram.expect;

    describe('hope2', function() {
        it('shodld be ok', function() {
            return expect(true).to.be.true;
        })
    });
});

mocha.addFile("testing.atena.js");
mocha.addFile("testing2.atena.js");
mocha.run(function(failures) {
    process.exitCode = failures ? 1 : 0;  // exit with non-zero status if there were failures
});
