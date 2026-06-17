import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  // Reuse cached connection, but verify it is still alive first
  if (cached.conn) {
    if (mongoose.connection.readyState === 1) {
      return cached.conn;
    }
    // Connection dropped — reset so we reconnect below
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      // Keep pool small — Next.js API routes are stateless/serverless-style.
      // Without this, each cold start adds to the pool until Atlas M0's
      // 100-connection limit is hit and requests start failing.
      maxPoolSize: 5,

      // Fail fast if Atlas is unreachable. Default is 30 000ms — that's why
      // login/register feels "frozen" on a cold start against a slow Atlas node.
      serverSelectionTimeoutMS: 5000,

      // Hard deadline for individual socket ops so a hung query doesn't block
      // an API route indefinitely.
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,

      // Keep buffering ON (the default). With bufferCommands: false, any
      // mongoose call made in the ~100ms window while the connection promise
      // is pending throws immediately. Since we always await connectDB() first
      // this was safe before, but buffering gives a second layer of protection
      // during hot-reload races in development.
      bufferCommands: true,
    }).then((m) => {
      console.log('✅ MongoDB connected');
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;