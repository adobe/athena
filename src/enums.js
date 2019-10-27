/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

// todo: enum values should be uppercase

const CONTEXTS = {
  GLOBAL: 'global',
};

const ENTITY_TYPES = {
  SUITE: 'suite',
  TEST: 'test',
  PLUGIN: 'plugin',
  FIXTURE: 'fixture',
  PERFORMANCE_SUITE: 'perfSuite',
  PERFORMANCE_RUN: 'perfRun',
  PERFORMANCE_PATTERN: 'perfPattern',
};

const TEST_TYPES = {
  FUNCTIONAL: 'functional',
  PERFORMANCE: 'performance',
};

const ALLOWED_ENTITY_TYPES = Object.keys(ENTITY_TYPES).map((e) => e.toLowerCase()); // todo: change this when enums are uppercase

const PLUGIN_TYPES = {
  LIB: 'lib',
  INLINE: 'inline',
};

const COMMANDS = {
  MAKE_PLUGIN: 'makePlugin',
  MAKE_TEST: 'makeTest',
};

//
// Cleanup
//

const ENGINES = {
  CHAKRAM: 'chakram',
  AUTOCANNON: 'autocannon',
};

const TAXONOMIES = {
  FUNCTIONAL: 'functional',
  PERFORMANCE: 'performance',
};

exports.CONTEXTS = CONTEXTS;
exports.ENTITY_TYPES = ENTITY_TYPES;
exports.TEST_TYPES = TEST_TYPES;
exports.ALLOWED_ENTITY_TYPES = ALLOWED_ENTITY_TYPES;
exports.PLUGIN_TYPES = PLUGIN_TYPES;
exports.COMMANDS = COMMANDS;
exports.TAXONOMIES = TAXONOMIES;
exports.ENGINES = ENGINES;
