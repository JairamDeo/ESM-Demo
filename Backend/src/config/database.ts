import mongoose from "mongoose";

const mongoOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

/** Reuse one Mongo connection on Vercel (no process.exit). */
export async function ensureMongoConnected(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGODB_URI as string;
  if (!uri) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(uri, mongoOptions);
}

const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI as string;

  try {
    const conn = await mongoose.connect(uri, mongoOptions);

    console.log(`✅  MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on("error", (err) => {
      console.error("❌  MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️   MongoDB disconnected. Retrying...");
    });
  } catch (error: any) {
    console.error("❌  MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
