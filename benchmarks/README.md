# Benchmarks

The in-memory benchmark harness compares core limiter performance without Redis, HTTP, or external services.

```sh
npm run bench
```

Current scenarios:

- fixed-window hot key
- fixed-window many keys
- sliding-window hot key
- sliding-window many keys

HTTP middleware benchmark:

```sh
npm run bench:http
```

HTTP scenarios:

- allowed-heavy Express middleware traffic
- blocked-heavy Express middleware traffic

The benchmark is intentionally simple and local. Treat results as directional rather than authoritative; include machine, Node.js version, and git commit when publishing numbers.
