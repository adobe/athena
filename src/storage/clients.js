const {Client} = require('@elastic/elasticsearch');
const mongoose = require('mongoose');

const {makeLogger} = require('./../utils');
const log = makeLogger();

const connString = "mongodb://mongodb:27017/athena";

mongoose.connect(connString, {
  useNewUrlParser: true,
  useFindAndModify: false
});

const clients = {
  elastic: new Client({
    node: 'http://elasticsearch:9200'
  }),
  mongo: mongoose.connection
}

clients.mongo.on('error', log.info.bind(log.info, `MongoDB Connection Error:`));
clients.mongo.on('open', () => {
  log.success('Successfully connected to MongoDB!');
});

module.exports = clients;
