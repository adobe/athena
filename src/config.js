const path = require("path"),
    { version, description } = require("./../package.json");

const CONF = {};

CONF.DEBUG = false;
CONF.VERSION = version;
CONF.DESCRIPTION = description;
CONF.BASEPATH = path.resolve(__dirname, "./..");
CONF.EXAMPLES_DIR = "./examples";
CONF.PLUGINS_DIR = "plugins";

module.exports = CONF;