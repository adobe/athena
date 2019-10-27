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

// Node
const fs = require('fs');
const path = require('path');

// External
const Mocha = require('mocha');
const {find} = require('lodash');
const toSource = require('tosource');
const jsBeautify = require('js-beautify');

// Project
const Engine = require('./engine');
const {TAXONOMIES, ENGINES} = require('./../enums');
const {isSuite, isFunctionalTest, parseAstExpressions} = require('./../utils');

/**
 * The main Chakram engine class.
 */
class ChakramEngine extends Engine {
  /**
   * Creates a new ChakramEngine instance.
   *
   * @param {object} settings The settings object.
   * @param {EntityManager} entityManager The EntityManager instance.
   * @param {PluginManager} pluginManager The PluginManager instance.
   */
  constructor(
      settings,
      entityManager,
      pluginManager
  ) {
    super(
        settings,
        entityManager,
        pluginManager,
        TAXONOMIES.FUNCTIONAL,
        ENGINES.CHAKRAM,
        new Mocha()
    );

    this.nativeMethods = {
      findPath: null,
      readFileSync: null,
    };

    this._overrideDefaultMethods();
    this._parseFunctionalEntities();

    // parse and register entities
    // this.entities = this.entityManager
    //     .getAllBy('engine', this.name) // todo: naive query as plugins/fixtures may be included as well if the engine property is mistakenly provided.
    //     .map(this._deepParseEntities)
    //     .filter((e) => e !== undefined) // todo: fix this
    //     .map(this._registerEntities); // todo: map only once dummy
  };

  // public


  run = () => {
    const {grep, bail} = this.settings;

    if (grep) {
      this.log.debug(`Grep pattern enabled. Running only tests ` +
        `that match the "${grep}" pattern.`);
      this.engine.grep(grep);
    }

    if (bail) {
      this.log.debug(`Bailing mode enabled. Will fail fast ` +
        `after the first test failure.`);
      this.engine.bail(bail);
    }

    this.engine.run((fail) => {
      process.exitCode = fail ? 1 : 0;
    });

    this._destruct();
  };

  // private

  _parseFunctionalEntities = () => {
    const functionalSuites = this.entityManager.getAllFunctionalSuites();
  };

  _registerEntities = (entity) => {
    entity.toString = entity.getContext;
    entity.fileName = `${entity.config.name}.atena.js`; // todo: use a setter.
    this.engine.addFile(entity.fileName);

    return entity;
  };

  _deepParseEntities = (entity) => {
    if (isFunctionalTest(entity)) {
      entity.setTaxonomy(this.taxonomy);
      entity.setContext(this._generateTestContext(entity));

      return entity;
    }

    if (isSuite(entity)) {
      entity.setTaxonomy(this.taxonomy);

      if (entity.tests.length) {
        entity.tests = entity.tests.map(this._deepParseEntities);
        const testsCtx = entity.tests.map((t) => t.getContext());
        const suiteCtx = this._generateSuiteContext(entity, testsCtx.join('\n'));
        entity.setContext(suiteCtx);
      }

      return entity;
    }
  };

  _generateTestContext = (test) => {
    const {name, version, description} = test.config;
    return `it("${name} ${version ? '[v' + version +
      ']' : ''}${description ? ' - ' + description : ''}", function() {
                    ${this.pluginManager.maybeInjectFixtures(test)}
                    ${this._generateAssertions(test)}
                });`;
  };

  _generateSuiteContext = (suite, testCases) => {
    const {name, version, description} = suite.config;
    return `describe("${name} ${version ? '[v' +
      version + ']' : ''}${description ? ' - ' + description : ''}", function() {
                    ${this.pluginManager.maybeInjectFixtures(suite)}
                    ${testCases}
                });`;
  };

  _generateAssertions = (test) => {
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
  };

  /**
   * Overrides the default Node.js methods.
   * @private
   */
  _overrideDefaultMethods = () => {
    // preserve original methods
    this.nativeMethods.readFileSync = fs.readFileSync;
    this.nativeMethods.findPath = module.constructor._findPath;

    // override default methods
    module.constructor._findPath = findPathOverride.bind(this);
    fs.readFileSync = readFileSyncOverride.bind(this);

    /**
     * Override method for the findPath native Node.js method.
     * @param args {string} The arguments the method is expected to receive.
     * @return {string} The file name.
     */
    function findPathOverride(...args) {
      const fileName = path.basename(args[0]);

      if (fileName.indexOf('.atena.') !== -1) {
        return fileName;
      }

      return this.nativeMethods.findPath(...args);
    }

    /**
     * Override method for the readFileSync native Node.js method.
     * @param args {string} The arguments the method is expected to receive.
     * @return {string} The contents of the specified file.
     */
    function readFileSyncOverride(...args) {
      const fileName = path.basename(args[0]);

      if (fileName.indexOf('.atena.') === -1) {
        return this.nativeMethods.readFileSync(...args);
      }

      const entity = find(this.entities, {fileName});

      if (!entity) {
        throw new Error(`Could not find registered entity (test/suite): "${fileName}".`);
      }

      return `
                const assert = require('assert').ok,
                    chakram = require('chakram'),
                    expect = chakram.expect;
                    
                const $entity = ${toSource(entity)};
                const $context = this; // global context
                                    
                ${this.pluginManager.maybeInjectFixtures(null, true)}
                ${entity.getContext()}`;
    }
  };

  /**
   * Cleans up once the tests have finished running.
   * @private
   */
  _destruct = () => {
    const {findPath, readFileSync} = this.nativeMethods;
    module.constructor._findPath = findPath;
    fs.readFileSync = readFileSync;
  };
}

module.exports = ChakramEngine;
