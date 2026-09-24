import mongoose from "mongoose";

// Surface connection drops / recoveries instead of failing silently. Once the
// first connect succeeds Mongoose reconnects on its own; these just make it
// visible in the dev console.
mongoose.connection.on("disconnected", () =>
  console.warn("MongoDB disconnected - driver will keep retrying.")
);
mongoose.connection.on("reconnected", () => console.log("MongoDB reconnected."));
mongoose.connection.on("error", (err) =>
  console.error(`MongoDB connection error: ${err.message}`)
);

// DNS/network hiccups look like these; anything else (bad auth, bad URI) will
// never fix itself by retrying, so let it through immediately.
const RETRYABLE =
  /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|ESERVFAIL|querySrv|getaddrinfo|server selection timed out|connection timed out/i;

export async function connectDB() {
  // family: 4 forces IPv4 - works around a known Windows IPv6-routing quirk
  // that breaks the TLS handshake to some Atlas shard hosts (tlsv1 alert
  // internal error) while leaving others reachable.
  const opts = { family: 4, serverSelectionTimeoutMS: 10000 };

  // A transient DNS/network blip at boot must not hard-crash the dev server -
  // nodemon then sits idle until a watched file changes. Retry with backoff.
  for (let attempt = 1; ; attempt++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, opts);
      console.log(`MongoDB connected: ${mongoose.connection.name}`);
      return;
    } catch (err) {
      if (!RETRYABLE.test(err.message) || attempt >= 10) throw err;
      const wait = Math.min(30000, 2000 * attempt);
      console.error(
        `MongoDB connect attempt ${attempt} failed (${err.message}). Retrying in ${wait / 1000}s...`
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}
