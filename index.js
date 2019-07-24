"use strict";

var path = require("path"),
    fs = require("fs");

var chakram = require("chakram"),
    expect = chakram.expect,
    yaml = require("yaml");

var log = require("./utils/log");

// Prep the config object used throughout the project.
const CONFIG = {}
CONFIG.BASE_PATH = path.resolve(__dirname);
CONFIG.TESTS_PATH = path.resolve(CONFIG.BASE_PATH, "tests/");

// Define assertion types
const ASSERT_TYPES = {
    COOKIE: "COOKIE",
    DEFLATE: "DEFLATE",
    GZIP: "GZIP",
    HEADER: "HEADER",
    JSON: "JSON",
    RESPONSETIME: "RESPONSETIME",
    SCHEMA: "SCHEMA",
    STATUS: "STATUS"
}

/**
 * Generates the Chakram assertion types based on a provided type.
 * 
 * @param {String} type The assertion type.
 * @param {Object} reqRes Either the request, or the response.
 * @param  {...any} expectedValues The expected values that will be passed to the assertion.
 */
function getAssertion(type, reqRes, ...expectedValues) {
    if (!type)
        throw new Error("Assertion type missing");

    if (!reqRes)
        throw new Error("Assertion request/response missing");

    if (!expectedValues)
        throw new Error("Assertion expected values missing.");

    switch (type) {
        case ASSERT_TYPES.COOKIE:
            return expect(reqRes).to.have.cookie(...expectedValues);
        case ASSERT_TYPES.DEFLATE:
            return expect(reqRes).to.be.encoded.with.deflate;
        case ASSERT_TYPES.GZIP:
            return expect(reqRes).to.be.encoded.with.gzip;
        case ASSERT_TYPES.HEADER:
            return expect(reqRes).to.have.header(...expectedValues);
        case ASSERT_TYPES.JSON:
            return expect(reqRes).to.have.json(...expectedValues);
        case ASSERT_TYPES.RESPONSETIME:
            return expect(reqRes).to.have.responsetime(...expectedValues);
        case ASSERT_TYPES.SCHEMA:
            return expect(reqRes).to.have.schema(...expectedValues);
        case ASSERT_TYPES.STATUS:
            return expect(reqRes).to.have.status(...expectedValues);
        default:
            throw new Error(`Invalid assertion type: ${type}.`)
    }
}

function parseTestProperty() {
    // TODO: Not implemented.
}

function parseTestSpec() {
    // TODO: Not implemented.
}

function parseSingleTest() {
    // TODO: Not implemented.
}

/**
 * Creates a custom test object that can be extended with utility
 * methods for easy manipulation.
 */
function makeTestObject() {
    const testObject = {
        $info: null,
        $data: null
    };

    function setInfo(fileInfo) {
        this.$info = fileInfo;
    }

    function setData(fileData) {
        this.$data = fileData;
    }

    // TODO: Use either parseTestProperty(), parseTestSpec() and parseSingleTest() to
    // generate a custom test object based on the parsed element (property, spec or 
    // test definition).

    testObject.setInfo = setInfo;
    testObject.setData = setData;

    return testObject;
}

/**
 * Returns a custom "file" object containing the parsed file path
 * by Node as well as its contents.
 * 
 * @param {String} filePath The file path.
 * @param {String} contents The contents of the file.
 */
function makeParsedFile(filePath, parsedData) {
    const fileInfo = path.parse(filePath);

    const testObject = makeTestObject();
    testObject.setInfo(fileInfo);
    testObject.setData(parsedData);

    return testObject;
}

/**
 * Checks whether the passed string file name ends with .yaml or .yml.
 * This function is used for filtering purposes.
 * 
 * @param {string} fn The file name.
 */
function onlyYamlFiles(fn) {
    if (!fn) return false;
    return fn.endsWith('.yaml') || fn.endsWith('.yml');
}

/**
 * Parse all available YAML test files defined inside the CONFIG tests path.
 * Return a custom object containing the tests, properties, specs and
 * special methods available for easy data manipulation.
 */
function parseTestFiles() {
    const testFiles = fs.readdirSync(CONFIG.TESTS_PATH).filter(onlyYamlFiles);

    // Check whether there are any test files available.
    if (!testFiles || !testFiles.length)
        throw new Error("There are no test files available.");

    // Parse test files.
    return testFiles.map(fp => {
        let parsedFileContents;

        try {
            const yamlFileContents = fs.readFileSync(path.resolve(CONFIG.TESTS_PATH, fp), "utf-8");
            parsedFileContents = yaml.parse(yamlFileContents);
        } catch (e) {
            const { name, message } = e;
            log.error(`${name}: ${message} (${fp})`);
        }

        return makeParsedFile(fp, parsedFileContents)
    });
}

function testRunnerStart() {
    // TODO:
    // ----
    // - Parse all the test files and decide their types (property, spec or test) and dependencies.
    // - Generate dynamic Chakram assertions using getAssertion() based on each test definition.
}

/**
 * Run all the tests.
 */

testRunnerStart();
