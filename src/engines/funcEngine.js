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

// Native
const fs = require('fs');
const path = require('path');
const {find, uniq} = require('lodash');

// External
const Mocha = require('mocha');
const toSource = require('tosource');
const jsBeautify = require('js-beautify');
const L = require('list/methods');

// Project specific
const Engine = require('./engine');
const {TAXONOMIES, ENGINES, ENTITY_TYPES} = require('./../enums');
const {makeLogger, isFunctionalTest, parseAstExpressions} = require('./../utils');

const log = makeLogger();

module.exports = class FunctionalEngine extends Engine {
  constructor([settings, pluginManager, entityManager]) {
    super(
      settings,
      pluginManager,
      entityManager,
      TAXONOMIES.FUNCTIONAL,
      ENGINES.CHAKRAM,
      new Mocha({
        reporter: (() => {
          let reporter = settings.reporter;

          if (settings.reporter === 'athena-json-stream') {
            return `${path.resolve(__dirname)}/funcJSONStreamReporter.js`;
          }

          if (settings.reporter === 'junit') {
            log.info(`Running tests using the JUnit reporter!`);
            return 'mocha-junit-reporter';
          }

          return reporter;
        })()
      })
    );

    this.entityManager = entityManager;
    this._nativeMethods = { readFileSync: null, findPath: null }
    this._overrideDefaultMethods();
    this.entities = this._registerEntities();
  }

  // Public
  run = _run

  // Private
  _registerEntities = _registerEntities
  _overrideDefaultMethods = _overrideDefaultMethods
  _destruct = __destruct
}

const PRE = {
  IT: 'it',
  DESCRIBE: 'describe'
};

const _makeCtxFuncBody = (pre) => {
  return `#pre
    ${pre}("[#name]: #description", #async function(#done) {
      #hooks
      #body
    }#post);`
}

// Context function templates.
const TEST_CTX_TPL = _makeCtxFuncBody(PRE.IT);
const SUITE_CTX_TPL = _makeCtxFuncBody(PRE.DESCRIBE);

const _generateEntityHooks = (entity) => {
  // Check whether this entity has any hooks defined.
  if (!entity.config.hooks) {
    log.debug(`No hooks found for the "${entity.name}" entity!`);

    return '';
  }

  const hookTypes = [
    "setup",
    "before",
    "after",
    "beforeEach",
    "afterEach"
  ];

  const hooksCode = hookTypes.map(h => {
    const hook = entity.config.hooks[h];

    if (!hook) {
      return '';
    }

    return h === "setup" ? hook : `${h}(function() { ${hook} });`;
  });

  return hooksCode.join('\n');
}

const _getFixturesCode = (fixtures) => {
  const fixturesCode = fixtures.map((f) => {
    if (!f.config || !f.config.config) {
      return '';
    }

    const conf = f.config.config;
    const fixturePath = f.fileData.dir;

    return `const ${f.config.name} = require("${fixturePath}/${conf.source}");`
  })

  return fixturesCode.join('\n');
}

/**
 * Registers all functional entities (suites as well as tests).
 */
