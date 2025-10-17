import { createClient } from "redis";

const client = createClient({ url: process.env.REDIS_URL });

client.on("error", (err) => console.log("Redis Connection Error:", err));
client.on("connect", () => console.log("Redis Connection Success"));

await client.connect();

export { client as redisClient };
