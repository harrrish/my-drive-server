import { createClient } from "redis";

const client = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
    connectTimeout: 10000,
  },
});

client.on("error", (err) => console.error("Redis connection error:", err));
client.on("connect", () => console.log("Connected to Redis"));

await client.connect();

export { client as redisClient };
