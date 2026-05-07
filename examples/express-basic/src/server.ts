import express from "express";
import {
  MemoryStore,
  RateLimiter,
} from "api-rate-limiter";
import { expressRateLimit } from "api-rate-limiter/express";

const app = express();
const port = Number(process.env.PORT ?? 3000);

const limiter = new RateLimiter({
  store: new MemoryStore(),
  defaultPolicy: {
    id: "api.default",
    algorithm: "fixed-window",
    limit: 5,
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
  console.log(`Express example listening on http://localhost:${port}`);
});
