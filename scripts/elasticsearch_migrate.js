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

const Storage = require("./../src/storage"),
    {makeLogger} = require("./../src/utils");

const log = makeLogger(),
    storage = new Storage();

(async function () {
    try {
        log.info(`Attempting to migrate ElasticSearch mappings...`);
        await storage.migrate();
    } catch (error) {
        log.error(`There was a problem when migrating the ElasticSearch mappings:\n${error}`);
    }

    log.success(`Successfully migrated ElasticSearch mappings!`);
})();