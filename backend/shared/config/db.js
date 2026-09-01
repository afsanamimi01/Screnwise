import mongoose from "mongoose";

export async function connectDB() {
  // family: 4 forces IPv4 - works around a known Windows IPv6-routing quirk
  // that breaks the TLS handshake to some Atlas shard hosts (tlsv1 alert
  // internal error) while leaving others reachable.
  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}
