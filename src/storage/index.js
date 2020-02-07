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

const storageClients = require('./clients');
const {makeLogger} = require('./../utils');
const log = makeLogger();

class Storage {
  constructor() {
    this.client = storageClients.elastic
  }

  async storeAgent(agent) {
    log.info(`Attempting to store new agent in ElasticSearch...`);
    await this.store(
        'ac_agent',
        agent
    );
  }

  async deleteAgentById(id) {
    log.info(`Attempting to delete an agent (id: ${id}) from ElasticSearch...`);
    try {
      await this.client.deleteByQuery({
        index: 'ac_agent',
        body: {
          query: {
            match: {
              id: id,
            },
          },
        },
      });
      log.success(`Successfully deleted an agent (id: ${id}) from ElasticSearch...`);
    } catch (error) {
      log.warn(`Failed to delete an agent (id: ${id} by ID\n${error}`);
    }
  }

  async bulk(actions) {
    try {
      await this.client.bulk({
        body: actions,
      });

      log.info(`Successfully stored bulk data in ElasticSearch!`);
    } catch (error) {
      log.warn(`Failed to handle bulk actions:\n${error}`);
    }
  }

  async store(index, body) {
    try {
      await this.client.index({
        index,
        body,
      });
      log.success(`Successfully stored new index [${index}] in ElasticSearch!`);
    } catch (error) {
      log.warn(`Failed to store document of type "${type}": \n${error}`);
    }
  }
}

module.exports = Storage;
