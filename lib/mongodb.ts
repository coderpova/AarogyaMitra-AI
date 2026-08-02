import mongoose from "mongoose";
import dns from "dns/promises";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in .env.local");
}

// Force Google DNS
dns.setServers(["8.8.8.8", "8.8.4.4"]);

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = {
    conn: null,
    promise: null,
  };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      family: 4,
    });
  }

  cached.conn = await cached.promise;

  console.log("MongoDB Connected ✅");

  return cached.conn;
}

export default connectDB;