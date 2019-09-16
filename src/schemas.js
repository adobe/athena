const Joi = require("@hapi/joi");


const schemaTest =
    Joi.object().keys({
        type: Joi.string().alphanum().equal("test"),
        name: Joi.string(),
        description: Joi.string(),
        engine: Joi.string().alphanum(),
        hooks: Joi.object().keys({
            skipIf: Joi.string(),
            setup: Joi.string(),
            beforeWhen: Joi.string(),
            beforeThen: Joi.string(),
            teardown: Joi.string()
        }),
        scenario: Joi.object().keys({
            given: Joi.string(),
            when: Joi.string(),
            then: Joi.string()
        })
    });

const schemaSuite =
    Joi.object().keys({
        type: Joi.string().alphanum().equal("suite"),
        name: Joi.string(),
        description: Joi.string(),
        engine: Joi.string().alphanum(),
        variables: Joi.object().keys()
    });

const schemas = {
    test: schemaTest,
    suite: schemaSuite
};

module.exports = schemas
