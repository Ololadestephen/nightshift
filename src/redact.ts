const SENSITIVE_KEY = /api[-_]?key|token|secret|password|authorization|credential/i;
const SENSITIVE_VALUE = /\b(?:sk-[A-Za-z0-9]{8,}|Bearer\s+[A-Za-z0-9._\-]{8,})\b/g;
const USAGE_COUNTERS = new Set(["prompt_tokens", "completion_tokens", "total_tokens"]);

export function redact<T>(value: T): T {
  return walk(value) as T;
}

function walk(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(SENSITIVE_VALUE, "[redacted]");
  }
  if (Array.isArray(value)) {
    return value.map((item) => walk(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        SENSITIVE_KEY.test(key) && !isUsageCounter(key, entry) ? "[redacted]" : walk(entry),
      ]),
    );
  }
  return value;
}

function isUsageCounter(key: string, value: unknown): boolean {
  return (
    USAGE_COUNTERS.has(key) &&
    (value === null || (typeof value === "number" && Number.isSafeInteger(value) && value >= 0))
  );
}
