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
