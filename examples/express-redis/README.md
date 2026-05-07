# Express Redis Example

This example protects an Express route with Redis-backed distributed rate limiting.

Redis is useful when an API runs multiple Node.js processes, containers, or instances. In-memory limiting only protects one process; Redis lets every instance share the same quota state.

Start Redis from the repository root:

```sh
docker compose up -d redis
```

Run the example:

```sh
npm install
npm run dev
```

Then call the limited route:

```sh
curl -i http://localhost:3000/api/widgets
```

Configuration:

- `REDIS_URL`, default `redis://127.0.0.1:6379`
- `PORT`, default `3000`

The example uses the sliding-window algorithm with a Redis store.
