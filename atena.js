
var pathModule = require('path');
var fs = require('fs');
var util = require('util');
var jsYaml = require('js-yaml');

const originalReadFileSync = fs.readFileSync;
const originalFindPath = module.constructor._findPath;

module.constructor._findPath = function(...args) {
    let fileName = pathModule.basename(args[0]);
    if(fileName.indexOf(".atena.") != -1) {
        return fileName;
    }

    return originalFindPath(...args);
};


fs.readFileSync = function(...args) {
    let fileName = pathModule.basename(args[0]);
    if(fileName.indexOf(".atena.") != -1) {
        let stringMockFile = registerdSuites[fileName].suite.toString();
        stringMockFile = stringMockFile.replace(/function[\s]*\(.*\)[\s]*\{/, "").trim().replace(/.$/,'');
        let suiteInfo = util.format("let suiteInfoFile = \"%s\";\n" +
            "let testInfoFiles = %s;\n", registerdSuites[fileName].suiteInfoFile, JSON.stringify(registerdSuites[fileName].testInfoFiles));

        return suiteInfo + stringMockFile;
    }
    return originalReadFileSync(...args);
};


const registerdSuites = {};
const Mocha = require('mocha');
const mocha = new Mocha();


//must be encapsulated yet look like real js files
registerdSuites["testing.atena.js"] = {};
registerdSuites["testing.atena.js"].suiteInfoFile = "./examples/spec.yaml";
registerdSuites["testing.atena.js"].testInfoFiles = [
    "./examples/test.yaml"
];
registerdSuites["testing.atena.js"].suite  = (function() {

    const assert = require('assert').ok,
        chakram = require('chakram'),
        expect = chakram.expect,
        jsYaml = require('js-yaml'),
        path = require('path'),
        fs = require('fs');

    let spec = jsYaml.safeLoad(fs.readFileSync(path.resolve(process.cwd(), suiteInfoFile)));
    let tests = [];
    testInfoFiles.forEach((fl) => {
        tests.push(jsYaml.safeLoad(fs.readFileSync(path.resolve(process.cwd(), fl))))
    });

    chakram.addProperty("true", function(object){
        assert(object, true);
    });

    describe(spec.title, function() {
        tests.forEach((testInfo) => {
            it(testInfo.description, function() {
                return expect(true).to.be.true;
            })
        })
    });
});

registerdSuites["testing2.atena.js"] = {};
registerdSuites["testing2.atena.js"].suiteInfoFile = "./examples/spec.yaml";
registerdSuites["testing2.atena.js"].testInfoFiles = [
    "./examples/test.yaml"
];
registerdSuites["testing2.atena.js"].suite = (function() {
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
