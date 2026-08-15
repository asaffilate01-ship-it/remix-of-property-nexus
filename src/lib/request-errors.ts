export function isRequestAbort(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const candidate = current as { code?: unknown; name?: unknown; message?: unknown; cause?: unknown };

    if (
      candidate.code === "ECONNRESET" ||
      candidate.code === "EPIPE" ||
      candidate.code === "ABORT_ERR" ||
      candidate.name === "AbortError"
    ) {
      return true;
    }

    if (
      typeof candidate.message === "string" &&
      /(?:^|\b)(?:aborted|aborterror|econnreset|socket hang up)(?:\b|$)/i.test(candidate.message)
    ) {
      return true;
    }

    current = candidate.cause;
  }

  return false;
}