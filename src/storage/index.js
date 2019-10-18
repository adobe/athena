const {Client} = require('@elastic/elasticsearch');

class Storage {
    constructor(url) {
        this.client = new Client({
            node: 'http://elasticsearch:9200'
        });
    }

    async migrate() {
        await this.client.indices.create({
            index: "autocannon"
        });

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
    }

    async store(index, type, body) {
        try {
            await this.client.index({
                index,
                type,
                body
            })
        } catch (error) {
            console.warn(`Storage failed: \n${error}`);
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