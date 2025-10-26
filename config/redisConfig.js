import { createClient } from "redis";

const client = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500),
  },
});

client.on("error", (err) => {
  if (err.code === "ENOTFOUND") {
    console.warn("Redis DNS lookup failed, retrying...");
  } else {
    console.error("Redis error:", err);
  }
});
client.on("connect", () => console.log("Redis Connection Success"));

await client.connect();

export { client as redisClient };
