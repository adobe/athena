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
const path = require('path');
const fs = require('fs');

// External
const jsYaml = require('js-yaml');

// Project
const {makeLogger} = require('../utils');

const log = makeLogger();

/**
 * The TestFile class.
 * An intermediary TestFile class used while parsing all test files.
 */
class TestFileEntity {
  /**
     * Creates a new TestFile instance.
     * @param {string} filePath The test file's path.
     */
  constructor(filePath) {
    this._config = null;
    this._fileData = null;
    this._path = null;
    this._name = null;

    if (!filePath) {
      throw new Error(`When instantiating a new TestFile, you must provide a filePath.`);
    }

    try {
      this._config = jsYaml.safeLoad(fs.readFileSync(filePath, 'utf-8'));
      this._fileData = path.parse(filePath);
    } catch (error) {
      log.error(`Could not parse test file.\n${error}`);
    }

    this._path = filePath;
    this._name = this._fileData.base;
  }

    /**
     * Returns the name of this particular test.
     * @return {string} The name of the test file.
     */
    getName = () => {
      return this._name;
    };

    /**
     * Returns the file path of this particular test.
     * @return {string} The file path of the test file.
     */
    getPath = () => {
      return this._path;
    };

    /**
     * Returns the config of this particular test.
     * @return {object} The parsed configuration file of the test file.
     */
    getConfig = () => {
      return this._config;
    };

    /**
     * Returns the parsed file data of this particular test returned
     * from path.parse().
     * @return {object} The parsed data of this particular test file.
     */
    getFileData = () => {
      return this._fileData;
    };
}

module.exports = TestFileEntity;
