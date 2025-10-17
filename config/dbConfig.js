import mongoose from "mongoose";

export async function connectDB() {
  try {
    const host = await mongoose.connect(process.env.DB_URL);
    console.log("Connected to Database:", host.connection.name);
  } catch (dbConnectionError) {
    console.log({ dbConnectionError });
    await mongoose.disconnect(process.env.DB_URL);
    process.exit(1);
  }
}
