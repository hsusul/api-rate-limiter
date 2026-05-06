import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { RateLimiter, RateLimiterCheckInput } from "../core/rate-limiter.js";
import type { RateLimitPolicy, RateLimitResult } from "../core/types.js";
import { createRateLimitHeaders } from "./headers.js";
import {
  defaultKeyGenerator,
  type KeyRequestLike,
  type RequestKeyGenerator,
} from "./request-key.js";

export interface ExpressRateLimitOptions {
  readonly limiter: RateLimiter;
  readonly policy?: RateLimitPolicy | ((request: Request) => RateLimitPolicy);
  readonly keyGenerator?: RequestKeyGenerator<Request>;
  readonly skip?: (request: Request) => boolean;
  readonly cost?: number | ((request: Request) => number);
  readonly headers?: boolean;
  readonly legacyHeaders?: boolean;
  readonly onLimitExceeded?: (
    result: RateLimitResult,
    request: Request,
    response: Response,
  ) => void;
}

export function expressRateLimit(
  options: ExpressRateLimitOptions,
): RequestHandler {
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      if (options.skip?.(request) === true) {
        next();
        return;
      }

      const result = await options.limiter.check(createCheckInput(options, request));

      if (options.headers !== false) {
        for (const [name, value] of Object.entries(
          createRateLimitHeaders(result, {
            legacyHeaders: options.legacyHeaders ?? false,
          }),
        )) {
          response.setHeader(name, value);
        }
      }

      if (result.allowed) {
        next();
        return;
      }

      options.onLimitExceeded?.(result, request, response);

      if (!response.headersSent) {
        response.status(429).json({
          error: "rate_limit_exceeded",
          message: "Too many requests",
          retryAfterMs: result.retryAfterMs,
        });
      }
    } catch (error) {
      next(error);
    }
  };
}

function createCheckInput(
  options: ExpressRateLimitOptions,
  request: Request,
): RateLimiterCheckInput {
  return {
    key: (options.keyGenerator ?? defaultExpressKeyGenerator)(request),
    ...resolvePolicy(options.policy, request),
    ...resolveCost(options.cost, request),
  };
}

function defaultExpressKeyGenerator(request: Request): string {
  return defaultKeyGenerator(request as KeyRequestLike);
}

function resolvePolicy(
  policy: ExpressRateLimitOptions["policy"],
  request: Request,
): Pick<RateLimiterCheckInput, "policy"> {
  if (policy === undefined) {
    return {};
  }

  return {
    policy: typeof policy === "function" ? policy(request) : policy,
  };
}

function resolveCost(
  cost: ExpressRateLimitOptions["cost"],
  request: Request,
): Pick<RateLimiterCheckInput, "cost"> {
  if (cost === undefined) {
    return {};
  }

  return {
    cost: typeof cost === "function" ? cost(request) : cost,
  };
}
