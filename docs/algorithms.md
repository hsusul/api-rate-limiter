# Algorithm Notes

## Fixed Window

Fixed window uses one counter per policy and subject for the active window.

- First increment creates the counter.
- TTL is set on first increment.
- Requests are allowed while the counter is less than or equal to `limit`.
- Requests over the limit are blocked and still counted.

This is fast and simple, but it allows boundary bursts at the transition between adjacent windows.

## Sliding Window Counter

Sliding window stores bucketed counters and estimates current usage with the previous bucket:

```text
estimated = currentCount + previousCount * previousWindowWeight
```

This smooths boundary bursts without storing every request timestamp. It is approximate, but much cheaper than an exact sliding log.

## Request Cost

Both supported algorithms accept `cost`, allowing one request to consume more than one quota unit.

## Storage Requirements

The store must support TTL-aware counters. For Redis, increment plus first-write TTL must be atomic to avoid race conditions under concurrency.