function _registerEntities() {
  log.debug('Registering functional entities...');

  function _deepParseEntities(entity) {
    if (isFunctionalTest(entity)) {
      const {name, version, description, config} = entity.config;
      const using = config && config.using || {
        asyncAwait: true
      };

      const timeout = config && config.timeout || false;

      // Check whether we need to limit the timeout for this test.
      const postCode = ``;

      // Set the appropriate functional test entity details.
      let funcTestEntity = TEST_CTX_TPL.replace('#version', `[${version || '1.0.0'}]`)
      funcTestEntity = funcTestEntity.replace('#name', `${name}`)
      funcTestEntity = funcTestEntity.replace('#description', `${description}`)
      funcTestEntity = funcTestEntity.replace('#body', `${jsBeautify(entity.config.scenario, { no_preserve_newlines: true })}`)

      // TODO: The line below was used for complex body structures.
      // funcTestEntity = funcTestEntity.replace('#body', `${this._generateAssertions(entity)}`)

      // No pre code for single tests.
      funcTestEntity = funcTestEntity.replace('#pre', "");

      // Hooks and post
      funcTestEntity = funcTestEntity.replace('#hooks', timeout ? `this.timeout(${timeout})` : "");
      funcTestEntity = funcTestEntity.replace("#post", postCode)

      // Maybe enable async/await and the done callback
      funcTestEntity = funcTestEntity.replace('#async', using.asyncAwait ? "async" : "");
      funcTestEntity = funcTestEntity.replace('#done', using.done ? "done" : "");

      entity.setContext(funcTestEntity);

      return entity;
    }

    // Assuming that the entity is a functional suite at this point.
    if (entity.hasTestRefs()) {
      const fixtures = this.entityManager.getAllFixtures();

      // Prep the pre code.
      const preCode = `
        ${_getFixturesCode(fixtures)}

        let suite;
      `;

      // Prep the hooks code.
      const conf = entity.config && entity.config.config || {}
      // TODO: Setup suite-level timeout here !!!
      const hooksCode = `
        suite = this;
        ${conf.retries ? `this.retries(${entity.config.config.retries})` : ""}
        ${_generateEntityHooks(entity)}
      `;

      // Define the generic suite context details.
      let functionalSuiteContext = SUITE_CTX_TPL.replace('#name', entity.config.name);
      functionalSuiteContext = functionalSuiteContext.replace('#version', `[${entity.config.version || '1.0.0'}]`);
      functionalSuiteContext = functionalSuiteContext.replace('#description', entity.config.description);
      functionalSuiteContext = functionalSuiteContext.replace('#hooks', hooksCode);
      functionalSuiteContext = functionalSuiteContext.replace('#pre', preCode);

      // Suites shouldn't support async/await and the done callback.
      functionalSuiteContext = functionalSuiteContext.replace('#async', "");
      functionalSuiteContext = functionalSuiteContext.replace('#done', "");
      functionalSuiteContext = functionalSuiteContext.replace("#post", "");

      // Parse all tests referenced by this suite.
      entity._tests = entity
        ._tests
        .map(_deepParseEntities.bind(this));

      // Generate contexts for the tests defined by this suite.
      const testsContext = entity
        ._tests
        .map(t => t.getContext());

      // Set the appropriate suite context now that the referenced tests were parsed.
      functionalSuiteContext = functionalSuiteContext.replace('#body', testsContext.join('\n'))

      entity.setContext(functionalSuiteContext)
    }

    return entity;
  }

  const allFunctionalSuites = L.toArray(this.entityManager.getAllFunctionalSuites());

  return allFunctionalSuites
    .map(_deepParseEntities.bind(this))
    .map(entity => {
      entity.toString = entity.getContext;
      entity.fileName = `${entity.name}.athena.js`;
      this
        .engine
        .addFile(entity.fileName);

      return entity;
    })
}

function _generateAssertions2(test) {
  debugger;
}

