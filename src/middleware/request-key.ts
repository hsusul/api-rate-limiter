export interface KeyRequestLike {
  readonly ip?: string;
  readonly socket?: {
    readonly remoteAddress?: string;
  };
  readonly headers?: Record<string, string | string[] | undefined>;
}

export type RequestKeyGenerator<TRequest = KeyRequestLike> = (
  request: TRequest,
) => string;

export function defaultKeyGenerator(request: KeyRequestLike): string {
  const forwardedFor = request.headers?.["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  if (Array.isArray(forwardedFor) && forwardedFor[0] !== undefined) {
    return forwardedFor[0].split(",")[0]?.trim() ?? "unknown";
  }

  return request.ip ?? request.socket?.remoteAddress ?? "unknown";
}
