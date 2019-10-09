// todo: enum values should be uppercase

const CONTEXTS = {
    GLOBAL: "global"
};

const ENTITY_TYPES = {
    SUITE: "suite",
    TEST: "test",
    PLUGIN: "plugin",
    FIXTURE: "fixture",
    PATTERN: "pattern",
    PERFORMANCE_TEST: "performance_test",
    PERFORMANCE_RUN: "performance_run"
};

const TEST_TYPES = {
    FUNCTIONAL: 'functional',
    PERFORMANCE: 'performance'
};

const ALLOWED_ENTITY_TYPES = Object.keys(ENTITY_TYPES).map(e => e.toLowerCase()); // todo: change this when enums are uppercase

const PLUGIN_TYPES = {
    LIB: "lib",
    INLINE: "inline"
};

const COMMANDS = {
    MAKE_PLUGIN: "makePlugin",
    MAKE_TEST: "makeTest"
};

//
// Cleanup
//

const ENGINES = {
    CHAKRAM: "chakram",
    AUTOCANNON: "autocannon"
};

const TAXONOMIES = {
    FUNCTIONAL: "functional",
    PERFORMANCE: "performance"
};

exports.CONTEXTS = CONTEXTS;
exports.ENTITY_TYPES = ENTITY_TYPES;
exports.TEST_TYPES = TEST_TYPES;
exports.ALLOWED_ENTITY_TYPES = ALLOWED_ENTITY_TYPES;
exports.PLUGIN_TYPES = PLUGIN_TYPES;
exports.COMMANDS = COMMANDS;
exports.TAXONOMIES = TAXONOMIES;
exports.ENGINES = ENGINES;