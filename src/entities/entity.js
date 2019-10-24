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

// node
const path = require('path');

// project
const {validateSchema, makeLogger} = require('./../utils');

class Entity {
  constructor(name, filePath, config) {
    this.name = name;
    this.config = config;
    this.fileData = null;
    this._type = null;
    this.context = null;
    this.taxonomy = null;
    this.log = makeLogger();

    if (filePath) {
      this.fileData = path.parse(filePath);
    }
  }

    validate = () => {
      try {
        validateSchema(this);
      } catch (error) {
        this.log.error(error);
      }
    };

    setContext = (context) => {
      this.context = context;
    };

    getContext = () => {
      return this.context;
    };

    setTaxonomy = (taxonomy) => {
      this.taxonomy = taxonomy;
    };

    getType = () => {
      return this._type;
    };

    setType = (type) => {
      // if (ALLOWED_ENTITY_TYPES.indexOf(type) === -1) {
      //     this.log.error(`Could not set type ${type} for entity "${this.name} as it's invald."`);
      // }

      this._type = type;
    };

    getFileName = () => {
      return this.fileData && this.fileData.base;
    };

    getConfig = () => {
      return this.config;
    }
}

module.exports = Entity;
