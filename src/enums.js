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
  PERFORMANCE_TEST: "perfTest",
  PERFORMANCE_RUN: "perfRun"
};

const TEST_TYPES = {
  FUNCTIONAL: 'functional',
  PERFORMANCE: 'performance'
};

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
exports.PLUGIN_TYPES = PLUGIN_TYPES;
exports.COMMANDS = COMMANDS;
exports.TAXONOMIES = TAXONOMIES;
exports.ENGINES = ENGINES;