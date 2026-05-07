import express from "express";
import {
  expressRateLimit,
  RateLimiter,
} from "api-rate-limiter";
import { RedisStore } from "api-rate-limiter/redis";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

const store = new RedisStore({
  url: redisUrl,
  keyPrefix: "rl:express-example",
});

await store.connect();

const limiter = new RateLimiter({
  store,
  defaultPolicy: {
    id: "api.widgets",
    algorithm: "sliding-window",
    limit: 20,
    windowMs: 60_000,
  },
});

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.get(
  "/api/widgets",
  expressRateLimit({
    limiter,
    keyGenerator: (request) => request.ip ?? "unknown",
  }),
  (_request, response) => {
    response.json({
      widgets: [
        { id: "widget_1", name: "Alpha" },
        { id: "widget_2", name: "Beta" },
      ],
    });
  },
);

app.listen(port, () => {
  console.log(`Express Redis example listening on http://localhost:${port}`);
  console.log(`Redis URL: ${redisUrl}`);
});
