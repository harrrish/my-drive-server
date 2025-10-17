import { createClient } from "redis";

export const redisClient = createClient();

redisClient.on("error", (err) => {
  console.log("Redis client error", err);
  process.exit(1);
});

await redisClient.connect();
