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