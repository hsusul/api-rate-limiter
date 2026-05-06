# Rate Limiting Algorithms

The package currently supports fixed-window and sliding-window counter algorithms.

## Fixed Window

Fixed window counts requests in a discrete time bucket.

Example: `100 requests per 60 seconds`.

Behavior:

- First request creates a counter with a TTL equal to `windowMs`.
- Each request increments the same counter until the TTL expires.
- Requests are allowed while the counter is less than or equal to `limit`.
- Requests over the limit are blocked and include `retryAfterMs`.

Tradeoffs:

- Simple and fast.
- Low storage overhead.
- Easy to reason about.
- Allows boundary bursts when clients send traffic at the end and beginning of adjacent windows.

Use it for simple quotas, local development, and low-risk endpoint protection.

## Sliding Window Counter

Sliding window estimates usage across the current and previous fixed buckets.

It calculates:

```text
estimated = currentCount + previousCount * previousWindowWeight
```

The previous window contributes less as the current window advances.

Tradeoffs:

- Smoother than fixed window.
- Still efficient because it stores counters rather than every request timestamp.
- Approximate rather than exact.
- Slightly more complex reset and retry behavior.

Use it as the better default for general API protection when burst smoothing matters.

## Current Comparison

| Algorithm | Accuracy | Burst Handling | Storage Cost | Status |
| --- | --- | --- | --- | --- |
| Fixed window | Medium | Weak near boundaries | Low | Supported |
| Sliding window counter | Good | Good | Low | Supported |
| Token bucket | Good | Excellent | Medium | Planned |
| Leaky bucket | Good | Smooths traffic | Medium | Planned |
| Sliding log | Excellent | Excellent | High | Planned |
