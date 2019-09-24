// node
const fs = require("fs"),
    path = require("path");

// external
const jsYaml = require("js-yaml"),
    {isString} = require("lodash");

// project
const {
    makeContainer,
    isTest,
    isSuite,
    isFixture,
    makeLogger
} = require("../utils");

const SuiteEntity = require("../entities/suiteEntity"),
    {ChakramTest} = require("../entities/testEntity"),
    FixtureEntity = require("../entities/fixtureEntity");

class EntityManager {
    constructor(settings) {
        this.settings = settings;
        this.log = makeLogger();
        this.entities = makeContainer();
        this._parseEntities();
    }

    // public

    addEntity = (entity) => {
        this.entities.add(entity);
    };

    getSuiteBy = (attribute, value) => {
        return this.entities.entries.filter(e => isSuite(e) && e.config[attribute] === value)[0];
    };

    getAllBy = (attribute, value) => {
        return this.entities.entries.filter(function (e) {
            if (e.config && e.config[attribute] && e.config[attribute] === value) {
                return e;
            }
        });
    };

    getAllFixtures = () => {
        return this.entities.entries.filter((e) => isFixture(e));
    };

    // private

    _parseEntities = () => {
        const {testsDirPath} = this.settings;
        const entitiesList = fs.readdirSync(testsDirPath);
        const entities = [];

        // parse all entities
        for (let entityFileName of entitiesList) {
            const entity = {};
            entity.name = entityFileName;
            entity.path = path.resolve(testsDirPath, entity.name);

            // skip directories
            if (fs.lstatSync(entity.path).isDirectory()) {
                continue;
            }

            // parse config
            entity.config = jsYaml.safeLoad(
                fs.readFileSync(entity.path),
                "utf-8"
            );

            entities.push(entity);
            const {name, path: entityPath, config} = entity;

            // parse suites
            if (isSuite(entity)) {
                const suite = new SuiteEntity(
                    name,
                    entityPath,
                    config
                );

                try {
                    suite.validate();
                    this.entities.add(suite);
                } catch (error) {
                    this.log.error(error);
                }

            }

            // parse fixtures
            if (isFixture(entity)) {
                const fixture = new FixtureEntity(
                    name,
                    entityPath,
                    config
                );

                try {
                    fixture.validate();
                    this.entities.add(fixture);
                } catch (error) {
                    this.log.error(error)
                }
            }
        }

        // parse tests
        for (let entity of entities) {
            if (!isTest(entity)) {
                continue;
            }

            let {suiteRef} = entity.config;
            const {name, path, config} = entity;
            const testEntity = new ChakramTest(name, path, config);

            // todo: validate test schema
            try {
                // testEntity.validate();
            } catch (error) {
                this.log.error(error);
            }

            // test as indie entity
            if (!suiteRef) {
                this.addEntity(testEntity);
                continue;
            }

            if (isString(suiteRef)) suiteRef = [suiteRef];

            suiteRef.forEach(suiteName => {
                let suite = this.getSuiteBy("name", suiteName);

                if (!suite) {
                    this.log.warn(`[Entity Parsing] Could not find the suite "${suiteName}" required by "${testEntity.config.name}".`);
                    return;
                }

                suite.addTest(testEntity)
            });
        }
    };
}

module.exports = EntityManager;