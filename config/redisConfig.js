import { createClient } from "redis";

export const redisClient = async () => {
  const redisClient = await createClient({
    url: process.env.REDIS_URL,
  })
    .on("error", (err) => console.log("Redis Connection Error:", err))
    .on("connect", () => console.log("Redis Connection Success"))
    .connect();

  return redisClient;
};

redisClient();