function _generateAssertions(test) {
  if (!test.config || !test.config.scenario) {
    return '';
  }

  const stagesOrder = [
    {
      'stage': 'hooks',
      'substage': ['beforeGiven', 'before'],
    }, // alias 'before'
    {
      'stage': 'scenario',
      'substage': ['given'],
    }, // main stage
    {
      'stage': 'hooks',
      'substage': ['beforeWhen'],
    },
    {
      'stage': 'scenario',
      'substage': ['when'],
    }, // main stage
    {
      'stage': 'hooks',
      'substage': ['beforeThen'],
    },
    {
      'stage': 'scenario',
      'substage': ['then'],
    }, // main stage
    {
      'stage': 'hooks',
      'substage': ['afterThen', 'after'],
    }, // todo: alias 'after'
  ];

  // todo: handle stage rejections properly
  const stages = stagesOrder
      .filter((s) =>
        test.config[s.stage] &&
      Object.keys(test.config[s.stage]).some((key) => s.substage.includes(key)))
      .map(function _makeContextBoundStage(s) {
        const substage = Object.keys(test.config[s.stage])
            .filter((key) => s.substage.includes(key))[0];
        let stageContent = test.config[s.stage][substage];
        const promiseTpl = `new Promise(function(resolve) {
                                      /* Stage: {substage} */
                                      {stageContent}
                                  }.bind($context))`;

        if (substage === 'then') {
          const parsedStageContent = parseAstExpressions(stageContent)
              .map((e) => e.replace(';', ''))
              .join(',');

          stageContent = `resolve(Promise.all([${parsedStageContent}]))`;
        } else {
          stageContent = `${stageContent} \n resolve();`;
        }

        return promiseTpl.format({
          substage,
          stageContent,
        });
      })
      .join(',');

  return jsBeautify(`return Promise.all([${stages}])`);
}

function _overrideDefaultMethods() {
  log.debug('Overriding default methods...');

  // Preserve original methods.
  this._nativeMethods.readFileSync = fs.readFileSync;
  this._nativeMethods.findPath = module.constructor._findPath;

  // Override default methods.
  fs.readFileSync = __readFileSyncOverride.bind(this);
  module.constructor._findPath = __findPathOverride.bind(this);

  /**
   * Overrides the native readFileSync native method.
   * @param  {...any} args The function arguments.
   */
  function __readFileSyncOverride(...args) {
    const fileName = path.basename(args[0])

    if (fileName.indexOf('.athena.js') === -1) {
      return this
        ._nativeMethods
        .readFileSync(...args);
    }

    return _makePrimaryContext(find(this.entities, {fileName}));
  }

  /**
   * Overrides the native findPath native method.
   * @param  {...any} args The arguments.
   */
  function __findPathOverride(...args) {
    const fileName = path.basename(args[0]);

    if (fileName.indexOf('.athena.') !== -1) {
      return fileName;
    }

    return this
      ._nativeMethods
      .findPath(...args);
  }

  /**
   * Creates the main context for a given functional suite.
   * @param {Object} entity The Athena functional entity.
   */
  function _makePrimaryContext(entity) {
    let entityRequires = []

    if (entity.config && entity.config.type && entity.config.type === "suite") {
      if (entity._tests && entity._tests.length) {
        entity._tests.forEach(e => {
          if (e.config && e.config.require && e.config.require.length) {
            entityRequires.push(...e.config.require)
          }
        })
      }
    }

    entityRequires = uniq(entityRequires)

    const requires = [
      "assert->ok",
      "chakram",
      "expect:chakram->expect",
      ...entityRequires
    ];

    const inits = {
      "$entity": toSource(entity),
      "$context": "this"
    }

    // Generate the final require string.
    const reqString = requires.map(r => {
      const _r = r.split('->')
      const _rMain = _r
        .shift()
        .split(':')
      const _rMainName = _rMain.shift()
      const _rMainReq = _rMain[0] || _rMainName
      let reqStr = `const ${_rMainName} = require('${_rMainReq}')`

      if (_r.length) 
        reqStr = `${reqStr}.${_r.join('.')}`

      return `${reqStr};`
    }).join('\n');

    // Generate the initializers string.
    const initString = Object
      .keys(inits)
      .map(initKey => `const ${initKey} = ${inits[initKey]};`)
      .join('\n');

    return jsBeautify(`${reqString} ${initString} ${entity.getContext()}`);
  }
}

function _run() {
  this
    .engine
    .run((fail) => {
      process.exitCode = fail
        ? 1
        : 0;
    });

  this._destruct();
}

function __destruct() {
  const {findPath, readFileSync} = this._nativeMethods;
  module.constructor._findPath = findPath
  false.readFileSync = readFileSync
}