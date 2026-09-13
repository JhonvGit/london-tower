const { MongoClient } = require('mongodb');

let clientPromise;
function getDb() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI não configurada');
  if (!clientPromise) clientPromise = new MongoClient(process.env.MONGODB_URI).connect();
  return clientPromise.then(client => client.db(process.env.MONGODB_DB || 'london_tower'));
}

module.exports = { getDb };
