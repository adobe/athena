const {Client} = require('@elastic/elasticsearch'),
    {makeLogger} = require("./../utils");

const log = makeLogger();

class Storage {
    constructor(url) {
        this.client = new Client({
            node: 'http://localhost:9200'
        });
    }

    async migrate() {
        await this.client.indices.create({
            index: "autocannon"
        });

        // Agent
        await this.client.indices.putMapping({
            index: "autocannon",
            type: "agent",
            body: {
                id: {
                    type: "text"
                },
                name: {
                    type: "text"
                },
                status: {
                    type: "text"
                }
            }
        });

        // Performance Report
        await this.client.indices.putMapping({
            index: "autocannon",
            type: "report",
            body: {
                id: {
                    type: "text",
                },
                is_aggregated: {
                    type: "boolean"
                },
                created_at: {
                    type: "date_nanos"
                },
                updated_at: {
                    type: "date_nanos"
                },
                results: {
                    properties: {
                        title: {
                            type: "string"
                        },
                        url: {
                            type: "string"
                        },
                        socketPath: {
                            type: "string"
                        },
                        requests: {
                            properties: {
                                average: {
                                    type: "float"
                                },
                                mean: {
                                    type: "float"
                                },
                                stddev: {
                                    type: "float"
                                },
                                min: {
                                    type: "float"
                                },
                                max: {
                                    type: "float"
                                },
                                total: {
                                    type: "float"
                                },
                                p0_001: {
                                    type: "float"
                                },
                                p0_01: {
                                    type: "float"
                                },
                                p0_1: {
                                    type: "float"
                                },
                                p1: {
                                    type: "float"
                                },
                                p2_5: {
                                    type: "float"
                                },
                                p10: {
                                    type: "float"
                                },
                                p25: {
                                    type: "float"
                                },
                                p50: {
                                    type: "float"
                                },
                                p75: {
                                    type: "float"
                                },
                                p90: {
                                    type: "float"
                                },
                                p97_5: {
                                    type: "float"
                                },
                                p99: {
                                    type: "float"
                                },
                                p99_9: {
                                    type: "float"
                                },
                                p99_99: {
                                    type: "float"
                                },
                                p99_999: {
                                    type: "float"
                                },
                                sent: {
                                    type: "float"
                                }
                            }
                        },
                        errors: {
                            type: "integer"
                        },
                        timeouts: {
                            type: "integer"
                        },
                        duration: {
                            type: "float"
                        },
                        start: {
                            type: "date"
                        },
                        finish: {
                            type: "date"
                        },
                        connections: {
                            type: "integer"
                        },
                        pipelining: {
                            type: "integer"
                        },
                        non2xx: {
                            type: "integer"
                        },
                        "1xx": {
                            type: "integer"
                        },
                        "2xx": {
                            type: "integer"
                        },
                        "3xx": {
                            type: "integer"
                        },
                        "4xx": {
                            type: "integer"
                        },
                        "5xx": {
                            type: "integer"
                        }
                    }
                }
            }
        })
    }

    async storeAgent(agent) {
        log.info(`Attempting to store new agent inside ElasticSearch...`);
        await this.store(
            "autocannon",
            "agent",
            agent
        );
        log.success(`Successfully stored new agent in ElasticSearch!`);
    }

    async deleteAgentById(id) {
        log.info(`Attempting to delete an agent (id: ${id}) from ElasticSearch...`);
        try {
            await this.client.deleteByQuery({
                index: "autocannon",
                type: "agent",
                body: {
                    query: {
                        match: {
                            id: id
                        }
                    }
                }
            })
        } catch (error) {
            log.warn(`Failed to delete an agent (id: ${id} by ID\n${error}`);
        }
        log.success(`Successfully deleted an agent (id: ${id}) from ElasticSearch...`);
    }

    async storeReport(report) {
        log.info(`Attempting to store new report inside ElasticSearch...`);
        await this.store(
            "autocannon",
            "report",
            report
        )
    }

    async store(index, type, body) {
        try {
            await this.client.index({
                index,
                type,
                body
            })
        } catch (error) {
            log.warn(`Failed to store document of type "${type}": \n${error}`);
        }
    }

    async delete(document) {
        try {
            await this.client.delete(document);
        } catch (error) {
            console.warn(`Delete command failed: \n${error}`);
        }
    }

    async deleteByQuery(query) {
        try {
            await this.client.deleteByQuery(query);
        } catch (error) {
            console.warn(`Delete by query command failed: \n${error}`);
        }
    }
}

module.exports = Storage;