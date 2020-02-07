const {Client} = require('@elastic/elasticsearch');

const clients = {
  elastic: new Client({
    node: 'http://elasticsearch:9200'
  })
}

module.exports = clients;