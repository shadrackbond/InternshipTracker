import mongoose from "mongoose";

type MongoCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalWithMongo = globalThis as typeof globalThis & { mongoCache?: MongoCache };
const cache = globalWithMongo.mongoCache ?? { connection: null, promise: null };
globalWithMongo.mongoCache = cache;

export async function connectToDatabase() {
  if (cache.connection) return cache.connection;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured.");

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || "internship_tracker",
      bufferCommands: false,
    });
  }

  try {
    cache.connection = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }

  return cache.connection;
}
