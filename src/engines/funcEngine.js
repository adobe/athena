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
const {
  find,
  uniq
} = require('lodash');

// External
const Mocha = require('mocha');
const toSource = require('tosource');
const jsBeautify = require('js-beautify');
const L = require('list/methods');

// Project specific
const Engine = require('./engine');
const {
  TAXONOMIES,
  ENGINES,
  ENTITY_TYPES
} = require('./../enums');
const {
  makeLogger,
  isFunctionalTest,
  parseAstExpressions,
  isFunctionalSuite
} = require('./../utils');
const bodyParser = require('body-parser');

const log = makeLogger();

const EMPTY_STRING = "";

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
    this._nativeMethods = {
      readFileSync: null,
      findPath: null
    }
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
  let isFirstSuite = true;

  function _deepParseEntities(entity) {
    if (isFunctionalTest(entity)) {
      const {
        name,
        version,
        description,
        config
      } = entity.config;

      const using = config && config.using || {
        asyncAwait: true
      };

      const timeout = config && config.timeout || false;

      // Check whether we need to limit the timeout for this test.
      const postCode = ``;

      entity.setContext(TEST_CTX_TPL.allReplace({
        '#version': `[${version || '1.0.0'}]`,
        '#name': name,
        '#description': description,
        '#body': `${jsBeautify(entity.config.scenario, { no_preserve_newlines: true })}`,
        '#pre': EMPTY_STRING,
        '#hooks': timeout ? `this.timeout(${timeout})` : "",
        '#post': postCode,
        '#async': using.asyncAwait ? "async" : "",
        '#done': using.done ? "done" : ""
      }));

      return entity;
    }

    let body = [];
    let suiteRef = isFirstSuite ? 'let suite = {};' : '';

    if (isFirstSuite) {
      suiteRef = `${suiteRef}
      ${_getFixturesCode(this.entityManager.getAllFixtures())}`;
      
      isFirstSuite = false;
    }

    // Generate the pre code.
    let preCode = suiteRef;

    // Generate the hooks code.
    const conf = entity.config && entity.config.config || {}
    const hooksCode = `
      suite = this;
      ${conf.timeout ? `this.timeout(${entity.config.config.timeout})` : ""}
      ${conf.retries ? `this.retries(${entity.config.config.retries})` : ""}
      ${_generateEntityHooks(entity)}`;

    // Process tests and suites nested in this suite.
    ['_tests', '_suites'].forEach(function _parseChildren(p) {
      if (!entity[p] && !entity[p].length) {
        return;
      }

      // Process entities.
      entity[p] = entity[p]
        .map(_deepParseEntities.bind(this))
        .map(e => body.push(e.getContext()));
    });

    // Generate the suite's context and set it.
    entity.setContext(SUITE_CTX_TPL.allReplace({
      "#name": entity.config.name,
      "#version": `[${entity.config.version || '1.0.0'}]`,
      "#description": entity.config.description,
      "#hooks": hooksCode,
      "#pre": preCode,
      "#body": body.join('\n'),
      "#async": EMPTY_STRING,
      "#done": EMPTY_STRING,
      "#post": EMPTY_STRING
    }));

    return entity;
  }

  let allFunctionalSuites = L.toArray(this.entityManager.getAllFunctionalSuites());
  allFunctionalSuites = allFunctionalSuites
    .map(_deepParseEntities.bind(this))
    .map(entity => {
      entity.toString = entity.getContext;
      entity.fileName = `${entity.name}.athena.js`;
      this.engine.addFile(entity.fileName);
      fs.writeFileSync('debug.js', jsBeautify(entity.getContext(), { no_preserve_newlines: true }));

      return entity;
    })

  return allFunctionalSuites;
}

function _generateAssertions(test) {
  if (!test.config || !test.config.scenario) {
    return '';
  }

  const stagesOrder = [{
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

    const primaryCtx = _makePrimaryContext(find(this.entities, { fileName }));
    this.settings.debug && fs.writeFileSync('debug.js', primaryCtx);

    return primaryCtx;
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

  _getEntitiesRequires = () => {
    const requires = [];

    this.entityManager.getFunctionalTestFiles().forEach(_processRequires);

    function _processRequires(e) {
      if (e._config && e._config.require && e._config.require.length) {
        requires.push(...e._config.require)
      }

      ["_tests", "_suites"].forEach(i => {
        if (e[i] && e[i].length) {
          e[i].forEach(_processRequires)
        }
      });
    }

    return uniq(requires);
  }

  /**
   * Creates the main context for a given functional suite.
   * @param {Object} entity The Athena functional entity.
   */
  _makePrimaryContext = (entity) => {
    const requires = [
      "assert->ok",
      "chakram",
      "expect:chakram->expect",
      ..._getEntitiesRequires()
    ];

    // Generate the final require string.
    const reqString = requires.map(r => {
      const _r = r.split('->')
      const _rMain = _r
        .shift()
        .split(':')
      const _rMainName = _rMain.shift()
      const _rMainReq = _rMain[0] || _rMainName
      let reqStr = `const ${_rMainName} = require('${_rMainReq}')`

      if (_r.length) {
        reqStr = `${reqStr}.${_r.join('.')}`
      }

      return `${reqStr};`
    }).join('\n');

    return jsBeautify(`${reqString} ${entity.getContext()}`);
  }
}

function _run() {
  this
    .engine
    .run((fail) => {
      process.exitCode = fail ? 1 : 0;
    });

  this._destruct();
}

function __destruct() {
  const {
    findPath,
    readFileSync
  } = this._nativeMethods;
  module.constructor._findPath = findPath
  false.readFileSync = readFileSync
}