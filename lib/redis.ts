
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// General purpose client
export const redis = new Redis(redisUrl);

// Dedicated subscriber client (Redis requires dedicated connection for subscribe)
export const redisSub = new Redis(redisUrl);
