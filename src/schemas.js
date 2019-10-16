const Joi = require("@hapi/joi");

const schemaTest =
    Joi.object().keys({
        type: Joi.string().alphanum().equal("test"),
        name: Joi.string(),
        description: Joi.string(),
        engine: Joi.string().alphanum(),
        hooks: Joi.object().keys({
            skip: Joi.string(),
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

const schemaFixture =
    Joi.object().keys({
        name: Joi.string(),
        type: Joi.string(),
        config: Joi.object().keys({
            type: Joi.string(),
            source: Joi.string()
        })
    });

const schemaACAgent =
    Joi.object({
        id: Joi.string(),
        name: Joi.string(),
        status: Joi.string()
    });

const schemaACReport =
    Joi.object({
        id: Joi.string(),
        job_id: Joi.string(),
        agent_id: Joi.string(),
        report: Joi.string()
    });

const schemaACAgentStatus =
    Joi.object({
        agent_id: Joi.string(),
        status: Joi.string()
    });

const schemaACJob =
    Joi.object({
        id: Joi.string(),
        data: Joi.string(),
        status: Joi.string()
    });

const schemas = {
    test: schemaTest,
    suite: schemaSuite,
    fixture: schemaFixture,
    acAgent: schemaACAgent,
    acAgentStatus: schemaACAgentStatus,
    acJob: schemaACJob,
    acReport: schemaACReport
};

module.exports = schemas;
