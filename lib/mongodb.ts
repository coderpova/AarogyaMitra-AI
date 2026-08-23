import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aarogya_test";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  let mongoose: MongooseCache | undefined;
}

if (!(globalThis as any).mongoose) {
  (globalThis as any).mongoose = {
    conn: null,
    promise: null,
  };
}
const cached = (globalThis as any).mongoose;

async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise || mongoose.connection.readyState === 0) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    console.error("[MongoDB] Connection error:", err);
    cached.conn = null;
    cached.promise = null; // Do NOT cache failed promise, allow retry on next call
    throw err;
  }
}

export default connectDB;