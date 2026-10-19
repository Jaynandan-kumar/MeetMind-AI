import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

redis.on("connect", () => {
    console.log("redis connected");
});

redis.on("error", (err) => {
    console.warn("redis notice:", err?.message || err);
});

export default redis;
