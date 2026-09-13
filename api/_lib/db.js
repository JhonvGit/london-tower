const { MongoClient } = require('mongodb');

let clientPromise;
function getDb() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI não configurada');
  if (!clientPromise) clientPromise = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS:10000 }).connect().catch(error => { clientPromise = undefined; throw error; });
  return clientPromise.then(client => client.db(process.env.MONGODB_DB || 'london_tower'));
}

async function closeDb() { if (clientPromise) { const client = await clientPromise; clientPromise = undefined; await client.close(); } }
module.exports = { getDb, closeDb };
