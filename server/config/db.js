import mongoose from "mongoose";

/**
 * Opens the Mongo connection once and reuses it.
 *
 * A long-running process (`server.js`) connects at boot. Serverless platforms
 * scale to zero, so the first request of a cold instance connects instead — the
 * promise is cached in module scope, which survives as long as the instance
 * stays warm, and every later request awaits the same connection.
 */
let connection = null;

export const ensureDatabase = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose.connection);
  if (!connection) {
    connection = mongoose
      .connect(process.env.MONGO_URI)
      .then((conn) => {
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
      })
      .catch((error) => {
        // Drop the rejected promise so the next request can try again rather
        // than replaying a cached failure for the life of the instance.
        connection = null;
        throw error;
      });
  }
  return connection;
};

const connectDB = async () => {
  try {
    return await ensureDatabase();
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

export default connectDB;