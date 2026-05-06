# Express Basic Example

This example protects a single Express route with the in-memory fixed-window limiter.

```sh
npm install
npm run dev
```

Then call the limited route:

```sh
curl -i http://localhost:3000/api/widgets
```

The default policy allows 5 requests per minute per request IP. The in-memory store is intended for local development and single-process examples only.
