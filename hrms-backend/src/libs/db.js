const mongoose = require('mongoose');

let cachedConnection = null;

async function connectToDatabase() {
  if (cachedConnection) {
    return cachedConnection;
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('Missing MongoDB connection string (MONGODB_URI or MONGO_URI)');
  }

  cachedConnection = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  return cachedConnection;
}

module.exports = {
  connectToDatabase,
};
