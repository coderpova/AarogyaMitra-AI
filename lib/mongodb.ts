import mongoose from "mongoose";
import dns from "dns/promises";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aarogya_test";

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in .env.local");
}

// Force Google DNS
dns.setServers(["8.8.8.8", "8.8.4.4"]);

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
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      family: 4,
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log("MongoDB Connected ✅");
    return cached.conn;
  } catch (err) {
    console.warn("[RAG] MongoDB connection failed (fallback to seed data):", err);
    // Resolve promise to avoid hanging on subsequent calls
    cached.conn = null;
    cached.promise = Promise.resolve(null as any);
    return null;
  }
}

export default connectDB;