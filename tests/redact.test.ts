import assert from "node:assert/strict";
import test from "node:test";
import { redact } from "../src/redact.js";

test("numeric token usage survives sanitization but credential-shaped values do not", () => {
  assert.deepEqual(
    redact({
      usage: { prompt_tokens: 1200, completion_tokens: 60, total_tokens: 1260 },
      api_key: "private-key",
      token: 12345,
      text: "Bearer abcdefghijkl",
    }),
    {
      usage: { prompt_tokens: 1200, completion_tokens: 60, total_tokens: 1260 },
      api_key: "[redacted]",
      token: "[redacted]",
      text: "[redacted]",
    },
  );
  assert.deepEqual(redact({ prompt_tokens: null }), { prompt_tokens: null });
  for (const value of ["sk-privatecredential", -1, 2.5, Infinity]) {
    assert.deepEqual(redact({ prompt_tokens: value }), { prompt_tokens: "[redacted]" });
  }
});
